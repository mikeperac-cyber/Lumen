// @ts-check
const { test, expect } = require('@playwright/test');

async function bootApp(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/');
  await page.waitForFunction(() => typeof window.state === 'object' && window.state !== null);
  await page.waitForTimeout(400);
  return errors;
}

test.describe('Challenger M3: Adversarial Stress & Edge Case Harness', () => {

  test('Stress 1: Rapid multi-cycle Tab navigation across full modal control ring', async ({ page }) => {
    await bootApp(page);
    await page.goto('/#tasks');
    await page.waitForTimeout(300);

    const taskBtn = page.locator('#task-new');
    await taskBtn.click();
    const dialog = page.locator('#modal-root .modal');
    await expect(dialog).toBeVisible();

    // Perform 20 forward Tabs rapidly
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      const inside = await page.evaluate(() => {
        const d = document.querySelector('#modal-root .modal');
        return d && d.contains(document.activeElement);
      });
      expect(inside, `Focus must remain inside modal on forward Tab cycle #${i + 1}`).toBe(true);
    }

    // Perform 20 backward Shift+Tabs rapidly
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Shift+Tab');
      const inside = await page.evaluate(() => {
        const d = document.querySelector('#modal-root .modal');
        return d && d.contains(document.activeElement);
      });
      expect(inside, `Focus must remain inside modal on backward Shift+Tab cycle #${i + 1}`).toBe(true);
    }

    await page.keyboard.press('Escape');
    await expect(page.locator('#modal-root .modal')).toHaveCount(0);
  });

  test('Stress 2: Rapid sequential modal replacements preserve original return focus', async ({ page }) => {
    await bootApp(page);
    
    // Focus an initial button
    await page.evaluate(() => {
      document.getElementById('theme-toggle')?.focus();
    });
    expect(await page.evaluate(() => document.activeElement ? document.activeElement.id : null)).toBe('theme-toggle');

    // Open Goal Modal
    await page.evaluate(() => window.__LUMEN_TEST.openGoalModal());
    await expect(page.locator('#modal-root .modal')).toBeVisible();

    // While Goal Modal is open, open Student Dossier (replacing previous modal in #modal-root)
    await page.evaluate(() => {
      state.students = [{ id: 's_test', name: 'Zack', level: 'C1', rate: 50, currency: 'USD', status: 'active', email: 'zack@test.com', createdAt: Date.now(), updatedAt: Date.now() }];
      save();
      window.__LUMEN_TEST.openStudentDossier('s_test');
    });
    await expect(page.locator('#modal-root .modal')).toBeVisible();

    // Close replacing modal
    await page.keyboard.press('Escape');
    await expect(page.locator('#modal-root .modal')).toHaveCount(0);

    // Verify focus returned to original opener (theme-toggle)
    await expect.poll(() => page.evaluate(() => document.activeElement ? document.activeElement.id : null)).toBe('theme-toggle');
  });

  test('Stress 3: Defensive behavior with repeated Escape and close calls when no modal is open', async ({ page }) => {
    const errs = await bootApp(page);

    // Call closeModal and closeSearch when nothing is open
    await page.evaluate(() => {
      if (typeof closeModal === 'function') closeModal();
      if (typeof closeSearch === 'function') closeSearch();
    });

    // Press Escape 5 times
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Escape');
    }

    // Verify app state and #view-root are clean and error-free
    const vr = await page.evaluate(() => {
      const el = document.getElementById('view-root');
      return { hasInert: el ? el.hasAttribute('inert') : false, ariaHidden: el ? el.getAttribute('aria-hidden') : null };
    });
    expect(vr.hasInert).toBe(false);
    expect(vr.ariaHidden).toBeNull();
    expect(errs).toEqual([]);
  });

  test('Stress 4: User clicks on elements inside #view-root while modal is active (inert prevents focus)', async ({ page }) => {
    await bootApp(page);
    await page.goto('/#tasks');
    await page.waitForTimeout(300);

    // Open task modal
    await page.locator('#task-new').click();
    await expect(page.locator('#modal-root .modal')).toBeVisible();

    // Try focusing an interactive element inside #view-root
    const interactionResult = await page.evaluate(() => {
      const target = document.querySelector('#view-root button, #view-root input, #view-root select');
      if (!target) return { hasTarget: false, focused: false };
      try {
        target.focus();
      } catch (e) {}
      return {
        hasTarget: true,
        focused: document.activeElement === target,
      };
    });

    if (interactionResult.hasTarget) {
      expect(interactionResult.focused, 'Elements inside inert #view-root cannot receive focus').toBe(false);
    }

    await page.keyboard.press('Escape');
    await expect(page.locator('#modal-root .modal')).toHaveCount(0);
  });

  test('Stress 5: Finance Modal (Income / Expense) focus trapping and restoration', async ({ page }) => {
    await bootApp(page);
    await page.goto('/#finance');
    await page.waitForTimeout(300);

    const finBtn = page.locator('#nav-finance');
    await finBtn.focus();

    await page.evaluate(() => {
      const btn = document.getElementById('fin-add-inc');
      if (btn) btn.click();
      else if (typeof openFinanceModal === 'function') openFinanceModal('income');
    });

    const dialog = page.locator('#modal-root .modal');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('role', 'dialog');
    await expect(dialog).toHaveAttribute('aria-modal', 'true');

    // Test Tab trapping forward and backward
    await page.evaluate(() => {
      const f = Array.from(document.querySelectorAll('#modal-root .modal button, #modal-root .modal input, #modal-root .modal select, #modal-root .modal textarea, #modal-root .modal a[href]'))
        .filter(el => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));
      if (f.length) f[f.length - 1].focus();
    });
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.querySelector('#modal-root .modal')?.contains(document.activeElement))).toBe(true);

    await page.keyboard.press('Escape');
    await expect(page.locator('#modal-root .modal')).toHaveCount(0);

    const vr = await page.evaluate(() => {
      const el = document.getElementById('view-root');
      return { hasInert: el ? el.hasAttribute('inert') : false, ariaHidden: el ? el.getAttribute('aria-hidden') : null };
    });
    expect(vr.hasInert).toBe(false);
    expect(vr.ariaHidden).toBeNull();
  });

});
