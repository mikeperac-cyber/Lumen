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
