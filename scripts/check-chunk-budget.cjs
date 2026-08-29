// scripts/check-chunk-budget.cjs
// Verifies that every generated .js chunk in dist/assets is <= 250KB (256,000 bytes).

const fs = require('fs');
const path = require('path');

const MAX_BYTES = 256000; // 250 KB (250 * 1024 = 256,000 bytes ceiling)
const distAssets = path.resolve(__dirname, '..', 'dist', 'assets');

if (!fs.existsSync(distAssets)) {
  console.error(`[check:budget] Error: directory not found: ${distAssets}. Run "npm run build" first.`);
  process.exit(1);
}

const files = fs.readdirSync(distAssets).filter((f) => f.endsWith('.js'));

if (files.length === 0) {
  console.error('[check:budget] Error: No .js chunks found in dist/assets.');
  process.exit(1);
}

let allPass = true;
console.log(`\nChecking Vite output JS chunk budget (<= ${MAX_BYTES.toLocaleString()} bytes / 250 KB):`);
console.log('='.repeat(75));

for (const file of files) {
  const filePath = path.join(distAssets, file);
  const stats = fs.statSync(filePath);
  const size = stats.size;
  const sizeKB = (size / 1024).toFixed(2);
  const pass = size <= MAX_BYTES;

  const status = pass ? '✓ PASS' : '✗ FAIL';
  console.log(`${status.padEnd(8)} | ${size.toString().padStart(8)} bytes (${sizeKB.padStart(6)} KB) | ${file}`);

  if (!pass) {
    allPass = false;
  }
}

console.log('='.repeat(75));

if (!allPass) {
  console.error(`\n[check:budget] FAILURE: One or more JavaScript chunks exceeded the 250KB budget ceiling.`);
  process.exit(1);
}

console.log(`\n[check:budget] SUCCESS: All ${files.length} JavaScript chunks are within the 250KB budget ceiling.\n`);
process.exit(0);
