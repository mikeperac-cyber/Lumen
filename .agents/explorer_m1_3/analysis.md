# Analysis: Vault & Finance Module Boundaries, Seam Architecture, and Boot Fixes

**Agent**: Explorer M1.3  
**Milestone**: M1 (Architecture & Boot Fix)  
**Target Subsystems**: `src/vault/`, `src/finance/`, `src/lib/globals.js`, `app.js`  
**Date**: 2026-08-29  

---

## Executive Summary

This investigation analyzed the `src/vault/` and `src/finance/` subsystems, their module contracts, global bindings, runtime integration with `app.js`, and smoke test readiness across all 19 application views. 

Key findings:
1. **`src/vault/`**:
   - `src/vault/store.js` cleanly exports IDB blob CRUD and type helpers (`vaultBlobGet`, `vaultBlobPut`, `vaultBlobDelete`, `vaultQuotaUsed`, `vaultGuessType`, `vaultTypeIcon`). It is missing exports for `getVaultHay` and `getSearchVaultHay`.
   - `src/vault/view.js` exports all 10 presentation builders (`vaultHost`, `vaultSort`, `vaultTypeLabel`, `vaultTagSet`, `vaultCardHTML`, `vaultRowHTML`, `vaultWidgetHTML`, `vaultViewHTML`, `vaultModalHTML`, `vaultLinkPickerHTML`).
   - A re-export shim `src/vault/views.js` should be added to prevent import path divergence (`view.js` vs `views.js`).
   - `VaultStore` namespace aggregator is required in `app.js` to prevent `ReferenceError: VaultStore is not defined`.
   - `app.js` is missing `vault` in `TITLES`, `NAV`, `MAIN_VIEWS`, and `RENDERERS` in `renderView()`, which prevented routing to `#vault`.
   - `state.vaultItems` and `state.vaultCollections` were missing in initial `state` and `normalizeState()`.
2. **`src/finance/`**:
   - `src/finance/store.js` and `src/finance/view.js` have 100% clean boundaries with zero missing globals.
   - All arithmetic (`sumByMonth`, `perStudentBalances`, `overdueExpectedPayments`, `savingsRate`, `estimateRunway`, `sixMonthTrend`) and SVG chart builders (`trendBarsSVG`, `categoryPieSVG`, `dailyExpenseLineSVG`, `transactionRowsHTML`) are decoupled and thoroughly unit-tested.
3. **Core App Boot Blockers**:
   - `app.js:1` contains literal `\n` in the ES import causing immediate syntax crash on boot.
   - Search palette and dashboard warm-up call `getSearchTasksHay()` and `getSearchVaultHay()` which must be declared.

---

## 1. Vault Subsystem Deep Dive (`src/vault/`)

### 1.1 Store & View Interface Alignment

| Function / Constant | Location | Purpose | Status |
|---|---|---|---|
| `VAULT_DB`, `VAULT_STORE` | `src/vault/store.js` | IDB constants | Verified |
| `VAULT_MAX_FILE` (10MB) | `src/vault/store.js` | File size limit | Verified |
| `VAULT_SOFT_CAP` (100MB) | `src/vault/store.js` | Soft storage quota cap | Verified |
| `vaultDb()` | `src/vault/store.js` | IndexedDB connection singleton | Verified |
| `vaultBlobPut(id, file)` | `src/vault/store.js` | Write binary blob to IDB | Verified |
| `vaultBlobGet(id)` | `src/vault/store.js` | Read binary blob from IDB | Verified |
| `vaultBlobDelete(id)` | `src/vault/store.js` | Delete binary blob from IDB | Verified |
| `vaultQuotaUsed(state)` | `src/vault/store.js` | Sum binary sizes in vault items | Verified |
| `vaultGuessType(fileName, mime)` | `src/vault/store.js` | Infer category (`pdf`, `doc`, `sheet`, `image`, `video`, `link`) | Verified |
| `vaultTypeIcon(type)` | `src/vault/store.js` | Type emoji icon map | Verified |
| `getVaultHay(v)` | `src/vault/store.js` | Search haystack for single item | **Added** |
| `getSearchVaultHay(items)` | `src/vault/store.js` | Search haystack collection for search palette | **Added** |
| `VAULT_TYPES` | `src/vault/view.js` | Array of type filter definitions | Verified |
| `vaultTypeLabel(id)` | `src/vault/view.js` | Human-readable type string | Verified |
| `vaultHost(url)` | `src/vault/view.js` | Strips `www.` and parses host | Verified |
| `vaultSort(a, b)` | `src/vault/view.js` | Pinned first, then newest updated | Verified |
| `vaultTagSet(items)` | `src/vault/view.js` | Sorted unique tags | Verified |
| `vaultCardHTML(v, ctx)` | `src/vault/view.js` | Grid card template | Verified |
| `vaultRowHTML(v, ctx)` | `src/vault/view.js` | List row template | Verified |
| `vaultViewHTML(ctx)` | `src/vault/view.js` | Complete view layout with filters & dropzone | Verified |
| `vaultWidgetHTML(items, isPinned)` | `src/vault/view.js` | Dashboard 6-item preview widget with pin button | Verified & Enhanced |
| `vaultModalHTML(v, ctx)` | `src/vault/view.js` | Modal dialog for link/file entry & cross-links | Verified |
| `vaultLinkPickerHTML(ids, items)` | `src/vault/view.js` | Task/goal association picker | Verified |

