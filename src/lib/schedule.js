// src/lib/schedule.js
// Personal-schedule interval generation. Pure.

/**
 * @param {string} t "HH:MM"
 * @returns {number} minutes since midnight
 */
export function timeToMin(t) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }

/**
 * @param {number} min
 * @returns {string} "HH:MM"
 */
export function minToTime(min) {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

/**
 * @param {string} start "HH:MM"
 * @param {string} end "HH:MM"
 * @param {number} interval minutes, 5..240
 * @param {{start:string,end:string,label?:string}[]} [breaks]
 * @returns {{id:string,label:string,time:string,start:string,end:string}[]|null}
 */
export function generatePeriods(start, end, interval, breaks) {
  const sMin = timeToMin(start), eMin = timeToMin(end);
  if (eMin <= sMin || interval < 5 || interval > 240) return null;
  const out = []; let cur = sMin, idx = 1;
  while (cur + interval <= eMin) {
    const st = minToTime(cur), en = minToTime(cur + interval);
    // skip if overlaps a break (e.g., lunch)
    let isBreak = false;
    for (const b of (breaks || [])) {
      const bS = timeToMin(b.start), bE = timeToMin(b.end);
      if (cur >= bS && cur < bE) { isBreak = true; break; }
    }
    if (isBreak) { cur += interval; continue; }
    const id = 'p' + idx;
    out.push({ id, label: 'Block ' + idx, time: st + ' – ' + en, start: st, end: en });
    idx++; cur += interval;
  }
  return out.length ? out : null;
}

/** A block with no end time is treated as occupying this many minutes. */
export const DEFAULT_BLOCK_MIN = 50;

/**
 * Do two scheduled entries clash? Back-to-back blocks (one ends exactly as the next
 * starts) are clear — that is a normal timetable, not a double-booking.
 *
 * An entry without a start time cannot clash with anything; one without an end time
 * is assumed to run for DEFAULT_BLOCK_MIN, because a lesson with no stated end still
 * occupies the slot.
 *
 * @param {{startTime?: string, endTime?: string}} a
 * @param {{startTime?: string, endTime?: string}} b
 * @returns {boolean}
 */
export function timeOverlaps(a, b) {
  if (!a.startTime || !b.startTime) return false;
  const aStart = timeToMin(a.startTime);
  const aEnd = a.endTime ? timeToMin(a.endTime) : aStart + DEFAULT_BLOCK_MIN;
  const bStart = timeToMin(b.startTime);
  const bEnd = b.endTime ? timeToMin(b.endTime) : bStart + DEFAULT_BLOCK_MIN;
  return aStart < bEnd && bStart < aEnd;
}

/**
 * The seven days of the week starting at `monday`, with display fields and which one
 * (if any) is today. Matched by date, not by weekday id — a stale "today" flag on the
 * wrong week is worse than none.
 * @param {Date} monday
 * @param {Array<{id:string,label:string}>} days Monday-first weekday definitions
 * @param {string} todayISOStr today as 'YYYY-MM-DD'
 * @returns {Array<{id:string,label:string,dateStr:string,dayNum:number,monthShort:string,isToday:boolean,fullLabel:string}>}
 */
export function buildWeekDays(monday, days, todayISOStr) {
  return days.map((d, idx) => {
    const dt = new Date(monday);
    dt.setDate(monday.getDate() + idx);
    // dt is local midnight; toISOString() converts to UTC first, which rolls the date
    // back a day in any timezone ahead of UTC. Format from local fields instead — the
    // same trap src/lib/helpers.js#fmtShort documents on the parsing side.
    const dateStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    const dayNum = dt.getDate();
    const monthShort = dt.toLocaleString('en-US', { month: 'short' });
    return {
      id: d.id, label: d.label, dateStr, dayNum, monthShort,
      isToday: dateStr === todayISOStr,
      fullLabel: `${d.label} ${dayNum}`,
    };
  });
}

/**
 * Files tasks into a period-by-day grid and flags which ones clash within a cell.
 * A task naming a period or day that no longer exists in the current schedule is
 * silently dropped rather than thrown away with an error — periods and days are
 * user-configurable, so a stale reference is expected, not exceptional.
 * @param {object[]} tasks
 * @param {Array<{id:string}>} periods
 * @param {Array<{id:string}>} days
 * @returns {{grid: Record<string, Record<string, object[]>>, overlapIds: Set<string>}}
 */
export function buildScheduleGrid(tasks, periods, days) {
  const grid = {};
  periods.forEach((p) => { grid[p.id] = {}; days.forEach((d) => { grid[p.id][d.id] = []; }); });
  tasks.forEach((t) => {
    const day = t.scheduleDay || 'mon';
    const period = t.schedulePeriod || 'p1';
    if (grid[period] && grid[period][day]) grid[period][day].push(t);
  });

  const overlapIds = new Set();
  periods.forEach((p) => {
    days.forEach((d) => {
      const cell = grid[p.id][d.id];
      for (let i = 0; i < cell.length; i++) {
        for (let j = i + 1; j < cell.length; j++) {
          if (timeOverlaps(cell[i], cell[j])) { overlapIds.add(cell[i].id); overlapIds.add(cell[j].id); }
        }
      }
    });
  });
  return { grid, overlapIds };
}
