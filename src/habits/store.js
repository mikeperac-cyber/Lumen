// src/habits/store.js — habit streak arithmetic. Pure functions parameterized by
// "today" as an ISO string rather than reading the clock directly, so the same
// algorithm the app runs live is exactly what the tests exercise — no clock mocking.
import { isoDate } from '../lib/helpers.js';

export const MAX_STREAK_DAYS = 3650;

const stepDay = (iso, deltaDays) => {
  if (!iso || typeof iso !== 'string' || iso.length !== 10) return '';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + deltaDays);
  return isoDate(d);
};

/**
 * The active streak ending today. A frozen day (no check-in, but protected) neither
 * extends the count nor breaks it — it only bridges past it. If today itself is
 * neither checked nor frozen, counting starts from yesterday, since today hasn't
 * been missed yet, just not done.
 * @param {Record<string, boolean>} dates check-in map, ISO date -> true
 * @param {Record<string, boolean>} freezes streak-freeze map, ISO date -> true
 * @param {string} todayISO
 * @returns {number}
 */
export function currentStreak(dates, freezes, todayISO) {
  if (!dates || typeof dates !== 'object') return 0;
  const f = (freezes && typeof freezes === 'object') ? freezes : {};
  let streak = 0;
  let cursor = todayISO;
  if (!dates[cursor] && !f[cursor]) cursor = stepDay(cursor, -1);
  let iterations = 0;
  while (cursor && (dates[cursor] || f[cursor]) && iterations++ < MAX_STREAK_DAYS) {
    if (dates[cursor]) streak++;
    cursor = stepDay(cursor, -1);
  }
  return streak;
}

/**
 * The streak as of a given date — used by the Weekly Review to show "streak at week
 * end". `endISO` is clamped to today if it names a future date.
 *
 * Freeze-unaware by design (unlike currentStreak): if the queried date itself was not
 * checked, this silently reads the streak as of the day before instead of returning
 * zero — verified against the shipped algorithm, not assumed. That is what lets the
 * review show "the streak going into a week that ended without a check-in" rather
 * than reporting the week itself as streak-breaking.
 * @param {Record<string, boolean>} dates
 * @param {string} endISO
 * @param {string} todayISO
 * @returns {number}
 */
export function streakAsOf(dates, endISO, todayISO) {
  if (!dates || typeof dates !== 'object') return 0;
  let streak = 0;
  let cursor = endISO > todayISO ? todayISO : endISO;
  if (!dates[cursor]) cursor = stepDay(cursor, -1);
  let iterations = 0;
  while (cursor && dates[cursor] && iterations++ < MAX_STREAK_DAYS) {
    streak++;
    cursor = stepDay(cursor, -1);
  }
  return streak;
}

/**
 * The longest streak in the trailing ~365 days, freezes bridging runs the same way
 * currentStreak does (a frozen day preserves an existing run without adding to its
 * length). Never reads past `todayISO`.
 * @param {Record<string, boolean>} dates
 * @param {Record<string, boolean>} freezes
 * @param {string} todayISO
 * @returns {number}
 */
export function bestStreak(dates, freezes, todayISO) {
  if (!dates || typeof dates !== 'object') return 0;
  const f = (freezes && typeof freezes === 'object') ? freezes : {};
  let best = 0, cur = 0;
  let cursor = stepDay(todayISO, -364);
  if (!cursor) return 0;
  for (let i = 0; i < 400; i++) {
    if (dates[cursor]) { cur++; best = Math.max(best, cur); }
    else if (!f[cursor]) { cur = 0; }
    cursor = stepDay(cursor, 1);
    if (!cursor || cursor > todayISO) break;
  }
  return best;
}
