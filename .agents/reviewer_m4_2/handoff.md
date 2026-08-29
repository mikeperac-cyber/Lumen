# Review & Handoff Report — Milestone M4: CI Gates & Code-Splitting Budget

**Reviewer**: Reviewer 2 (`reviewer_m4_2` — Reviewer & Adversarial Critic)  
**Date**: 2026-08-30  
**Milestone**: M4 (CI Gates & Code-Splitting Budget)  
**Verdict**: **APPROVE**

---

## 1. Observation

Direct, independent empirical observation of all Milestone M4 deliverables and verification commands on the project:

### 1.1 Build & Chunk Budget Verification (`npm run build` & `npm run check:budget`)
- Running `npm run build` executed `vite build && node scripts/postbuild.cjs && npm run check:budget`.
- Vite generated 18 `.js` output chunks in `dist/assets/`.
- Every chunk is comfortably below the 250 KB (256,000 bytes) threshold:
  - `controller-DKTw1wv7.js`: 380 bytes (0.37 KB)
  - `core-3OYIuWTe.js`: 104,536 bytes (102.09 KB) — **Largest chunk**
  - `index-BBd1inbw.js`: 58,814 bytes (57.44 KB)
  - `peerjs.min-DPtSHinz.js`: 92,865 bytes (90.69 KB)
  - `rolldown-runtime-BX80bFGj.js`: 323 bytes (0.32 KB)
  - `routes-finance-voice-Bt1BgwQC.js`: 1,690 bytes (1.65 KB)
  - `routes-habits-vault-BZpV1hnP.js`: 66,173 bytes (64.62 KB)
  - `routes-overview-BBgeADmE.js`: 67,163 bytes (65.59 KB)
  - `routes-settings-schedule-DGw0c93Z.js`: 119 bytes (0.12 KB)
  - `routes-students-D61sWGed.js`: 95 bytes (0.09 KB)
  - `tasks-CWDXIMdG.js`: 40,200 bytes (39.26 KB)
  - `vault-worker-DHYv1t_m.js`: 1,273 bytes (1.24 KB)
  - `view-BfDU64Zh.js`: 329 bytes (0.32 KB)
  - Virtual chunks (`_virtual_lumen-chunk-*.js`): 82–99 bytes each
- Total chunks: 18/18 PASS. `scripts/check-chunk-budget.cjs` exited with status `0`.

### 1.2 Adversarial Stress Test on Budget Gate
- Injected an artificial 300,000 byte JS chunk `dist/assets/test-oversized.js` and ran `node scripts/check-chunk-budget.cjs`.
- Script immediately detected the violation, output `✗ FAIL | 300000 bytes (292.97 KB) | test-oversized.js`, printed `[check:budget] FAILURE: One or more JavaScript chunks exceeded the 250KB budget ceiling.`, and exited with status `1`.
- Cleaned up the test artifact and confirmed status `0` restored.

### 1.3 CI Coverage Gate on `src/lib/**` (`npm run test:coverage`)
- Running `npm run test:coverage` (`vitest run --coverage`) using `@vitest/coverage-v8` produced:
  - **Statements**: 94.38% (723/766) — Target: >= 80% (PASS)
  - **Branches**: 83.55% (508/608) — Target: >= 80% (PASS)
  - **Functions**: 94.65% (124/131) — Target: >= 80% (PASS)
  - **Lines**: 97.68% (549/562) — Target: >= 80% (PASS)
- Unit test suite: 29 test files, 417 passing tests, 0 failures.

### 1.4 Multi-Browser Playwright Smoke Tests (`npx playwright test tests/smoke.spec.js`)
- Executed `npx playwright test tests/smoke.spec.js` across configured matrix:
  - `chromium` (`Desktop Chrome`): 19/19 view routes tested, 0 console errors, 0 uncaught errors.
  - `webkit` (`Desktop Safari`): 19/19 view routes tested, 0 console errors, 0 uncaught errors.
- Total: 38/38 passed in 19.7s.

### 1.5 CI Workflow Configuration (`.github/workflows/ci.yml`)
- Contains steps: `npm ci`, `npm run build`, `npm run check:budget`, `npm run test:coverage`, `npx playwright install --with-deps chromium webkit`, and `npx playwright test --reporter=list`.

---

## 2. Logic Chain

1. **Integrity Assessment**:
   - Inspected `scripts/check-chunk-budget.cjs`: Uses genuine `fs.readdirSync`, `fs.statSync`, compares actual file sizes against 256,000 bytes, and handles missing folders, empty directories, and violations with non-zero exit codes. No hardcoded results or bypasses.
   - Inspected `tests/unit/lib-coverage.test.js`: Exercises real Web Crypto AES-GCM encryption/decryption, PBKDF2 key derivation, natural language task parsing, weekly schedule period generation with conflict detection, student FK backfilling, and state merge logic with tombstones. No mock bypasses or facade implementations.
