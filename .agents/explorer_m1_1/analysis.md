# Analysis Report — Milestone M1.1: Architecture & Boot Fix (`app.js`)

**Author**: Explorer M1.1  
**Target File**: `c:\Users\micha\Desktop\Lumen\app.js`  
**Date**: 2026-08-29  

---

## 1. Executive Summary

Lumen failed to boot due to two critical classes of runtime errors in `app.js`:
1. **Header Import Corruption and Missing Module Namespaces**: Unescaped literal `\n` in `app.js:1`, duplicate `vaultBlobGet` imports, and complete omission of `import * as VaultStore from './src/vault/view.js'` which left 10 presentation functions undefined.
2. **Missing Search Index Generators**: `getSearchTasksHay()` and `getSearchVaultHay()` were called in global search (`app.js:10136, 10197, 10221`) and idle warmup (`app.js:10588`) without declarations, causing `ReferenceError` during boot and search interactions.

This report provides the exact root-cause analysis, module interface contracts, and line-by-line patch designs required for the implementer to fix `app.js`.

---

## 2. Detailed Problem Breakdown & Evidence

### Issue 1: Header Import Corruption (`app.js:1-2`)
* **Observation**:
  `app.js:1-2` contains:
  ```javascript
  import { setupTasksController } from './src/tasks/controller.js';\nimport { vaultBlobGet } from './src/vault/store.js';
  import { vaultBlobGet } from './src/vault/store.js';
  ```
* **Root Cause**: An automated script or string replacement previously inserted an unescaped literal `\n` string into line 1 and duplicated line 2.
* **Impact**: Depending on the bundler/parser, literal `\n` in raw JS source can cause syntax errors or invalid token parsing, while duplicate imports pollute the module header.
* **Missing Symbols**:
  - `src/vault/view.js` exports 10 presentation methods used across `app.js:4871–5109` as `VaultStore.*`:
    - `VaultStore.vaultHost(url)`
    - `VaultStore.vaultSort(a, b)`
    - `VaultStore.vaultTypeLabel(id)`
    - `VaultStore.vaultTagSet(items)`
    - `VaultStore.vaultCardHTML(v, deps)`
    - `VaultStore.vaultRowHTML(v, deps)`
    - `VaultStore.vaultWidgetHTML(items)`
    - `VaultStore.vaultViewHTML(ctx)`
    - `VaultStore.vaultModalHTML(v, ctx)`
    - `VaultStore.vaultLinkPickerHTML(selectedIds, items)`
  - `src/vault/store.js` exports: `vaultDb`, `vaultBlobPut`, `vaultBlobGet`, `vaultBlobDelete`, `vaultQuotaUsed`, `vaultGuessType`, `vaultTypeIcon`, `VAULT_MAX_FILE`, `VAULT_SOFT_CAP`.
  - `src/tasks/controller.js` exports: `setupTasksController`, `renderTasks`, `openTaskModal`, `applyTagFilter`, `matrixShowMore`.

---

### Issue 2: `setupTasksController` Invocation & Context Wiring
* **Observation**:
  `setupTasksController` is defined in `src/tasks/controller.js:6`:
  ```javascript
  let app = {};
  export function setupTasksController(ctx) {
    app = ctx;
    if (!window.LumenLib) window.LumenLib = {};
    if (!window.LumenLib.tasks) window.LumenLib.tasks = {};
    Object.assign(window.LumenLib.tasks, { renderTasks, openTaskModal, applyTagFilter, matrixShowMore });
  }
  ```
  `app.js` invokes `setupTasksController({...})` at line 3462.
* **Root Cause**:
  The context object passed to `setupTasksController` at line 3462 contained `isMobile`, but `const isMobile` was not declared in `app.js` top-level helpers, which would trigger `ReferenceError: isMobile is not defined` when evaluating the object literal.
