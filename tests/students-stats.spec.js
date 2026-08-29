// @ts-check
// The roster card and the student dossier compute the same "amount paid" figure two
// different ways. The dossier matches income by studentId first, falling back to the
// name string (app.js:10686, the FK-first pattern the v105 wedge established). The
// roster card's getStudentStats only ever compared `.student` against the name —
// never checked `.studentId` at all. Rename a student (or log income through a path
// that only sets the FK, e.g. attendance auto-bill after a rename) and the roster
// undercounts them while the dossier for the same student is correct.
const { test, expect } = require('@playwright/test');

test('a renamed student shows the same paid total on the roster card and in their dossier', async ({ page }) => {
  await page.goto('/#students', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.state === 'object' && window.state !== null);
  await page.waitForTimeout(500);

  await page.evaluate(() => {
    const now = Date.now();
    state.students = [{ id: 's1', name: 'New Name', level: 'B2', rate: 40, currency: 'USD', status: 'active', email: '', createdAt: now, updatedAt: now }];
    // Income logged before the student was renamed: the FK is right, the name string is stale.
    state.income = [{ id: 'i1', amount: 100, currency: 'USD', studentId: 's1', student: 'Old Name', type: 'ESL', date: '2026-08-01', createdAt: now, updatedAt: now }];
    save();
    renderView();
  });
  await page.waitForTimeout(400);

  const rosterText = await page.locator('[data-student-id="s1"]').innerText();
  expect(rosterText, 'roster card must count FK-linked income even when the name string is stale').toContain('100');

  await page.evaluate(() => window.__LUMEN_TEST.openStudentDossier('s1'));
  await page.waitForTimeout(300);
  const dossierText = await page.locator('.modal').innerText();
  expect(dossierText).toContain('100');
});
