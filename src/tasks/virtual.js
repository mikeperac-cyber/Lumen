// src/tasks/virtual.js — windowing maths for the kanban column bodies.
//
// A column may hold hundreds of cards. Rendering them all is what made long boards
// slow, so only the cards near the viewport go into the DOM and the rest become two
// spacer divs. This module decides the slice; app.js owns the DOM: it measures each
// rendered card's height, feeds the measurements back in on the next pass, and binds
// the result. Pure and framework-free, so the edge cases are testable.

/** Cards above the viewport that are still rendered, to hide the seam while scrolling. */
export const OVERSCAN_TOP = 200;
/** Same below the viewport — larger, because scrolling down is the common direction. */
export const OVERSCAN_BOTTOM = 500;

/**
 * @typedef {object} WindowResult
 * @property {number} first index of the first card to render
 * @property {number} last  index of the last card to render (-1 when empty)
 * @property {number} topPad    spacer height above the slice
 * @property {number} bottomPad spacer height below it
 * @property {number} total     full content height
 */

/**
 * Which cards to render for a given scroll position.
 *
 * Heights are per-card and measured after render, so the first pass runs entirely on
 * `estHeight` and self-corrects once real heights arrive.
 *
 * @param {object} o
 * @param {Array<{id: string}>} o.items
 * @param {Record<string, number>} o.heights measured heights by card id
 * @param {number} o.scrollTop
 * @param {number} o.clientHeight
 * @param {number} o.estHeight fallback for a card not yet measured
 * @returns {WindowResult}
 */
export function visibleWindow({ items = [], heights = {}, scrollTop = 0, clientHeight = 400, estHeight = 0 }) {
  if (!items.length) return { first: 0, last: -1, topPad: 0, bottomPad: 0, total: 0 };

  const hOf = (t) => (t && heights[t.id]) || estHeight;

  // `first` starts past the end so "no card reaches the scroll position" is
  // representable. app.js initialised it to 0, which the clamp below could never
  // catch: when a filter shortened a column that was scrolled down, `first` stayed 0
  // while `y` ran to the full content height, giving a full-height top spacer above
  // cards starting at index 0 — a blank column with the wrong slice under it.
  let y = 0, first = items.length;
  for (let i = 0; i < items.length; i++) {
    if (y + hOf(items[i]) > scrollTop - OVERSCAN_TOP) { first = i; break; }
    y += hOf(items[i]);
  }
  if (first >= items.length) { first = Math.max(0, items.length - 1); y -= hOf(items[first]); }

  let y2 = 0, last = items.length - 1;
  for (let i = first; i < items.length; i++) {
    y2 += hOf(items[i]);
    if (y + y2 > scrollTop + clientHeight + OVERSCAN_BOTTOM) { last = i; break; }
  }

  let total = 0;
  for (let i = 0; i < items.length; i++) total += hOf(items[i]);

  return { first, last, topPad: Math.max(0, y), bottomPad: Math.max(0, total - (y + y2)), total };
}
