import { test, expect } from '@playwright/test';

test('Personal Schedule: customizable intervals — change 60→30 and preview updates', async ({ page }) => {
  await page.goto('/#schedule', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  // Personal Schedule title
  await expect(page.locator('#view-title')).toContainText('Personal Schedule', { timeout: 3000 });
  // Intervals button exists
  const intervalsBtn = page.locator('#sched-intervals');
  await expect(intervalsBtn).toBeVisible({ timeout: 3000 });
  await intervalsBtn.click();
  await page.waitForTimeout(500);
  // Modal should be visible
  const modal = page.locator('.modal');
  await expect(modal).toContainText('Personal Schedule Intervals', { timeout: 3000 });
  // Check start/end/interval fields exist
  await expect(page.locator('#ps-start')).toBeVisible();
  await expect(page.locator('#ps-end')).toBeVisible();
  await expect(page.locator('#ps-interval')).toBeVisible();
  // Change interval from 60 to 30 and verify preview updates to more intervals
  const previewBefore = await page.locator('#ps-preview').textContent();
  await page.selectOption('#ps-interval', '30');
  await page.waitForTimeout(400);
  const previewAfter = await page.locator('#ps-preview').textContent();
  // after should have more intervals than before (30 min has double of 60)
  expect(previewAfter).not.toEqual(previewBefore);
  expect(previewAfter).toMatch(/\d+ intervals/);
  // Extract counts
  const countBefore = parseInt((previewBefore.match(/(\d+) intervals/)||[])[1]||'0',10);
  const countAfter = parseInt((previewAfter.match(/(\d+) intervals/)||[])[1]||'0',10);
  expect(countAfter).toBeGreaterThan(countBefore);
  // Change interval to 90 and check preview reduces
  await page.selectOption('#ps-interval', '90');
  await page.waitForTimeout(400);
  const preview90 = await page.locator('#ps-preview').textContent();
  const count90 = parseInt((preview90.match(/(\d+) intervals/)||[])[1]||'0',10);
  expect(count90).toBeLessThan(countAfter);
  // Test advanced editing: add a custom interval via Advanced
  await page.click('summary:has-text("Advanced")');
  await page.waitForTimeout(300);
  const addBtn = page.locator('#ps-add-period');
  await expect(addBtn).toBeVisible();
  const beforeRows = await page.locator('#ps-advanced-list .field-row').count();
  await addBtn.click();
  await page.waitForTimeout(300);
  const afterRows = await page.locator('#ps-advanced-list .field-row').count();
  expect(afterRows).toBe(beforeRows + 1);
  // Cancel modal
  await page.click('button:has-text("Cancel")');
  await page.waitForTimeout(400);
  await expect(modal).toHaveCount(0);
  // Now test actual save: set 30 min and save, verify schedule grid has more periods
  await intervalsBtn.click();
  await page.waitForTimeout(400);
  await page.selectOption('#ps-interval', '30');
  await page.waitForTimeout(300);
  // ensure start 08:00 end 20:00 for predictable
  await page.fill('#ps-start', '08:00');
  await page.fill('#ps-end', '20:00');
  await page.waitForTimeout(300);
  await page.click('#ps-save');
  await page.waitForTimeout(900);
  // Schedule should now show 24 intervals (08:00-20:00 with 30 min = 24) OR 12 hours *2 =24
  const periodLabels = page.locator('.sched-period-label');
  const countPeriods = await periodLabels.count();
  // after save, periods should be 24 (or at least >12 which is default 12)
  expect(countPeriods).toBeGreaterThan(12);
  // Verify that a period label contains expected time e.g., 08:00 – 08:30
  await expect(page.locator('.sched-period-label').first()).toContainText('08:00');
  // Reset to default for cleanup
  await page.click('#sched-intervals');
  await page.waitForTimeout(400);
  await page.click('#ps-reset');
  await page.waitForTimeout(800);
  const resetCount = await page.locator('.sched-period-label').count();
  expect(resetCount).toBe(12); // default 12 periods
  // cleanup
  await page.evaluate(() => {
    // ensure no leftover personal schedule in state for next tests
    if (state.schedulePeriods) { state.schedulePeriods = null; if(state.settings) { delete state.settings.personalSchedule; delete state.settings.scheduleConfig; } save(); }
  });
});
