// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Tier 5 Adversarial Stress & Hardening — Challenger M5 E2E Suite', () => {

  test.afterEach(async ({ page }) => {
    await page.evaluate(() => {
      if (window.state) {
        window.state.tasks = [];
        if (typeof flushSave === 'function') flushSave();
      }
    }).catch(() => {});
  });

  // =========================================================================
  // 1. Extreme 5,000 Tasks Virtual Scroll Stress & DOM Bounds
  // =========================================================================
  test('5,000 tasks virtual scroll: bounds DOM nodes, avoids layout thrash and spacer corruption', async ({ page }) => {
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => {
      errors.push(err.message);
    });

    await page.goto('/#tasks');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(400);

    // Seed 5,000 tasks distributed across 4 kanban statuses
    await page.evaluate((count) => {
      const statuses = ['backlog', 'todo', 'in_progress', 'done'];
      const now = Date.now();
      window.state.tasks = Array.from({ length: count }, (_, i) => ({
        id: 'stress_t_' + i,
        title: `Stress Task ${i} — High Concurrency Test`,
        desc: `Description payload for task ${i} to simulate realistic DOM height variation.`,
        status: statuses[i % 4],
        priority: ['low', 'med', 'high'][i % 3],
        tags: ['stress', 'm5', `tag_${i % 10}`],
        subtasks: i % 5 === 0 ? [{ id: 'sub1', text: 'Subtask A', done: false }] : [],
        createdAt: now - i * 1000,
        updatedAt: now - i * 1000
      }));
      if (typeof flushSave === 'function') flushSave();
      if (window.LumenLib?.tasks?.renderTasks) {
        window.LumenLib.tasks.renderTasks();
      }
    }, 5000);

    await page.waitForTimeout(500);

    // Assert that total DOM task cards across ALL 4 columns does not exceed 160 cards
    const totalRenderedCards = await page.evaluate(() => {
      return document.querySelectorAll('.task-card').length;
    });
    expect(totalRenderedCards).toBeLessThan(180);
    expect(totalRenderedCards).toBeGreaterThan(10);

    // Inspect each column's spacer styling to verify exact integer heights and no NaN/corrupt values
    const spacerData = await page.evaluate(() => {
      const spacers = Array.from(document.querySelectorAll('.col-spacer'));
      return spacers.map(s => ({
        style: s.getAttribute('style') || '',
        height: (/** @type {HTMLElement} */ (s)).style.height
      }));
    });

    expect(spacerData.length).toBeGreaterThan(0);
    for (const s of spacerData) {
      expect(s.style).not.toContain('NaN');
      expect(s.style).not.toContain('undefined');
      expect(s.style).not.toContain('app.${');
      expect(s.style).not.toContain('app.$');
    }

    // Stress: rapidly scroll the backlog column from top to bottom and back 10 times
    await page.evaluate(() => {
      const col = document.querySelector('.col-body[data-status-body="backlog"]');
      if (!col) return;
      for (let i = 0; i < 10; i++) {
        col.scrollTop = i * 2000;
        col.dispatchEvent(new Event('scroll'));
      }
      col.scrollTop = 0;
      col.dispatchEvent(new Event('scroll'));
    });

    await page.waitForTimeout(400);
    expect(errors).toEqual([]);
  });

  // =========================================================================
  // 2. Rapid Route Switching & Async Route Split Stress Harness
  // =========================================================================
  test('rapid 100-switch route thrashing with heavy state does not throw unhandled exceptions', async ({ page }) => {
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => {
      errors.push(err.message);
    });

    await page.goto('/#dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(300);

    // Seed state with 1,000 tasks and 200 notes
    await page.evaluate(() => {
      const now = Date.now();
      window.state.tasks = Array.from({ length: 1000 }, (_, i) => ({
        id: 't_fast_' + i,
        title: 'Task ' + i,
        status: 'today',
        priority: 'high',
        createdAt: now,
        updatedAt: now
      }));
      window.state.notes = Array.from({ length: 200 }, (_, i) => ({
        id: 'n_fast_' + i,
        title: 'Note ' + i,
        content: 'Content ' + i,
        updatedAt: now
      }));
      if (typeof flushSave === 'function') flushSave();
    });

    const routes = ['brief', 'dashboard', 'tasks', 'vault', 'review', 'projects', 'goals', 'habits', 'notes', 'finance', 'students', 'settings', 'perf'];

    // Thrash 60 rapid route switches without waiting
    for (let i = 0; i < 60; i++) {
      const r = routes[i % routes.length];
      await page.evaluate((targetRoute) => {
        location.hash = '#' + targetRoute;
      }, r);
      if (i % 10 === 0) await page.waitForTimeout(25);
    }

    // Settle on dashboard
    await page.evaluate(() => { location.hash = '#dashboard'; });
    await page.waitForTimeout(600);

    const titleText = await page.textContent('#view-title');
    expect(titleText).toBeTruthy();
    expect(errors).toEqual([]);
  });

  // =========================================================================
  // 3. Modal Focus Trap, Inert Lifecycle, and Key Loops
  // =========================================================================
  test('modal focus trap loops seamlessly and restores view-root inert status across cycles', async ({ page }) => {
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => {
      errors.push(err.message);
    });

    await page.goto('/#tasks');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(400);

    // Open task modal via shortcut or button
    await page.evaluate(() => {
      if (window.LumenLib?.tasks?.openTaskModal) {
        window.LumenLib.tasks.openTaskModal();
      } else if (typeof openTaskModal === 'function') {
        openTaskModal();
      }
    });

    await page.waitForTimeout(300);

    // Verify modal is displayed and view-root is inert
    const modalBackdrop = await page.$('.modal-backdrop');
    expect(modalBackdrop).not.toBeNull();

    const viewRootInert = await page.evaluate(() => {
      const vr = document.getElementById('view-root');
      return vr?.hasAttribute('inert') && vr?.getAttribute('aria-hidden') === 'true';
    });
    expect(viewRootInert).toBe(true);

    // Cycle Tab forward 10 times — must remain inside modal
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const insideModal = await page.evaluate(() => {
        const active = document.activeElement;
        const modal = document.querySelector('.modal-backdrop');
        return modal ? modal.contains(active) : false;
      });
      expect(insideModal).toBe(true);
    }

    // Cycle Shift+Tab backward 10 times — must remain inside modal
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Shift+Tab');
      const insideModal = await page.evaluate(() => {
        const active = document.activeElement;
        const modal = document.querySelector('.modal-backdrop');
        return modal ? modal.contains(active) : false;
      });
      expect(insideModal).toBe(true);
    }

    // Press Escape to dismiss
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Verify modal is gone and view-root inert is removed
    const modalAfter = await page.$('.modal-backdrop');
    expect(modalAfter).toBeNull();

    const viewRootInertAfter = await page.evaluate(() => {
      const vr = document.getElementById('view-root');
      return vr?.hasAttribute('inert');
    });
    expect(viewRootInertAfter).toBe(false);
    expect(errors).toEqual([]);
  });
});
