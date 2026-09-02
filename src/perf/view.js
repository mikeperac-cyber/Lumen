/* Performance & Velocity View Helpers */

export function perfStats(perfLog = []) {
  const byView = {};
  perfLog.forEach((e) => {
    if (!byView[e.view]) byView[e.view] = [];
    byView[e.view].push(e.ms);
  });
  const res = {};
  for (const [v, list] of Object.entries(byView)) {
    const sorted = [...list].sort((a, b) => a - b);
    const sum = sorted.reduce((s, x) => s + x, 0);
    const avg = (sum / sorted.length).toFixed(1);
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    res[v] = {
      count: sorted.length,
      min,
      max,
      avg,
      p50,
      p95,
      slow: perfLog.filter((e) => e.view === v && e.slow).length,
    };
  }
  return res;
}

export function calculateVelocity(tasks = []) {
  const velocityDays = [];
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    const iso = d.toLocaleDateString('en-CA');
    const label = d.toLocaleDateString(undefined, { weekday: 'narrow', month: 'numeric', day: 'numeric' });
    const count = tasks.filter((t) => t.completedAt === iso).length;
    velocityDays.push({ iso, label, count });
  }
  const maxVelocity = Math.max(1, ...velocityDays.map((v) => v.count));
  const totalDone14d = velocityDays.reduce((s, v) => s + v.count, 0);
  const avgVelocity = (totalDone14d / 14).toFixed(1);
  return { velocityDays, maxVelocity, totalDone14d, avgVelocity };
}