* **Required Context Properties**:
  The context object must supply:
  - State accessors: `get state() { return state; }`, `set state(v) { state = v; }`
  - Filter accessors: `get taskFilter()`, `set taskFilter(v)`, `get taskShowArchived()`, `set taskShowArchived(v)`
  - DOM helpers: `$`, `$$`, `viewRoot`, `bindFilterInput`, `openModal`, `closeModal`
  - App utilities: `toast`, `captureUndo`, `logActivity`, `save`, `parseNaturalLanguageTask`, `uid`, `todayISO`, `esc`, `isMobile`, `updateOnlineStatus`
  - Domain integration callbacks: `goalProgressToast`, `trackProgressTime`, `applyTaskGoalProgress`, `currentView`, `renderView`, `getStudentsList`, `openStudentDossier`, `openTimeBreakdownModal`, `toggleTaskDone`, `isGoalOverdue`, `goalProgress`, `vaultLinkPickerHTML`, `ic`, `playChime`, `confetti`

---

### Issue 3: Missing Search Index Generators `getSearchTasksHay()` and `getSearchVaultHay()`
* **Observation**:
  - `app.js:10136`: Calls `getSearchVaultHay().filter(...)` when search query starts with `>vault`.
  - `app.js:10197`: Calls `getSearchTasksHay().filter(...)` for standard keyword task matching.
  - `app.js:10221`: Calls `getSearchVaultHay().filter(...)` for standard keyword vault item matching.
  - `app.js:10588`: Idle warmup invokes `_whenIdle(() => { try { getSearchTasksHay(); ... } catch(_) {} })`.
* **Contract Specification**:
  1. `getSearchTasksHay()`:
     - Returns: `Array<{ t: Task, hay: string }>`
     - Mapping:
       ```javascript
       function getSearchTasksHay() {
         return (state.tasks || []).map(t => ({
           t,
           hay: `${t.title || ''} ${t.desc || ''} ${(t.tags || []).join(' ')} ${t.student || ''}`.toLowerCase()
         }));
       }
       ```
  2. `getSearchVaultHay()`:
     - Returns: `Array<{ v: VaultItem, hay: string }>`
     - Mapping:
       ```javascript
       function getSearchVaultHay() {
         return (state.vaultItems || []).map(v => ({
           v,
           hay: `${v.title || ''} ${v.description || ''} ${v.fileName || ''} ${v.url || ''} ${(v.tags || []).join(' ')}`.toLowerCase()
         }));
       }
       ```

---

### Issue 4: Vault View State & Helper Implementations in `app.js`
* **Observation**:
  `renderVault()` in `app.js:4879–4905` requires:
  - `vaultFilter`: `{ q: '', type: '', tag: '', collection: '' }`
  - `vaultViewMode`: `'grid'` (default) or `'list'`
  - `setVaultViewMode(mode)`
  - `getVaultItems()`: returns `state.vaultItems || []`
  - `getVaultCollections()`: returns `state.vaultCollections || []`
  - `addVaultCollection(title)`: creates new collection with `uid()` and sync timestamp metadata
  - `toastQuota(msg)`: toast error helper
  - `getVaultFiltered()`: applies sorting by `vaultSort` and filters by `q`, `type`, `tag`, `collection`
  - `vaultQuotaUsed()`: wrapper delegating to `storeVaultQuotaUsed(state)`
* **Routing Registration**:
  Ensure `vault` is registered in `app.js`:
  - `TITLES.vault = ['Personal Vault', 'Secure links, documents & files']`
  - `NAV.vault = ['folder', 'Vault']`
  - `MAIN_VIEWS.add('vault')`
  - `RENDERERS.vault = renderVault`

---

## 3. Line-by-Line Patch Specifications

### Chunk 1: Header Imports (`app.js:1–10`)

#### Before:
```javascript
import { setupTasksController } from './src/tasks/controller.js';\nimport { vaultBlobGet } from './src/vault/store.js';
import { vaultBlobGet } from './src/vault/store.js';
```

