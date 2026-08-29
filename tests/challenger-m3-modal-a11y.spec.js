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

test.describe('Challenger M3: Modal & Search A11y / Focus Behavior Verification', () => {

  test('1. Task editor modal: Focus trapping, #view-root inert lifecycle, Escape dismissal, and focus restoration', async ({ page }) => {
    const errs = await bootApp(page);
    expect(errs).toEqual([]);

    await page.goto('/#tasks');
    await page.waitForTimeout(300);

    // Focus an element in the page to act as opener
    await page.evaluate(() => {
      const btn = document.getElementById('global-search-btn');
      if (btn) btn.focus();
    });
    expect(await page.evaluate(() => document.activeElement ? document.activeElement.id : null)).toBe('global-search-btn');

    // Click #task-new to open Task Modal
    const taskNewBtn = page.locator('#task-new');
    await expect(taskNewBtn).toBeVisible();
    await taskNewBtn.click();

    const dialog = page.locator('#modal-root .modal');
    await expect(dialog).toBeVisible();

    await expect(dialog).toHaveAttribute('role', 'dialog');
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    const labelId = await dialog.getAttribute('aria-labelledby');
    expect(labelId).toBeTruthy();
    const heading = page.locator('#' + labelId);
    await expect(heading).toBeVisible();

    const viewRootStateWhileOpen = await page.evaluate(() => {
      const vr = document.getElementById('view-root');
      return {
        hasInert: vr ? vr.hasAttribute('inert') : false,
        ariaHidden: vr ? vr.getAttribute('aria-hidden') : null,
      };
    });
    expect(viewRootStateWhileOpen.hasInert).toBe(true);
    expect(viewRootStateWhileOpen.ariaHidden).toBe('true');

    const focusInside = await page.evaluate(() => {
      const d = document.querySelector('#modal-root .modal');
      return d && d.contains(document.activeElement);
    });
    expect(focusInside).toBe(true);

    // Forward Tab wrap
    await page.evaluate(() => {
      const f = Array.from(document.querySelectorAll('#modal-root .modal button, #modal-root .modal input, #modal-root .modal select, #modal-root .modal textarea, #modal-root .modal a[href]'))
        .filter(el => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));
      if (f.length) f[f.length - 1].focus();
    });
    await page.keyboard.press('Tab');
    const afterForwardTab = await page.evaluate(() => {
      const d = document.querySelector('#modal-root .modal');
      return d && d.contains(document.activeElement);
    });
    expect(afterForwardTab, 'Forward Tab from last control stays trapped inside modal').toBe(true);

    // Shift+Tab wrap
    await page.evaluate(() => {
      const f = Array.from(document.querySelectorAll('#modal-root .modal button, #modal-root .modal input, #modal-root .modal select, #modal-root .modal textarea, #modal-root .modal a[href]'))
        .filter(el => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));
      if (f.length) f[0].focus();
    });
    await page.keyboard.press('Shift+Tab');
    const afterBackwardTab = await page.evaluate(() => {
      const d = document.querySelector('#modal-root .modal');
      return d && d.contains(document.activeElement);
    });
    expect(afterBackwardTab, 'Shift+Tab from first control stays trapped inside modal').toBe(true);

    // Escape dismissal
    await page.keyboard.press('Escape');
    await expect(page.locator('#modal-root .modal')).toHaveCount(0);

    const viewRootStateAfterClose = await page.evaluate(() => {
      const vr = document.getElementById('view-root');
      return {
        hasInert: vr ? vr.hasAttribute('inert') : false,
        ariaHidden: vr ? vr.getAttribute('aria-hidden') : null,
      };
    });
    expect(viewRootStateAfterClose.hasInert).toBe(false);
    expect(viewRootStateAfterClose.ariaHidden).toBeNull();

    await expect.poll(() => page.evaluate(() => document.activeElement ? document.activeElement.id : null)).toBe('task-new');
  });

  test('2. Vault modal: Focus trapping, #view-root inert lifecycle, Escape dismissal, and focus restoration', async ({ page }) => {
    await bootApp(page);
    await page.goto('/#vault');
    await page.waitForTimeout(300);

    await page.evaluate(() => {
      const btn = document.getElementById('global-focus-hub-btn');
      if (btn) btn.focus();
    });
    expect(await page.evaluate(() => document.activeElement ? document.activeElement.id : null)).toBe('global-focus-hub-btn');

    await page.evaluate(() => {
      window.LumenLib.vault.openVaultModal();
    });

    const dialog = page.locator('#modal-root .modal');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('role', 'dialog');
    await expect(dialog).toHaveAttribute('aria-modal', 'true');

    const vrOpen = await page.evaluate(() => {
      const vr = document.getElementById('view-root');
      return { hasInert: vr ? vr.hasAttribute('inert') : false, ariaHidden: vr ? vr.getAttribute('aria-hidden') : null };
    });
    expect(vrOpen.hasInert).toBe(true);
    expect(vrOpen.ariaHidden).toBe('true');

    expect(await page.evaluate(() => {
      const d = document.querySelector('#modal-root .modal');
      return d && d.contains(document.activeElement);
    })).toBe(true);

    await page.evaluate(() => {
      const f = Array.from(document.querySelectorAll('#modal-root .modal button, #modal-root .modal input, #modal-root .modal select, #modal-root .modal textarea, #modal-root .modal a[href]'))
        .filter(el => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));
      if (f.length) f[f.length - 1].focus();
    });
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => {
      const d = document.querySelector('#modal-root .modal');
      return d && d.contains(document.activeElement);
    })).toBe(true);

    await page.evaluate(() => {
      const f = Array.from(document.querySelectorAll('#modal-root .modal button, #modal-root .modal input, #modal-root .modal select, #modal-root .modal textarea, #modal-root .modal a[href]'))
        .filter(el => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));
      if (f.length) f[0].focus();
    });
    await page.keyboard.press('Shift+Tab');
    expect(await page.evaluate(() => {
      const d = document.querySelector('#modal-root .modal');
      return d && d.contains(document.activeElement);
    })).toBe(true);

    await page.keyboard.press('Escape');
    await expect(page.locator('#modal-root .modal')).toHaveCount(0);

    const vrClosed = await page.evaluate(() => {
      const vr = document.getElementById('view-root');
      return { hasInert: vr ? vr.hasAttribute('inert') : false, ariaHidden: vr ? vr.getAttribute('aria-hidden') : null };
    });
    expect(vrClosed.hasInert).toBe(false);
    expect(vrClosed.ariaHidden).toBeNull();

    await expect.poll(() => page.evaluate(() => document.activeElement ? document.activeElement.id : null)).toBe('global-focus-hub-btn');
  });

  test('3. Habit modal: Focus trapping, #view-root inert lifecycle, Escape dismissal, and focus restoration', async ({ page }) => {
    await bootApp(page);
    await page.goto('/#habits');
    await page.waitForTimeout(300);

    await page.evaluate(() => {
      const btn = document.getElementById('theme-toggle');
      if (btn) btn.focus();
    });
    expect(await page.evaluate(() => document.activeElement ? document.activeElement.id : null)).toBe('theme-toggle');

    await page.evaluate(() => {
      const qh = document.querySelector('[data-action="habit"]');
      if (qh) qh.click();
      else if (typeof openHabitModal === 'function') openHabitModal();
    });

    const dialog = page.locator('#modal-root .modal');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('role', 'dialog');
    await expect(dialog).toHaveAttribute('aria-modal', 'true');

    const vrOpen = await page.evaluate(() => {
      const vr = document.getElementById('view-root');
      return { hasInert: vr ? vr.hasAttribute('inert') : false, ariaHidden: vr ? vr.getAttribute('aria-hidden') : null };
    });
    expect(vrOpen.hasInert).toBe(true);
    expect(vrOpen.ariaHidden).toBe('true');

    await page.evaluate(() => {
      const f = Array.from(document.querySelectorAll('#modal-root .modal button, #modal-root .modal input, #modal-root .modal select, #modal-root .modal textarea, #modal-root .modal a[href]'))
        .filter(el => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));
      if (f.length) f[f.length - 1].focus();
    });
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => {
      const d = document.querySelector('#modal-root .modal');
      return d && d.contains(document.activeElement);
    })).toBe(true);

    await page.evaluate(() => {
      const f = Array.from(document.querySelectorAll('#modal-root .modal button, #modal-root .modal input, #modal-root .modal select, #modal-root .modal textarea, #modal-root .modal a[href]'))
        .filter(el => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));
      if (f.length) f[0].focus();
    });
    await page.keyboard.press('Shift+Tab');
    expect(await page.evaluate(() => {
      const d = document.querySelector('#modal-root .modal');
      return d && d.contains(document.activeElement);
    })).toBe(true);

    await page.keyboard.press('Escape');
    await expect(page.locator('#modal-root .modal')).toHaveCount(0);

    const vrClosed = await page.evaluate(() => {
      const vr = document.getElementById('view-root');
      return { hasInert: vr ? vr.hasAttribute('inert') : false, ariaHidden: vr ? vr.getAttribute('aria-hidden') : null };
    });
    expect(vrClosed.hasInert).toBe(false);
    expect(vrClosed.ariaHidden).toBeNull();
  });

  test('4. Search Palette: Focus trapping, #view-root inert lifecycle, Escape dismissal, and focus restoration', async ({ page }) => {
    await bootApp(page);

    await page.evaluate(() => {
      const btn = document.getElementById('nav-tasks');
      if (btn) btn.focus();
    });
    expect(await page.evaluate(() => document.activeElement ? document.activeElement.id : null)).toBe('nav-tasks');

    await page.keyboard.press('Control+k');

    const panel = page.locator('#search-root .search-panel');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAttribute('role', 'dialog');
    await expect(panel).toHaveAttribute('aria-modal', 'true');
    await expect(panel).toHaveAttribute('aria-label', 'Search and commands');

    const vrOpen = await page.evaluate(() => {
      const vr = document.getElementById('view-root');
      return { hasInert: vr ? vr.hasAttribute('inert') : false, ariaHidden: vr ? vr.getAttribute('aria-hidden') : null };
    });
    expect(vrOpen.hasInert).toBe(true);
    expect(vrOpen.ariaHidden).toBe('true');

    expect(await page.evaluate(() => document.activeElement ? document.activeElement.id : null)).toBe('search-input');

    await page.evaluate(() => {
      const f = Array.from(document.querySelectorAll('#search-root .search-panel button, #search-root .search-panel input, #search-root .search-panel select, #search-root .search-panel a[href]'))
        .filter(el => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));
      if (f.length) f[f.length - 1].focus();
    });
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => {
      const p = document.querySelector('#search-root .search-panel');
      return p && p.contains(document.activeElement);
    })).toBe(true);

    await page.evaluate(() => {
      const f = Array.from(document.querySelectorAll('#search-root .search-panel button, #search-root .search-panel input, #search-root .search-panel select, #search-root .search-panel a[href]'))
        .filter(el => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));
      if (f.length) f[0].focus();
    });
    await page.keyboard.press('Shift+Tab');
    expect(await page.evaluate(() => {
      const p = document.querySelector('#search-root .search-panel');
      return p && p.contains(document.activeElement);
    })).toBe(true);

    await page.keyboard.press('Escape');
    await expect(page.locator('#search-root .search-panel')).toHaveCount(0);

    const vrClosed = await page.evaluate(() => {
      const vr = document.getElementById('view-root');
      return { hasInert: vr ? vr.hasAttribute('inert') : false, ariaHidden: vr ? vr.getAttribute('aria-hidden') : null };
    });
    expect(vrClosed.hasInert).toBe(false);
    expect(vrClosed.ariaHidden).toBeNull();

    await expect.poll(() => page.evaluate(() => document.activeElement ? document.activeElement.id : null)).toBe('nav-tasks');
  });

  test('5. Close button ([data-close-modal]) and Backdrop click dismissals clean up #view-root and restore focus', async ({ page }) => {
    await bootApp(page);
    await page.evaluate(() => {
      const btn = document.getElementById('global-search-btn');
      if (btn) btn.focus();
    });

    await page.evaluate(() => window.__LUMEN_TEST.openGoalModal());
    await expect(page.locator('#modal-root .modal')).toBeVisible();

    const closeBtn = page.locator('#modal-root [data-close-modal]').first();
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await expect(page.locator('#modal-root .modal')).toHaveCount(0);

    const vr1 = await page.evaluate(() => document.getElementById('view-root').hasAttribute('inert'));
    expect(vr1).toBe(false);
    await expect.poll(() => page.evaluate(() => document.activeElement ? document.activeElement.id : null)).toBe('global-search-btn');

    await page.evaluate(() => window.__LUMEN_TEST.openGoalModal());
    await expect(page.locator('#modal-root .modal')).toBeVisible();
    expect(await page.evaluate(() => document.getElementById('view-root').hasAttribute('inert'))).toBe(true);

    await page.locator('#modal-root .modal-backdrop').click({ position: { x: 5, y: 5 } });
    await expect(page.locator('#modal-root .modal')).toHaveCount(0);
    expect(await page.evaluate(() => document.getElementById('view-root').hasAttribute('inert'))).toBe(false);
    await expect.poll(() => page.evaluate(() => document.activeElement ? document.activeElement.id : null)).toBe('global-search-btn');
  });

  test('6. Route transition while modal is open cleans up #view-root inert and aria-hidden', async ({ page }) => {
    await bootApp(page);
    await page.evaluate(() => window.__LUMEN_TEST.openGoalModal());
    await expect(page.locator('#modal-root .modal')).toBeVisible();
    expect(await page.evaluate(() => document.getElementById('view-root').hasAttribute('inert'))).toBe(true);

    await page.evaluate(() => {
      location.hash = '#finance';
    });
    await page.waitForTimeout(300);

    await expect(page.locator('#modal-root .modal')).toHaveCount(0);
    const vr = await page.evaluate(() => {
      const el = document.getElementById('view-root');
      return { hasInert: el ? el.hasAttribute('inert') : false, ariaHidden: el ? el.getAttribute('aria-hidden') : null };
    });
    expect(vr.hasInert).toBe(false);
    expect(vr.ariaHidden).toBeNull();
  });

  test('7. Search command transition to modal preserves proper inert cleanup lifecycle', async ({ page }) => {
    await bootApp(page);
    await page.evaluate(() => {
      const btn = document.getElementById('global-focus-hub-btn');
      if (btn) btn.focus();
    });

    await page.keyboard.press('Control+k');
    await expect(page.locator('#search-root .search-panel')).toBeVisible();
    expect(await page.evaluate(() => document.getElementById('view-root').hasAttribute('inert'))).toBe(true);

    const searchInput = page.locator('#search-input');
    await searchInput.fill('>goal');
    await page.waitForTimeout(200);
    await page.keyboard.press('Enter');

    await expect(page.locator('#search-root .search-panel')).toHaveCount(0);
    await expect(page.locator('#modal-root .modal')).toBeVisible();
    expect(await page.evaluate(() => document.getElementById('view-root').hasAttribute('inert'))).toBe(true);

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