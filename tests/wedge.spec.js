// @ts-check
/* v105 Teaching Wedge Weave — student FK, goal↔student links, per-student finance. */
const { test, expect } = require('@playwright/test');

test('legacy income is FK-linked to a student on load', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    state.students = [{ id: 's-caner', name: 'Caner Yilmaz', currency: 'TRY', rate: 1500, status: 'active', level: 'IELTS' }];
    state.income = [{ id: 'i1', student: 'Caner Yilmaz', amount: 1500, currency: 'TRY', date: '2026-08-01' }];
    save();
  });
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(700);
  const sid = await page.evaluate(() => state.income[0].studentId);
  expect(sid).toBe('s-caner');
  await page.evaluate(() => { state.students = []; state.income = []; save(); });
});

test('goal modal links students and persists linkedStudentIds', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    state.students = [{ id: 's-ana', name: 'Ana', status: 'active', currency: 'USD', rate: 35, level: 'ESL' }];
    state.goals = [];
    save();
  });
  await page.goto('/#goals');
  await page.waitForTimeout(400);
  await page.evaluate(() => openGoalModal());
  await page.waitForTimeout(300);
  await page.fill('#g-title', 'IELTS 8.0');
  await page.click('.g-student-toggle[data-sid="s-ana"]');
  await page.click('#g-save');
  await page.waitForTimeout(400);
  const linked = await page.evaluate(() => state.goals[0].linkedStudentIds);
  expect(linked).toEqual(['s-ana']);
  // chip renders on the card
  await page.waitForTimeout(200);
  expect(await page.locator('.goal-card .chip-student').innerText()).toContain('Ana');
  await page.evaluate(() => { state.students = []; state.goals = []; save(); });
});

test('an income entry with an unknown student name still renders without error', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    state.students = [];
    state.income = [{ id: 'i9', student: 'Ghost Student', amount: 99, currency: 'USD', date: '2026-08-01' }];
    save();
  });
  await page.reload();
  await page.waitForTimeout(500);
  await page.goto('/#finance');
  await page.waitForTimeout(500);
  const sid = await page.evaluate(() => state.income[0].studentId);
  expect(sid).toBeUndefined();
  expect(errors).toEqual([]);
  await page.evaluate(() => { state.income = []; save(); });
});
