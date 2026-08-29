// src/schedule/view.js — schedule presentation. Pure builders following the same
// deps pattern as src/vault/view.js and src/tasks/view.js: everything from app state
// is injected. renderSchedule keeps the date arithmetic, the grid assembly and the
// drag-and-drop wiring.
import { esc, fmtShort } from '../lib/helpers.js';
import { CATEGORIES } from '../lib/constants.js';

/**
 * Subtask progress as `done/total`, or empty when a task has none.
 * @param {{subtasks?: Array<{done?: boolean}>}} t
 * @returns {string}
 */
export const subtaskLabel = (t) => {
  const sub = t.subtasks || [];
  const done = sub.filter(s => s.done).length;
  return sub.length ? `${done}/${sub.length}` : '';
};

/**
 * One task as it appears in a timetable cell.
 * @param {object} t task
 * @param {{today?: string, overlapIds?: Set<string>}} [ctx] `overlapIds` is resolved by
 *   the caller, which alone knows which tasks share a cell
 * @returns {string}
 */
export function schedTaskCell(t, ctx) {
  const { today = '', overlapIds = new Set() } = ctx || {};
  const cat = CATEGORIES.find(c => c.id === t.category);
  const overdue = t.due && t.due < today;
  const done = t.status === 'done';
  const subProg = subtaskLabel(t);
  const overlap = overlapIds.has(t.id);
  const timeLabel = t.startTime ? (t.endTime ? `${t.startTime}–${t.endTime}` : t.startTime) : '';
  const catStyle = cat ? ` style="border-left:3px solid ${cat.color};background:${cat.color}14"` : '';
  const catEmoji = cat ? cat.label.split(' ')[0] : '';
  return `<div class="sched-task ${done ? 'done' : ''} ${overlap ? 'time-overlap' : ''} ${cat ? 'cat-' + cat.id : 'cat-none'}" data-id="${t.id}" draggable="true"${catStyle} title="${esc(t.title)}${t.desc ? '\n' + esc(t.desc) : ''}${overlap ? '\n⚠ Overlapping time range!' : ''}">
    ${overlap ? '<div class="sched-overlap-badge">⚠ Overlap</div>' : ''}
    ${timeLabel ? `<div class="sched-task-time">🕐 ${timeLabel}</div>` : ''}
    <div class="sched-task-title">${esc(t.title)}</div>
    <div class="sched-task-meta">
      ${t.student ? `<span class="badge" style="background:rgba(81,141,191,.15);color:#518DBF;font-size:10px;padding:0 4px">🎓 ${esc(t.student)}</span>` : ''}
      ${cat ? `<span class="sched-cat" style="background:${cat.color}22;color:${cat.color}">${catEmoji}</span>` : ''}
      ${subProg ? `<span class="sched-sub">✓${subProg}</span>` : ''}
      ${overdue ? '<span class="sched-overdue">⚠</span>' : ''}
    </div>
  </div>`;
}

/**
 * Month calendar grid. Leading and trailing filler days come from the neighbouring
 * months so every row is a full week — a ragged final row is what this avoids.
 * @param {object} ctx
 * @param {number} ctx.year
 * @param {number} ctx.month zero-based, as Date uses
 * @param {number} ctx.startDayIdx weekday of the 1st, Monday = 0
 * @param {number} ctx.totalDays days in the month
 * @param {string} ctx.today ISO date
 * @param {string} ctx.todayDow three-letter weekday id for today
 * @param {object[]} [ctx.tasks]
 * @param {Array<{id:string,label:string}>} [ctx.days] weekday headers, Monday first
 * @returns {string}
 */
export function monthGridHTML(ctx) {
  const {
    year, month, startDayIdx = 0, totalDays = 0, today = '', todayDow = '', tasks = [], days = [],
  } = ctx || {};
  // Month calendar grid
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  let monthCellsHTML = '';
  // Previous month filler days
  for (let i = startDayIdx - 1; i >= 0; i--) {
    const prevDate = prevMonthLastDay - i;
    monthCellsHTML += `<div class="cal-month-cell other-month"><div class="cal-month-top"><span class="cal-month-num">${prevDate}</span></div></div>`;
  }
  // Current month days
  for (let d = 1; d <= totalDays; d++) {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = dStr === today;
    const dayTasks = tasks.filter(t => t.due === dStr || (t.scheduleDay && dStr === today && t.scheduleDay === todayDow));
    monthCellsHTML += `
      <div class="cal-month-cell ${isToday ? 'today' : ''}" data-calendar-date="${dStr}">
        <div class="cal-month-top">
          <span class="cal-month-num">${d}</span>
          ${isToday ? '<span class="sched-today-dot"></span>' : ''}
        </div>
        <div class="cal-month-tasks">
          ${dayTasks.map(t => {
            const cat = CATEGORIES.find(c => c.id === t.category);
            const color = cat ? cat.color : 'var(--accent)';
            const timeLabel = t.startTime ? `${t.startTime} ` : '';
            return `<div class="sched-task ${t.status === 'done' ? 'done' : ''}" data-id="${t.id}" style="border-left:3px solid ${color};font-size:10.5px;padding:2px 4px;margin-bottom:2px">
              <div class="sched-task-title" style="font-size:10.5px">${timeLabel}${esc(t.title)}</div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
  }
  // Next month filler days
  const totalCells = startDayIdx + totalDays;
  const nextFill = (7 - (totalCells % 7)) % 7;
  for (let n = 1; n <= nextFill; n++) {
    monthCellsHTML += `<div class="cal-month-cell other-month"><div class="cal-month-top"><span class="cal-month-num">${n}</span></div></div>`;
  }

  return `
    <div class="cal-month-grid">
      ${days.map(d => `<div class="cal-month-head">${d.label}</div>`).join('')}
      ${monthCellsHTML}
    </div>`;
}

