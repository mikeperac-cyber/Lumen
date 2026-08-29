import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { subtaskLabel, schedTaskCell, monthGridHTML, weekGridHTML, committedTrayHTML, unscheduledListHTML } from '../../src/schedule/view.js';

const task = (over = {}) => ({
  id: 's1', title: 'Lesson with Ada', status: 'today', category: '', student: '',
  due: '', startTime: '', endTime: '', subtasks: [], ...over,
});
const TODAY = '2026-08-29';
const ctx = (over = {}) => ({ today: TODAY, overlapIds: new Set(), ...over });

describe('subtaskLabel', () => {
  it('is empty when a task has no subtasks', () => {
    assert.equal(subtaskLabel(task()), '');
    assert.equal(subtaskLabel({}), '');
  });
  it('counts the done ones out of the total', () => {
    assert.equal(subtaskLabel(task({ subtasks: [{ done: true }, { done: false }, { done: true }] })), '2/3');
  });
});

describe('schedTaskCell', () => {
  it('escapes a hostile title and student name', () => {
    const html = schedTaskCell(task({ title: '<img src=x onerror=1>', student: '<b>S</b>' }), ctx());
    assert.ok(!html.includes('<img src=x'));
    assert.ok(!html.includes('<b>S</b>'));
  });

  it('marks a completed task', () => {
    assert.ok(/class="sched-task done/.test(schedTaskCell(task({ status: 'done' }), ctx())));
    assert.ok(!/class="sched-task done/.test(schedTaskCell(task(), ctx())));
  });

  it('flags a clash only for tasks the caller identified as overlapping', () => {
    assert.ok(schedTaskCell(task(), ctx({ overlapIds: new Set(['s1']) })).includes('Overlap'));
    assert.ok(!schedTaskCell(task(), ctx({ overlapIds: new Set(['other']) })).includes('Overlap'));
  });

  it('shows a time range, or just the start when there is no end', () => {
    assert.ok(schedTaskCell(task({ startTime: '09:00', endTime: '10:00' }), ctx()).includes('09:00–10:00'));
    const openEnded = schedTaskCell(task({ startTime: '09:00' }), ctx());
    assert.ok(openEnded.includes('09:00'));
    assert.ok(!openEnded.includes('–'));
    assert.ok(!schedTaskCell(task(), ctx()).includes('sched-task-time'));
  });

  it('warns about a past due date', () => {
    assert.ok(schedTaskCell(task({ due: '2026-08-01' }), ctx()).includes('sched-overdue'));
    assert.ok(!schedTaskCell(task({ due: '2026-09-01' }), ctx()).includes('sched-overdue'));
  });

  it('shows subtask progress only when there are subtasks', () => {
    assert.ok(schedTaskCell(task({ subtasks: [{ done: true }, { done: false }] }), ctx()).includes('✓1/2'));
    assert.ok(!schedTaskCell(task(), ctx()).includes('sched-sub'));
  });

  it('carries the category colour when the category resolves, and a neutral class otherwise', () => {
    const withCat = schedTaskCell(task({ category: 'admin' }), ctx());
    assert.ok(withCat.includes('cat-admin'));
    assert.ok(/border-left:3px solid/.test(withCat));
    const noCat = schedTaskCell(task({ category: 'not-a-category' }), ctx());
    assert.ok(noCat.includes('cat-none'));
    assert.ok(!/border-left:3px solid/.test(noCat));
  });
});

describe('monthGridHTML', () => {
  const DAYS7 = [
    { id: 'mon', label: 'Mon' }, { id: 'tue', label: 'Tue' }, { id: 'wed', label: 'Wed' },
    { id: 'thu', label: 'Thu' }, { id: 'fri', label: 'Fri' }, { id: 'sat', label: 'Sat' }, { id: 'sun', label: 'Sun' },
  ];
  // August 2026: 31 days, the 1st is a Saturday, so Monday-first leading filler is 5.
  const ctx = (over = {}) => ({
    year: 2026, month: 7, startDayIdx: 5, totalDays: 31,
    today: '2026-08-29', todayDow: 'sat', tasks: [], days: DAYS7, ...over,
  });
  const cells = (html) => (html.match(/class="cal-month-cell/g) || []).length;

  it('heads the grid with all seven weekday labels', () => {
    const html = monthGridHTML(ctx());
    assert.equal((html.match(/class="cal-month-head"/g) || []).length, 7);
  });

  it('fills whole weeks, so the grid never ends ragged', () => {
    for (const [startDayIdx, totalDays] of [[5, 31], [0, 28], [3, 30], [6, 31]]) {
      const html = monthGridHTML(ctx({ startDayIdx, totalDays }));
      assert.equal(cells(html) % 7, 0, `startDayIdx ${startDayIdx}, ${totalDays} days`);
      assert.ok(cells(html) >= startDayIdx + totalDays);
    }
  });

  it('pads the head with exactly the days before the first', () => {
    const html = monthGridHTML(ctx({ startDayIdx: 5, totalDays: 31 }));
    const lead = html.split('data-calendar-date=')[0];
    assert.equal((lead.match(/other-month/g) || []).length, 5);
  });

  it('renders one dated cell per day of the month', () => {
    const html = monthGridHTML(ctx({ totalDays: 31 }));
    assert.equal((html.match(/data-calendar-date=/g) || []).length, 31);
    assert.ok(html.includes('data-calendar-date="2026-08-01"'));
    assert.ok(html.includes('data-calendar-date="2026-08-31"'));
  });

  it('marks today, and only today', () => {
    const html = monthGridHTML(ctx());
    assert.equal((html.match(/cal-month-cell today/g) || []).length, 1);
    assert.equal((html.match(/sched-today-dot/g) || []).length, 1);
  });

  it('places a task on its due date and nowhere else', () => {
    const html = monthGridHTML(ctx({ tasks: [{ id: 't1', title: 'Report due', status: 'today', due: '2026-08-14', category: '' }] }));
    assert.equal((html.match(/data-id="t1"/g) || []).length, 1);
    const cell = html.split('data-calendar-date="2026-08-14"')[1].split('data-calendar-date=')[0];
    assert.ok(cell.includes('Report due'));
  });

  it('escapes a hostile task title and prefixes the start time', () => {
    const html = monthGridHTML(ctx({
      tasks: [{ id: 't1', title: '<img src=x onerror=1>', status: 'today', due: '2026-08-14', category: '', startTime: '09:00' }],
    }));
    assert.ok(!html.includes('<img src=x'));
    assert.ok(html.includes('09:00'));
  });
});

describe('weekGridHTML', () => {
  const day = (over = {}) => ({ id: 'mon', label: 'Mon', dateStr: '2026-08-24', dayNum: 24, monthShort: 'Aug', isToday: false, fullLabel: 'Mon 24', ...over });
  const period = (over = {}) => ({ id: 'p1', label: 'Period 1', time: '08:00 – 08:45', ...over });
  const ctx = (over = {}) => ({ weekDays: [day()], periods: [period()], grid: { p1: { mon: [] } }, ...over });

  it('heads the grid with one column per day, in order', () => {
    const html = weekGridHTML(ctx({ weekDays: [day({ id: 'mon', label: 'Mon' }), day({ id: 'tue', label: 'Tue' })] }));
    const names = [...html.matchAll(/sched-day-name">([^<]+)</g)].map((m) => m[1]);
    assert.deepEqual(names, ['Mon', 'Tue']);
  });

  it('marks today’s column and no other', () => {
    const html = weekGridHTML(ctx({ weekDays: [day({ id: 'mon', isToday: false }), day({ id: 'tue', isToday: true })] }));
    assert.equal((html.match(/sched-day-head today/g) || []).length, 1);
    assert.equal((html.match(/sched-today-dot/g) || []).length, 1);
  });

  it('lists one row per period, with its label and time', () => {
    const html = weekGridHTML(ctx({ periods: [period({ id: 'p1', label: 'Period 1' }), period({ id: 'p2', label: 'Period 2', time: '09:00 – 09:45' })] }));
    assert.ok(html.includes('Period 1'));
    assert.ok(html.includes('Period 2'));
    assert.ok(html.includes('09:00'));
  });

  it('marks a cell as having tasks only when it does', () => {
    const withTask = weekGridHTML(ctx({ grid: { p1: { mon: [{ id: 't1' }] } } }));
    assert.ok(/sched-cell[^"]*has-tasks/.test(withTask));
    const empty = weekGridHTML(ctx());
    assert.ok(!/sched-cell[^"]*has-tasks/.test(empty));
  });

  it('renders each cell’s tasks through the injected cell renderer', () => {
    const html = weekGridHTML(ctx({
      grid: { p1: { mon: [{ id: 't1' }] } },
      cellHTML: (t) => `<b id="cell-${t.id}"></b>`,
    }));
    assert.ok(html.includes('<b id="cell-t1"></b>'));
  });

  it('carries the day and date onto each cell for drag-and-drop targeting', () => {
    const html = weekGridHTML(ctx({ weekDays: [day({ id: 'wed', dateStr: '2026-08-26' })], grid: { p1: { wed: [] } } }));
    assert.ok(html.includes('data-day="wed"'));
    assert.ok(html.includes('data-period="p1"'));
    assert.ok(html.includes('data-date="2026-08-26"'));
  });
});

describe('committedTrayHTML', () => {
  const day = (over = {}) => ({ id: 'mon', label: 'Mon', ...over });
  const t = (over = {}) => ({ id: 't1', title: 'Lesson', category: '', due: '', ...over });
  const ctx = (over = {}) => ({ todayDow: 'mon', days: [day()], tagSpan: () => '', linkGraph: () => '', ...over });

  it('is empty when there is nothing committed and unplaced', () => {
    assert.equal(committedTrayHTML([], ctx()), '');
  });

  it('names today by its day label', () => {
    const html = committedTrayHTML([t()], ctx({ todayDow: 'mon', days: [day({ id: 'mon', label: 'Monday' })] }));
    assert.ok(html.includes('Monday'));
  });

  it('escapes a hostile task title', () => {
    const html = committedTrayHTML([t({ title: '<img src=x onerror=1>' })], ctx());
    assert.ok(!html.includes('<img src=x'));
  });

  it('shows a due-date chip only when the task has one', () => {
    assert.ok(committedTrayHTML([t({ due: '2026-08-30' })], ctx()).includes('due-chip'));
    assert.ok(!committedTrayHTML([t({ due: '' })], ctx()).includes('due-chip'));
  });

  it('carries the category colour as an inline border when the category resolves', () => {
    // Unlike unscheduledListHTML's items, a committed row has no cat-<id> class —
    // the colour is applied only via the inline border-left style. Checked against
    // the actual source rather than assumed from the sibling function.
    const html = committedTrayHTML([t({ category: 'admin' })], ctx());
    assert.ok(html.includes('border-left:3px solid #ffb020'));
  });

  it('renders the link graph the caller injects', () => {
    const html = committedTrayHTML([t()], ctx({ linkGraph: () => '<b id="lg"></b>' }));
    assert.ok(html.includes('<b id="lg"></b>'));
  });
});

describe('unscheduledListHTML', () => {
  const t = (over = {}) => ({ id: 't1', title: 'Lesson', category: '', student: '', ...over });

  it('is empty when there are no unscheduled tasks', () => {
    assert.equal(unscheduledListHTML([]), '');
  });

  it('escapes a hostile title and student name', () => {
    const html = unscheduledListHTML([t({ title: '<script>a</script>', student: '<b>S</b>' })]);
    assert.ok(!html.includes('<script>'));
    assert.ok(!html.includes('<b>S</b>'));
  });

  it('shows the student badge only when a student is set', () => {
    assert.ok(unscheduledListHTML([t({ student: 'Ada' })]).includes('🎓'));
    assert.ok(!unscheduledListHTML([t({ student: '' })]).includes('🎓'));
  });

  it('carries the category colour when the category resolves, and a neutral class otherwise', () => {
    assert.ok(unscheduledListHTML([t({ category: 'admin' })]).includes('cat-admin'));
    assert.ok(unscheduledListHTML([t({ category: 'not-a-real-category' })]).includes('cat-none'));
  });
});
