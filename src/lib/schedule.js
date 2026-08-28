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