#### After:
```javascript
import { setupTasksController, renderTasks, openTaskModal, applyTagFilter, matrixShowMore } from './src/tasks/controller.js';
import * as VaultStore from './src/vault/view.js';
import {
  vaultDb, vaultBlobPut, vaultBlobGet, vaultBlobDelete,
  vaultQuotaUsed as storeVaultQuotaUsed, vaultGuessType, vaultTypeIcon,
  VAULT_DB, VAULT_STORE, VAULT_MAX_FILE, VAULT_SOFT_CAP
} from './src/vault/store.js';
```

---

### Chunk 2: Top-level Helpers (`app.js:110–115`)

#### Addition:
```javascript
const isMobile = () => (typeof window !== 'undefined' ? window.innerWidth <= 768 : false);
```

---

### Chunk 3: Routing Metadata & Views (`app.js:920–945, 1248`)

#### Changes in `TITLES`:
```javascript
const TITLES = {
  brief: ['Morning Brief', 'Your day, assembled before you start'],
  dashboard: ['Dashboard', 'Your day at a glance'],
  vault: ['Personal Vault', 'Secure links, documents & files'],
  review: ['Weekly review', 'What got done this week'],
  tasks: ['Tasks', 'Kanban board — drag cards to move them'],
...
```

#### Changes in `NAV`:
```javascript
const NAV = {
  brief: ['sparkles', 'Brief'], dashboard: ['dashboard', 'Dashboard'], vault: ['folder', 'Vault'], students: ['graduation-cap', 'Students'], review: ['calendar', 'Weekly review'], tasks: ['check-square', 'Tasks'], projects: ['folder', 'Projects'], schedule: ['calendar-plus', 'Schedule'], tags: ['tag', 'Tags'], goals: ['target', 'Goals'],
...
```

#### Changes in `MAIN_VIEWS`:
```javascript
const MAIN_VIEWS = new Set(['brief', 'dashboard', 'vault', 'students', 'tasks', 'projects', 'schedule', 'habits', 'notes', 'voice', 'finance', 'more']);
```

#### Changes in `RENDERERS`:
```javascript
const RENDERERS = { brief: renderBrief, dashboard: renderDashboard, vault: renderVault, students: renderStudents, review: renderReview, tasks: renderTasks, projects: renderProjects, tags: renderTags, schedule: renderSchedule, goals: renderGoals, habits: renderHabits, achievements: renderAchievements, notes: renderNotes, voice: renderVoice, activity: renderActivity, settings: renderSettings, analytics: renderAnalytics, finance: renderFinance, perf: renderPerf };
```

---

### Chunk 4: Controller Setup Context Object (`app.js:3462–3474`)

#### Replace:
```javascript
setupTasksController({
  get state() { return state; },
  set state(v) { state = v; },
  $, $$, toast, captureUndo, logActivity, save, parseNaturalLanguageTask, uid, todayISO,
  goalProgressToast, trackProgressTime, applyTaskGoalProgress, 
  currentView, closeModal,
  bindFilterInput, esc, openModal, renderView,
  viewRoot, isMobile, updateOnlineStatus,
  getStudentsList, openStudentDossier, openTimeBreakdownModal,
  toggleTaskDone, isGoalOverdue, goalProgress,
  get taskFilter() { return taskFilter; },
  set taskFilter(v) { taskFilter = v; },
  get taskShowArchived() { return taskShowArchived; },
  set taskShowArchived(v) { taskShowArchived = v; },
  vaultLinkPickerHTML, ic, playChime, confetti,
});
```

---

### Chunk 5: Personal Vault Implementations (`app.js:4865–4930`)

