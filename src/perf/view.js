/* Performance & Velocity View Helpers - Optimized O(N) calculations */

export function perfStats(perfLog = []) {
  const byView = {};
  const slowCountByView = {};

  // Single pass through perfLog to gather measurements and count slow entries
  for (let i = 0; i < perfLog.length; i++) {
    const entry = perfLog[i];
    const v = entry.view;
    if (!byView[v]) {
      byView[v] = [];
      slowCountByView[v] = 0;
    }
    byView[v].push(entry.ms);
    if (entry.slow) {
      slowCountByView[v]++;
    }
  }

  const res = {};
  for (const [v, sorted] of Object.entries(byView)) {
    sorted.sort((a, b) => a - b);
    const len = sorted.length;
    let sum = 0;
    for (let i = 0; i < len; i++) {
      sum += sorted[i];
    }
    const avg = Math.round((sum / len) * 10) / 10;
    const p50 = sorted[Math.floor(len * 0.5)];
    const p95 = sorted[Math.floor(len * 0.95)];
    const min = sorted[0];
    const max = sorted[len - 1];

    res[v] = {
      count: len,
      min,
      max,
      avg,
      p50,
      p95,
      slow: slowCountByView[v] || 0,
    };
  }
  return res;
}

export function calculateVelocity(tasks = []) {
  const velocityDays = [];
  const dayMap = {};
  const now = new Date();

  // Pre-populate 14 days in dayMap and array
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    const iso = d.toLocaleDateString('en-CA');
    const label = d.toLocaleDateString(undefined, { weekday: 'narrow', month: 'numeric', day: 'numeric' });
    const dayObj = { iso, label, count: 0 };
    velocityDays.push(dayObj);
    dayMap[iso] = dayObj;
  }

  // Single pass through tasks to count completions
  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];
    if (t.completedAt && dayMap[t.completedAt]) {
      dayMap[t.completedAt].count++;
    }
  }

  const maxVelocity = Math.max(1, ...velocityDays.map((v) => v.count));
  const totalDone14d = velocityDays.reduce((s, v) => s + v.count, 0);
  const avgVelocity = (totalDone14d / 14).toFixed(1);
  return { velocityDays, maxVelocity, totalDone14d, avgVelocity };
}
