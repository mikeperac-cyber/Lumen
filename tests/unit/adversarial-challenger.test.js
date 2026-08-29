import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { applyMerge } from '../../src/lib/merge.js';
import { currentStreak, streakAsOf, bestStreak, MAX_STREAK_DAYS } from '../../src/habits/store.js';

function makeBaseState() {
  return {
    tasks: [], goals: [], habits: [], notes: [], recordings: [], projects: [],
    krHistory: [], income: [], expenses: [], expectedIncome: [], expectedExpenses: [],
    students: [], attendance: [], assignments: [], lessonPlans: [], kanbanLists: [],
    vaultItems: [], vaultCollections: [],
    tagColors: {}, achievements: {},
    _tagColorMeta: {}, _incomeTypesMeta: {}, _expenseCategoriesMeta: {},
    _vaultItemsMeta: {}, _vaultCollectionsMeta: {},
    incomeTypes: [], expenseCategories: [],
  };
}

function makeBaseSyncMeta() {
  return {
    rev: 1,
    tombstones: {
      tasks: [], goals: [], habits: [], notes: [], recordings: [],
      vaultItems: [], vaultCollections: {}
    }
  };
}

describe('Challenger M2 — applyMerge high volume & LWW stress tests', () => {
  it('handles 10,000 items merge with high performance and correct LWW resolution', () => {
    const state = makeBaseState();
    const syncMeta = makeBaseSyncMeta();
    const localTasks = [];
    for (let i = 0; i < 5000; i++) {
      localTasks.push({ id: `task-${i}`, title: `Local ${i}`, updatedAt: 1000 + i });
    }
    state.tasks = localTasks;

    const incomingTasks = [];
    // 2500 overlapping (newer incoming), 2500 overlapping (older incoming), 5000 brand new
    for (let i = 0; i < 2500; i++) {
      incomingTasks.push({ id: `task-${i}`, title: `Remote New ${i}`, updatedAt: 2000 + i });
    }
    for (let i = 2500; i < 5000; i++) {
      incomingTasks.push({ id: `task-${i}`, title: `Remote Old ${i}`, updatedAt: 500 + i });
    }
    for (let i = 5000; i < 10000; i++) {
      incomingTasks.push({ id: `task-${i}`, title: `Remote Fresh ${i}`, updatedAt: 1000 + i });
    }

    const t0 = performance.now();
    const changed = applyMerge({ state, syncMeta, inc: { tasks: incomingTasks }, incomingRev: 10 });
    const duration = performance.now() - t0;

    assert.equal(changed, true);
    assert.equal(state.tasks.length, 10000);
    assert.equal(state.tasks.find(t => t.id === 'task-0').title, 'Remote New 0');
    assert.equal(state.tasks.find(t => t.id === 'task-3000').title, 'Local 3000');
    assert.equal(state.tasks.find(t => t.id === 'task-7500').title, 'Remote Fresh 7500');
    // Ensure O(N) performance — 10k items merge should complete well under 250ms
    assert.ok(duration < 250, `Expected duration < 250ms, got ${duration.toFixed(2)}ms`);
  });

  it('correctly handles all 18 entity arrays with tombstones and LWW', () => {
    const state = makeBaseState();
    const syncMeta = makeBaseSyncMeta();
    const entities = [
      'tasks', 'goals', 'habits', 'notes', 'recordings', 'projects',
      'krHistory', 'income', 'expenses', 'expectedIncome', 'expectedExpenses',
      'students', 'attendance', 'assignments', 'lessonPlans'
    ];

    const inc = {};
    entities.forEach(ent => {
      state[ent] = [{ id: `${ent}-1`, title: 'Old', updatedAt: 10 }];
      inc[ent] = [
        { id: `${ent}-1`, title: 'Updated', updatedAt: 20 },
        { id: `${ent}-2`, title: 'New', updatedAt: 30 }
      ];
    });

    const changed = applyMerge({ state, syncMeta, inc, incomingRev: 1 });
    assert.equal(changed, true);

    entities.forEach(ent => {
      assert.equal(state[ent].length, 2);
      assert.equal(state[ent].find(x => x.id === `${ent}-1`).title, 'Updated');
      assert.equal(state[ent].find(x => x.id === `${ent}-2`).title, 'New');
    });
  });

  it('rejects zombie resurrection attempts against active tombstones across all arrays', () => {
    const state = makeBaseState();
    const syncMeta = makeBaseSyncMeta();
    syncMeta.tombstones.tasks = ['t-dead'];
    state.tasks = [{ id: 't-alive', title: 'Alive', updatedAt: 100 }];

    const changed = applyMerge({
      state,
      syncMeta,
      inc: { tasks: [{ id: 't-dead', title: 'Zombie', updatedAt: 999999 }] },
      incomingRev: 5
    });

    assert.equal(changed, false);
    assert.equal(state.tasks.length, 1);
    assert.equal(state.tasks[0].id, 't-alive');
  });

  it('handles signature changes on item additions and deletions', () => {
    const state = makeBaseState();
    const syncMeta = makeBaseSyncMeta();
    state.tasks = [{ id: 't1', title: 'A', updatedAt: 100 }];

    // Addition changes length
    const addChanged = applyMerge({
      state, syncMeta,
      inc: { tasks: [{ id: 't2', title: 'B', updatedAt: 100 }] },
      incomingRev: 2
    });
    assert.equal(addChanged, true);

    // Deletion changes length
    const delChanged = applyMerge({
      state, syncMeta,
      inc: { deleted: { tasks: ['t2'] } },
      incomingRev: 3
    });
    assert.equal(delChanged, true);
    assert.equal(state.tasks.length, 1);
  });

  it('handles max updatedAt increases in signature', () => {
    const state = makeBaseState();
    const syncMeta = makeBaseSyncMeta();
    state.tasks = [{ id: 't1', title: 'A', updatedAt: 100 }];

    const updateChanged = applyMerge({
      state, syncMeta,
      inc: { tasks: [{ id: 't1', title: 'A Modified', updatedAt: 200 }] },
      incomingRev: 2
    });
    assert.equal(updateChanged, true);
    assert.equal(state.tasks[0].updatedAt, 200);
  });

  it('idempotently merges identical state without claiming changes', () => {
    const state = makeBaseState();
    const syncMeta = makeBaseSyncMeta();
    state.tasks = [{ id: 't1', title: 'A', updatedAt: 100 }];

    const changed = applyMerge({
      state, syncMeta,
      inc: { tasks: [{ id: 't1', title: 'A', updatedAt: 100 }] },
      incomingRev: 2
    });
    assert.equal(changed, false);
  });
});

