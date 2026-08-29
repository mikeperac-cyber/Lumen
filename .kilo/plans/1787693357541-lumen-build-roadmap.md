# Lumen Current Build & Next Best Builds — Roadmap Plan

**Date:** 2026-08-28 (updated with code review findings)
**Base:** `app.js:13581` 691KB, `styles.css:2890` 137KB, `sw.js:v103`, `index.html?v=111`, 43 Playwright E2E green (`smoke 18, behavioral 14, regression 8, offline 1, commit-timebox 1, personal-schedule 1`)
**Deploy:** Vercel `cleanUrls:true`, `sw.js max-age=0`, PWA `manifest.webmanifest`, `peerjs.min.js` lazy
**Prior plan:** `.kilo/plans/1787530813042-lumen-optimization-plan.md` (10 optimizations) — shipped as v99→v102

---

## 0) Decisions Locked (Interview 2026-08-27 + Review 2026-08-28)

* **Zero-build lifted:** `Allow bundler` — next foundation may use build step. Previous constraint `vanilla, no bundler` is now out of scope.
* **Stack:** `Vite + Vitest` (Vercel native, ESM, fast). Not importmaps, not CRA/Webpack.
* **Priority:** `all of them` — tech debt + wedge depth + user value, ordered by shippability.
* **Horizon:** `3 builds`, each shippable alone: v103 Stabilize+Review → v104 Wedge → v105 Ritual/AI/Mobile
* **Review scope:** All findings (critical + high + medium + low) included as v103 tasks 10-22.
* **Review plan structure:** Single ordered task list — v103 original 1-9, then review tasks 10-22 interleaved by dependency.

**Constraints carried forward:** local-first (`localStorage` + IndexedDB `STATE_DB='lumen-state'`), AES-GCM vault, offline shell must stay green (`offline.spec.js:37`), no mandatory cloud, BYO Gemini key pattern.

---

## 1) Current Build v111 — As-Built Snapshot

### What shipped and works (verified)

* **Pillar A Loop:** Brief Commit Day `app.js:1849` 3 buckets + `getFirstCommittedTask:1869` seeds Focus; Link Graph `app.js:1882/1901` + Backlinks `app.js:1924` `[[Title]]` pill; Command Palette `app.js:12259` fuzzy `fuzzyScore:12268` + recents + `>habit/>note/>focus` quick-add parity; Focus→Habit `app.js:7322` `offerFocusHabitProtect()` on pomo complete
* **Pillar B Perf:** `_stateRev:697` invalidates `_dashMemo/_timeTrackMemo/_teachingMemo/_deadlinesMemo/_searchIndex` (`app.js:698`) + midnight `setInterval:715`; teaching `weaveRows:2692`; `MATRIX_PAGE=60:4229` + `IntersectionObserver:4945` auto-expand; `createListVirt:1975` for dash/notes/search; idle warm `app.js:12816`
* **Pillar C Ritual:** Daily Commit soft-nudge collapsed `app.js:2215`, Habit decay banner `app.js:8351` + day-of-week win-rate `app.js:8307`, Brief→Schedule→Focus wired via `focusTaskId`/`scheduleDay`/`schedulePeriod`
* **Pillar D Sovereignty:** Per-field `_tagColorMeta/_incomeTypesMeta/_expenseCategoriesMeta` + `syncMeta.tombstones` LWW `applyMerge` (merge.js:11); auto-vault `AUTO_VAULT_DB='lumen-vault-auto'` 3-slot rotating `autoVaultBackup:516` on `flushSave:719` if `settings.autoBackup`
* **Personal Vault (v107-v111):** `state.vaultItems[]`, `state.vaultCollections[]`, `lumen-vault` IDB store, dashboard widget + full `vault` view, `openVaultModal` CRUD, vault link picker in task/goal/note modals, search palette `>vault` prefix, drag-drop upload + preview, peer sync merge (`merge.js:161-224`).

### Debt / gaps (from code review 2026-08-28)

**Critical:**
- God file 691KB must be split (addressed by v103 task 2)
- XSS via `esc()` + `innerHTML` — 50+ `innerHTML` assignments, some with attribute-context interpolation
- `vaultGuessType` duplicated 3× (app.js:815, store.js:32, vault.test.js:5) — diverged
- Weak KDF: PBKDF2 100k iterations (crypto.js:45, crypto.js:163) — OWASP recommends 600k+

