# Explorer 3 Analysis Report: Testing, CI/Rollout (R5) & Task Inventory

**Date:** 2026-08-29  
**Explorer:** Explorer 3 (`explorer_survey_3`)  
**Scope:** Testing infrastructure, CI/Rollout gates (R5), and comprehensive project task inventory (R1–R5)

---

## 1. Executive Summary & Project Task Inventory

The Lumen project is an offline-first personal productivity operating system. A previous engineering sprint (builds v115–v139 documented in `docs/superpowers/specs/2026-08-29-lumen-v115-v139-design.md`) stabilized the handler contract, repaired the unit-test runner under Vitest, achieved accessibility parity across dialogs/forms/headings, and extracted major view markup into `src/`.

However, the latest state in `ORIGINAL_REQUEST.md` identifies remaining architectural, performance, hardening, and testing tasks across five core requirement areas (R1–R5):

### Comprehensive Status Checklist

| Req | Item / Task | Current Status | Findings & Exact Location |
| :--- | :--- | :--- | :--- |
| **R1** | **Architecture — Decompress `app.js`** | **PENDING / BROKEN** | `app.js` is currently 10,638 lines. Top of `app.js` has broken imports with literal `\n` (`app.js:1`). |
| R1.1 | Extract remaining `tasks` logic into `src/tasks/` | Partial | `src/tasks/view.js`, `src/tasks/virtual.js`, `src/tasks/controller.js` exist, but task event handling and state connections remain in `app.js`. |
| R1.2 | Extract remaining `vault` logic into `src/vault/` | Partial | `src/vault/store.js` and `src/vault/view.js` exist. `app.js` has dangling references to `vaultBlobGet` (lines 4945, 4969). |
| R1.3 | Extract remaining `finance` logic into `src/finance/` | Partial | `src/finance/store.js` and `src/finance/view.js` exist. Event wiring and DOM bindings remain in `app.js`. |
| R1.4 | Fix runtime boot ReferenceErrors (`getSearchTasksHay`, `vaultBlobGet`) | Broken | `getSearchTasksHay` is called at `app.js:10197, 10588` without a definition. `vaultBlobGet` import is malformed at `app.js:1`. |
| **R2** | **Performance — Load & Parse** | **PENDING** | App loads monolithic bundle without view code-splitting. |
| R2.1 | Implement code-splitting with dynamic `import()` | Pending | `index.html` loads all scripts statically; no lazy view loading in place. |
| R2.2 | Achieve 250KB Vite chunk budget | Pending | Current single JS bundle in `dist/assets/index-*.js` is **552 KB** (>2× over budget). |
| R2.3 | Defer non-critical saves with `requestIdleCallback` | Pending | Persistence saves in `flushSave` / auto-vault execute synchronously or without idle scheduling. |
| R2.4 | Fix rendering flicker in `virtual.js` | Pending | `src/tasks/virtual.js` card height cache / overscan calculation needs smoothing on rapid scroll. |
| **R3** | **Performance — Sync Merge** | **PENDING** | Sync merge relies on expensive `JSON.stringify` serialization. |
| R3.1 | Replace `key()` in `merge.js` with cheap signature (`updatedAt` max + `length`) | Pending | `src/lib/merge.js:12-14, 227` performs full `JSON.stringify` on sorted arrays before and after merge. |
| R3.2 | Cap recursive loops in `habits/store.js` | Pending | `currentStreak` and `streakAsOf` in `src/habits/store.js` use uncapped `while` loops without iteration bounds. |
| **R4** | **Hardening Part 2** | **PENDING** | Artifact and accessibility hardening remaining. |
| R4.1 | Fix `/manifest.webmanifest` hashing | Pending | `dist/` contains content-hashed manifest in `assets/`, while `index.html` points to unhashed manifest. |
| R4.2 | Rename `postbuild.js` to `.cjs` | Pending | File is `scripts/postbuild.js` under CommonJS; needs rename to `scripts/postbuild.cjs` and `package.json` script update. |
| R4.3 | Add `inert` polyfill/attribute to `#view-root` for modals | Pending | `openModal` (`app.js:1177`) and `closeModal` (`app.js:1188`) do not toggle `inert` on `#view-root`. |
| **R5** | **Testing & Rollout** | **PENDING** | CI gates and multi-browser configurations not yet configured. |
| R5.1 | Setup CI gate: 80% coverage on `src/lib` | Pending | `@vitest/coverage-v8` missing from devDependencies; `vite.config.mjs` has no coverage thresholds. |
| R5.2 | Setup CI gate: Vite chunk budget (<=250KB) | Pending | No automated budget checking script in build/CI. |
| R5.3 | Split Playwright into `chromium` and `webkit` | Pending | `playwright.config.js` has single default project without explicit multi-browser matrix. |

---

## 2. Test Suite Inspection & Failure Root Cause

