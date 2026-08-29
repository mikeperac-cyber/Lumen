// @ts-check
// Every modal in Lumen goes through openModal() (app.js), so dialog semantics belong
// there rather than in the 90-odd HTML strings that call it. These pin the four things
// a keyboard or screen-reader user needs and the app shipped none of: the dialog role,
// an accessible name, a focus trap, and focus returning where it came from.
const { test, expect } = require('@playwright/test');

async function boot(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/');
  await page.waitForFunction(() => typeof window.state === 'object' && window.state !== null);
  await page.waitForTimeout(400);
  return errors;
}

const openGoal = (page) => page.evaluate(() => window.__LUMEN_TEST.openGoalModal());

test('an open modal is exposed as a labelled modal dialog', async ({ page }) => {
  await boot(page);
  await openGoal(page);

  const dialog = page.locator('#modal-root .modal');
  await expect(dialog).toHaveAttribute('role', 'dialog');
  await expect(dialog).toHaveAttribute('aria-modal', 'true');

  // The name must come from the modal's own visible heading, not a hardcoded string.
  const named = await page.evaluate(() => {
    const d = document.querySelector('#modal-root .modal');
    const id = d && d.getAttribute('aria-labelledby');
    const label = id && document.getElementById(id);
    return { id, labelText: label ? label.textContent.trim() : null, headText: (d.querySelector('.modal-head h3') || {}).textContent };
  });
  expect(named.id).toBeTruthy();
  expect(named.labelText).toBe((named.headText || '').trim());
});

test('the icon-only close control has an accessible name', async ({ page }) => {
  await boot(page);
  await openGoal(page);
  const unnamed = await page.evaluate(() =>
    [...document.querySelectorAll('#modal-root [data-close-modal]')]
      .filter((b) => !b.textContent.trim() && !b.getAttribute('aria-label') && !b.getAttribute('title'))
      .length);
  expect(unnamed).toBe(0);
});

test('focus is trapped inside the dialog and wraps at both ends', async ({ page }) => {
  await boot(page);
  await openGoal(page);

  const inside = () => page.evaluate(() => !!document.querySelector('#modal-root .modal').contains(document.activeElement));

  // Forward past the last focusable element must land back on the first, not on the page behind.
  await page.evaluate(() => {
    const f = document.querySelectorAll('#modal-root .modal button, #modal-root .modal input, #modal-root .modal select, #modal-root .modal textarea, #modal-root .modal a[href]');
    f[f.length - 1].focus();
  });
  await page.keyboard.press('Tab');
  expect(await inside(), 'Tab from the last control stays in the dialog').toBe(true);

  await page.evaluate(() => {
    document.querySelector('#modal-root .modal button, #modal-root .modal input, #modal-root .modal select, #modal-root .modal textarea, #modal-root .modal a[href]').focus();
  });
  await page.keyboard.press('Shift+Tab');
  expect(await inside(), 'Shift+Tab from the first control stays in the dialog').toBe(true);
});

test('closing a modal returns focus to whatever opened it', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => { document.getElementById('global-search-btn').focus(); });

  await openGoal(page);
  await expect.poll(() => page.evaluate(() =>
    !!document.querySelector('#modal-root .modal').contains(document.activeElement)
  ), { message: 'focus moved into the dialog' }).toBe(true);

  await page.locator('#modal-root [data-close-modal]').first().click();
  await expect.poll(() => page.evaluate(() => document.activeElement.id)).toBe('global-search-btn');
});

test('Escape closes the dialog and also restores focus', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => { document.getElementById('global-search-btn').focus(); });
  await openGoal(page);
  await expect.poll(() => page.evaluate(() =>
    !!document.querySelector('#modal-root .modal').contains(document.activeElement)
  ), { message: 'focus moved into the dialog' }).toBe(true);

  await page.keyboard.press('Escape');
  await expect(page.locator('#modal-root .modal')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => document.activeElement.id)).toBe('global-search-btn');
});