**High:**
- API key stored plaintext in `state.settings.geminiApiKey`, reused as auto-backup encryption fallback (app.js:737)
- `startAmbient` (app.js:250) leaks AudioContext nodes; binaural path merger never disconnected
- `b642buf(envelope.data).buffer` (vault-worker.js:21) fragile — `.buffer` can return wrong slice

**Medium:**
- Global namespace pollution — ~200 functions + ~40 mutable `let`/`const` at top level all become `window` props
- Inconsistent error handling — IDB failures silently swallowed (`load:692`), quota errors lost
- Regex parsing O(n·m) in parser.js:78-88 — builds regex per student, retests full text
- Undo snapshot budget (12MB) holds few snapshots with full-vault JSON; `pushUndoSnapshot:750` deduplicates only last
- Synchronous `localStorage.getItem` + `JSON.parse` + `normalizeState` on load path blocks first paint

**Low:**
- Magic numbers inline (5 toasts, 24ms debounce, 5000ms achievement interval, etc.)
- `void allKeys` dead code (merge.js:60)
- `openScheduleIntervalsModal` (app.js:1105-1197) — 90+ line HTML-in-JS template
- `startViewTransition` fallback uses magic 350ms timeout (app.js:1786)
- Test coverage gaps: no unit tests for `normalizeState`, `getBriefCandidates`, `goalProgress`, `habitStreak`, `commitBriefDay`

---

## 2) Build v103 — Stabilize Foundation + Code Review Fixes

**Goal:** Pay debt without changing UX. Make v111 behavior byte-identical but maintainable, secure, and guarded. Apply all code-review findings.

**Boundaries:** No new views, no UI redesign. Keep PWA offline contract `sw.js:21 usable()` and `vercel.json` headers. Keep `state` shape backwards-compatible (normalize via `normalizeState:545`). All fixes additive or internal — no user-facing behavior change except security hardening (stronger KDF, no API-key-as-encryption).

**Data flow:** `app.js` → split to `src/` modules bundled by Vite to `dist/`. Same dual-write LS+IDB, same `KEY='lumen.state.v1'`.

---

### Tasks (ordered, single list)

**=== Foundation (original v103) ===**

1. **Scaffold Vite** (`vite.config.js` `build.outDir=dist`, `base:./`, `manifest: true`), preserve `cleanUrls` via `vercel.json` rewrite. Vitest `include: ['src/**/*.{test,spec}.{js,ts}','tests/unit/**']`.

2. **Split `app.js` by seam** (copy-paste, no logic change): `src/state/{store,persist,undo}.js`, `src/views/{brief,dashboard,schedule,habits,notes,finance,students,vault}.js`, `src/lib/{icons,helpers,crypto,parser,naturalLanguage}.js`, `src/sync/{peer,merge}.js`, `src/vault/{crypto,autoVault,store}.js`, `src/perf/memo.js`. Keep `app.js` as re-export shim until cutover. Move `vaultGuessType` import from `src/vault/store.js` into any module that needs it (removes duplication — see task 10).

3. **Persist `_autoVaultIdx`** — store `autoVaultNextSlot` in `localStorage` or IDB `AUTO_VAULT_STORE` meta key, read on `autoVaultDb()` init, write on `autoVaultBackup`.

4. **Add CI** `.github/workflows/ci.yml` (ubuntu-latest, `npm ci`, `npm run build`, `npm run test:unit`, `npx playwright test --reporter=list`).

5. **Add unit tests** (Vitest, no DOM where possible): `parseNaturalLanguageTask`, `deriveVaultKey/encryptVaultBackup/decryptVaultBackup`, `generatePeriods` edge cases (break skip, start>=end, interval bounds), `applyMerge` LWW tombstones, `getPeriods` fallback, `linkGraphForTask`/`renderBacklinks`, `fuzzyScore`.

6. **Add perf regression tests** (Playwright): seed 2000 tasks (`tests/perf/*.spec.js`) assert `dashboard` `<50ms` via `perfLog`, matrix initial `<16ms`. Add offline conflict test: `tagColors` edit vs delete timestamp winner.

