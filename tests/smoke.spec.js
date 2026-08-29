// @ts-check
const { test, expect } = require('@playwright/test');

const VIEWS = [
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

test.describe('Lumen smoke — zero console errors across all views', () => {
  for (const view of VIEWS) {
    test(`navigates to ${view} without errors`, async ({ page }) => {
      const errors = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      page.on('pageerror', (err) => {
        errors.push(err.message);
      });

      // Navigate directly via hash — works regardless of collapsed sidebar
      await page.goto(`/#${view}`);
      await page.waitForLoadState('domcontentloaded');

      // Give the view time to render and fire any deferred errors
      await page.waitForTimeout(500);

      expect(errors, `Console errors on ${view} view`).toEqual([]);
    });
  }
});
