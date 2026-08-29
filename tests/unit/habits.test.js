import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { currentStreak, streakAsOf, bestStreak } from '../../src/habits/store.js';

// n days before 2026-08-29 (local); negative n reaches into the future.
const days = (n) => {
  const d = new Date(2026, 7, 29);
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const TODAY = days(0);
const asMap = (arr) => Object.fromEntries(arr.map((d) => [d, true]));

describe('currentStreak', () => {
  it('is zero with no check-ins at all', () => {
    assert.equal(currentStreak({}, {}, TODAY), 0);
  });

  it('counts consecutive days ending today', () => {
    const dates = asMap([days(0), days(1), days(2)]);
    assert.equal(currentStreak(dates, {}, TODAY), 3);
  });

  it('still counts yesterday’s streak when today has not been checked in yet', () => {
    const dates = asMap([days(1), days(2), days(3)]);
    assert.equal(currentStreak(dates, {}, TODAY), 3);
  });

  it('breaks the streak at the first genuinely missed day, not just an unchecked one', () => {
    const dates = asMap([days(0), days(1), days(4), days(5)]); // gap at 2, 3
    assert.equal(currentStreak(dates, {}, TODAY), 2);
  });

  it('a frozen day keeps the streak alive without extending it', () => {
    // Checked today and two days ago; yesterday is frozen, not checked. Without the
    // freeze this would break at yesterday and streak would be 1 (today only); the
    // freeze bridges the gap without itself counting as a checked day, so 2 (day0 +
    // day2), not 3 — a frozen day preserves, it doesn't add.
    const dates = asMap([days(0), days(2)]);
    const freezes = asMap([days(1)]);
    assert.equal(currentStreak(dates, freezes, TODAY), 2);
  });

  it('a frozen (not checked) today does not count as an extra day, but preserves the streak', () => {
    const dates = asMap([days(1), days(2)]);
    const freezes = asMap([days(0)]);
    assert.equal(currentStreak(dates, freezes, TODAY), 2);
  });

  it('two consecutive frozen days still bridge a real streak on both sides', () => {
    const dates = asMap([days(0), days(3)]);
    const freezes = asMap([days(1), days(2)]);
    assert.equal(currentStreak(dates, freezes, TODAY), 2);
  });
});

describe('streakAsOf', () => {
  it('counts the run ending on the given date, ignoring anything after it', () => {
    const dates = asMap([days(0), days(1), days(2), days(5)]);
    assert.equal(streakAsOf(dates, days(1), TODAY), 2);
  });

  it('falls back to the streak as of the prior day when the queried date was not checked', () => {
    // Traced from the shipped algorithm, not assumed: querying an unchecked date does
    // NOT return 0 — it silently looks at the day before instead. Preserved as-is
    // because the Weekly Review depends on this exact reading ("streak going into
    // week end" even for a week that ended without a check-in).
    const dates = asMap([days(1), days(2)]);
    assert.equal(streakAsOf(dates, days(0), TODAY), 2);
  });

  it('clamps a future date to today, rather than reading past the end of history', () => {
    const dates = asMap([days(0), days(1)]);
    const future = days(-10); // 10 days after "today"
    assert.equal(streakAsOf(dates, future, TODAY), 2);
  });
});

describe('bestStreak', () => {
  it('is zero with no check-ins', () => {
    assert.equal(bestStreak({}, {}, TODAY), 0);
  });

  it('finds the longest run, not just the most recent one', () => {
    const dates = asMap([
      days(300), days(299), days(298), days(297), days(296), // a 5-day run, long ago
      days(0), days(1), // a 2-day run, current
    ]);
    assert.equal(bestStreak(dates, {}, TODAY), 5);
  });

  it('a frozen day bridges two runs into one for the purpose of "best", without counting itself', () => {
    // day3, day2 checked; day1 frozen (bridges, does not count); day0 checked.
    // The run's calendar span is 4 days, but only 3 of them were actually checked in —
    // "best" measures check-ins bridged by freezes, not the span of days covered.
    const dates = asMap([days(3), days(2), days(0)]);
    const freezes = asMap([days(1)]);
    assert.equal(bestStreak(dates, freezes, TODAY), 3);
  });

  it('never looks past today into the future', () => {
    // days(-1)/days(-2) are tomorrow and the day after — genuinely in the future
    // relative to TODAY. If the scan walked past today it would count them too.
    const dates = asMap([days(0), days(-1), days(-2)]);
    assert.equal(bestStreak(dates, {}, TODAY), 1);
  });
});