7. **Add auto-vault round-trip test:** enable `settings.autoBackup`, mutate, assert IDB `AUTO_VAULT_DB` has encrypted blob, clear `localStorage`, restore via `autoVaultList`+decrypt.

8. **Salt sync passphrase:** `app.js:8248` `hashPass(p)` currently calls `hashPassLegacy(p)` (unsalted). Wire it to `window.LumenLib.crypto.hashPass(p, syncMeta.passSalt)`. Migration: `syncMeta.passHashV === 2` detects v2; on first v2 set, generate `syncMeta.passSalt = randomSaltB64()` and re-hash. Peers with `passV: 1` still validated via `hashPassLegacy` (backward compat — crypto.js:145).

9. **Bump `sw.js`** `VERSION='lumen-cache-v103'` + `index.html` `?v=103`, add Vite `?v=` hash for cache bust, keep `ignoreSearch` handling.

**=== Code Review Findings (critical → low) ===**

10. **Deduplicate `vaultGuessType`** (critical, correctness): Delete the copy at `app.js:815-835` and the one in `vault.test.js:5-22`. Import from `src/vault/store.js` (single source of truth). After Vite split (task 2), modules `import { vaultGuessType } from '../vault/store.js'`. Update all 3 call sites. Run `node --check` + unit tests to confirm identical behavior.

11. **XSS audit + harden `esc()`/`innerHTML`** (critical, security): Audit all 50+ `innerHTML` assignments (see review list). For each, confirm `esc()` wraps all dynamic content. Special attention to:
    - `app.js:2253` `state.settings.aiDailyFocus` — already `esc()`-wrapped but verify
    - `app.js:1924` `renderBacklinks` — re-escapes already-safe string, build HTML from user note content
    - `app.js:5378` cover image — `reader.result` interpolated into `src="${pendingCoverImage}"` (data URL, safe)
    - `app.js:5451` subtask row — `esc(text)` in attribute context (OK)
    Create `src/lib/helpers.js#htmlEscape()` (rename `esc` for clarity) and a `safeAttr()` helper for attribute contexts. Replace `esc()` calls incrementally. Add XSS regression test: inject `<img src=x onerror=alert(1)>` into a task title, assert it renders as text not DOM.

12. **Strengthen PBKDF2 iterations** (critical, security): Bump `deriveVaultKey` (crypto.js:45) from 100,000 to 310,000 iterations (OWASP 2023 minimum for PBKDF2-SHA256). Bump `hashPass` (crypto.js:163) to match. Version the envelope (`version: 1` → `version: 2` in `encryptVaultBackup`). On decrypt, read `version` and select iteration count (keep `version: 1` → 100k for backward compat with existing backups). Update `encryptInline`/`decryptInline` and worker to accept iteration count param. Add unit test: v1 envelope decrypts with 100k, v2 decrypts with 310k.

13. **Remove API-key-as-encryption-secret** (high, security): At `app.js:737`, change:
    ```js
    const pwd = state.settings.autoBackupPassword || state.settings.geminiApiKey || '';
    ```
    to:
    ```js
    const pwd = state.settings.autoBackupPassword || '';
    ```
    If `autoBackup` is enabled but `autoBackupPassword` is empty, skip auto-backup and show a toast nudging the user to set a dedicated backup password in Settings. Never derive encryption material from the Gemini API key.

14. **Fix `startAmbient` AudioContext node leaks** (high, correctness): Refactor `startAmbient` (app.js:250-328) to:
    - Keep one persistent `ambientGain` node (already does)
    - Fully disconnect + stop the previous source before creating a new one (track `ambientOscillators[]` for multi-note types)
    - Fix binaural path: disconnect the `merger` node too (currently `ambientSource.disconnect` only disconnects merger, but `oscL`/`oscR` never stopped)
    - Add `stopAmbient()` test: call `startAmbient('rain')` then `startAmbient('ocean')`, assert only one source active

15. **Fix `b642buf` buffer fragility** (high, correctness): In `vault-worker.js:21`, replace:
    ```js
    const ct = b642buf(envelope.data).buffer;
    ```
    with:
    ```js
    const ct = new Uint8Array(b642buf(envelope.data));
    ```
    `crypto.subtle.decrypt` accepts `BufferSource` (Uint8Array directly). Remove the intermediate `.buffer` access that risks wrong-slice returns. Add unit test: decrypt envelope with non-byte-aligned base64 length.

