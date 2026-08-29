## 2026-08-29T20:40:59Z

You are Worker M4 on the Lumen project for Milestone M4: CI Gates & Code-Splitting Budget.
Your Working Directory: C:\Users\micha\Desktop\Lumen\.agents\worker_m4
Project Root: C:\Users\micha\Desktop\Lumen
Original Request: C:\Users\micha\Desktop\Lumen\.agents\ORIGINAL_REQUEST.md
PROJECT document: C:\Users\micha\Desktop\Lumen\PROJECT.md
TEST_INFRA document: C:\Users\micha\Desktop\Lumen\TEST_INFRA.md

Exclusive Write Ownership:
- `package.json`
- `vite.config.mjs`
- `playwright.config.js`
- `.github/workflows/ci.yml`
- `scripts/check-chunk-budget.cjs`
- `app.js`
- `tests/unit/helpers.test.js`
- `tests/unit/lib-coverage.test.js`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Mission for Milestone M4 (CI Gates & Code-Splitting Budget):
1. **Dynamic import() Route Splitting & 250KB Vite Chunk Budget (R2.3, R5.2)**:
   - Implement route-level dynamic `import()` in `renderView()` in `app.js` and/or Rollup `manualChunks` in `vite.config.mjs`.
   - Ensure every output `.js` chunk in `dist/assets/` is strictly under the 250KB budget (<= 256,000 bytes).
   - Set `chunkSizeWarningLimit: 250` in `vite.config.mjs`.
   - Create `scripts/check-chunk-budget.cjs` that checks each `.js` file in `dist/assets/` against the 250KB ceiling and exits with code 0 (pass) or 1 (fail).
   - Update `package.json` scripts: `"check:budget": "node scripts/check-chunk-budget.cjs"` and include in `"build"`.
2. **CI 80% Coverage Gate on `src/lib` (R5.1)**:
   - Install `@vitest/coverage-v8` in `devDependencies` (e.g. `npm i -D @vitest/coverage-v8@4.1.11` or npm install @vitest/coverage-v8).
   - Configure `vite.config.mjs` `test.coverage` with `provider: 'v8'`, `include: ['src/lib/**']`, and `thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 }`.
   - Expand `tests/unit/helpers.test.js` and add `tests/unit/lib-coverage.test.js` so that all functions in `src/lib` are thoroughly tested and `npm run test:coverage` passes with >= 80% coverage.
   - Add `"test:coverage": "vitest run --coverage"` to `package.json`.
3. **Multi-Browser Playwright Split (R5.3)**:
   - Update `playwright.config.js` to configure `projects: [ { name: 'chromium', use: { ...devices['Desktop Chrome'] } }, { name: 'webkit', use: { ...devices['Desktop Safari'] } } ]`.
   - Update `.github/workflows/ci.yml` to include coverage gate, budget gate, and Playwright multi-browser execution.
4. **Verification**:
   - `npm run build`
   - `npm run check:budget`
   - `npm run test:unit`
   - `npm run test:coverage`
   - `npx playwright test tests/smoke.spec.js`
5. Write a comprehensive `handoff.md` with verbatim test and coverage outputs, and send a message back to orchestrator when completed.

## 2026-08-29T20:50:13Z
**Context**: Milestone M4 (CI Gates & Code-Splitting Budget)
**Content**: Checking in on implementation status for dynamic import code splitting, @vitest/coverage-v8, check-chunk-budget.cjs, and Playwright chromium/webkit setup.
**Action**: Please report progress and test/coverage results.
