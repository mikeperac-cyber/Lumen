# Lumen Codebase Survey — Architecture (R1) & Hardening (R4)

## Executive Summary
This survey provides an exhaustive, line-by-line structural audit of the Lumen codebase as of August 2026. The application is an offline-first, local-first personal command center built with vanilla JavaScript, modern ES modules, and a Vite/Playwright/Vitest toolchain.

The investigation uncovered critical boot-halting syntax errors, multiple missing symbol references (`ReferenceError`s on `getSearchTasksHay`, `getSearchVaultHay`, `vaultBlobGet`, and `VaultStore`), corruptions introduced by prior extraction scripts in `src/tasks/controller.js`, and concrete hardening gaps in PWA manifest generation and modal dialog accessibility/inert semantics.

---

## 1. Boot Errors and ReferenceErrors in `app.js`

### 1.1 Fatal Syntax Error at `app.js:1`
- **Location**: `app.js`, Line 1.
- **Observed Code**:
  ```javascript
  import { setupTasksController } from './src/tasks/controller.js';\nimport { vaultBlobGet } from './src/vault/store.js';
  import { vaultBlobGet } from './src/vault/store.js';
  ```
- **Root Cause**: An automated script injected a literal `\n` string instead of a real newline into line 1. When the browser or Playwright attempts to parse `app.js` as an ES module (`<script type="module" src="app.js">`), the JS engine immediately throws:
  `SyntaxError: Invalid or unexpected token`
  This halts execution before any application logic or DOM setup can run, causing all 19 views in `tests/smoke.spec.js` to fail.

---

### 1.2 `vaultBlobGet` ReferenceError
- **Locations in `app.js`**:
  - `Line 4945`: `try { const blob = await vaultBlobGet(v.blobId); ... }`
  - `Line 4969`: `try { const blob = await vaultBlobGet(v.blobId); ... }`
- **Location in `src/tasks/controller.js`**:
  - `Line 815`: `try { const blob = await app.vaultBlobGet(blobId); ... }`
- **Definition**:
  - `src/vault/store.js`, Line 25: `export function vaultBlobGet(key) { ... }`
  - `src/lib/globals.js`, Line 21 & 40: Exports to `window.LumenLib.vault.vaultBlobGet`.
- **Root Cause**: `vaultBlobGet` was called as a bare global identifier in `app.js` and passed into `setupTasksController(ctx)` from `app.js:3462`, but was never properly imported or defined in `app.js` module scope.

---

### 1.3 `getSearchTasksHay` ReferenceError
- **Locations in `app.js`**:
  - `Line 10197`: `const taskHits = getSearchTasksHay().filter(e => !q || e.hay.includes(q)).map(e => e.t).filter(t => { ... });`
  - `Line 10588`: `_whenIdle(() => { try { getSearchTasksHay(); deadlinesCardHTML(); ... } catch (_) {} });`
- **Root Cause**: `getSearchTasksHay` is completely missing from `app.js` and `src/tasks/`.
- **Intended Implementation**: A function that caches/returns an array of `{ t: task, hay: string }` where `hay` is the pre-computed lowercase concatenation of searchable fields:
  ```javascript
  let _tasksHayCache = null;
  let _tasksHayState = null;
  export function getSearchTasksHay() {
    const tasks = (typeof state !== 'undefined' ? state.tasks : (app.state ? app.state.tasks : [])) || [];
    if (_tasksHayCache && _tasksHayState === tasks) return _tasksHayCache;
    _tasksHayState = tasks;
    _tasksHayCache = tasks.map(t => ({
      t,
      hay: ((t.title || '') + ' ' + (t.desc || '') + ' ' + (t.tags || []).join(' ') + ' ' + (t.comments || []).map(c => c.text).join(' ')).toLowerCase()
    }));
    return _tasksHayCache;
  }
  ```

---

### 1.4 `getSearchVaultHay` ReferenceError
- **Locations in `app.js`**:
  - `Line 10136`: `const vaultOnlyHay = getSearchVaultHay().filter(e => !vq || e.hay.includes(vq));`
  - `Line 10221`: `const vaultHits = getSearchVaultHay().filter(e => !q || e.hay.includes(q));`
- **Root Cause**: Like `getSearchTasksHay`, `getSearchVaultHay` is called during global search but is undefined across the entire codebase.
- **Intended Implementation**:
  ```javascript
  let _vaultHayCache = null;
  let _vaultHayState = null;
  export function getSearchVaultHay() {
    const items = (typeof state !== 'undefined' ? state.vaultItems : (app.state ? app.state.vaultItems : [])) || [];
    if (_vaultHayCache && _vaultHayState === items) return _vaultHayCache;
    _vaultHayState = items;
    _vaultHayCache = items.map(v => ({
      v,
      hay: ((v.title || '') + ' ' + (v.notes || '') + ' ' + (v.fileName || '') + ' ' + (v.url || '') + ' ' + (v.tags || []).join(' ')).toLowerCase()
    }));
    return _vaultHayCache;
  }
  ```