16. **Encapsulate global namespace** (medium, maintainability): After Vite split (task 2), wrap remaining `app.js` shim in IIFE or convert to ES module. Rename collision-prone globals: `esc` → `htmlEscape`, `ic` → `icon`, `state` → kept as internal store export. Remove top-level `let` bindings that leak to `window`. Add ESLint rule `no-unused-vars` + explicit `window.*` assignments only for the debug API (`window.__LUMEN_DEBUG`).

17. **Centralize persistence error handling** (medium, robustness): Create `src/state/persist.js#PersistError` typed error. Replace silent `.catch(() => {})` at `load:692` with a visible banner: "IndexedDB unavailable — running in localStorage-only mode (5MB limit)". Replace `flushSave:729` bare try/catch with a `notifyPersistFailure()` that toasts once per session. Add unit test: mock `indexedDB.open` to throw, assert banner shown + localStorage-only path active.

18. **Refactor parser regex matching** (medium, correctness): In `parser.js:78-88`, after the `@token` extraction pass, skip students already matched. Change the fuzzy name match (line 78-88) to run only if no `@student` was found. Pre-compile the regex once per parse pass instead of inside the loop. Add Vitest: parse "Call Ana about homework" and assert only one match, no double-extraction.

19. **Improve undo snapshot efficiency** (medium, correctness): At `pushUndoSnapshot:750`, change full-state JSON snapshot to a patch/diff approach OR snapshot only the mutated collection. Minimum: track `undoBytes` more accurately and increase `UNDO_BYTES` to 24MB. Add dedup of identical consecutive snapshots beyond just the last one (hash last 5). Add unit test: 50 rapid mutations → undo stack ≤ 40 AND ≤ 24MB.

20. **Async load path** (medium, perf): At `load:668-673`, paint the shell first (critical CSS already in `index.html:26-35`), then hydrate state asynchronously via `requestIdleCallback`. Move synchronous `localStorage.getItem(KEY)` + `JSON.parse` into the idle callback. Show a loading spinner until hydration completes. Add perf test: assert `_bootStart` to first interactive < 200ms with 2MB state.

21. **Extract magic numbers to constants** (low, maintainability): Create `src/lib/constants.js` exporting `MAX_TOASTS`, `TOAST_DEBOUNCE_MS`, `ACHIEVAL_EVAL_INTERVAL_MS`, `UNDO_MAX`, `UNDO_BYTES`, `VAULT_MAX_FILE`, `VAULT_SOFT_CAP`, `PERF_SLOW_MS`, `PERF_MAX`, `ACTIVITY_LOG_MAX`, `BRIEF_COMMIT_KEY`. Replace inline literals. Add `node --check` pass.

22. **Clean dead code + fix `startViewTransition` timeout** (low, maintainability):
    - Remove `void allKeys` dead code at `merge.js:60` (and the `allKeys` Set declaration at line 59)
    - Refactor `openScheduleIntervalsModal` (app.js:1105-1197) 90+ line template into a `ScheduleIntervalsModal` component function returning a DOM node or template parts
    - Fix `app.js:1786`: replace magic 350ms timeout with `document.documentElement.addEventListener('transitionend', ...)` or read `--theme-transition-duration` CSS variable

**=== Test Coverage Gaps (low) ===**

23. **Add unit tests for core logic** (low, test coverage): Add Vitest cases for:
    - `normalizeState` — legacy string students → objects, missing arrays default empty, vault backfill
    - `getBriefCandidates` — priority sort, overdue exclusion, protected-ids-first
    - `goalProgress` — KR averaging, zero KRs → 0%
    - `habitStreak` — daily/weekly, freeze dates, broken streak
    - `commitBriefDay` — moves to today, writes `BRIEF_COMMIT_KEY`, seeds `focusTaskId`

---

### Validation

* **Commands:** `node --check src/**/*.js`, `npm run build`, `npm run test:unit` (>40 cases green), `npx playwright test --reporter=list` (expect 43+ green), manual `offline.spec.js` 120s.
* **Security:** XSS regression test green (task 11), PBKDF2 310k confirmed in envelope v2 (task 12), API key no longer used for encryption (task 13).
* **Perf:** `slow boot >800ms` warning not triggered at 2k tasks on CI (task 20), dashboard render <50ms (task 6).
* **Backward compat:** v1 encrypted envelopes still decrypt (task 12), legacy `passV:1` peers still connect (task 8), `normalizeState` preserves all existing state shapes.
* **Rollback:** Keep `app.js` shim 1 release; `Vite` output `dist/app.legacy.js` fallback via `<script nomodule>`.

