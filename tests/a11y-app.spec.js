// @ts-check
// Accessibility of the app shell — the parts outside a dialog. B3 (v117) covered
// modals and the command palette; everything a screen-reader user meets before
// opening one was untouched: no landmark names, no indication of which view is
// current, and toasts that appeared silently.
const { test, expect } = require('@playwright/test');

async function boot(page) {
  await page.goto('/');
  await page.waitForFunction(() => typeof window.state === 'object' && window.state !== null);
  await page.waitForTimeout(400);
}

test('the primary navigation is a named landmark', async ({ page }) => {
  await boot(page);
  const nav = page.locator('nav').first();
  await expect(nav).toHaveAttribute('aria-label', /\S/);
});

test('the sidebar does not present the main navigation as complementary content', async ({ page }) => {
  await boot(page);
  // <aside> maps to role="complementary" — "tangentially related". Wrapping the app's
  // primary navigation in one tells assistive tech the opposite of the truth.
  const wrapped = await page.evaluate(() =>
    !!document.querySelector('nav')?.closest('aside, [role="complementary"]'));
  expect(wrapped).toBe(false);
});

test('exactly one nav item is marked as the current page, and it follows navigation', async ({ page }) => {
  await boot(page);
  const current = () => page.evaluate(() =>
    [...document.querySelectorAll('.nav-item[aria-current="page"]')].map((b) => b.dataset.view));

  await page.evaluate(() => { location.hash = '#tasks'; });
  await page.waitForTimeout(400);
  expect(await current()).toEqual(['tasks']);

  await page.evaluate(() => { location.hash = '#habits'; });
  await page.waitForTimeout(400);
  expect(await current()).toEqual(['habits']);
});

test('the main content region is named by the view it is showing', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => { location.hash = '#notes'; });
  await page.waitForTimeout(400);
  const named = await page.evaluate(() => {
    const root = document.getElementById('view-root');
    const id = root.getAttribute('aria-labelledby');
    const label = id && document.getElementById(id);
    return { id, text: label ? label.textContent.trim() : null };
  });
  expect(named.id).toBeTruthy();
  expect(named.text).toBe('Notes');
});

test('toasts are announced rather than appearing silently', async ({ page }) => {
  await boot(page);
  const root = page.locator('#toast-root');
  await expect(root).toHaveAttribute('aria-live', /polite|assertive/);
  await expect(root).toHaveAttribute('role', /status|alert|log/);

  // The live region must already exist when the toast lands inside it — a region
  // created at the same time as its content is not reliably announced.
  await page.evaluate(() => window.__LUMEN_TEST.toast('Saved to the vault'));
  await expect(page.locator('#toast-root .toast')).toHaveText('Saved to the vault');
});