2. **Code-Splitting Architecture**:
   - `vite.config.mjs` incorporates `routeCodeSplitPlugin` which dynamically extracts heavy view routes into virtual modules and imports them via `Promise.all([import(...), ...])` in the transformed bundle.
   - Rollup `manualChunks` successfully splits `tasks`, `vault`, `finance`, `students`, `habits`, `schedule`, and `notes` into segregated chunks, keeping every individual output JS chunk well below the 250KB threshold (maximum chunk size observed is 102.09 KB).
3. **Multi-Browser Verification**:
   - Playwright configuration defines distinct projects for Chromium and WebKit.
   - Smoke test navigates to all 19 views (`brief`, `dashboard`, `vault`, `review`, `tasks`, `projects`, `schedule`, `tags`, `goals`, `habits`, `achievements`, `notes`, `voice`, `activity`, `analytics`, `finance`, `students`, `settings`, `perf`) and validates clean console log state across both rendering engines.

---

## 3. Caveats & Adversarial Observations

1. **Full E2E Suite Concurrency (M5 Scope)**:
   - When running the entire legacy E2E suite (`npx playwright test` with 265 test cases across 2 browsers) on Windows, high parallel concurrency against the local static `serve` process can cause socket resets or connection timeouts if tests do not isolate storage or run without worker throttling.
   - *Recommendation for M5*: In `playwright.config.js`, configure `workers: process.env.CI ? 2 : 1` or test state reset fixtures so full suite execution remains deterministic under heavy load.
2. **Coverage Scope Filter**:
   - `src/lib/package.json` is listed in the v8 coverage table with 0% lines (due to `{ "type": "module" }`). Despite this, overall line coverage remains 97.68%, well above the 80% threshold. Adding `exclude: ['src/lib/package.json']` to `vite.config.mjs` test coverage configuration will keep the report strictly focused on JS source files.

---

## 4. Conclusion

All requirements for Milestone M4 (R2.3, R5.1, R5.2, R5.3) are satisfied with high quality, rigorous integrity, and full test pass rates:
- 250 KB chunk budget is actively enforced and satisfied (largest chunk is 102.09 KB).
- Automated CI budget gate script `scripts/check-chunk-budget.cjs` is wired to build and verified with positive and negative test cases.
- CI 80% coverage threshold is enforced on `src/lib/**` with 94.38% statements, 83.55% branches, 94.65% functions, and 97.68% lines.
- Multi-browser testing is established across Chromium and WebKit with 38/38 passing smoke tests.

**Verdict: APPROVE**

---

## 5. Verification Method

To independently reproduce the verification results:

```bash
# 1. Build and verify chunk budget
npm run build

# 2. Run budget check script directly
npm run check:budget

# 3. Run unit tests and verify 80% coverage gate on src/lib
npm run test:coverage

# 4. Run multi-browser smoke tests (Chromium + WebKit)
npx playwright test tests/smoke.spec.js
```

---

## 6. Quality Review Summary

**Verdict**: APPROVE

### Findings
- **[Minor] Coverage config includes `src/lib/package.json`**:
  - *Where*: `vite.config.mjs` line 116.
  - *Impact*: Low. `src/lib/package.json` appears with 0% lines, but aggregate coverage is 97.68% lines (threshold is 80%).
  - *Suggestion*: Add `exclude: ['src/lib/package.json']` in `coverage.exclude`.
- **[Minor] WebServer concurrency under full test suite**:
  - *Where*: `playwright.config.js` line 26.
  - *Impact*: Low for M4 (M4 smoke tests pass 38/38); relevant for M5 full suite run.
  - *Suggestion*: Set worker limits or timeout buffer for full 265-test E2E run.

### Verified Claims
- `npm run build` succeeds and triggers budget check → PASS
- `npm run check:budget` verifies all JS chunks <= 256,000 bytes → PASS (18 chunks, max 104,536 bytes)
- Negative budget violation exits with code 1 → PASS (verified with 300KB test chunk)
- `npm run test:coverage` exceeds 80% threshold across all dimensions → PASS (Stmts 94.38%, Branch 83.55%, Funcs 94.65%, Lines 97.68%)
- `npx playwright test tests/smoke.spec.js` passes 38/38 across Chromium and WebKit → PASS (0 console errors)

---

## 7. Adversarial Challenge Summary

**Overall risk assessment**: LOW

### Stress Test Results
- **Oversized Chunk Injection**: Injected 300KB dummy chunk → Budget script rejected with exit code 1 → PASS
- **Multi-Browser Rendering**: Evaluated 19 routes in Chromium and WebKit → 0 unhandled rejections, 0 console errors → PASS
- **Coverage Assertions**: Traced unit test assertions against source logic in `src/lib/` → Genuine behavior verified → PASS
- **Integrity Audit**: Checked for dummy facades, test score hardcoding, or bypassed requirements → None found → PASS
