import { describe, it, expect } from 'vitest';
import { visibleWindow, OVERSCAN_TOP, OVERSCAN_BOTTOM } from '../../src/tasks/virtual.js';

describe('Adversarial Stress Test: Virtual Scroll Maths', () => {
  const items = (n) => Array.from({ length: n }, (_, i) => ({ id: 'card_' + i }));

  it('handles negative scrollTop (iOS/macOS bounce scroll)', () => {
    const res = visibleWindow({
      items: items(50),
      heights: {},
      scrollTop: -250,
      clientHeight: 400,
      estHeight: 100
    });

    expect(res.first).toBe(0);
    expect(res.topPad).toBe(0);
    expect(res.last).toBeGreaterThan(0);
    expect(res.bottomPad).toBeGreaterThan(0);
    const rendered = (res.last - res.first + 1) * 100;
    expect(res.topPad + rendered + res.bottomPad).toBe(res.total);
  });

  it('handles fractional / sub-pixel scrollTop and clientHeight', () => {
    const res = visibleWindow({
      items: items(30),
      heights: {},
      scrollTop: 345.678,
      clientHeight: 412.33,
      estHeight: 90.5
    });

    expect(res.first).toBeGreaterThan(0);
    expect(res.last).toBeGreaterThanOrEqual(res.first);
    expect(res.topPad).toBeGreaterThanOrEqual(0);
    expect(res.bottomPad).toBeGreaterThanOrEqual(0);
    const rendered = (res.last - res.first + 1) * 90.5;
    expect(Math.abs((res.topPad + rendered + res.bottomPad) - res.total)).toBeLessThan(1e-5);
  });

  it('handles huge scrollTop far past column height without NaN or errors', () => {
    const res = visibleWindow({
      items: items(10),
      heights: {},
      scrollTop: 10_000_000,
      clientHeight: 400,
      estHeight: 100
    });

    expect(res.first).toBe(9);
    expect(res.last).toBe(9);
    expect(res.bottomPad).toBe(0);
    expect(res.topPad).toBe(9 * 100);
    expect(res.total).toBe(10 * 100);
    expect(res.topPad + 100 + res.bottomPad).toBe(res.total);
  });

  it('handles heterogeneous, dynamic, and extreme card heights', () => {
    const list = items(100);
    const heights = {};
    // Give chaotic heights ranging from 20px to 1500px
    list.forEach((item, idx) => {
      heights[item.id] = idx % 2 === 0 ? 40 : (idx % 5 === 0 ? 1200 : 150);
    });

    for (let scroll = 0; scroll <= 30000; scroll += 500) {
      const res = visibleWindow({
        items: list,
        heights,
        scrollTop: scroll,
        clientHeight: 600,
        estHeight: 100
      });

      expect(res.first).toBeGreaterThanOrEqual(0);
      expect(res.last).toBeGreaterThanOrEqual(res.first);
      expect(res.last).toBeLessThan(100);
      expect(res.topPad).toBeGreaterThanOrEqual(0);
      expect(res.bottomPad).toBeGreaterThanOrEqual(0);

      // Verify exact sum invariant
      let renderedSum = 0;
      for (let i = res.first; i <= res.last; i++) {
        renderedSum += heights[list[i].id];
      }
      expect(res.topPad + renderedSum + res.bottomPad).toBe(res.total);
    }
  });

  it('handles zero clientHeight or zero estHeight', () => {
    const res1 = visibleWindow({
      items: items(5),
      heights: {},
      scrollTop: 0,
      clientHeight: 0,
      estHeight: 100
    });
    expect(res1.first).toBe(0);
    expect(res1.last).toBeGreaterThanOrEqual(0);

    const res2 = visibleWindow({
      items: items(5),
      heights: {},
      scrollTop: 0,
      clientHeight: 400,
      estHeight: 0
    });
    expect(res2.first).toBe(0);
    expect(res2.total).toBe(0);
    expect(res2.topPad).toBe(0);
    expect(res2.bottomPad).toBe(0);
  });

  it('handles single item list across various scroll points', () => {
    const single = [{ id: 'single_task' }];
    const resTop = visibleWindow({ items: single, heights: { single_task: 120 }, scrollTop: 0, clientHeight: 400 });
    expect(resTop.first).toBe(0);
    expect(resTop.last).toBe(0);
    expect(resTop.topPad).toBe(0);
    expect(resTop.bottomPad).toBe(0);
    expect(resTop.total).toBe(120);

    const resScrolled = visibleWindow({ items: single, heights: { single_task: 120 }, scrollTop: 500, clientHeight: 400 });
    expect(resScrolled.first).toBe(0);
    expect(resScrolled.last).toBe(0);
    expect(resScrolled.topPad).toBe(0);
    expect(resScrolled.bottomPad).toBe(0);
  });

  it('handles massive column (10,000 items) calculation with zero latency', () => {
    const massive = items(10000);
    const start = performance.now();
    const res = visibleWindow({
      items: massive,
      heights: {},
      scrollTop: 500000,
      clientHeight: 800,
      estHeight: 100
    });
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(50); // Calculation must be sub-50ms even for 10k items
    expect(res.first).toBeGreaterThan(0);
    expect(res.last).toBeGreaterThan(res.first);
    expect(res.total).toBe(1000000);
    const rendered = (res.last - res.first + 1) * 100;
    expect(res.topPad + rendered + res.bottomPad).toBe(res.total);
  });
});