#### Replace:
```javascript
/* ============ Personal Vault ============ */
let vaultFilter = { q: '', type: '', tag: '', collection: '' };
let vaultViewMode = 'grid'; // 'grid' | 'list'
function setVaultViewMode(mode) { vaultViewMode = mode; }
function getVaultItems() { return state.vaultItems || []; }
function getVaultCollections() { return state.vaultCollections || []; }
function vaultQuotaUsed() { return storeVaultQuotaUsed(state); }
function toastQuota(msg) { toast(msg, 'error'); }

function addVaultCollection(title) {
  if (!state.vaultCollections) state.vaultCollections = [];
  const col = { id: uid(), title: title.trim(), color: COVER_COLORS[state.vaultCollections.length % COVER_COLORS.length] || '#4f8cff' };
  state.vaultCollections.push(col);
  if (!state._vaultCollectionsMeta) state._vaultCollectionsMeta = {};
  state._vaultCollectionsMeta[col.id] = Date.now();
  save();
  renderVault();
}

function getVaultFiltered() {
  let list = getVaultItems().slice().sort(vaultSort);
  if (vaultFilter.q) {
    const q = vaultFilter.q.toLowerCase();
    list = list.filter(v => (v.title + ' ' + (v.description || '') + ' ' + (v.fileName || '') + ' ' + (v.url || '') + ' ' + (v.tags || []).join(' ')).toLowerCase().includes(q));
  }
  if (vaultFilter.type) list = list.filter(v => v.type === vaultFilter.type);
  if (vaultFilter.tag) list = list.filter(v => (v.tags || []).includes(vaultFilter.tag));
  if (vaultFilter.collection) {
    if (vaultFilter.collection === '__none') list = list.filter(v => !v.collectionId);
    else list = list.filter(v => v.collectionId === vaultFilter.collection);
  }
  return list;
}

const vaultViewDeps = () => ({ collections: state.vaultCollections, tasks: state.tasks, tagSpan });
function vaultHost(url){ return VaultStore.vaultHost(url); }
function vaultSort(a,b){ return VaultStore.vaultSort(a,b); }
function vaultTypeLabel(id){ return VaultStore.vaultTypeLabel(id); }
function vaultTagSet(){ return VaultStore.vaultTagSet(state.vaultItems); }
function vaultCardHTML(v){ return VaultStore.vaultCardHTML(v, vaultViewDeps()); }
function vaultRowHTML(v){ return VaultStore.vaultRowHTML(v, vaultViewDeps()); }
function vaultWidgetHTML(){ return VaultStore.vaultWidgetHTML(getVaultItems()); }
function vaultLinkPickerHTML(selectedIds){ return VaultStore.vaultLinkPickerHTML(selectedIds, getVaultItems()); }
```

---

### Chunk 6: Search Hay Generators (`app.js:10125–10135`)

#### Definition Addition:
```javascript
function getSearchTasksHay() {
  return (state.tasks || []).map(t => ({
    t,
    hay: `${t.title || ''} ${t.desc || ''} ${(t.tags || []).join(' ')} ${t.student || ''}`.toLowerCase()
  }));
}

function getSearchVaultHay() {
  return (state.vaultItems || []).map(v => ({
    v,
    hay: `${v.title || ''} ${v.description || ''} ${v.fileName || ''} ${v.url || ''} ${(v.tags || []).join(' ')}`.toLowerCase()
  }));
}
```

---

## 4. Test & Verification Plan

| Test Target | Command / Check | Expected Result |
|---|---|---|
| Vitest Unit Tests | `npx vitest run tests/unit/vault.test.js tests/unit/vault-view.test.js` | All unit tests pass with 0 errors |
| Playwright Smoke Spec | `npx playwright test tests/smoke.spec.js` | All 19 views (including `#vault`, `#tasks`, `#schedule`) render without console `ReferenceError` |
| Playwright Vault Spec | `npx playwright test tests/vault.spec.js` | All vault CRUD, upload, tagging, collections, and search tests pass |
| Global Search Test | Search `>vault` and general search terms in UI | Both Tasks and Vault items return relevant results instantly without crashing |

---

## 5. Artifact Summary
- **Analysis Document**: `C:\Users\micha\Desktop\Lumen\.agents\explorer_m1_1\analysis.md`
- **Handoff Document**: `C:\Users\micha\Desktop\Lumen\.agents\explorer_m1_1\handoff.md`
- **Agent Working Dir**: `C:\Users\micha\Desktop\Lumen\.agents\explorer_m1_1\`