---

### 1.5 `VaultStore` ReferenceError
- **Locations in `app.js`**:
  - `Line 4871`: `function vaultHost(url){ return VaultStore.vaultHost(url); }`
  - `Line 4872`: `function vaultSort(a,b){ return VaultStore.vaultSort(a,b); }`
  - `Line 4873`: `function vaultTypeLabel(id){ return VaultStore.vaultTypeLabel(id); }`
  - `Line 4874`: `function vaultTagSet(){ return VaultStore.vaultTagSet(state.vaultItems); }`
  - `Line 4875`: `function vaultCardHTML(v){ return VaultStore.vaultCardHTML(v, vaultViewDeps()); }`
  - `Line 4876`: `function vaultRowHTML(v){ return VaultStore.vaultRowHTML(v, vaultViewDeps()); }`
  - `Line 4878`: `function vaultWidgetHTML(){ return VaultStore.vaultWidgetHTML(getVaultItems()); }`
  - `Line 4884`: `viewRoot().innerHTML = VaultStore.vaultViewHTML({ ... });`
  - `Line 4983`: `openModal(VaultStore.vaultModalHTML(v, { ... }));`
  - `Line 5109`: `function vaultLinkPickerHTML(selectedIds){ return VaultStore.vaultLinkPickerHTML(selectedIds, getVaultItems()); }`
- **Root Cause**: `VaultStore` is called in 10 places in the Personal Vault section of `app.js`, but `VaultStore` is NEVER declared, imported, or assigned in `app.js`.
- **Fix**: Declare `const VaultStore = window.LumenLib.vault;` or import functions directly from `src/vault/view.js` and `src/vault/store.js`.

---

## 2. Extraction Corruption in `src/tasks/controller.js`

An automated script (`do_extract.js`) previously extracted the Tasks kanban code from `app.js` into `src/tasks/controller.js`, but applied unconstrained global regular expression replacements:
1. **`app.$app.$` Corruptions**:
   - Lines 47, 1032, 1035, 1082 have `app.$app.$('.selector')` because `$$` was replaced with `app.$$` and then `$` inside it was replaced again with `app.$`.
2. **Template String Interpolation Corruptions**:
   - Lines 185, 187, 197, 203, 213, 214, 215, 994, 1001, 1004, 1011 have `app.${...}` inside template literals (e.g. ``height:app.${topPad}px``).
   - In JavaScript, `` `height:app.${topPad}px` `` evaluates to `"height:app.120px"`, which is **invalid CSS**, resulting in 0-height spacer divs in virtualized columns and causing heavy rendering flicker.
   - Text elements display `"app.25:app.00"` instead of `"25:00"`.
3. **Mangled State and Classes**:
   - Line 175: `'empty-app.state'` instead of `'empty-state'`.
   - Line 170: `'data-status-body="app.${status}"'` instead of `'data-status-body="${status}"'`.

---

## 3. Module Boundaries, Imports/Exports, and Shared State

### 3.1 Module Inventory in `src/`