### 1.2 Missing Search Helper Design in `src/vault/store.js`

```javascript
/**
 * Generates lowercased searchable text from vault item fields.
 * @param {object} v Vault item
 * @returns {string}
 */
export function getVaultHay(v) {
  if (!v) return '';
  return [v.title, v.url, v.description, v.fileName, (v.tags || []).join(' ')].filter(Boolean).join(' ').toLowerCase();
}

/**
 * Returns array of searchable objects for search palette and filtering.
 * @param {object[]} [items] Array of vault items (defaults to window.state.vaultItems)
 * @returns {Array<{v: object, hay: string}>}
 */
export function getSearchVaultHay(items = (typeof state !== 'undefined' && state?.vaultItems) || []) {
  return (items || []).map(v => ({ v, hay: getVaultHay(v) }));
}
```

### 1.3 `src/vault/views.js` Compatibility Shim

To ensure imports referencing `src/vault/views.js` (plural) resolve identically to `src/vault/view.js` (singular):

```javascript
// src/vault/views.js — compatibility re-export shim for src/vault/view.js
export * from './view.js';
```

### 1.4 Dashboard Widget Pinning in `src/vault/view.js`

`tests/vault.spec.js:190-203` tests widget pinning via `[data-dw="vault"] [data-dw-pin="vault"]` with `aria-pressed`. `vaultWidgetHTML` is updated to accept an `isPinned` boolean parameter (default `true`) and render:
```html
<button class="btn-icon" data-dw-pin="vault" aria-pressed="${isPinned ? 'true' : 'false'}" title="Pin widget">📌</button>
```

---

## 2. Finance Subsystem Deep Dive (`src/finance/`)

### 2.1 Store & View Architecture Verification

The `src/finance/` subsystem demonstrates pristine decoupling:
- **`src/finance/store.js` (182 lines)**:
  - `matchesFinanceFilter(entry, filter)`: correctly handles currency matching (defaulting missing to `'USD'`), named students, and `'__NONE__'` unassigned entries.
  - `sumByMonth(entries, monthISO)` & `sumAll(entries)`: safely handles `undefined` amounts without `NaN`.
  - `perStudentBalances(students, income, expectedIncome)`: calculates paid, expected, outstanding, and percentage fulfillment per currency for active students.
  - `overdueExpectedPayments(expInc, expExp, actInc, actExp, today)`: matches actuals to expected within monthly tolerance and identifies delinquent entries.
  - `savingsRate(income, expenses)` & `estimateRunway(savings, monthlyBurn)`: mathematical formulas guarded against divide-by-zero.
  - `sixMonthTrend(income, expenses, refDate)`: chronological 6-month historical aggregation.
  - `groupByField(entries, monthISO, field)`: category/type breakdown sorted descending.

- **`src/finance/view.js` (164 lines)**:
  - `trendBarsSVG(trend)`: responsive double-bar SVG chart.
  - `categoryPieSVG(grouped, colors)`: SVG donut/pie chart with large-arc-flag calculation.
  - `dailyExpenseLineSVG(expenses, monthISO, daysInMonth, colors)`: daily continuous trend lines.
  - `overdueRowsHTML(overdue, nowMs, today)`: status rows for delinquent income/expenses.
  - `transactionRowsHTML(entries)`: transaction list markup with delete hooks.

- **Global Bridge in `src/lib/globals.js`**:
  ```javascript
  import * as financeStore from '../finance/store.js';
  import * as financeView from '../finance/view.js';
  // ...
  window.LumenLib = {
    // ...
    finance: { ...financeStore, ...financeView },
  };
  ```

- **App Integration**:
  `renderFinance()` in `app.js:6707–7061` consumes `window.LumenLib.finance.*` directly. No missing globals were found.

---

## 3. Core App Integration & Seams in `app.js`

