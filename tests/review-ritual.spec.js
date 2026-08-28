// @ts-check
/* v106 — Weekly Review ritual (Shipped / Slipped / Protect next week) + Brief hand-off. */
const { test, expect } = require('@playwright/test');

test('weekly review ritual: start → protect a habit → commit persists', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const now = Date.now();
    const iso = (d) => new Date(d).toISOString().slice(0, 10);
    state.habits = [{ id: 'h1', emoji: '📚', name: 'Read', color: '#605dff', dates: {}, createdAt: now - 20 * 864e5, freqType: 'daily' }];
    state.tasks = [{ id: 'od1', title: 'Slipped', status: 'today', due: iso(now - 2 * 864e5), createdAt: now, updatedAt: now }];
    if (!state.settings) state.settings = {};
    delete state.settings.reviewCommit;
    save(); flushSave();
  });
  await page.goto('/#review');
  await page.waitForTimeout(500);
  await page.click('#ritual-start');
  await page.waitForTimeout(200);
  await page.click('#ritual-next');   // Shipped -> Slipped
  await page.waitForTimeout(150);
  await page.click('#ritual-next');   // Slipped -> Protect
  await page.waitForTimeout(150);
  await page.click('.protect-pick[data-kind="habit"][data-id="h1"]');
  await page.click('#ritual-finish');
  await page.waitForTimeout(300);
  const rc = await page.evaluate(() => state.settings.reviewCommit);
  expect(rc.habitIds).toContain('h1');
  expect(rc.weekStart).toBeTruthy();
  await page.evaluate(() => { state.habits = []; state.tasks = []; delete state.settings.reviewCommit; save(); flushSave(); });
});

test('protected tasks from the weekly review lead the Brief candidates', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const now = Date.now();
    state.tasks = [
      { id: 'a', title: 'Ordinary backlog', status: 'backlog', priority: 'high', due: '', createdAt: now, updatedAt: now, subtasks: [] },
      { id: 'b', title: 'Protected carryover', status: 'backlog', priority: 'low', due: '', createdAt: now, updatedAt: now, subtasks: [] },
    ];
    if (!state.settings) state.settings = {};
    state.settings.reviewCommit = { weekStart: 'x', taskIds: ['b'], habitIds: [], goalIds: [], at: now };
    save(); flushSave();
  });
  await page.goto('/#brief');
  await page.waitForTimeout(500);
  const first = await page.evaluate(() => getBriefCandidates()[0].title);
  expect(first).toBe('Protected carryover');
  await page.evaluate(() => { state.tasks = []; delete state.settings.reviewCommit; save(); flushSave(); });
});

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