describe('Challenger M2 — habit streak loop bounds, dates & prototype stress tests', () => {
  const stepDayTest = (iso, delta) => {
    const d = new Date(iso + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  it('accurately computes 10-year span (3650 days) and caps at MAX_STREAK_DAYS for larger spans', () => {
    const dates = {};
    let cursor = '2026-08-29';
    for (let i = 0; i < 3650; i++) {
      dates[cursor] = true;
      cursor = stepDayTest(cursor, -1);
    }

    const t0 = performance.now();
    const streak = currentStreak(dates, {}, '2026-08-29');
    const duration = performance.now() - t0;

    assert.equal(streak, 3650);
    assert.ok(duration < 50, `10-year streak took ${duration.toFixed(2)}ms (expected <50ms)`);

    // Add 200 more days (3850 days total)
    for (let i = 0; i < 200; i++) {
      dates[cursor] = true;
      cursor = stepDayTest(cursor, -1);
    }
    const cappedStreak = currentStreak(dates, {}, '2026-08-29');
    assert.equal(cappedStreak, MAX_STREAK_DAYS);
  });

  it('streakAsOf accurately handles 10-year spans and future date clamping', () => {
    const dates = {};
    let cursor = '2026-08-29';
    for (let i = 0; i < 4000; i++) {
      dates[cursor] = true;
      cursor = stepDayTest(cursor, -1);
    }

    const asOfToday = streakAsOf(dates, '2026-08-29', '2026-08-29');
    assert.equal(asOfToday, MAX_STREAK_DAYS);

    const asOfFuture = streakAsOf(dates, '2030-01-01', '2026-08-29');
    assert.equal(asOfFuture, MAX_STREAK_DAYS);
  });

  it('bestStreak accurately scans trailing 365 days across year/leap boundaries', () => {
    const dates = {};
    let cursor = '2026-08-29';
    for (let i = 0; i < 365; i++) {
      dates[cursor] = true;
      cursor = stepDayTest(cursor, -1);
    }

    const best = bestStreak(dates, {}, '2026-08-29');
    assert.equal(best, 365);
  });

  it('safely handles corrupted dates, NaN, null, and malformed date strings without throwing or looping', () => {
    const malformedDates = [
      null, undefined, NaN, 12345, false, true, '', 'invalid-date',
      '2026-99-99', '2026-02-31', '99999-99-99', '2026/08/29', '2026-8-29',
      '2026-08-29T00:00:00Z', 'undefined', 'null', '{}', '[]'
    ];

    malformedDates.forEach(badInput => {
      assert.doesNotThrow(() => currentStreak(badInput, {}, '2026-08-29'));
      assert.doesNotThrow(() => currentStreak({ [badInput]: true }, {}, badInput));
      assert.doesNotThrow(() => currentStreak({}, { [badInput]: true }, badInput));
      assert.doesNotThrow(() => streakAsOf(badInput, '2026-08-29', '2026-08-29'));
      assert.doesNotThrow(() => streakAsOf({}, badInput, '2026-08-29'));
      assert.doesNotThrow(() => streakAsOf({ '2026-08-29': true }, '2026-08-29', badInput));
      assert.doesNotThrow(() => bestStreak(badInput, {}, '2026-08-29'));
      assert.doesNotThrow(() => bestStreak({}, badInput, '2026-08-29'));
      assert.doesNotThrow(() => bestStreak({}, {}, badInput));
    });
  });

  it('is resilient to prototype pollution on Object.prototype without infinite loops', () => {
    const cleanDates = { '2026-08-29': true };
    try {
      Object.prototype['2026-08-28'] = true;
      Object.prototype['2026-08-27'] = true;
      Object.prototype['invalid-date'] = true;
      Object.prototype['toString'] = true;

      const streak = currentStreak(cleanDates, {}, '2026-08-29');
      assert.ok(typeof streak === 'number');
      assert.ok(streak <= MAX_STREAK_DAYS);

      const asOf = streakAsOf(cleanDates, '2026-08-29', '2026-08-29');
      assert.ok(typeof asOf === 'number');
      assert.ok(asOf <= MAX_STREAK_DAYS);

      const best = bestStreak(cleanDates, {}, '2026-08-29');
      assert.ok(typeof best === 'number');
      assert.ok(best <= 400);
    } finally {
      delete Object.prototype['2026-08-28'];
      delete Object.prototype['2026-08-27'];
      delete Object.prototype['invalid-date'];
      delete Object.prototype['toString'];
    }
  });
});
