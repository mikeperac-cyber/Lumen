import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { perfStats, calculateVelocity } from '../../src/perf/view.js';

describe('Performance Stats & Velocity Calculations', () => {
  it('correctly aggregates per-view render stats', () => {
    const logs = [
      { view: 'dashboard', ms: 20, slow: false },
      { view: 'dashboard', ms: 50, slow: false },
      { view: 'dashboard', ms: 120, slow: true },
      { view: 'tasks', ms: 15, slow: false },
    ];
    const stats = perfStats(logs);
    assert.equal(stats.dashboard.count, 3);
    assert.equal(stats.dashboard.slow, 1);
    assert.equal(stats.dashboard.max, 120);
    assert.equal(stats.tasks.count, 1);
    assert.equal(stats.tasks.slow, 0);
  });

  it('calculates 14-day completion velocity accurately', () => {
    const now = new Date();
    const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const tasks = [
      { id: '1', completedAt: todayISO },
      { id: '2', completedAt: todayISO },
      { id: '3', completedAt: '2020-01-01' },
    ];
    const { velocityDays, totalDone14d } = calculateVelocity(tasks);
    assert.equal(velocityDays.length, 14);
    assert.equal(totalDone14d, 2);
    assert.equal(velocityDays[13].count, 2);
  });

  it('handles empty or malformed inputs gracefully in perfStats', () => {
    assert.deepEqual(perfStats([]), {});
    assert.deepEqual(perfStats(null), {});

    const malformedLog = [
      null,
      { view: null, ms: 10 },
      { view: 'tasks', ms: 'invalid' },
      { view: 'tasks', ms: NaN },
      { view: 'tasks', ms: 15, slow: false },
    ];
    const stats = perfStats(malformedLog);
    assert.equal(stats.tasks.count, 3);
    assert.equal(stats.tasks.min, 0);
    assert.equal(stats.tasks.max, 15);
  });

  it('handles empty or malformed task arrays gracefully in calculateVelocity', () => {
    const emptyRes = calculateVelocity([]);
    assert.equal(emptyRes.velocityDays.length, 14);
    assert.equal(emptyRes.totalDone14d, 0);
    assert.equal(emptyRes.maxVelocity, 1);

    const nullTasksRes = calculateVelocity(null);
    assert.equal(nullTasksRes.velocityDays.length, 14);
    assert.equal(nullTasksRes.totalDone14d, 0);

    const malformedTasks = [
      null,
      { id: '1' },
      { id: '2', completedAt: null },
      { id: '3', completedAt: 'invalid-date' },
    ];
    const res = calculateVelocity(malformedTasks);
    assert.equal(res.totalDone14d, 0);
  });
});
