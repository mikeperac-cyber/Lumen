// @ts-check
// `vercel.json` ships dist/, so dist/ — not the source tree — is the artifact users
// load. These pin the parts of the PWA contract that only exist at build output:
// the service worker file, the manifest and its icons, and a precache list whose
// entries all resolve. tests/offline.spec.js boots this same artifact with the server dead.
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

// dist/ is gitignored and built on demand; CI builds before it tests.
test.beforeAll(() => {
  if (!fs.existsSync(path.join(DIST, 'index.html'))) {
    throw new Error('dist/ is missing or empty — run `npm run build` first');
  }
});

const distFile = (rel) => path.join(DIST, rel.replace(/^\.\//, ''));
const shellOf = (swSource) => {
  const m = swSource.match(/const SHELL = \[([\s\S]*?)\];/);
  if (!m) throw new Error('SHELL array not found in sw.js');
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
};

test('the built artifact ships a service worker at its root', () => {
  expect(fs.existsSync(path.join(DIST, 'sw.js'))).toBe(true);
});

test('every sw.js SHELL entry resolves to a file in the artifact', () => {
  const shell = shellOf(fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8'));
  const missing = shell.filter((rel) => rel !== './' && !fs.existsSync(distFile(rel)));
  expect(missing).toEqual([]);
});

test('the web manifest resolves, and so do its icons and start_url', () => {
  const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
  const href = (html.match(/<link[^>]+rel="manifest"[^>]+href="([^"]+)"/) || [])[1];
  expect(href, 'index.html declares a manifest').toBeTruthy();

  const manifestPath = distFile(href);
  expect(fs.existsSync(manifestPath), `${href} exists`).toBe(true);

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  // Manifest URLs resolve against the MANIFEST's own directory, not the page's — a
  // content-hashed manifest under assets/ silently scopes the installed app there.
  const baseDir = path.dirname(manifestPath);
  const resolveRef = (u) => (u.startsWith('/') ? path.join(DIST, u.slice(1)) : path.resolve(baseDir, u));

  const unresolved = (manifest.icons || []).map((i) => i.src).filter((src) => !fs.existsSync(resolveRef(src)));
  expect(unresolved, 'every manifest icon resolves').toEqual([]);

  expect(resolveRef(manifest.start_url || './'), 'start_url points at the app root').toBe(path.resolve(DIST));
  expect(resolveRef(manifest.scope || './'), 'scope covers the app root').toBe(path.resolve(DIST));
});
