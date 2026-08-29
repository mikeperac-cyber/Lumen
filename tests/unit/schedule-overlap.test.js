import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { timeOverlaps, DEFAULT_BLOCK_MIN, buildWeekDays, buildScheduleGrid } from '../../src/lib/schedule.js';

/* Drives the "⚠ Overlap" warning on the timetable. A false negative means the user
   is silently double-booked; a false positive nags about lessons that are fine. */

const at = (startTime, endTime) => ({ startTime, endTime });

describe('timeOverlaps', () => {
  it('is false unless both entries have a start time', () => {
    assert.equal(timeOverlaps(at('', ''), at('09:00', '10:00')), false);
    assert.equal(timeOverlaps(at('09:00', '10:00'), at('', '')), false);
  });

  it('detects a genuine clash', () => {
    assert.equal(timeOverlaps(at('09:00', '10:00'), at('09:30', '10:30')), true);
  });

  it('treats back-to-back blocks as clear, not clashing', () => {
    // 09:00-10:00 then 10:00-11:00 is a normal timetable, not a double-booking.
    assert.equal(timeOverlaps(at('09:00', '10:00'), at('10:00', '11:00')), false);
  });

  it('leaves separated blocks alone', () => {
    assert.equal(timeOverlaps(at('09:00', '10:00'), at('14:00', '15:00')), false);
  });

  it('assumes a default block length when an end time is missing', () => {
    // A lesson with no end time still occupies the room for a while.
    assert.equal(DEFAULT_BLOCK_MIN, 50);
    assert.equal(timeOverlaps(at('09:00', ''), at('09:40', '10:00')), true);
    assert.equal(timeOverlaps(at('09:00', ''), at('09:50', '10:00')), false);
  });

  it('is symmetric', () => {
    const pairs = [['09:00', '10:00', '09:30', '10:30'], ['09:00', '', '09:40', ''], ['09:00', '10:00', '10:00', '11:00']];
    for (const [as, ae, bs, be] of pairs) {
      assert.equal(timeOverlaps(at(as, ae), at(bs, be)), timeOverlaps(at(bs, be), at(as, ae)), `${as}-${ae} vs ${bs}-${be}`);
    }
  });

  it('handles times either side of midday without hour-string confusion', () => {
    assert.equal(timeOverlaps(at('11:30', '12:30'), at('12:00', '13:00')), true);
    assert.equal(timeOverlaps(at('08:05', '08:55'), at('09:00', '09:50')), false);
  });
});

describe('buildWeekDays', () => {
  const DAYS7 = [
    { id: 'mon', label: 'Mon' }, { id: 'tue', label: 'Tue' }, { id: 'wed', label: 'Wed' },
    { id: 'thu', label: 'Thu' }, { id: 'fri', label: 'Fri' }, { id: 'sat', label: 'Sat' }, { id: 'sun', label: 'Sun' },
  ];
  // Monday 2026-08-24 through Sunday 2026-08-30.
  const monday = new Date(2026, 7, 24);

  it('returns one entry per day, Monday through Sunday, in order', () => {
    const week = buildWeekDays(monday, DAYS7, '2026-01-01');
    assert.equal(week.length, 7);
    assert.deepEqual(week.map((d) => d.id), ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
    assert.equal(week[0].dateStr, '2026-08-24');
    assert.equal(week[6].dateStr, '2026-08-30');
  });

  it('marks only the day matching today, by date not by weekday name', () => {
    const week = buildWeekDays(monday, DAYS7, '2026-08-26');
    assert.deepEqual(week.map((d) => d.isToday), [false, false, true, false, false, false, false]);
  });

  it('marks no day today when today falls in a different week', () => {
    const week = buildWeekDays(monday, DAYS7, '2026-09-15');
    assert.ok(week.every((d) => !d.isToday));
  });

  it('carries the day number and short month for display', () => {
    const week = buildWeekDays(monday, DAYS7, '');
    assert.equal(week[0].dayNum, 24);
    assert.equal(week[0].monthShort, 'Aug');
    assert.equal(week[0].fullLabel, 'Mon 24');
  });

  it('rolls the month over correctly at a month boundary', () => {
    // Monday 2026-08-31 -> the week runs into September.
    const week = buildWeekDays(new Date(2026, 7, 31), DAYS7, '');
    assert.equal(week[0].dateStr, '2026-08-31');
    assert.equal(week[1].dateStr, '2026-09-01');
    assert.equal(week[1].monthShort, 'Sep');
  });
});

describe('buildScheduleGrid', () => {
  const PERIODS2 = [{ id: 'p1', label: 'P1' }, { id: 'p2', label: 'P2' }];
  const DAYS2 = [{ id: 'mon', label: 'Mon' }, { id: 'tue', label: 'Tue' }];
  const t = (over) => ({ id: 'x', startTime: '', endTime: '', ...over });

  it('creates an empty bucket for every period and day, even with no tasks', () => {
    const { grid } = buildScheduleGrid([], PERIODS2, DAYS2);
    for (const p of PERIODS2) for (const d of DAYS2) assert.deepEqual(grid[p.id][d.id], []);
  });

  it('files a task under its own day and period', () => {
    const task = t({ id: 'a', scheduleDay: 'tue', schedulePeriod: 'p2' });
    const { grid } = buildScheduleGrid([task], PERIODS2, DAYS2);
    assert.deepEqual(grid.p2.tue, [task]);
    assert.deepEqual(grid.p1.mon, []);
  });

  it('defaults an unscheduled day or period to Monday / period 1', () => {
    const task = t({ id: 'a' });
    const { grid } = buildScheduleGrid([task], PERIODS2, DAYS2);
    assert.deepEqual(grid.p1.mon, [task]);
  });

  it('drops a task addressed to a period or day that no longer exists', () => {
    const task = t({ id: 'a', scheduleDay: 'mon', schedulePeriod: 'p99' });
    const { grid } = buildScheduleGrid([task], PERIODS2, DAYS2);
    assert.ok(!Object.values(grid).some((byDay) => Object.values(byDay).some((cell) => cell.includes(task))));
  });

  it('flags only the tasks that actually clash within a cell', () => {
    const a = t({ id: 'a', scheduleDay: 'mon', schedulePeriod: 'p1', startTime: '09:00', endTime: '10:00' });
    const b = t({ id: 'b', scheduleDay: 'mon', schedulePeriod: 'p1', startTime: '09:30', endTime: '10:30' });
    const c = t({ id: 'c', scheduleDay: 'mon', schedulePeriod: 'p1', startTime: '14:00', endTime: '15:00' });
    const { overlapIds } = buildScheduleGrid([a, b, c], PERIODS2, DAYS2);
    assert.deepEqual([...overlapIds].sort(), ['a', 'b']);
  });

  it('never flags tasks that only share a day, not a period', () => {
    const a = t({ id: 'a', scheduleDay: 'mon', schedulePeriod: 'p1', startTime: '09:00', endTime: '10:00' });
    const b = t({ id: 'b', scheduleDay: 'mon', schedulePeriod: 'p2', startTime: '09:00', endTime: '10:00' });
    const { overlapIds } = buildScheduleGrid([a, b], PERIODS2, DAYS2);
    assert.equal(overlapIds.size, 0);
  });
});
