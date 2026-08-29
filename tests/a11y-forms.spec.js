// @ts-check
// Every visible <label> in the app sits next to its input as a sibling, associated
// only by proximity — none of the app's 98 <label> elements used `for`. A screen
// reader announces such an input with no name at all. This sweeps every form surface
// the app can open and asserts each visible label resolves to a real control, either
// by `for`/id or by wrapping it.
const { test, expect } = require('@playwright/test');

async function boot(page) {
  await page.goto('/');
  await page.waitForFunction(() => typeof window.state === 'object' && window.state !== null);
  await page.waitForTimeout(400);
}

/**
 * A label is associated if it wraps its control, if `for` resolves to a real element,
 * or — for a label naming a GROUP of controls (a swatch picker, a checkbox grid, a
 * repeatable list) rather than one field — if the label carries an `id` that some
 * element references via `aria-labelledby` (the `role="group"` pattern; `for` has no
 * meaning when there is no single control to point it at).
 * @returns {Promise<string[]>} descriptions of labels with no resolvable control
 */
async function unassociatedLabels(page, scope) {
  return page.evaluate((sel) => {
    const root = document.querySelector(sel) || document;
    const bad = [];
    for (const label of root.querySelectorAll('label')) {
      if (!label.offsetParent && label.getClientRects().length === 0) continue; // hidden
      if (label.querySelector('input, select, textarea')) continue;
      const forId = label.getAttribute('for');
      if (forId && document.getElementById(forId)) continue;
      if (label.id && document.querySelector(`[aria-labelledby~="${label.id}"]`)) continue;
      bad.push(`"${label.textContent.trim().slice(0, 40)}" for="${forId}"`);
    }
    return bad;
  }, scope);
}

test('goal modal: every label resolves to a real control', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => window.__LUMEN_TEST.openGoalModal());
  await page.waitForTimeout(200);
  expect(await unassociatedLabels(page, '#modal-root')).toEqual([]);
});

test('new task modal: every label resolves to a real control', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => { location.hash = '#tasks'; });
  await page.waitForTimeout(300);
  await page.keyboard.press('n');
  await page.waitForTimeout(200);
  expect(await unassociatedLabels(page, '#modal-root')).toEqual([]);
});

test('vault item modal: every label resolves to a real control', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => window.LumenLib.vault.openVaultModal());
  await page.waitForTimeout(200);
  expect(await unassociatedLabels(page, '#modal-root')).toEqual([]);
});

test('student edit modal: every label resolves to a real control', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => { location.hash = '#students'; });
  await page.waitForTimeout(400);
  await page.evaluate(() => window.__LUMEN_TEST.openStudentEditModal(null));
  await page.waitForTimeout(200);
  expect(await unassociatedLabels(page, '#modal-root')).toEqual([]);
});

test('settings view: every label resolves to a real control', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => { location.hash = '#settings'; });
  await page.waitForTimeout(400);
  expect(await unassociatedLabels(page, '#view-root')).toEqual([]);
});

test('personal schedule interval modal: every label resolves to a real control', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => { location.hash = '#schedule'; });
  await page.waitForTimeout(400);
  await page.click('#sched-intervals');
  await page.waitForTimeout(200);
  expect(await unassociatedLabels(page, '#modal-root')).toEqual([]);
});

test('every table header cell declares which column it heads', async ({ page }) => {
  await boot(page);
  const views = ['finance', 'students', 'analytics'];
  const bad = [];
  for (const v of views) {
    await page.evaluate((view) => { location.hash = '#' + view; }, v);
    await page.waitForTimeout(400);
    const found = await page.evaluate(() =>
      [...document.querySelectorAll('table th')].filter((th) => !th.getAttribute('scope')).length);
    if (found) bad.push(`${v}: ${found} <th> with no scope`);
  }
  expect(bad).toEqual([]);
});
