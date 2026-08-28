// @ts-check
/* v106 — Weekly Review ritual (Shipped / Slipped / Protect next week) + Brief hand-off. */
const { test, expect } = require('@playwright/test');

test('reviewCtx exposes slipped items and protect candidates', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const now = Date.now();
    const iso = (d) => new Date(d).toISOString().slice(0, 10);
    state.tasks = [{ id: 'od1', title: 'Overdue thing', status: 'today', due: iso(now - 2 * 864e5), createdAt: now, updatedAt: now }];
    state.habits = [{ id: 'h1', emoji: '📚', name: 'Read', color: '#605dff', dates: {}, createdAt: now - 20 * 864e5, freqType: 'daily' }];
    save(); flushSave();
  });
  await page.goto('/#review');
  await page.waitForTimeout(500);
  const ctx = await page.evaluate(() => {
    const c = reviewCtx(0);
    return { slippedTasks: c.slipped.tasks.length, slippedHabits: c.slipped.habits.length, candidates: c.protectCandidates.length };
  });
  expect(ctx.slippedTasks).toBeGreaterThan(0);
  expect(ctx.slippedHabits).toBeGreaterThan(0);
  expect(ctx.candidates).toBeGreaterThan(0);
  await page.evaluate(() => { state.tasks = []; state.habits = []; save(); flushSave(); });
});