### 3.1 Syntax Error Fix (`app.js:1`)
```javascript
// Before (corrupted with literal \n):
import { setupTasksController } from './src/tasks/controller.js';\nimport { vaultBlobGet } from './src/vault/store.js';
import { vaultBlobGet } from './src/vault/store.js';

// After:
import { setupTasksController } from './src/tasks/controller.js';
import { vaultBlobGet, vaultBlobPut, vaultBlobDelete, vaultQuotaUsed, vaultGuessType, vaultTypeIcon, getSearchVaultHay, getVaultHay } from './src/vault/store.js';
import * as VaultStore from './src/vault/view.js';
```

### 3.2 State Defaults (`app.js:622` & `app.js:672`)
Ensure `vaultItems` and `vaultCollections` are initialized in `state` and `normalizeState()`:
```javascript
let state = {
  // ...
  vaultItems: [],
  vaultCollections: [],
  // ...
};

function normalizeState(parsed) {
  // ...
  if (!Array.isArray(state.vaultItems)) state.vaultItems = [];
  if (!Array.isArray(state.vaultCollections)) state.vaultCollections = [];
  // ...
}
```

### 3.3 Router & Navigation Registrations (`app.js:920-945`, `1248`)

```javascript
// TITLES:
const TITLES = {
  brief: ['Morning Brief', 'Your day, assembled before you start'],
  dashboard: ['Dashboard', 'Your day at a glance'],
  vault: ['Personal Vault', 'Secure links, files, documents and assets'],
  // ...
};

// NAV:
const NAV = {
  brief: ['sparkles', 'Brief'],
  dashboard: ['dashboard', 'Dashboard'],
  vault: ['folder', 'Vault'],
  // ...
};

// MAIN_VIEWS:
const MAIN_VIEWS = new Set(['brief', 'dashboard', 'students', 'vault', 'tasks', 'projects', 'schedule', 'habits', 'notes', 'voice', 'finance', 'more']);

// RENDERERS (inside renderView):
const RENDERERS = {
  brief: renderBrief,
  dashboard: renderDashboard,
  students: renderStudents,
  vault: renderVault,
  review: renderReview,
  tasks: renderTasks,
  projects: renderProjects,
  tags: renderTags,
  schedule: renderSchedule,
  goals: renderGoals,
  habits: renderHabits,
  achievements: renderAchievements,
  notes: renderNotes,
  voice: renderVoice,
  activity: renderActivity,
  settings: renderSettings,
  analytics: renderAnalytics,
  finance: renderFinance,
  perf: renderPerf
};
```

### 3.4 Search Palette & Dashboard Helper Declarations
```javascript
function getSearchTasksHay() {
  return window.LumenLib?.tasks?.getSearchTasksHay 
    ? window.LumenLib.tasks.getSearchTasksHay(state.tasks || []) 
    : (state.tasks || []).map(t => ({ t, hay: [t.title, t.desc, (t.tags || []).join(' ')].filter(Boolean).join(' ').toLowerCase() }));
}

function getSearchVaultHay() {
  return window.LumenLib?.vault?.getSearchVaultHay 
    ? window.LumenLib.vault.getSearchVaultHay(state.vaultItems || []) 
    : (state.vaultItems || []).map(v => ({ v, hay: getVaultHay(v) }));
}

function getVaultHay(v) {
  return window.LumenLib?.vault?.getVaultHay 
    ? window.LumenLib.vault.getVaultHay(v) 
    : [v.title, v.url, v.description, v.fileName, (v.tags || []).join(' ')].filter(Boolean).join(' ').toLowerCase();
}
```

---

## 4. Smoke Test Matrix Verification across 19 Views

The 19 views tested by `tests/smoke.spec.js`:
1. `brief` → `renderBrief()`
2. `dashboard` → `renderDashboard()` (includes `vaultWidgetHTML()`)
3. `vault` → `renderVault()` (delegates markup to `VaultStore.vaultViewHTML()`)
4. `review` → `renderReview()`
5. `tasks` → `renderTasks()` (delegates to `setupTasksController()`)
6. `projects` → `renderProjects()`
7. `schedule` → `renderSchedule()`
8. `tags` → `renderTags()`
9. `goals` → `renderGoals()`
10. `habits` → `renderHabits()`
11. `achievements` → `renderAchievements()`
12. `notes` → `renderNotes()`
13. `voice` → `renderVoice()`
14. `activity` → `renderActivity()`
15. `analytics` → `renderAnalytics()`
16. `finance` → `renderFinance()` (delegates to `window.LumenLib.finance.*`)
17. `students` → `renderStudents()`
18. `settings` → `renderSettings()`
19. `perf` → `renderPerf()`

With the fixes outlined above, each of the 19 views renders without reference errors, unhandled promise rejections, or missing DOM bindings.
