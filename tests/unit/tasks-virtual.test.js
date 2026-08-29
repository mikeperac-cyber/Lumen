import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { visibleWindow } from '../../src/tasks/virtual.js';

/* The kanban columns render only the cards near the viewport and pad the rest with
   spacer divs. The maths decides which cards exist in the DOM at all, so a mistake
   here shows up as blank columns or jumping scroll — and it had no test. */

const items = (n) => Array.from({ length: n }, (_, i) => ({ id: 'i' + i }));
const EST = 100;

describe('visibleWindow', () => {
  it('reports an empty column', () => {
    const w = visibleWindow({ items: [], heights: {}, scrollTop: 0, clientHeight: 400, estHeight: EST });
    assert.deepEqual(w, { first: 0, last: -1, topPad: 0, bottomPad: 0, total: 0 });
  });

  it('renders everything when the column is shorter than the viewport', () => {
    const w = visibleWindow({ items: items(3), heights: {}, scrollTop: 0, clientHeight: 400, estHeight: EST });
    assert.equal(w.first, 0);
    assert.equal(w.last, 2);
    assert.equal(w.topPad, 0);
    assert.equal(w.bottomPad, 0);
  });

  it('windows a long column at the top, padding the tail', () => {
    const w = visibleWindow({ items: items(100), heights: {}, scrollTop: 0, clientHeight: 400, estHeight: EST });
    assert.equal(w.first, 0);
    assert.ok(w.last < 99, 'does not render all 100');
    assert.equal(w.topPad, 0);
    assert.ok(w.bottomPad > 0);
  });

  it('moves the window down as the column scrolls, padding the head', () => {
    const w = visibleWindow({ items: items(100), heights: {}, scrollTop: 2000, clientHeight: 400, estHeight: EST });
    assert.ok(w.first > 0, 'skips the cards above');
    assert.equal(w.topPad, w.first * EST, 'top spacer matches the skipped cards');
  });

  it('keeps the spacers and the rendered slice adding up to the full height', () => {
    // If this drifts, the scrollbar lies and the column jumps as you scroll.
    for (const scrollTop of [0, 500, 2000, 9999]) {
      const w = visibleWindow({ items: items(60), heights: {}, scrollTop, clientHeight: 400, estHeight: EST });
      const rendered = (w.last - w.first + 1) * EST;
      assert.equal(w.topPad + rendered + w.bottomPad, w.total, `at scrollTop ${scrollTop}`);
    }
  });

  it('clamps to the last card when scrolled past the end', () => {
    const w = visibleWindow({ items: items(10), heights: {}, scrollTop: 100000, clientHeight: 400, estHeight: EST });
    assert.equal(w.last, 9);
    assert.ok(w.first <= 9);
  });

  it('prefers a measured height over the estimate', () => {
    const heights = { i0: 300 };
    const w = visibleWindow({ items: items(10), heights, scrollTop: 0, clientHeight: 400, estHeight: EST });
    assert.equal(w.total, 300 + 9 * EST);
  });
});
