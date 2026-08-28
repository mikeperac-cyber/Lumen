// @ts-check
/* v106 — the heaviest views must be one-handed on a phone (375px). */
const { test, expect } = require('@playwright/test');

test.use({ viewport: { width: 375, height: 812 } });

const VIEWS = ['tasks', 'finance', 'students', 'schedule'];

for (const view of VIEWS) {
  test(`#${view} has no horizontal body overflow on a phone`, async ({ page }) => {
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`/#${view}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(700);
    const overflow = await page.evaluate(() => document.body.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${view} body overflows by ${overflow}px`).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
  });
}

test('kanban columns scroll and snap horizontally on a phone', async ({ page }) => {
  await page.goto('/#tasks');
  await page.waitForTimeout(600);
  const kb = page.locator('.kanban');
  const canScroll = await kb.evaluate((el) => el.scrollWidth > el.clientWidth + 10);
  expect(canScroll).toBe(true);
  const snap = await kb.evaluate((el) => getComputedStyle(el).scrollSnapType);
  expect(snap).toContain('x');
});
