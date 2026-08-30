// @ts-check
/* Perf budget tripwire — seeds 2,000 tasks and asserts the dashboard render
   stays well under the slow-frame threshold. This is a regression guard, not an
   absolute benchmark; if CI hardware makes it flaky, raise the ceiling here and
   note the measured baseline. */
const { test, expect } = require('@playwright/test');

async function seedTasks(page, n) {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(400);
  await page.evaluate((count) => {
    const now = Date.now();
    state.tasks = Array.from({ length: count }, (_, i) => ({
      id: 't' + i,
      title: 'Task ' + i,
      desc: '',
      status: i % 4 === 0 ? 'today' : 'backlog',
      priority: ['low', 'med', 'high'][i % 3],
      due: '',
      startTime: '',
      goalId: '',
      projectId: '',
      recurrence: '',
      tags: [],
      subtasks: [],
      createdAt: now - i * 1000,
      updatedAt: now - i * 1000,
    }));
    flushSave();
  }, n);
}

test.afterEach(async ({ page }) => {
  await page.evaluate(() => { state.tasks = []; flushSave(); }).catch(() => {});
});

test('dashboard renders under budget with 2,000 tasks', async ({ page }) => {
  await seedTasks(page, 2000);
  await page.goto('/#dashboard');
  await page.waitForTimeout(700);
  const ms = await page.evaluate(() => {
    const logs = (window.__LUMEN_DEBUG?.perfLog || []).filter((e) => e.view === 'dashboard');
    return logs.length ? logs[logs.length - 1].ms : null;
  });
  expect(ms, 'no dashboard perf sample captured').not.toBeNull();
  expect(ms, `dashboard render was ${ms?.toFixed?.(1)}ms`).toBeLessThan(350);
});

test('tasks board renders under budget with 2,000 tasks', async ({ page }) => {
  await seedTasks(page, 2000);
  await page.goto('/#tasks');
  await page.waitForTimeout(700);
  const ms = await page.evaluate(() => {
    const logs = (window.__LUMEN_DEBUG?.perfLog || []).filter((e) => e.view === 'tasks');
    return logs.length ? logs[logs.length - 1].ms : null;
  });
  expect(ms, 'no tasks perf sample captured').not.toBeNull();
  expect(ms, `tasks render was ${ms?.toFixed?.(1)}ms`).toBeLessThan(350);
});