### 2.1 E2E Test Suite (Playwright)
Located in `tests/` (22 spec files):
- `tests/smoke.spec.js` (iterates over 19 app views asserting zero console errors)
- `tests/behavioral.spec.js` (E2E interactive workflows)
- `tests/regression.spec.js` (pinned bug regressions)
- `tests/a11y-modal.spec.js`, `tests/a11y-forms.spec.js`, `tests/a11y-app.spec.js` (accessibility)
- `tests/dist-artifact.spec.js`, `tests/offline.spec.js` (PWA and offline service worker contracts)
- `tests/wedge.spec.js`, `tests/review-ritual.spec.js`, `tests/commit-timebox.spec.js`, `tests/personal-schedule.spec.js`, `tests/students-stats.spec.js`, `tests/vault.spec.js`, `tests/autovault.spec.js`, `tests/mobile.spec.js`, `tests/csp.spec.js`, `tests/hydration.spec.js`, `tests/module-scope.spec.js`, `tests/perf.spec.js`, `tests/schedule.spec.js`

### 2.2 Unit Test Suite (Vitest)
Located in `tests/unit/` (24 test files, 342 passing tests):
- `tests/unit/crypto.test.js`
- `tests/unit/finance-view.test.js`
- `tests/unit/finance.test.js`
- `tests/unit/focus-contrast.test.js`
- `tests/unit/gemini.test.js`
- `tests/unit/habits.test.js`
- `tests/unit/helpers.test.js`
- `tests/unit/merge.test.js`
- `tests/unit/normalize.test.js`
- `tests/unit/notes-view.test.js`
- `tests/unit/parser.test.js`
- `tests/unit/sanity.test.js`
- `tests/unit/schedule-overlap.test.js`
- `tests/unit/schedule-view.test.js`
- `tests/unit/schedule.test.js`
- `tests/unit/students-stats.test.js`
- `tests/unit/students-tabs.test.js`
- `tests/unit/students-view.test.js`
- `tests/unit/students.test.js`
- `tests/unit/tasks-view.test.js`
- `tests/unit/tasks-virtual.test.js`
- `tests/unit/vault-view.test.js`
- `tests/unit/vault.test.js`
- `tests/unit/xss.test.js`

### 2.3 Smoke Test Failure Diagnosis
When running `npx playwright test tests/smoke.spec.js`, all 19 view navigation tests fail with:
```
Console errors on <view> view: ["Invalid or unexpected token"]
```
**Root Cause:**
`app.js:1` was modified with a literal `\n` sequence:
```javascript
import { setupTasksController } from './src/tasks/controller.js';\nimport { vaultBlobGet } from './src/vault/store.js';
```
This causes an immediate JavaScript parse `SyntaxError` in browsers and in `vite build` (`[PARSE_ERROR] Invalid Unicode escape sequence`).

Furthermore, runtime execution reveals two additional missing identifiers in `app.js`:
1. `getSearchTasksHay()` at `app.js:10197` and `app.js:10588` (function missing from scope).
2. `vaultBlobGet(blobId)` at `app.js:4945` and `app.js:4969` (needs valid import from `./src/vault/store.js`).

---

## 3. Coverage Gate for `src/lib` (Target: 80%)

### 3.1 Target Modules in `src/lib/`
1. `src/lib/constants.js` — Core application constants
2. `src/lib/crypto.js` — AES-GCM encryption, PBKDF2 key derivation, PassHash
3. `src/lib/gemini.js` — AI daily focus client & timeout handling
4. `src/lib/globals.js` — Event dispatcher & DOM selector bindings
5. `src/lib/helpers.js` — HTML escaping, date/time formatters, clamp/debounce
6. `src/lib/merge.js` — LWW multi-master synchronization algorithm
7. `src/lib/parser.js` — Natural language task & token parser
8. `src/lib/schedule.js` — Interval math, overlap detection, grid builder
9. `src/lib/students.js` — Student statistics aggregation & revenue formatting
10. `src/lib/vault-worker.js` — Web Worker for PBKDF2 & AES crypto

### 3.2 Vitest Configuration & Coverage Provider
To enable coverage thresholds in Vitest:
1. Add `@vitest/coverage-v8` to `devDependencies` in `package.json`.
2. Configure `test.coverage` in `vite.config.mjs`:
```javascript
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    manifest: true,
    rollupOptions: { input: 'index.html' }
  },
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}', 'tests/unit/**/*.{test,spec}.{js,ts}'],
    environment: 'node',
    globals: false,
    pool: 'forks',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: ['src/lib/**'],
      exclude: ['src/lib/package.json'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80
      }
    }
  }
});
```

### 3.3 Test Coverage Gap Analysis & Missing Tests
To ensure `src/lib` comfortably meets and exceeds the 80% threshold across all metrics:
- **`src/lib/helpers.js`**: Add unit tests in `tests/unit/helpers.test.js` for:
  - `htmlEscape` / `safeAttr` / `attr` (attribute context escaping)
  - `isoDate` / `todayISO` / `shiftDays`
  - `clamp` (lower bound, upper bound, in-range)
  - `debounce` (delayed invocation, reset on subsequent calls)
  - `fmtFull` (full date with weekday)
  - `fmtWhen` (timestamp to formatted date/time)
