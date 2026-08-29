// @ts-check
// Contract tests for the ESM cutover. app.js is loaded as <script type="module">, so
// nothing in it is global by accident: inline handlers cannot resolve its functions,
// and a `window.x = x` shim snapshots the VALUE, going stale the moment the module
// rebinds `x`. Both failure modes are silent, so they are pinned here.
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

async function boot(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/');
  await page.waitForFunction(() => typeof window.state === 'object' && window.state !== null);
  return errors;
}

test('no inline handler in app.js depends on a module-scoped function', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  // `event` is supplied by the inline-handler scope chain, so it is allowed.
  // Anything else named here must resolve on `window`, which module scope breaks.
  const offenders = (src.match(/onclick="(?:(?!event\.)[^"])*?[A-Za-z_$][\w$]*\s*\(/g) || []);
  expect(offenders).toEqual([]);
});

test('task modal: close button dismisses the modal and raises no error', async ({ page }) => {
  const errors = await boot(page);
  await page.evaluate(() => { location.hash = '#tasks'; });
  await page.waitForTimeout(400);
  await page.keyboard.press('n');
  await expect(page.locator('#modal-root .modal')).toBeVisible();

  const closer = page.locator('#modal-root [data-close-modal]').first();
  await expect(closer).toHaveCount(1);
  await closer.click();

  await expect(page.locator('#modal-root .modal')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('goal modal: close button dismisses the modal and raises no error', async ({ page }) => {
  const errors = await boot(page);
  await page.evaluate(() => { location.hash = '#goals'; });
  await page.waitForTimeout(400);
  await page.evaluate(() => window.__LUMEN_TEST.openGoalModal());
  await expect(page.locator('#modal-root .modal')).toBeVisible();

  await page.locator('#modal-root [data-close-modal]').first().click();

  await expect(page.locator('#modal-root .modal')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('window.state tracks reassignment of the module binding', async ({ page }) => {
  await boot(page);
  // performUndo does `state = JSON.parse(prev)`, rebinding the module-scoped variable.
  // A snapshot shim would leave window.state pointing at the pre-undo object.
  const result = await page.evaluate(() => {
    window.state.tasks = [{ id: 'a', title: 'before', status: 'backlog', createdAt: 1, updatedAt: 1 }];
    window.__LUMEN_TEST.captureUndo('probe');
    window.state.tasks.push({ id: 'b', title: 'after', status: 'backlog', createdAt: 2, updatedAt: 2 });
    const beforeUndo = window.state.tasks.length;
    window.__LUMEN_TEST.performUndo();
    return { beforeUndo, afterUndo: window.state.tasks.length };
  });
  expect(result.beforeUndo).toBe(2);
  expect(result.afterUndo).toBe(1);
});
