// @ts-check
/* v105 Teaching Wedge Weave — student FK, goal↔student links, per-student finance. */
const { test, expect } = require('@playwright/test');

test('legacy income is FK-linked to a student on load', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    state.students = [{ id: 's-caner', name: 'Caner Yilmaz', currency: 'TRY', rate: 1500, status: 'active', level: 'IELTS' }];
    state.income = [{ id: 'i1', student: 'Caner Yilmaz', amount: 1500, currency: 'TRY', date: '2026-08-01' }];
    save();
  });
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(700);
  const sid = await page.evaluate(() => state.income[0].studentId);
  expect(sid).toBe('s-caner');
  await page.evaluate(() => { state.students = []; state.income = []; save(); });
});

test('goal modal links students and persists linkedStudentIds', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    state.students = [{ id: 's-ana', name: 'Ana', status: 'active', currency: 'USD', rate: 35, level: 'ESL' }];
    state.goals = [];
    save();
  });
  await page.goto('/#goals');
  await page.waitForTimeout(400);
  await page.evaluate(() => openGoalModal());
  await page.waitForTimeout(300);
  await page.fill('#g-title', 'IELTS 8.0');
  await page.click('.g-student-toggle[data-sid="s-ana"]');
  await page.click('#g-save');
  await page.waitForTimeout(400);
  const linked = await page.evaluate(() => state.goals[0].linkedStudentIds);
  expect(linked).toEqual(['s-ana']);
  // chip renders on the card
  await page.waitForTimeout(200);
  expect(await page.locator('.goal-card .chip-student').innerText()).toContain('Ana');
  await page.evaluate(() => { state.students = []; state.goals = []; save(); });
});

test('teaching hub weave uses the explicit goal-student link', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    state.students = [{ id: 's-x', name: 'Zeynep', status: 'active', currency: 'TRY', rate: 1200, level: 'IELTS' }];
    state.goals = [{ id: 'g-x', title: 'Band 7 by December', color: '#605dff', keyResults: [], linkedStudentIds: ['s-x'], createdAt: Date.now(), updatedAt: Date.now() }];
    state.income = [{ id: 'i-x', studentId: 's-x', student: 'Zeynep', amount: 1200, currency: 'TRY', date: '2026-08-10' }];
    save();
  });
  const hub = await page.evaluate(() => teachingDashboardHTML());
  expect(hub).toContain('Zeynep');
  expect(hub).toContain('Band 7 by December'); // explicit link, not the word-overlap heuristic
  expect(hub).toMatch(/₺1,?200/);
  await page.evaluate(() => { state.students = []; state.goals = []; state.income = []; save(); flushSave(); });
});

test('finance shows a per-student Paid / Expected / Outstanding rollup', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    state.students = [{ id: 's-c', name: 'Caner', status: 'active', currency: 'TRY', rate: 1500, level: 'IELTS' }];
    state.income = [{ id: 'i1', studentId: 's-c', student: 'Caner', amount: 1500, currency: 'TRY', date: '2026-08-01' }];
    state.expectedIncome = [{ id: 'e1', studentId: 's-c', student: 'Caner', amount: 4500, currency: 'TRY', date: '2026-08-01' }];
    save(); flushSave();
  });
  await page.goto('/#finance');
  await page.waitForTimeout(600);
  const card = await page.locator('#fin-per-student').innerText();
  expect(card).toContain('Caner');
  expect(card).toMatch(/₺1,?500/);   // paid
  expect(card).toMatch(/₺3,?000 due/); // outstanding = 4500 - 1500
  await page.evaluate(() => { state.students = []; state.income = []; state.expectedIncome = []; save(); flushSave(); });
});

test('student dossier shows linked-goal chips with progress', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    state.students = [{ id: 's-d', name: 'Deniz', status: 'active', currency: 'USD', rate: 40, level: 'ESL' }];
    state.goals = [{ id: 'g-d', title: 'CEFR C1', color: '#605dff',
      keyResults: [{ id: 'k1', title: 'Vocab', target: 100, current: 40 }],
      linkedStudentIds: ['s-d'], createdAt: Date.now(), updatedAt: Date.now() }];
    save(); flushSave();
  });
  await page.goto('/#students');
  await page.waitForTimeout(400);
  await page.evaluate(() => openStudentDossier('s-d'));
  await page.waitForTimeout(400);
  const modal = await page.locator('.modal').innerText();
  expect(modal).toContain('CEFR C1');
  expect(modal).toMatch(/\d+%/);
  await page.evaluate(() => { state.students = []; state.goals = []; save(); flushSave(); });
});

test('an income entry with an unknown student name still renders without error', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    state.students = [];
    state.income = [{ id: 'i9', student: 'Ghost Student', amount: 99, currency: 'USD', date: '2026-08-01' }];
    save();
  });
  await page.reload();
  await page.waitForTimeout(500);
  await page.goto('/#finance');
  await page.waitForTimeout(500);
  const sid = await page.evaluate(() => state.income[0].studentId);
  expect(sid).toBeUndefined();
  expect(errors).toEqual([]);
  await page.evaluate(() => { state.income = []; save(); });
});