- **`src/lib/merge.js`**: Add tests for the optimized signature check (`updatedAt` max + `length`), ensuring modifications in deep nested collections or deletions trigger `applyMerge` returning `true`.
- **`src/lib/globals.js`**: Add unit tests for DOM selector helpers (`$`, `$$`) and event bus dispatching under JSDOM or mock DOM.

---

## 4. Vite Chunk Budget CI Gate (Target: 250KB)

### 4.1 Current Chunk Size Analysis
Running `Get-ChildItem dist/assets/*.js` reveals:
- `index-CdbXRSw3.js`: **552 KB (552,158 bytes)** ❌ Exceeds 250KB budget by 120%.
- `peerjs.min-DPtSHinz.js`: **92.8 KB** ✅ Within budget.
- `vault-worker-Dvqvcv2c.js`: **1.27 KB** ✅ Within budget.

### 4.2 Code-Splitting Architecture
To reduce the main bundle size below 250KB:
1. **Dynamic `import()` for Views**: Implement lazy route/view loading in `renderView(viewName)`:
   - `src/finance/` (store + view)
   - `src/students/` (view + stats)
   - `src/vault/` (view + modal)
   - `src/notes/` (view + editor)
   - `src/schedule/` (view + timetable)
   - `src/tasks/` (kanban + modal)
2. **Rollup `manualChunks` in `vite.config.mjs`**:
   Split heavy vendored utilities or independent modules into dedicated chunks.

### 4.3 Automated CI Gate Script (`scripts/check-chunk-budget.cjs`)
Create a dedicated verification script to enforce the 250KB budget in local builds and CI:
```javascript
// scripts/check-chunk-budget.cjs
const fs = require('fs');
const path = require('path');

const MAX_BYTES = 250 * 1024; // 256,000 bytes
const assetsDir = path.join(__dirname, '..', 'dist', 'assets');

if (!fs.existsSync(assetsDir)) {
  console.error('❌ dist/assets directory not found. Please run build first.');
  process.exit(1);
}

const files = fs.readdirSync(assetsDir);
let hasError = false;

console.log('--- Vite Chunk Budget Gate Check (Limit: 250 KB) ---');
for (const file of files) {
  if (file.endsWith('.js')) {
    const fullPath = path.join(assetsDir, file);
    const stat = fs.statSync(fullPath);
    const sizeKB = (stat.size / 1024).toFixed(2);
    if (stat.size > MAX_BYTES) {
      console.error(`❌ [OVER BUDGET] ${file}: ${sizeKB} KB > 250 KB`);
      hasError = true;
    } else {
      console.log(`✅ [PASS] ${file}: ${sizeKB} KB <= 250 KB`);
    }
  }
}

if (hasError) {
  console.error('\nCI Gate Failed: One or more JavaScript chunks exceed the 250 KB limit.');
  process.exit(1);
} else {
  console.log('\nCI Gate Passed: All JavaScript chunks are within the 250 KB limit.');
}
```

---

## 5. Playwright Multi-Browser Configuration (`chromium` + `webkit`)

### 5.1 Project Configuration in `playwright.config.js`
Update `playwright.config.js` to define explicit browser projects using `@playwright/test`'s `devices`:
```javascript
// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.js',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: 'http://127.0.0.1:8092',
    headless: true,
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npx serve . -l 8092 --no-clipboard',
    port: 8092,
    reuseExistingServer: true,
  },
});
```

### 5.2 CI Workflow Integration (`.github/workflows/ci.yml`)
Update `.github/workflows/ci.yml` to install dependencies for both `chromium` and `webkit` and run all gate checks:
```yaml
name: CI
on:
  push:
    branches: [ main, feat/*, v103* ]
  pull_request:
    branches: [ main ]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - run: node scripts/check-chunk-budget.cjs
      - run: npm run test:coverage
      - run: npx playwright install --with-deps chromium webkit
      - run: npx playwright test --reporter=list
```

---

## 6. Comprehensive Test Runner Commands Reference

| Action | Command | Purpose / Acceptance Target |
| :--- | :--- | :--- |
| **Smoke Tests** | `npx playwright test tests/smoke.spec.js` | Zero console errors across all 19 views |
| **All E2E Specs** | `npm test` or `npx playwright test` | All 22 spec files pass in `chromium` & `webkit` |
| **Unit Tests** | `npm run test:unit` | All 342+ Vitest tests pass |
| **Unit Coverage Gate** | `npx vitest run --coverage` | >=80% lines, functions, branches, statements on `src/lib` |
| **Production Build** | `npm run build` | Bundles app into `dist/` and runs postbuild steps |
| **Chunk Budget Gate** | `node scripts/check-chunk-budget.cjs` | All `.js` assets <= 250 KB |
| **Full Local CI Gate** | `npm run test:unit && npm run build && node scripts/check-chunk-budget.cjs && npm test` | Complete verification before deployment |