| Module | Lines | Primary Exports | Purpose / Status |
|---|---|---|---|
| `src/lib/constants.js` | 134 | `STATUSES`, `PRIOS`, `CATEGORIES`, `RECURRENCE`, `COVER_COLORS`, `MATRIX_PAGE`, `VAULT_*` | Static constants |
| `src/lib/crypto.js` | 191 | `deriveVaultKey`, `encryptVaultBackup`, `decryptVaultBackup`, `hashPass`, `sealSecret`, `openSecret` | Web Crypto encryption |
| `src/lib/helpers.js` | 140 | `esc`, `safeAttr`, `isoDate`, `todayISO`, `clamp`, `debounce`, `fileSizeStr`, `fmtShort`, `fmtM` | Pure utilities |
| `src/lib/globals.js` | 42 | Attaches `crypto`, `schedule`, `parser`, `merge`, `gemini`, `students`, `helpers`, `constants`, `persist`, `tasks`, `finance`, `notes`, `habits`, `vault` to `window.LumenLib` | Global bridge |
| `src/lib/parser.js` | 170 | `parseNaturalLanguageTask` | NLP task syntax parser |
| `src/lib/merge.js` | 230 | `applyMerge` | P2P LWW CRDT state merge |
| `src/lib/schedule.js` | 130 | `timeToMin`, `minToTime`, `generatePeriods`, `timeOverlaps`, `buildWeekDays`, `buildScheduleGrid` | Schedule maths |
| `src/lib/students.js` | 90 | `backfillStudentIds`, `getStudentStats`, `formatStudentRevenue` | Student stats calculations |
| `src/lib/gemini.js` | 69 | `requestGemini` | Gemini API client |
| `src/state/persist.js` | 98 | `PersistError`, `notifyIdbUnavailable`, `notifyPersistFailure`, `secretsDbGet`, `secretsDbPut` | IDB persistence & secrets |
| `src/tasks/virtual.js` | 65 | `OVERSCAN_TOP`, `OVERSCAN_BOTTOM`, `visibleWindow` | Windowing maths |
| `src/tasks/view.js` | 404 | `isArchivedTask`, `linkGraphForTask`, `taskCardHTML`, `taskBoardHTML`, `taskModalHTML`, `matrixHTML` | Task view markup |
| `src/tasks/controller.js` | 1149 | `setupTasksController`, `renderTasks`, `openTaskModal`, `applyTagFilter`, `matrixShowMore`, `getKanbanLists`, etc. | Task controller logic |
| `src/vault/store.js` | 55 | `VAULT_DB`, `VAULT_STORE`, `vaultDb`, `vaultBlobPut`, `vaultBlobGet`, `vaultBlobDelete`, `vaultQuotaUsed`, `vaultTypeIcon` | Vault IDB blobs |
| `src/vault/view.js` | 273 | `VAULT_TYPES`, `vaultTypeLabel`, `vaultHost`, `vaultSort`, `vaultTagSet`, `vaultCardHTML`, `vaultRowHTML`, `vaultViewHTML`, `vaultModalHTML` | Vault view markup |
| `src/finance/store.js` | 182 | `matchesFinanceFilter`, `sumByMonth`, `sumAll`, `studentBalances`, `overduePayments`, `sixMonthTrend`, `groupByField` | Finance arithmetic |
| `src/finance/view.js` | 164 | `trendBarsSVG`, `categoryPieSVG`, `cashflowBarsSVG`, `financeSummaryCardsHTML`, `financeTablesHTML` | Finance SVG charts & tables |
| `src/habits/store.js` | 75 | `currentStreak`, `streakAsOf`, `bestStreak` | Habit streaks |
| `src/notes/view.js` | 66 | `noteItemHTML`, `noteEditorHTML` | Notes markup |
| `src/schedule/view.js` | 200 | `subtaskLabel`, `schedTaskCell`, `monthGridHTML`, `weekGridHTML`, `unscheduledListHTML`, `committedTrayHTML` | Schedule view markup |
| `src/students/view.js` | 398 | `studentCardHTML`, `studentRowHTML`, `attendanceTabHTML`, `assignmentsTabHTML`, `lessonPlansTabHTML` | Students view markup |

---

### 3.2 Remaining Logic in `app.js` (10,638 lines)
1. **Tasks**:
   - `parseNaturalLanguageTask` (shims `LumenLib.parser`)
   - `applyTaskGoalProgress`, `toggleTaskDone` (lines 3140–3160)
   - Task Pomodoro bindings (`startTaskPomo`, `stopTaskPomo`, `toggleTaskPomo`, lines 5671–5790)
   - Kanban list management & controller wiring (`setupTasksController`, line 3462)
2. **Vault**:
   - Lines 4865–5188 (~324 lines): `renderVault`, `openVaultModal`, collection management, upload handling, `backfillVaultLinks`, `vaultLinkPickerHTML`.
3. **Finance**:
   - Lines 6698–7161 (~464 lines): `renderFinance`, `openFinanceModal`, transaction add/edit/delete, category/income type modals (lines 8467, 8510).

---

## 4. Hardening & PWA Analysis (R4)

### 4.1 `scripts/postbuild.js` & `manifest.webmanifest`
- **Current State**:
  - `package.json` line 9: `"build": "vite build && node scripts/postbuild.js"`
  - `package.json` specifies `"type": "commonjs"`.
  - In `index.html`: `<link rel="manifest" href="manifest.webmanifest">`.
  - Vite default build hashes `manifest.webmanifest` into `dist/assets/manifest-BWm-CJgl.webmanifest`.
- **Issues**:
  1. `postbuild.js` should be explicitly named `scripts/postbuild.cjs` so it is unconditionally CommonJS regardless of top-level or sub-package module configurations.
  2. Web manifest hashing creates non-deterministic URLs for the PWA manifest and risks scoping installed PWA instances to `/assets/` rather than `/`.
  3. `vite.config.mjs` should configure `rollupOptions.output.assetFileNames` to preserve `manifest.webmanifest` at `dist/manifest.webmanifest` (or place in `public/`).
  4. `vercel.json` currently has a specific header for `/assets/(.*).webmanifest`, which should be updated to `/manifest.webmanifest` (or `/(.*).webmanifest`).
  5. `scripts/postbuild.cjs` will walk `dist/` and include `'./manifest.webmanifest'` in `sw.js` `SHELL`.

