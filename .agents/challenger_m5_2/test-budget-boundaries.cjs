const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

console.log('--- Testing check-chunk-budget.cjs Boundary Conditions ---');

const ROOT = 'C:\\Users\\micha\\Desktop\\Lumen';
const SCRIPT = path.join(ROOT, 'scripts', 'check-chunk-budget.cjs');
const TEST_DIR = path.join(ROOT, '.agents', 'challenger_m5_2', 'temp_dist');
const ASSETS_DIR = path.join(TEST_DIR, 'assets');

function cleanup() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

const scriptCode = fs.readFileSync(SCRIPT, 'utf8');

function runBudgetCheck(filesMap, customAssetsDir) {
  cleanup();
  const targetDir = customAssetsDir !== undefined ? customAssetsDir : ASSETS_DIR;
  if (targetDir) {
    fs.mkdirSync(targetDir, { recursive: true });
    for (const [filename, size] of Object.entries(filesMap)) {
      const p = path.join(targetDir, filename);
      const buf = Buffer.alloc(size, 97);
      fs.writeFileSync(p, buf);
    }
  }

  const testScriptPath = path.join(ROOT, '.agents', 'challenger_m5_2', 'test-budget-runner.cjs');
  const dirLiteral = JSON.stringify(targetDir ? targetDir : path.join(TEST_DIR, 'nonexistent'));
  const modifiedCode = scriptCode.replace(
    /const distAssets = path\.resolve\(__dirname, '\.\.', 'dist', 'assets'\);/,
    'const distAssets = ' + dirLiteral + ';'
  );
  fs.writeFileSync(testScriptPath, modifiedCode);

  const res = spawnSync(process.execPath, [testScriptPath], { encoding: 'utf8' });
  return {
    status: res.status,
    stdout: res.stdout,
    stderr: res.stderr
  };
}

const tests = [
  {
    name: 'Exact 256,000 bytes boundary (ceiling)',
    files: { 'chunk-exact-256k.js': 256000 },
    expectedStatus: 0,
    shouldContain: 'PASS'
  },
  {
    name: '255,999 bytes (1 byte below ceiling)',
    files: { 'chunk-255999.js': 255999 },
    expectedStatus: 0,
    shouldContain: 'PASS'
  },
  {
    name: '256,001 bytes (1 byte above ceiling)',
    files: { 'chunk-256001.js': 256001 },
    expectedStatus: 1,
    shouldContain: 'FAIL'
  },
  {
    name: '0 bytes (empty file)',
    files: { 'chunk-zero.js': 0 },
    expectedStatus: 0,
    shouldContain: 'PASS'
  },
  {
    name: 'Mixed chunks: 5 passing + 1 oversized (256,001 bytes)',
    files: {
      'core.js': 104536,
      'routes-habits.js': 66173,
      'routes-overview.js': 67163,
      'index.js': 58814,
      'tasks.js': 40200,
      'bloated-vendor.js': 256001
    },
    expectedStatus: 1,
    shouldContain: 'FAILURE: One or more JavaScript chunks exceeded the 250KB budget ceiling'
  },
  {
    name: 'Mixed chunks: 6 chunks all under or equal to 256,000 bytes',
    files: {
      'core.js': 104536,
      'routes-habits.js': 66173,
      'routes-overview.js': 67163,
      'index.js': 58814,
      'tasks.js': 40200,
      'vendor-at-limit.js': 256000
    },
    expectedStatus: 0,
    shouldContain: 'SUCCESS: All 6 JavaScript chunks are within the 250KB budget ceiling'
  },
  {
    name: 'Non-JS files in assets (css, png, webmanifest) are ignored',
    files: {
      'chunk.js': 50000,
      'style.css': 500000,
      'image.png': 1000000
    },
    expectedStatus: 0,
    shouldContain: 'SUCCESS: All 1 JavaScript chunks are within the 250KB budget ceiling'
  },
  {
    name: 'No JS files in assets',
    files: { 'style.css': 1000 },
    expectedStatus: 1,
    shouldContain: 'Error: No .js chunks found in dist/assets'
  },
  {
    name: 'Missing dist/assets directory',
    customAssetsDir: null,
    files: {},
    expectedStatus: 1,
    shouldContain: 'Error: directory not found'
  }
];

let allPassed = true;
for (const t of tests) {
  const result = runBudgetCheck(t.files, t.customAssetsDir);
  const statusMatch = result.status === t.expectedStatus;
  const contentMatch = (result.stdout + result.stderr).includes(t.shouldContain);
  const pass = statusMatch && contentMatch;
  if (!pass) allPassed = false;
  console.log('[' + (pass ? 'PASS' : 'FAIL') + '] ' + t.name + ': exitCode=' + result.status + ' (expected ' + t.expectedStatus + '), contentMatched=' + contentMatch);
  if (!pass) {
    console.log('Stdout:', result.stdout);
    console.log('Stderr:', result.stderr);
  }
}

cleanup();
if (fs.existsSync(path.join(ROOT, '.agents', 'challenger_m5_2', 'test-budget-runner.cjs'))) {
  fs.unlinkSync(path.join(ROOT, '.agents', 'challenger_m5_2', 'test-budget-runner.cjs'));
}

console.log('\nBoundary Suite Result:', allPassed ? 'ALL PASS' : 'FAILURES DETECTED');
process.exit(allPassed ? 0 : 1);