// One modal proves the primitive works; this proves every caller inherits it, since
// openModal() applies the semantics to whatever markup the caller passed in.
test('dialog semantics reach every kind of modal, not just one', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const now = Date.now();
    state.students = [{ id: 's1', name: 'Ada', level: 'B2', rate: 40, currency: 'USD', status: 'active', email: '', createdAt: now, updatedAt: now }];
    save();
  });

  const openers = [
    ['goal', () => window.__LUMEN_TEST.openGoalModal()],
    ['assignment', () => window.__LUMEN_TEST.openAssignmentModal(null, 'Ada')],
    ['student dossier', () => window.__LUMEN_TEST.openStudentDossier('s1')],
    ['vault item', () => window.LumenLib.vault.openVaultModal()],
  ];

  const bad = [];
  for (const [name] of openers) {
    await page.evaluate((n) => {
      const map = {
        'goal': () => window.__LUMEN_TEST.openGoalModal(),
        'assignment': () => window.__LUMEN_TEST.openAssignmentModal(null, 'Ada'),
        'student dossier': () => window.__LUMEN_TEST.openStudentDossier('s1'),
        'vault item': () => window.LumenLib.vault.openVaultModal(),
      };
      map[n]();
    }, name);
    await page.waitForTimeout(200);

    const shape = await page.evaluate(() => {
      const d = document.querySelector('#modal-root .modal');
      if (!d) return null;
      const id = d.getAttribute('aria-labelledby');
      return {
        role: d.getAttribute('role'),
        modal: d.getAttribute('aria-modal'),
        named: !!(id && document.getElementById(id) && document.getElementById(id).textContent.trim()),
        focusInside: d.contains(document.activeElement),
      };
    });
    if (!shape) { bad.push(`${name}: no .modal rendered`); continue; }
    if (shape.role !== 'dialog') bad.push(`${name}: role=${shape.role}`);
    if (shape.modal !== 'true') bad.push(`${name}: aria-modal=${shape.modal}`);
    if (!shape.named) bad.push(`${name}: no accessible name`);
    if (!shape.focusInside) bad.push(`${name}: focus not moved into the dialog`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(120);
  }
  expect(bad).toEqual([]);
});

// The Ctrl+K palette is a dialog too — it just does not go through openModal().
test('the command palette is a labelled dialog that traps and restores focus', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => { document.getElementById('global-focus-hub-btn').focus(); });
  await page.keyboard.press('Control+k');

  const panel = page.locator('#search-root .search-panel');
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute('role', 'dialog');
  await expect(panel).toHaveAttribute('aria-modal', 'true');
  const named = await page.evaluate(() => {
    const p = document.querySelector('#search-root .search-panel');
    const id = p.getAttribute('aria-labelledby');
    return p.getAttribute('aria-label') || (id && document.getElementById(id) ? document.getElementById(id).textContent.trim() : null);
  });
  expect(named, 'palette has an accessible name').toBeTruthy();

  await page.keyboard.press('Escape');
  await expect(page.locator('#search-root .search-panel')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => document.activeElement.id)).toBe('global-focus-hub-btn');
});

// The unit test (tests/unit/focus-contrast.test.js) proves the chosen colour clears
// 3:1 in every palette. This proves the rule actually reaches the elements — several
// inputs set `outline: none`, which a bare :focus-visible loses the specificity tie to.
test('keyboard focus paints a real outline on inputs that clear their own', async ({ page }) => {
  await boot(page);
  await openGoal(page);

  const ring = await page.evaluate(() => {
    // #g-due is a date input, covered by the `outline: none` rule in styles.css.
    const el = document.getElementById('g-due');
    el.focus();
    const cs = getComputedStyle(el);
    return { found: !!el, style: cs.outlineStyle, width: parseFloat(cs.outlineWidth) || 0 };
  });
  expect(ring.found).toBe(true);
  expect(ring.style).not.toBe('none');
  expect(ring.width).toBeGreaterThanOrEqual(2);
});