### Risks → Mitigations

* Bundle breaks offline shell → keep `SHELL:7` list in `sw.js` generated from Vite manifest.
* Import split drops globals (`state`, `save`) → centralize `src/state/store.js` single `state` export, avoid circular via `bind*` injection.
* PBKDF2 310k slows older devices → keep Web Worker path (vault-worker.js), add perf budget test.
* XSS audit misses a context → run Playwright with injected payload strings across all views.
* Async load delays first data paint → show skeleton/spinner, measure `_bootStart` to interactive.

---

## 3) Build v104 — Deepen Teaching Wedge (Finance↔Student↔Goal)

**Goal:** Make wedge non-bolted-on. Student finance and goals drive each other visibly.

**Boundaries:** Reuse `students`, `finance`, `goals`, `attendance`, `assignments`, `lessonPlans` views. No new top-level nav.

**Data flow:** `students[].id` becomes FK. `income.student` + `expectedIncome.student` + `assignments.studentId` + `attendance.studentId` canonicalize to `student.id` (not name). `goals[].linkedStudentIds: string[]` (new optional field, default `[]`) + heuristic backfill on migrate.

**Tasks:**

1. FK migration: `normalizeState` maps `income.student` name→id via `getStudentsList()` lookup, writes `income.studentId` + keeps `student` for display, updates `dossier` `inc:10357` to filter by `id||name`.
2. Goal→Student link: `openGoalModal` add `Student link` multi-select (from `getStudentsList()`), persist `goal.linkedStudentIds`, render in goal card chips + `teachingDashboardHTML` `weaveRows` now uses `goal.linkedStudentIds.includes(s.id)` first, heuristic second.
3. Finance analytics: new card in `finance` view — per-student `total Paid / Expected / Outstanding` (from `expectedIncome` vs `income`), `TRY`/`USD` separate via `currency` group. Uses `fmtM` existing. No new chart lib, use `bar-chart` `div` widths.
4. Dossier deepen: `student dossier` `attendance` tab shows `Goals linked` chips with `goalProgress(g)` + `KR` deltas; `finance` tab shows last 5 income rows + `Log Income` prefilled `studentId/currency/rate`.
5. LessonPlan→Task bridge: `lessonPlans` `Create tasks` button already exists — wire to `project.linkedTasks` style plus `studentId` propagation so `teachingDashboardHTML` shows active plans count correctly.
6. Tests: new `tests/wedge.spec.js` — create student `Caner Yilmaz TRY 1500`, create goal `IELTS 8.0` linked to student, log income 1500 TRY for student, assert dossier shows goal chip 0%→progress, finance per-student total updates, `teachingDashboardHTML` row shows `💰 1 · ₺1,500` or `$`.

**Validation:** Seed legacy name-based income, reload, assert migrated to `studentId` and UI still shows. `teachingDashboardHTML` memo `_teachingMemo` still invalidated on `student|income|goal` change. No E2E `status:archived-unknown` regression.

**Risks → Mitigations:** FK migration orphans income if name typo → keep name fallback display, log `activityLog` warning. `TRY` formatting `₺` vs `$` already `fmtM` handles, add explicit `currency` param tests.

---

## 4) Build v105 — Ritual + AI + Mobile Polish

**Goal:** Turn Brief ritual from soft-nudge into habit-forming, harden AI daily focus, make mobile heavy views thumb-usable.

**Boundaries:** No Electron/Capacitor. Keep BYO Gemini key (`callGemini` gemini-2.5-flash). Keep single Brief view, enhance not replace.

**Data flow:** Brief reads `state.tasks/goals/habits` → `aiDailyFocus` cache `state.settings.aiDailyFocus` + `habitToProtect` → Gemini prompt `app.js:2312` → `Generate Focus` button. Store result in `state.settings.aiDailyFocusAt`.

**Tasks:**

