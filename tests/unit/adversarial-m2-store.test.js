import { describe, it, expect } from 'vitest';
import { applyMerge } from '../../src/lib/merge.js';
import { currentStreak, streakAsOf, bestStreak, MAX_STREAK_DAYS } from '../../src/habits/store.js';

describe('Empirical Verification: merge.js signature and O(N) performance', () => {
  function createLargeState(numTasks = 2000) {
    const now = Date.now();
    const tasks = Array.from({ length: numTasks }, (_, i) => ({
      id: 'task_' + i,
      title: 'Task Item ' + i,
      desc: 'Description for task ' + i,
      status: i % 4 === 0 ? 'today' : 'backlog',
      priority: ['low', 'med', 'high'][i % 3],
      tags: ['perf', 'stress', 'tag' + (i % 10)],
      createdAt: now - i * 500,
      updatedAt: now - i * 500,
    }));
    return {
      tasks,
      goals: [],
      habits: [],
      notes: [],
      recordings: [],
      projects: [],
      krHistory: [],
      income: [],
      expenses: [],
      expectedIncome: [],
      expectedExpenses: [],
      students: [],
      attendance: [],
      assignments: [],
      lessonPlans: [],
      kanbanLists: [],
      tagColors: {},
      achievements: {},
      _tagColorMeta: {},
      _incomeTypesMeta: {},
      _expenseCategoriesMeta: {},
      incomeTypes: [],
      expenseCategories: [],
    };
  }

  it('evaluates applyMerge on 2,000 items under 50ms budget', () => {
    const state = createLargeState(2000);
    const syncMeta = { rev: 1, tombstones: { tasks: [], goals: [], habits: [], notes: [], recordings: [] } };
    const incomingTasks = [
      { id: 'task_50', title: 'Task Item 50 Updated', updatedAt: Date.now() + 1000 },
      { id: 'task_new_9999', title: 'Brand New Task', updatedAt: Date.now() + 2000 },
    ];

    const t0 = performance.now();
    const changed = applyMerge({
      state,
      syncMeta,
      inc: { tasks: incomingTasks },
      incomingRev: 2,
    });
    const elapsed = performance.now() - t0;

    expect(changed).toBe(true);
    expect(state.tasks.length).toBe(2001);
    expect(elapsed).toBeLessThan(50); // Budget: <50ms for 2,000 items
  });

  it('evaluates state signature without mutations (no-op merge) under 25ms', () => {
    const state = createLargeState(2000);
    const syncMeta = { rev: 1, tombstones: { tasks: [], goals: [], habits: [], notes: [], recordings: [] } };

    const t0 = performance.now();
    const changed = applyMerge({
      state,
      syncMeta,
      inc: { tasks: [] },
      incomingRev: 2,
    });
    const elapsed = performance.now() - t0;

    expect(changed).toBe(false);
    expect(elapsed).toBeLessThan(25);
  });
});

describe('Empirical Verification: habits store bounds & adversarial inputs', () => {
  const TODAY = '2026-08-29';

  it('caps streak calculation at MAX_STREAK_DAYS (3650) without infinite loops', () => {
    // Generate an unbroken 10,000 day streak
    const dates = {};
    const d = new Date(2026, 7, 29);
    for (let i = 0; i < 10000; i++) {
      const cur = new Date(d);
      cur.setDate(d.getDate() - i);
      const iso = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
      dates[iso] = true;
    }

    const t0 = performance.now();
    const streak = currentStreak(dates, {}, TODAY);
    const elapsed = performance.now() - t0;

    expect(streak).toBe(MAX_STREAK_DAYS);
    expect(elapsed).toBeLessThan(50); // Bounded execution
  });

  it('handles malformed, cyclic, and non-date strings gracefully', () => {
    expect(currentStreak({ 'invalid-date': true }, {}, 'invalid-today')).toBe(0);
    expect(streakAsOf({ 'foo': true }, 'invalid-end', 'invalid-today')).toBe(0);
    expect(bestStreak({ 'bar': true }, {}, 'invalid-today')).toBe(0);
  });

  it('handles null, undefined, and non-object parameters without throwing', () => {
    expect(() => currentStreak(null, null, null)).not.toThrow();
    expect(() => streakAsOf(null, null, null)).not.toThrow();
    expect(() => bestStreak(null, null, null)).not.toThrow();
  });
});
