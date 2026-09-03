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
    const todayISO = new Date().toLocaleDateString('en-CA');
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
});