1. Ritual polish: Brief `Commit Day` gains `Commit` → `Schedule` CTA `/ #schedule` scroll to `#sched-commit-tray`, `Undo` restores `localStorage BRIEF_COMMIT_KEY`. Add `Blocking` opt-in? Keep soft-nudge default, add `settings.ritualBlocking: boolean` (default false) that shows overlay until commit — guarded behind setting, not forced.
2. AI harden: `callGemini` add timeout `AbortController 12s`, retry 1× on 429/5xx, surface `NO_API_KEY` as inline CTA to `settings` not toast. Cache `aiDailyFocus` per `todayISO()` to avoid re-call cost. Add Vitest mock for `fetch`.
3. Habit analytics polish: analytics view `decayBanner` add `Fix` button that `toggleHabitFreeze` or creates `focus` task for that habit. Day-of-week bars add tooltip `win-rate %` + `n` sample.
4. Mobile: `styles.css` `kanban .col` scroll-snap already, add `tasks` view sticky `topbar` + `search` full-width <860px, finance `Recent transactions` top already, ensure `topbar-right` wraps. Test on 375px viewport Playwright `test.use({viewport:{width:375,height:812}})`.
5. Perf: move `deriveVaultKey` 310k PBKDF2 off main via `Web Worker` (`src/workers/vaultWorker.js`) fallback to main thread if `Worker` absent, keep `encryptVaultBackup` API same.

**Validation:** `tests/ritual.spec.js` — intercept Gemini `fetch` mock, click `Generate Focus`, assert `aiDailyFocus` rendered, reload persists cache. Mobile spec: viewport 375, `nav-more` still reachable, kanban horizontal scroll works, no `console.error`. Worker test: encrypt in worker completes <2s.

**Risks → Mitigations:** Gemini cost/leak → BYO key stays LS-only, never sent to sync; add `settings.geminiModel` select. Worker breaks CSP `sw.js` scope → worker src same-origin, fallback.

---

## 5) Cross-Cutting Concerns

**Rollout / Migration:** v103 Vite `dist/` deploy via Vercel `buildCommand: npm run build` else `serve .` stays for v102 tag. State migration idempotent via `normalizeState` versions; `schedulePeriods`/`linkedStudentIds` additive. `sw.js` version bump each build + `caches.keys() → delete old` `activate`. PBKDF2 v2 envelope additive — old backups remain decryptable.

**Failure modes:** LS quota `flushSave:729` already warns → IDB primary. Worker missing → fallback sync `crypto.subtle` on main. PeerJS offline `loadPeerLib` error → `peerStatus='error'` toast, sync queue persists `syncMeta.syncQueue`. Gemini 429 → retry + inline `Try later`. IDB unavailable → localStorage-only banner (task 17).

**Open questions resolved:** bundler allowed → Vite; stack Vitest; horizon 3 builds; review scope = all findings; plan structure = single ordered list.

**Open question remaining (for build agent to confirm at start of v103):** `TypeScript` scope — Vite supports TS but adds type debt. Recommended: `allowJs:true, checkJs:false` first build, introduce `tsconfig` + JSDoc types for `state` shape only, full TS in v104. If owner wants full TS now, expand task 2 to rename `js→ts` and add `tsc --noEmit` to CI — tradeoff is migration churn vs safety.

**Validation command set (all builds):** `node --check src/**/*.js`, `npm run build`, `npm run test:unit`, `npx playwright test --reporter=list` (expect 43 + new specs green), manual `offline.spec.js` 120s.

---

## 6) Task List for Next Agent (execute in order)

* [ ] Read this file + `app.js` `normalizeState:545` + `vercel.json` + `playwright.config.js` + `crypto.js` + `vault-worker.js` + `parser.js` + `merge.js` before any edit
* [ ] Execute v103 foundation tasks 1→9 (Vite scaffold → sw.js bump)
* [ ] Execute v103 review tasks 10→23 (dedup → unit tests)
* [ ] Open PR `v103-stabilize-review` with `dist/` gitignored, `ci.yml` + Vitest + all review fixes
* [ ] After merge, execute v104 tasks 1→6, add `tests/wedge.spec.js`
* [ ] After merge, execute v105 tasks 1→5, add `tests/ritual.spec.js` + mobile viewport case
* [ ] Each build bump `lumen-cache-v10x` + `?v=10x` + tag `v10x`
