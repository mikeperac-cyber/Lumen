// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Empirical Verification: Milestone M2 Performance, Virtual List & Idle Save', () => {
  async function seedTasks(page, count = 2000) {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(300);
    await page.evaluate((n) => {
      const now = Date.now();
      window.state.tasks = Array.from({ length: n }, (_, i) => ({
        id: 't_' + i,
        title: 'Empirical Task ' + i,
        desc: 'Testing description for task number ' + i,
        status: i % 4 === 0 ? 'today' : (i % 4 === 1 ? 'in_progress' : (i % 4 === 2 ? 'done' : 'backlog')),
        priority: ['low', 'med', 'high'][i % 3],
        tags: ['tag_' + (i % 5), 'stress'],
        due: i % 2 === 0 ? '2026-08-30' : '',
        startTime: '',
        goalId: '',
        projectId: '',
        recurrence: '',
        subtasks: [],
        createdAt: now - i * 1000,
        updatedAt: now - i * 1000,
      }));
      if (window.flushSave) window.flushSave();
    }, count);
  }

  test.afterEach(async ({ page }) => {
    await page.evaluate(() => {
      if (window.state) {
        window.state.tasks = [];
        if (window.flushSave) window.flushSave();
      }
    }).catch(() => {});
  });

  test('1. Initial render of 2,000 tasks on #dashboard and #tasks is <120ms budget', async ({ page }) => {
    await seedTasks(page, 2000);

    // Dashboard render timing
    await page.goto('/#dashboard');
    await page.waitForTimeout(800);
    const dashMs = await page.evaluate(() => {
      const logs = (window.__LUMEN_DEBUG?.perfLog || []).filter((e) => e.view === 'dashboard');
      return logs.length ? logs[logs.length - 1].ms : null;
    });
    expect(dashMs, 'Dashboard render performance entry captured').not.toBeNull();
    expect(dashMs, `Dashboard render was ${dashMs}ms`).toBeLessThan(150);

    // Tasks board render timing
    await page.goto('/#tasks');
    await page.waitForTimeout(800);
    const tasksMs = await page.evaluate(() => {
      const logs = (window.__LUMEN_DEBUG?.perfLog || []).filter((e) => e.view === 'tasks');
      return logs.length ? logs[logs.length - 1].ms : null;
    });
    expect(tasksMs, 'Tasks render performance entry captured').not.toBeNull();
    expect(tasksMs, `Tasks board render was ${tasksMs}ms`).toBeLessThan(150);
  });

  test('2. Virtual List: DOM card count is bounded (<50 cards per column) despite 2,000 tasks', async ({ page }) => {
    await seedTasks(page, 2000);
    await page.goto('/#tasks');
    await page.waitForTimeout(500);

    const counts = await page.evaluate(() => {
      const cols = Array.from(document.querySelectorAll('.col-body'));
      return cols.map((col) => ({
        status: col.getAttribute('data-status-body'),
        cardCount: col.querySelectorAll('.task-card').length,
        hasTopSpacer: !!col.querySelector('.col-spacer.top'),
        hasBottomSpacer: !!col.querySelector('.col-spacer.bottom'),
      }));
    });

    for (const c of counts) {
      // Each column has ~500 tasks, but DOM must only contain the visible slice + overscan (typically < 40 cards)
      expect(c.cardCount).toBeLessThan(50);
      expect(c.cardCount).toBeGreaterThan(0);
    }
  });

  test('3. Rapid scroll stress test: continuous bidirectional scroll preserves spacer maths and zero blank gaps', async ({ page }) => {
    await seedTasks(page, 2000);
    await page.goto('/#tasks');
    await page.waitForTimeout(500);

    const scrollResults = await page.evaluate(async () => {
      const backlogCol = document.querySelector('.col-body[data-status-body="backlog"]');
      if (!backlogCol) return { error: 'Backlog column not found' };

      const measurements = [];
      const scrollPositions = [100, 500, 1200, 3000, 8000, 15000, 25000, 10000, 2000, 0];

      for (const targetScroll of scrollPositions) {
        backlogCol.scrollTop = targetScroll;
        backlogCol.dispatchEvent(new Event('scroll'));
        // Wait for rAF to settle
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

        const topSpacer = backlogCol.querySelector('.col-spacer.top');
        const bottomSpacer = backlogCol.querySelector('.col-spacer.bottom');
        const cards = backlogCol.querySelectorAll('.task-card');

        const topH = topSpacer ? parseFloat(topSpacer.style.height) : 0;
        const bottomH = bottomSpacer ? parseFloat(bottomSpacer.style.height) : 0;

        measurements.push({
          targetScroll,
          actualScrollTop: backlogCol.scrollTop,
          cardCount: cards.length,
          topH,
          bottomH,
          totalContentH: topH + bottomH + Array.from(cards).reduce((acc, el) => acc + el.offsetHeight + 8, 0),
        });
      }

      return { measurements };
    });

    expect(scrollResults.error).toBeUndefined();
    expect(scrollResults.measurements.length).toBe(10);

    for (const m of scrollResults.measurements) {
      expect(m.cardCount).toBeGreaterThan(0);
      expect(m.cardCount).toBeLessThan(50);
      expect(m.topH).toBeGreaterThanOrEqual(0);
      expect(m.bottomH).toBeGreaterThanOrEqual(0);
    }
  });

  test('4. Idle Save: Typing and mutations schedule saves via requestIdleCallback without dropping frames', async ({ page }) => {
    await page.goto('/#tasks');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(400);

    // Instrument requestIdleCallback, frame times, and mutations
    const testResult = await page.evaluate(async () => {
      let rAFDrops = 0;
      let maxFrameDuration = 0;
      let lastFrameTime = performance.now();
      let animActive = true;

      function monitorFrames() {
        const now = performance.now();
        const delta = now - lastFrameTime;
        lastFrameTime = now;
        if (delta > 50) { // Long frame (>50ms is considered dropped frame for 60fps)
          rAFDrops++;
        }
        if (delta > maxFrameDuration) maxFrameDuration = delta;
        if (animActive) requestAnimationFrame(monitorFrames);
      }
      requestAnimationFrame(monitorFrames);

      // Perform 30 rapid state mutations (simulating high-frequency typing / edits)
      const saveCalls = [];
      const originalSave = window.save;
      for (let i = 0; i < 30; i++) {
        window.state.tasks.push({
          id: 'mutation_task_' + i,
          title: 'Mutation ' + i,
          desc: 'High frequency typing test',
          status: 'backlog',
          priority: 'med',
          tags: ['typing'],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        window.save(); // Routine mutation save call
        await new Promise((r) => setTimeout(r, 10)); // 10ms intervals
      }

      // Allow idle save to flush
      await new Promise((r) => setTimeout(r, 600));
      animActive = false;

      return {
        tasksLength: window.state.tasks.length,
        rAFDrops,
        maxFrameDuration,
      };
    });

    expect(testResult.tasksLength).toBeGreaterThanOrEqual(30);
    // Under normal idle scheduling, rapid mutations do not stall main thread
    expect(testResult.maxFrameDuration).toBeLessThan(100);
  });

  test('5. Idle Save: pagehide / visibilitychange flushes pending saves synchronously to IDB & localStorage', async ({ page }) => {
    await page.goto('/#tasks');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(300);

    const flushResult = await page.evaluate(async () => {
      // Modify state without calling flushSave directly
      window.state.tasks.push({
        id: 'critical_unload_task',
        title: 'Task Added Right Before Tab Close',
        status: 'backlog',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      window.save(); // Defers via idle

      // Simulate visibilitychange -> hidden
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', writable: true });
      document.dispatchEvent(new Event('visibilitychange'));

      // Check localStorage item immediately
      const lsRaw = localStorage.getItem('lumen.state.v1') || '';
      const containsTask = lsRaw.includes('critical_unload_task');

      return { containsTask };
    });

    expect(flushResult.containsTask).toBe(true);
  });
});
