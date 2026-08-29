// @ts-check
const { test, expect } = require('@playwright/test');

const ALL_VIEWS = [
  'brief',
  'dashboard',
  'vault',
  'review',
  'tasks',
  'projects',
  'schedule',
  'tags',
  'goals',
  'habits',
  'achievements',
  'notes',
  'voice',
  'activity',
  'analytics',
  'finance',
  'students',
  'settings',
  'perf',
];

test.describe('Adversarial Route Transitions & Stress Harness', () => {
  test('rapid sequential transitions across all 19 views with 0ms pause', async ({ page }) => {
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`[console.error] ${msg.text()}`);
    });
    page.on('pageerror', (err) => {
      errors.push(`[pageerror] ${err.message}`);
    });

    await page.goto('/#dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Rapidly change hash through all 19 views back and forth without waiting
    for (const v of ALL_VIEWS) {
      await page.evaluate((view) => {
        location.hash = '#' + view;
      }, v);
    }

    // Reverse direction rapidly
    for (const v of [...ALL_VIEWS].reverse()) {
      await page.evaluate((view) => {
        location.hash = '#' + view;
      }, v);
    }

    // Wait for the final route to settle
    await page.waitForTimeout(500);

    const viewRoot = await page.$('#view-root');
    expect(viewRoot).not.toBeNull();
    const html = await page.evaluate(() => document.getElementById('view-root')?.innerHTML || '');
    expect(html.length).toBeGreaterThan(50);
    expect(errors).toEqual([]);
  });

  test('fuzzing: 50 randomized rapid route switches', async ({ page }) => {
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`[console.error] ${msg.text()}`);
    });
    page.on('pageerror', (err) => {
      errors.push(`[pageerror] ${err.message}`);
    });

    await page.goto('/#dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Perform 50 rapid random route changes
    for (let i = 0; i < 50; i++) {
      const randomView = ALL_VIEWS[Math.floor(Math.random() * ALL_VIEWS.length)];
      await page.evaluate((v) => { location.hash = '#' + v; }, randomView);
      if (i % 5 === 0) await page.waitForTimeout(20);
    }

    await page.waitForTimeout(600);
    expect(errors).toEqual([]);
  });

  test('resilience against malformed, malicious, and invalid hash routes', async ({ page }) => {
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`[console.error] ${msg.text()}`);
    });
    page.on('pageerror', (err) => {
      errors.push(`[pageerror] ${err.message}`);
    });

    await page.goto('/#dashboard');
    await page.waitForLoadState('domcontentloaded');

    const weirdRoutes = [
      '#',
      '#/',
      '#non_existent_view_404',
      '#<script>alert(1)</script>',
      '#tasks/123?filter=active&sort=desc',
      '#..%2F..%2Fetc%2Fpasswd',
      '#null',
      '#undefined',
      '#vault#finance',
      '#dashboard'
    ];

    for (const route of weirdRoutes) {
      await page.evaluate((r) => { location.hash = r; }, route);
      await page.waitForTimeout(50);
    }

    await page.waitForTimeout(500);
    expect(errors).toEqual([]);
  });

  test('modal lifecycle during navigation: route change cleans up modals and inert state', async ({ page }) => {
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`[console.error] ${msg.text()}`);
    });
    page.on('pageerror', (err) => {
      errors.push(`[pageerror] ${err.message}`);
    });

    await page.goto('/#tasks');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(300);

    // Trigger keyboard search modal or add task modal if available
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(100);

    // Switch route while modal might be open
    await page.evaluate(() => { location.hash = '#vault'; });
    await page.waitForTimeout(400);

    // Verify view-root is not inert
    const isInert = await page.evaluate(() => {
      const vr = document.getElementById('view-root');
      return vr ? vr.hasAttribute('inert') : false;
    });

    expect(isInert).toBe(false);
    expect(errors).toEqual([]);
  });

  test('in-DOM virtual scrolling spacer and element stability in tasks kanban', async ({ page }) => {
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`[console.error] ${msg.text()}`);
    });
    page.on('pageerror', (err) => {
      errors.push(`[pageerror] ${err.message}`);
    });

    await page.goto('/#tasks');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // Seed state with 100 tasks across columns and trigger virtual scroll
    await page.evaluate(() => {
      const statuses = ['backlog', 'todo', 'in_progress', 'done'];
      const tasks = [];
      for (let i = 0; i < 120; i++) {
        tasks.push({
          id: 'perf_task_' + i,
          title: 'Adversarial Task ' + i,
          desc: 'Description for virtual scroll card ' + i,
          status: statuses[i % statuses.length],
          prio: 'med',
          tags: ['test', 'virt'],
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }
      if (window.state) {
        window.state.tasks = tasks;
        if (window.LumenLib?.tasks?.renderTasks) {
          window.LumenLib.tasks.renderTasks();
        }
      }
    });

    await page.waitForTimeout(300);

    // Check all spacer heights in DOM
    const spacerStyles = await page.evaluate(() => {
      const spacers = Array.from(document.querySelectorAll('.col-spacer'));
      return spacers.map(s => ({
        style: s.getAttribute('style') || '',
        height: (/** @type {HTMLElement} */ (s)).style.height
      }));
    });

    for (const s of spacerStyles) {
      expect(s.style).not.toContain('NaN');
      expect(s.style).not.toContain('undefined');
      expect(s.style).not.toContain('app.${');
      expect(s.style).not.toContain('app.$');
    }

    // Rapidly scroll kanban column bodies
    await page.evaluate(() => {
      const cols = document.querySelectorAll('.col-body');
      cols.forEach(c => {
        c.scrollTop = 500;
        c.dispatchEvent(new Event('scroll'));
        c.scrollTop = 0;
        c.dispatchEvent(new Event('scroll'));
        c.scrollTop = 1500;
        c.dispatchEvent(new Event('scroll'));
      });
    });

    await page.waitForTimeout(300);
    expect(errors).toEqual([]);
  });
});
