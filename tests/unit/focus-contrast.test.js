import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/* WCAG 2.2 SC 1.4.11 wants a focus indicator to reach 3:1 against adjacent colours.
   Lumen ships 15 palettes, so "looks fine on my theme" proves nothing — this reads the
   real :focus-visible rule out of styles.css, resolves its colour token in every
   palette, and measures. It fails if the rule goes away, if its colour changes to
   something weaker, or if a new theme is added with a palette that cannot carry it. */

const ROOT = path.join(import.meta.dirname, '..', '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

const hex = (h) => {
  h = h.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
const luminance = ([r, g, b]) => {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const declaredVars = (block) => {
  const out = {};
  for (const decl of block.split(';')) {
    const m = decl.match(/--([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,6}|var\(--[a-z0-9-]+\))\s*$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
};
// One level of var() indirection is enough: :root sets --text-strong: var(--text).
const resolve = (palette, token, seen = 0) => {
  const v = palette[token];
  if (!v) return null;
  const m = v.match(/^var\(--([a-z0-9-]+)\)$/);
  if (m) return seen > 4 ? null : resolve(palette, m[1], seen + 1);
  return hex(v);
};

function palettes() {
  const styles = read('styles.css');
  const start = styles.indexOf(':root');
  const base = declaredVars(styles.slice(start, styles.indexOf('}', start)));
  const out = { '(default)': base };
  const re = /html\[data-theme="([a-z-]+)"\]\s*\{([^}]*)\}/g;
  let m;
  const themes = read('themes.css');
  while ((m = re.exec(themes))) out[m[1]] = { ...base, ...declaredVars(m[2]) };
  return out;
}

/** The colour token the shipped :focus-visible rule actually uses. */
function focusRingToken() {
  const styles = read('styles.css');
  const rule = styles.match(/:focus-visible\s*\{([^}]*)\}/);
  assert.ok(rule, 'styles.css must define a :focus-visible rule');
  const outline = rule[1].match(/outline\s*:\s*[^;]*?var\(--([a-z0-9-]+)\)/);
  assert.ok(outline, 'the :focus-visible outline must use a theme token, not a fixed colour');
  return outline[1];
}

describe('focus indicator contrast (WCAG 2.2 SC 1.4.11)', () => {
  it('reaches 3:1 against the surface behind it in every palette', () => {
    const token = focusRingToken();
    const failures = [];
    for (const [name, palette] of Object.entries(palettes())) {
      const ring = resolve(palette, token);
      const surface = resolve(palette, 'surface');
      assert.ok(ring, `${name}: --${token} does not resolve`);
      assert.ok(surface, `${name}: --surface does not resolve`);
      const ratio = contrast(ring, surface);
      if (ratio < 3) failures.push(`${name} ${ratio.toFixed(2)}:1`);
    }
    assert.deepEqual(failures, [], `palettes below 3:1 using --${token}`);
  });

  it('covers every theme the app ships, so a new one cannot slip past', () => {
    // themes.css also carries per-theme component overrides, so count distinct names.
    const declared = new Set(read('themes.css').match(/html\[data-theme="[a-z-]+"\]/g) || []);
    assert.equal(Object.keys(palettes()).length, declared.size + 1, 'a theme in themes.css has no parsed palette');
  });
});
