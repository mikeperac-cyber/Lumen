# Explorer 3 Handoff Report: Testing, CI/Rollout (R5) & Task Inventory

**Agent:** Explorer 3 (`explorer_survey_3`)  
**Parent Agent:** Orchestrator (`4ba36659-60ef-4fb3-9c74-13261b0e181d`)  
**Scope:** Survey of testing infrastructure, CI/Rollout gates (R5), and project task inventory (R1–R5)  
**Date:** 2026-08-29  

---

## 1. Observation

1. **Smoke Test Failure & Root Cause**:
   - Running `npx playwright test tests/smoke.spec.js` resulted in 19 test failures:
     ```
     Console errors on <view> view: ["Invalid or unexpected token"]
     ```
   - Running `node --check app.js` and `npm run build` directly reported:
     ```
     [PARSE_ERROR] Invalid Unicode escape sequence
     app.js:1:67
     import { setupTasksController } from './src/tasks/controller.js';\nimport { vaultBlobGet } from './src/vault/store.js';
     ```
   - `app.js:1` contains literal `\n` characters instead of a newline, causing immediate script compilation failure in both browsers and bundlers.
   - Calling `getSearchTasksHay()` at `app.js:10197` and `app.js:10588` references an undefined function (not present in `app.js` or exported from `src/tasks/`).
   - `vaultBlobGet` is imported malformed at `app.js:1` and called at `app.js:4945` and `app.js:4969`.

2. **Unit Test Suite & Coverage**:
   - Running `npm run test:unit` executes Vitest v4.1.11 and outputs:
     ```
     Test Files  24 passed (24)
     Tests       342 passed (342)
     ```
   - Running `npx vitest run --coverage` fails with:
     ```
     MISSING DEPENDENCY  Cannot find dependency '@vitest/coverage-v8'
     ```
   - `package.json` lacks `@vitest/coverage-v8` in `devDependencies`, and `vite.config.mjs` has no `test.coverage` section configured.
   - `src/lib/helpers.js` has functions (`safeAttr`, `attr`, `isoDate`, `todayISO`, `shiftDays`, `clamp`, `debounce`, `fmtFull`, `fmtWhen`) without dedicated assertions in `tests/unit/helpers.test.js`.

3. **Vite Chunk Budget**:
   - Inspecting `dist/assets/` shows `index-CdbXRSw3.js` is **552,158 bytes (552 KB)**.
   - The project target is a **250 KB chunk budget**.
   - No code-splitting via dynamic `import()` or Rollup `manualChunks` is implemented in `index.html` / `app.js`.
   - No automated budget check script exists in the repository.

4. **Playwright Multi-Browser Setup**:
   - `playwright.config.js` currently specifies a single configuration without a `projects` array:
     ```javascript
     module.exports = defineConfig({
       testDir: './tests',
       testMatch: '**/*.spec.js',
       timeout: 30_000,
       retries: 0,
       use: { baseURL: 'http://127.0.0.1:8092', headless: true },
       webServer: { command: 'npx serve . -l 8092 --no-clipboard', port: 8092 }
     });
     ```
   - `npx playwright --version` is 1.62.1. Chromium is installed locally; WebKit requires download or CI installation via `npx playwright install --with-deps chromium webkit`.

5. **CI Workflow**:
   - `.github/workflows/ci.yml` runs `npm run test:unit` and `npx playwright test --reporter=list`, but lacks:
     - Coverage gate (`npm run test:coverage`)
     - Chunk budget gate (`node scripts/check-chunk-budget.cjs`)
     - Explicit installation of webkit browser binary.

6. **Other Checklist Items (R1–R4)**:
   - `src/lib/merge.js:12-14, 227`: `applyMerge` uses expensive `key()` `JSON.stringify` serialization.
   - `src/habits/store.js:26, 51`: `currentStreak` and `streakAsOf` use uncapped `while` loops.
   - `scripts/postbuild.js`: Needs renaming to `.cjs` and manifest hash alignment.
   - `app.js:1177, 1188`: `openModal` / `closeModal` do not toggle the `inert` attribute on `#view-root`.

---

## 2. Logic Chain

1. **From Observation 1**: The immediate failure of all 19 smoke tests and `npm run build` is caused by the literal `\n` in `app.js:1` and missing `getSearchTasksHay`/`vaultBlobGet` declarations. Fixing these syntax and reference defects will unblock initial page boot and smoke test execution.
2. **From Observation 2**: Vitest unit testing is fully functional (342 passing tests), but enabling the 80% coverage gate on `src/lib` requires installing `@vitest/coverage-v8`, setting threshold configuration in `vite.config.mjs`, and adding unit tests for uncovered helpers in `src/lib/helpers.js`.
3. **From Observation 3**: The monolithic 552 KB JavaScript bundle exceeds the 250 KB budget by >2×. Code-splitting with dynamic `import()` for views and adding a CI gate script (`scripts/check-chunk-budget.cjs`) will enforce and maintain the 250 KB ceiling.
4. **From Observation 4 & 5**: Playwright can easily support both `chromium` and `webkit` by declaring `projects: [ { name: 'chromium', use: { ...devices['Desktop Chrome'] } }, { name: 'webkit', use: { ...devices['Desktop Safari'] } } ]` in `playwright.config.js` and updating `.github/workflows/ci.yml`.
5. **From Observation 6**: Requirements R1–R4 have well-defined, localized remediation targets in `src/tasks/`, `src/vault/`, `src/finance/`, `src/lib/merge.js`, `src/habits/store.js`, and `app.js`.

---

## 3. Caveats

- Playwright tests against `webkit` locally require running `npx playwright install webkit` if not already downloaded to `AppData/Local/ms-playwright`.
- Full coverage analysis of `src/lib` with exact percentages will run once `@vitest/coverage-v8` is installed.
- Dynamic `import()` code-splitting may alter how `sw.js` precaches `dist/` assets; `scripts/postbuild.cjs` must correctly walk all generated chunks in `dist/assets/`.

---

## 4. Conclusion

The testing and CI infrastructure is in a strong baseline state (342 unit tests green, full E2E spec suite in place), but requires key updates to meet Requirement R5:
1. Fix `app.js:1` syntax and missing symbols to unblock smoke and build validation.
2. Install `@vitest/coverage-v8` and configure 80% threshold gates for `src/lib/**`.
3. Split views with dynamic `import()`, achieving <=250KB per JS chunk, guarded by `scripts/check-chunk-budget.cjs`.
4. Configure Playwright `projects` for `chromium` and `webkit`.
5. Update `.github/workflows/ci.yml` and `package.json` scripts to run and enforce all gates.

---

## 5. Verification Method

To independently verify the findings:
1. **Reproduce Smoke Test Failure**:
   ```bash
   npx playwright test tests/smoke.spec.js
   ```
2. **Reproduce Build Syntax Error**:
   ```bash
   npm run build
   ```
3. **Verify Unit Tests**:
   ```bash
   npm run test:unit
   ```
4. **Inspect Bundle Size**:
   ```powershell
   Get-ChildItem -Path "dist/assets" -Filter "*.js" | Select-Object Name, Length
   ```
5. **Inspect Files**:
   - `app.js` (lines 1–5, 4945, 10197, 10588)
   - `playwright.config.js` (entire file)
   - `vite.config.mjs` (entire file)
   - `.github/workflows/ci.yml` (entire file)
   - `src/lib/merge.js` (lines 12–14, 227)
   - `src/habits/store.js` (lines 22–54)