/**
 * The weekly timetable grid: a day header row, then one row per period with a cell
 * for each day. `grid` is period-id -> day-id -> tasks, already resolved by the
 * caller (buildScheduleGrid); cell markup is the caller’s too, via `cellHTML`, since
 * it alone knows the overlap set and today’s date.
 * @param {object} ctx
 * @param {Array} ctx.weekDays from buildWeekDays
 * @param {Array<{id:string,label:string,time:string}>} ctx.periods
 * @param {Record<string, Record<string, object[]>>} ctx.grid
 * @param {(t:object)=>string} [ctx.cellHTML]
 * @returns {string}
 */
export function weekGridHTML(ctx) {
  const {
    weekDays = [], periods = [], grid = {}, cellHTML = () => '',
  } = ctx || {};
return `
    <div class="sched-wrap">
      <div class="sched-grid">
        <div class="sched-corner">Time &amp; Period</div>
        ${weekDays.map(wd => `
          <div class="sched-day-head ${wd.isToday ? 'today' : ''}">
            <span class="sched-day-name">${wd.label}</span>
            <span class="sched-day-date">${wd.monthShort} ${wd.dayNum}</span>
            ${wd.isToday ? '<span class="sched-today-dot"></span>' : ''}
          </div>
        `).join('')}
        ${periods.map(p => `
          <div class="sched-period-label">
            <span class="sched-period-name">${p.label}</span>
            <span class="sched-period-time">🕐 ${p.time}</span>
          </div>
          ${weekDays.map(wd => {
            const tasks = (grid[p.id] && grid[p.id][wd.id]) || [];
            return `<div class="sched-cell ${wd.isToday ? 'today' : ''} ${tasks.length ? 'has-tasks' : ''}" data-day="${wd.id}" data-period="${p.id}" data-date="${wd.dateStr}">
              ${tasks.map(cellHTML).join('')}
            </div>`;
          }).join('')}
        `).join('')}
      </div>
    </div>`;
}

/**
 * "Other unscheduled" list — tasks not yet placed into the timetable and not part
 * of the committed-but-unplaced tray.
 * @param {object[]} tasks
 * @returns {string} empty when there are none
 */
export function unscheduledListHTML(tasks) {
  if (!tasks.length) return '';
  return `<div class="sched-unscheduled">
      <h3 class="card-title"><span>📋 Other unscheduled</span><span class="muted" style="font-size:12px;font-weight:400">Assign a day & period or drag into a time slot</span></h3>
      <div class="sched-unsched-list">${tasks.map(t => {
        const cat = CATEGORIES.find(c => c.id === t.category);
        const catStyle = cat ? ` style="border-left:3px solid ${cat.color};background:${cat.color}10"` : '';
        return `<div class="sched-unsched-item ${cat ? 'cat-' + cat.id : 'cat-none'}" data-id="${t.id}" draggable="true"${catStyle}>
          <span class="sched-unsched-title">${t.student ? `<span class="badge" style="background:rgba(81,141,191,.15);color:#518DBF;font-size:10px;padding:0 4px;margin-right:4px">🎓 ${esc(t.student)}</span>` : ''}${esc(t.title)}</span>
          ${cat ? `<span class="sched-cat" style="background:${cat.color}22;color:${cat.color}">${cat.label.split(' ')[0]}</span>` : ''}
          <button class="btn btn-sm btn-ghost sched-assign" data-assign="${t.id}" title="Quick assign">📅</button>
        </div>`;
      }).join('')}</div>
    </div>`;
}

/**
 * Committed-but-unplaced tray: tasks the user committed for today via the Brief
 * but hasn't dragged onto a timetable slot yet.
 * @param {object[]} tasks
 * @param {{todayDow: string, days: Array<{id:string,label:string}>, linkGraph?: (t:object)=>string}} ctx
 * @returns {string} empty when there is nothing committed and unplaced
 */
export function committedTrayHTML(tasks, ctx) {
  const { todayDow = '', days = [], linkGraph = () => '' } = ctx || {};
  if (!tasks.length) return '';
  return `<div class="sched-commit-tray" id="sched-commit-tray" data-testid="commit-tray">
      <h3 class="card-title"><span>🎯 Committed, unplaced — drop onto today (${days.find(d=>d.id===todayDow)?.label || todayDow})</span><span class="muted" style="font-size:12px;font-weight:400">Drag onto a period to schedule</span></h3>
      <div class="sched-unsched-list" id="sched-commit-list">${tasks.map(t=>{
        const cat=CATEGORIES.find(c=>c.id===t.category); const catStyle=cat?` style="border-left:3px solid ${cat.color};background:${cat.color}10"`:'';
        return `<div class="sched-unsched-item committed" data-id="${t.id}" draggable="true"${catStyle} title="Drag onto today's periods">
          <span class="sched-unsched-title">${esc(t.title)} ${linkGraph(t)}</span>
          ${cat?`<span class="sched-cat" style="background:${cat.color}22;color:${cat.color}">${cat.label.split(' ')[0]}</span>`:''}
          ${t.due?`<span class="due-chip">${fmtShort(t.due)}</span>`:''}
          <span class="muted" style="font-size:10px">↗ drag to today</span>
        </div>`;
      }).join('')}</div>
    </div>`;
}
