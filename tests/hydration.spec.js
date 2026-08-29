// @ts-check
// load() paints the shell, then defers hydration to requestIdleCallback so first
// paint is not blocked. Everything init() does after load() — applyTheme(),
// renderView() — therefore runs against DEFAULT state. Hydration must re-apply
// both, or a reload shows an empty app with the wrong theme until you navigate.
const { test, expect } = require('@playwright/test');

async function seedAndReload(page) {
  await page.goto('/#tasks', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.state === 'object' && window.state !== null);
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    const now = Date.now();
    state.tasks = [{ id: 'hyd1', title: 'Survives hydration', status: 'today', priority: 'med', tags: [], subtasks: [], createdAt: now, updatedAt: now }];
    state.settings.theme = 'nord';
    save();
  });
  await page.evaluate(() => window.flushSave && window.flushSave());
  await page.waitForTimeout(400);
  await page.reload({ waitUntil: 'domcontentloaded' });
}

test('hydrated state is rendered without navigating away and back', async ({ page }) => {
  await seedAndReload(page);
  await expect(page.locator('.task-card').filter({ hasText: 'Survives hydration' })).toBeVisible({ timeout: 5000 });
});

test('hydrated theme is applied without navigating away and back', async ({ page }) => {
  await seedAndReload(page);
  await expect.poll(
    () => page.evaluate(() => document.documentElement.dataset.theme),
    { timeout: 5000 }
  ).toBe('nord');
});
