// src/lib/helpers.js — XSS-safe HTML helpers for v103 task 11 + 16
// htmlEscape replaces `esc` (rename for clarity); safeAttr wraps attribute contexts.

/**
 * Escape a value for safe interpolation into HTML text or double-quoted attributes.
 * Mirrors app.js#esc but renamed to htmlEscape.
 * @param {unknown} s
 * @returns {string}
 */
export function htmlEscape(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Back-compat alias — app.js shim still calls `esc`
export const esc = htmlEscape;

/**
 * Escape for double-quoted HTML attribute context.
 * For now identical to htmlEscape (both escape ", ', <, >, &).
 * Separate function makes attribute-context audits explicit.
 * @param {unknown} s
 * @returns {string}
 */
export function safeAttr(s) {
  return htmlEscape(s);
}

/**
 * Build an attribute string safely: ` name="escapedValue"`.
 * @param {string} name
 * @param {unknown} value
 * @returns {string}
 */
export function attr(name, value) {
  return ` ${name}="${htmlEscape(value)}"`;
}

export function isoDate(d = new Date()) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
export const todayISO = () => isoDate();
export function shiftDays(n, from = new Date()) {
  const d = new Date(from); d.setDate(d.getDate() + n); return d;
}
export function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
export function debounce(fn, ms) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

/**
 * Human-readable byte size. Binary units, one decimal above 1 KiB.
 * @param {number} bytes
 * @returns {string}
 */
export function fileSizeStr(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/* Date and duration formatting. Pure — no state, no DOM. Moved out of app.js, which
   held byte-identical copies of the helpers above it and sole copies of these. */

/**
 * Short calendar date. The ISO string is read as LOCAL midnight: a bare
 * 'YYYY-MM-DD' parses as UTC, which renders the previous day west of Greenwich.
 * @param {string} dateStr ISO 'YYYY-MM-DD'
 * @returns {string}
 */
export function fmtShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Short calendar date with weekday. Same local-midnight rule as fmtShort.
 * @param {string} dateStr ISO 'YYYY-MM-DD'
 * @returns {string}
 */
export function fmtFull(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

/**
 * Date and time for a millisecond timestamp.
 * @param {number} ts
 * @returns {string}
 */
export function fmtWhen(ts) {
  return new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/**
 * Duration in seconds as `Xm Ys`, or `Ys` under a minute.
 * @param {number} sec
 * @returns {string}
 */
export function fmtDur(sec) {
  const m = Math.floor(sec / 60), s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/**
 * Coarse relative age. Clamped at zero, so a future timestamp reads "just now".
 * @param {number} ts millisecond timestamp
 * @returns {string}
 */
export function timeAgo(ts) {
  const diff = Math.max(0, Date.now() - ts);
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
}

/**
 * A currency amount led by its symbol — "$100", "₺500". Only USD and TRY are
 * recognised symbols; any other code falls back to the dollar sign, matching the
 * app's two supported currencies.
 * @param {number} v
 * @param {'USD'|'TRY'} [curr]
 * @returns {string}
 */
export function fmtM(v, curr = 'USD') {
  const num = (v || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return curr === 'TRY' ? `₺${num}` : `$${num}`;
}
