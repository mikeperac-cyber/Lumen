// @ts-check
// The week view builds each day's date at local midnight, then previously
// serialized it with toISOString() — which converts to UTC first. For a timezone
// ahead of UTC, that rolls the date back a day whenever the local clock is still
// inside the UTC offset window (e.g. 00:00-03:00 for UTC+3): "today" was highlighted
// on the wrong column, and every date under it was one column off. The bug never
// shows once the local time is far enough past midnight, which is why it went
// unnoticed — so this pins both the timezone AND the clock, not just the timezone.
const { test, expect } = require('@playwright/test');

test.use({ timezoneId: 'Asia/Istanbul' }); // UTC+3, no DST — a stable offset for the assertion

test('the schedule week view highlights the right day at 1am in an east-of-UTC timezone', async ({ page }) => {
  // 2026-08-29 01:00 local (UTC+3) = 2026-08-28 22:00 UTC. Well inside the window
  // where the UTC conversion would roll the date back a day if it were used.
  await page.clock.install({ time: new Date('2026-08-29T01:00:00+03:00') });

  await page.goto('/#schedule');
  await page.waitForFunction(() => typeof window.state === 'object' && window.state !== null);
  await page.waitForTimeout(500);

  await expect(page.locator('.sched-day-head.today')).toHaveCount(1);
  const shown = await page.locator('.sched-day-head.today .sched-day-date').textContent();
  expect(shown.trim(), 'the highlighted column must show the 29th, not the 28th or 30th').toBe('Aug 29');
});
