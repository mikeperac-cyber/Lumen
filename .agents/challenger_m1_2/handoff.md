# Challenger 2 Handoff Report — Milestone M1 (Vault Subsystem)

## 1. Observation

Direct empirical observations and execution results:

1. **Test Suite Executions**:
   - `npx playwright test tests/vault.spec.js`:
     - 10 tests executed, 10 passed (0 failed), duration ~52.7s.
     - Coverage includes: link CRUD via UI, PDF upload (<5MB) via file input, size limit guards, tag and type filters, collection creation, moves and deletion to unsorted (`__none`), dashboard vault widget pinning and counts, task-vault two-way link round-trip, global search `>vault` filtering, state reload persistence (LS + IDB), `vaultGuessType` non-recursing classification, and auto-detect file modal handling.
   - `npm run test:unit` (`vitest run`):
     - 26 test files executed, 358 tests passed (0 failed), duration ~1.62s.
     - `tests/unit/vault.test.js`: 6 test cases passed (100%).
     - `tests/unit/vault-view.test.js`: 36 test cases passed (100%).

2. **Subsystem Implementations**:
   - `src/vault/store.js`:
     - `vaultGuessType(fileName, mime)`: Correctly handles mime prefixes (`image/`, `video/`), exact mimes (`application/pdf`, `text/plain`), document mimes (`docMimes` set), spreadsheet mimes (`sheetMimes` set), extension fallbacks (`pdf`, `doc`, `docx`, `odt`, `rtf`, `txt`, `md`, `xls`, `xlsx`, `csv`, `ods`, `png`, `jpg`, `jpeg`, `gif`, `webp`, `svg`, `bmp`, `ico`, `mp4`, `mov`, `avi`, `webm`, `mkv`), and defaults to `link`.
     - `vaultBlobGet(key)`: Opens IDB object store `blobs` in `readonly` mode and retrieves blob safely returning `null` if not found.
     - `vaultBlobPut(key, blob)`: Writes binary blob via IDB `readwrite` transaction.
     - `vaultBlobDelete(key)`: Deletes key via IDB `readwrite` transaction.
     - `vaultQuotaUsed(state)`: Sums `v.size` across all vault items.
     - Constants: `VAULT_MAX_FILE = 10 * 1024 * 1024` (10MB per file), `VAULT_SOFT_CAP = 100 * 1024 * 1024` (100MB soft cap).
   - `src/vault/view.js` / `src/vault/views.js`:
     - Clean pure view rendering (`vaultCardHTML`, `vaultRowHTML`, `vaultViewHTML`, `vaultWidgetHTML`, `vaultModalHTML`, `vaultLinkPickerHTML`).
     - Pure dependency injection with zero side-effects.
   - `app.js` (lines 5058–5366 & 10360–10425):
     - File size guards: `f.size > VAULT_MAX_FILE` rejects files >10MB with toast notification.
     - Quota guard: `vaultQuotaUsed() + f.size > VAULT_SOFT_CAP + 5*1024*1024` enforces hard cutoff with warning.
     - Collection filtering: `vaultFilter.collection === '__none'` filters items where `!v.collectionId`.
     - Collection deletion: Deleting a collection resets associated items' `collectionId = null`, assigning metadata and sync tombstones.
     - Search prefix filtering: `q.startsWith('>vault')` and command mode `cmdWord === 'vault'` isolate search to Vault items and vault commands only.

---

## 2. Logic Chain

1. **`vaultGuessType` Correctness & Immunity to Recursion**:
   - `vaultGuessType` in `src/vault/store.js` is pure and uses no recursive delegators.
   - M1 fix resolved previous issue where `app.js` delegated back to itself.
   - Tested 30+ input variations (uppercase `.PDF`, `.XLSX`, compound `.tar.gz`, dotted filenames, null/empty strings, mime priorities). All returned expected classifications.
2. **`vaultBlobGet` & IDB Resilience**:
   - Missing keys resolve to `null` without throwing `NotFoundError` or hanging the transaction.
   - Storing, retrieving, and deleting binary blobs succeeds across sequential and concurrent operations.
   - Atomic rollback in `app.js:5334` ensures that if metadata saving fails, newly written blobs are removed to prevent orphan IDB leaks.
3. **File Size Limit Guards & Quota**:
   - File uploads under 5MB (e.g. 1MB PDF) pass all validation checks and calculate sizes correctly.
   - Files exceeding `VAULT_MAX_FILE` (10MB) are prevented from entering IDB and trigger user notifications.
   - Quota tracking dynamically evaluates total byte usage.
4. **Collection Moves & Unsorted (`__none`)**:
   - Assigning `collectionId` places items in that collection view.
   - Assigning `null` or deleting a collection sets `collectionId: null`, which matches `vaultFilter.collection === '__none'`.
   - Modals and drop-downs accurately reflect and update collection states.
5. **Search Palette `>vault` Isolation**:
   - When query begins with `>vault`, search rows are built exclusively from `getSearchVaultHay()` items and the `Open Vault` command.
   - Non-vault items (tasks, goals, habits, notes, students) are completely excluded from the result set.
   - Selecting a result from search correctly navigates to `#vault` and opens the item modal.

---

## 3. Caveats

1. **Flaky Timing Threshold in Virtual Scroll Test**:
   - `tests/unit/adversarial-virtual.test.js` has a strict `< 10ms` timing assertion for 10,000 item calculations. On cold runs / CPU throttles, this may measure ~10.2ms–11.5ms. This is an adversarial test timing sensitivity, not a functional bug in Vault or M1 architecture.
2. **Soft Quota Behavior**:
   - Soft quota (100MB) allows uploads up to 105MB with warnings (`toastQuota`) before hard-blocking. This is by design.

---

## 4. Conclusion & Explicit Verdict

**Verdict: APPROVE**

The Vault subsystem and its integration with Core App are robust, fully decoupled, and resilient against edge cases:
- `vaultGuessType`, `vaultBlobGet`, and size guards operate as specified without errors or regressions.
- Collection creation, moves, and deletion-to-unsorted (`__none`) behave accurately.
- `>vault` search isolation works cleanly in global search.
- Full E2E (`tests/vault.spec.js`) and Unit (`npm run test:unit`) test suites pass with 100% success.

---

## 5. Verification Method

To independently reproduce and verify:

```powershell
# 1. Run Playwright Vault E2E test suite
npx playwright test tests/vault.spec.js

# 2. Run Vitest Unit test suite
npm run test:unit

# 3. Run Vault unit test files directly
npx vitest run tests/unit/vault.test.js tests/unit/vault-view.test.js
```
