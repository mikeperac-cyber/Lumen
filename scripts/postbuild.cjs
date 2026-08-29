/* Turns `vite build` output into a complete, self-contained artifact.

   Vite bundles what index.html references, but the PWA contract lives in files
   nothing imports: the service worker, the web manifest, and the icons the manifest points at.
   Without this step dist/ ships no sw.js at all and manifest icons may 404.

   Order matters: copy the statics first, clean up any hashed manifest chunk,
   normalize index.html manifest reference, then derive the precache list by walking
   the finished dist/, then copy the regenerated sw.js in. */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');

/* Reachable only through the manifest's absolute icon paths, or probed directly by
   iOS/PWA install — Vite never sees them, so nothing else would place them in the artifact. */
const STATIC = [
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png',
  'apple-touch-icon.png',
  'manifest.webmanifest',
];

function copyStatics() {
  for (const name of STATIC) {
    const from = path.join(root, name);
    if (!fs.existsSync(from)) throw new Error(`postbuild: missing ${name} at repo root`);
    fs.copyFileSync(from, path.join(dist, name));
  }
}

function cleanHashedManifest() {
  const assetsDir = path.join(dist, 'assets');
  if (fs.existsSync(assetsDir)) {
    for (const f of fs.readdirSync(assetsDir)) {
      if (f.startsWith('manifest-') && f.endsWith('.webmanifest')) {
        fs.unlinkSync(path.join(assetsDir, f));
      }
    }
  }
}

function fixHtmlManifest() {
  const htmlPath = path.join(dist, 'index.html');
  if (fs.existsSync(htmlPath)) {
    let html = fs.readFileSync(htmlPath, 'utf8');
    html = html.replace(/<link([^>]+rel="manifest"[^>]+href=")[^"]+(")/, '<link$1manifest.webmanifest$2');
    fs.writeFileSync(htmlPath, html);
  }
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.vite') continue; // build metadata, not shipped
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else out.push('./' + path.relative(dist, p).split(path.sep).join('/'));
  }
  return out;
}

function writeShell() {
  // './' is the navigation entry; index.html is its concrete file.
  const files = new Set(['./', ...walk(dist)]);
  files.delete('./sw.js'); // a service worker never precaches itself
  const shell = [...files].sort().map((f) => `  '${f}',`).join('\n');
  const swPath = path.join(root, 'sw.js');
  const sw = fs.readFileSync(swPath, 'utf8');
  if (!/const SHELL = \[/.test(sw)) throw new Error('postbuild: SHELL array not found in sw.js');
  fs.writeFileSync(swPath, sw.replace(/const SHELL = \[[\s\S]*?\];/, `const SHELL = [\n${shell}\n];`));
  return files.size;
}

if (!fs.existsSync(dist)) throw new Error('postbuild: dist/ not found — run vite build first');
copyStatics();
cleanHashedManifest();
fixHtmlManifest();
const n = writeShell();
fs.copyFileSync(path.join(root, 'sw.js'), path.join(dist, 'sw.js'));
console.log(`postbuild: ${STATIC.length} statics copied, SHELL rebuilt with ${n} entries, sw.js shipped`);