---

### 4.2 Modal Implementation & `#view-root` Inert Attribute
- **Current State**:
  - `openModal(html)` in `app.js:1177` sets `#modal-root.innerHTML = ...`.
  - Does NOT set `inert` on `#view-root` (or `.app`).
  - Does NOT enforce `role="dialog"`, `aria-modal="true"`, or dynamic `aria-labelledby` on `.modal`.
  - Does NOT save active element or restore focus on `closeModal()`.
  - Does NOT trap focus (Tab / Shift+Tab wrapping).
- **Requirements for Hardening**:
  1. When modal opens:
     - Save `_modalReturnFocus = document.activeElement`.
     - Set `const vr = document.getElementById('view-root'); if (vr) { vr.setAttribute('inert', ''); vr.inert = true; }`.
     - Decorate modal dialog element: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` linked to the heading id.
     - Move focus to first input or dialog container.
     - Install Tab / Shift+Tab keyboard trap.
  2. When modal closes (`closeModal()`):
     - Remove `inert` from `#view-root`: `vr.removeAttribute('inert'); vr.inert = false;`.
     - Clear `#modal-root.innerHTML = ''`.
     - Restore focus: `if (_modalReturnFocus && _modalReturnFocus.isConnected) _modalReturnFocus.focus();`.
  3. Also ensure `openSearch()` and `closeSearch()` toggle `inert` on `#view-root`.

---

## 5. Performance Optimization Opportunities (R2, R3)

### 5.1 `src/lib/merge.js` Signature Optimization (R3)
- **Current State (Lines 14 & 227)**:
  `const key = (arr) => JSON.stringify([...(arr || [])].sort((a, b) => (a.id < b.id ? -1 : 1)));`
  Serializes 18 entity arrays with JSON.stringify and sort before and after merge.
- **Recommended Fix**:
  Replace `key(arr)` with a fast O(N) signature:
  ```javascript
  const sig = (arr) => {
    if (!arr || !arr.length) return '0:0';
    let maxTs = 0;
    for (let i = 0; i < arr.length; i++) {
      const ts = arr[i].updatedAt || arr[i].unlockedAt || arr[i].createdAt || 0;
      if (ts > maxTs) maxTs = ts;
    }
    return `${arr.length}:${maxTs}`;
  };
  ```

### 5.2 `src/habits/store.js` Streak Loop Guard (R3)
- **Current State (Lines 26, 51)**:
  `while (dates[cursor] || freezes[cursor])` runs without an iteration cap.
- **Recommended Fix**:
  Add `let maxDays = 3650; while ((dates[cursor] || freezes[cursor]) && maxDays-- > 0)` to guarantee termination against corrupt/cyclical dates.

---

## 6. Recommended Action Plan & Target Code Changes

1. **Fix `app.js` Header & Imports**:
   - Replace line 1 literal `\n` with clean imports:
     ```javascript
     import { setupTasksController } from './src/tasks/controller.js';
     import { vaultBlobGet } from './src/vault/store.js';
     ```
   - Define `const VaultStore = window.LumenLib.vault;` in `app.js` scope.
2. **Fix Corruptions in `src/tasks/controller.js`**:
   - Fix all `app.$app.$` -> `app.$$`.
   - Fix all `app.${...}` in template strings -> `${...}`.
   - Fix `'empty-app.state'` -> `'empty-state'` and `.col-body[data-status-body="app.${status}"]` -> `.col-body[data-status-body="${status}"]`.
   - Export and wire `getSearchTasksHay()`.
3. **Export and Wire `getSearchVaultHay()`**:
   - Export from `src/vault/` and wire into search.
4. **Implement Modal Dialog A11y & Inert**:
   - Refactor `openModal` and `closeModal` in `app.js` with `_modalReturnFocus`, focus trap, dialog ARIA attributes, and `#view-root` `inert` toggling.
5. **PWA & Postbuild Hardening**:
   - Rename `scripts/postbuild.js` to `scripts/postbuild.cjs`.
   - Update `package.json` script: `"build": "vite build && node scripts/postbuild.cjs"`.
   - Update `vite.config.mjs` to keep `manifest.webmanifest` unhashed at `dist/manifest.webmanifest`.
   - Update `vercel.json` headers to match `/manifest.webmanifest`.
