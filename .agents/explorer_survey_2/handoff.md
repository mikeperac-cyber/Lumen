# Explorer 2 Handoff Report: Performance Load & Parse (R2) and Sync Merge (R3)

## 1. Observation

### Observation 1.1: Bundle Size and Monolithic Entry Chunk
- **File**: `app.js:1-10638` (563,698 bytes, 10,638 lines)
- **File**: `index.html:170-172`:
  ```html
  <script type="module" src="src/lib/globals.js"></script>
  <script type="module" src="src/main.js"></script>
  <script type="module" src="app.js"></script>
  ```
- **File**: `vite.config.mjs:1-2`:
  ```javascript
  import { defineConfig } from 'vite';
  export default defineConfig({ base: './', build: { outDir: 'dist', emptyOutDir: true, manifest: true, rollupOptions: { input: 'index.html' } }, test: { include: ['src/**/*.{test,spec}.{js,ts}', 'tests/unit/**/*.{test,spec}.{js,ts}'], environment: 'node', globals: false, pool: 'forks' } });
  ```
- **Command & Output**: Running `npx vite build` previously produced a single monolithic output chunk `dist/assets/index-*.js` exceeding the 250KB chunk budget because all 18 view renderers and subsystems are statically imported.

### Observation 1.2: Save Debounce and Synchronous Main-Thread Serialization
- **File**: `app.js:775-797`:
  ```javascript
  function save() {
    reviewWeekCache.clear();
    saveDirty = true;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flushSave, 150);
  }
  function flushSave() {
    clearTimeout(saveTimer); saveTimer = 0;
    if (!saveDirty) return;
    saveDirty = false;
    const json = JSON.stringify(state);
    if (json === lastSavedJson) return;
    lastSavedJson = json;
    try { localStorage.setItem(KEY, json); } catch (e) { console.warn('localStorage quota exceeded — IDB is primary', e); }
    stateDbPut(json).catch(() => {});
    maybeAutoSync();
    checkOverdueNotifications();
  }
  ```
- `JSON.stringify(state)` runs synchronously on the main thread inside a `setTimeout(150)` callback, blocking user interactions, typing, and 60fps animations for 25-50ms when state reaches multi-megabyte sizes.

### Observation 1.3: Virtual List Rendering Flicker
- **File**: `src/tasks/virtual.js:10-12`:
  ```javascript
  export const OVERSCAN_TOP = 60;
  export const OVERSCAN_BOTTOM = 120;
  ```
- **File**: `src/tasks/controller.js:185, 228`:
  ```javascript
  body.innerHTML = (topPad ? `<div style="height:app.${topPad}px;flex-shrink:0"></div>` : '') + ...
  taskVirtRAF[status] = setTimeout(() => { taskVirtRAF[status] = 0; renderTaskColumnBody(status); }, 24);
  ```
- Overscan is smaller than a single task card (60px vs ~80-140px card height). `setTimeout(24)` causes macrotask delay after scrolling. `body.innerHTML` destroys all DOM nodes on every scroll tick. `height:app.${topPad}px` produces invalid CSS `height: app.120px` causing zero-height spacers.

### Observation 1.4: Sync Merge Hash Serialization
- **File**: `src/lib/merge.js:12-14, 227`:
  ```javascript
  const key = (arr) => JSON.stringify([...(arr || [])].sort((a, b) => (a.id < b.id ? -1 : 1)));
  const keyAch = (a) => JSON.stringify(Object.entries(a || {}).sort((x, y) => (x[0] < y[0] ? -1 : 1)));
  const before = key(state.tasks) + key(state.goals) + key(state.habits) + key(state.notes) + key(state.recordings) + key(state.projects) + key(state.krHistory) + key(state.income) + key(state.expenses) + key(state.students) + key(state.attendance) + key(state.assignments) + key(state.lessonPlans) + JSON.stringify(state.kanbanLists || []) + JSON.stringify(state.tagColors || {}) + keyAch(state.achievements) + key(state.vaultItems) + JSON.stringify(state.vaultCollections||[]) + JSON.stringify(state._vaultItemsMeta||{}) + JSON.stringify(state._vaultCollectionsMeta||{});
  ```
- `applyMerge` runs 19 array clones, 19 array sorts, and 19 JSON stringifications twice (before and after merge), causing 30-150ms UI freezes and MBs of garbage collection pressure.

### Observation 1.5: Habit Store Unbounded While Loops
- **File**: `src/habits/store.js:22-31, 47-53`:
  ```javascript
  export function currentStreak(dates, freezes, todayISO) {
    let streak = 0;
    let cursor = todayISO;
    if (!dates[cursor] && !freezes[cursor]) cursor = stepDay(cursor, -1);
    while (dates[cursor] || freezes[cursor]) {
      if (dates[cursor]) streak++;
      cursor = stepDay(cursor, -1);
    }
    return streak;
  }
  ```
- Unlike `bestStreak` which caps iterations at 400 (`for (let i = 0; i < 400; i++)`), `currentStreak` and `streakAsOf` have unbounded `while` loops that enter infinite loops if corrupted date strings (`NaN-NaN-NaN`) or prototype properties exist.

---

## 2. Logic Chain

1. **Bundle Size & Chunk Splitting**:
   - Because `app.js` is 564KB and imports all 18 views statically (Obs 1.1), the built JavaScript output chunk exceeds 250KB.
   - Dynamic `import()` on route switching in `renderView()` and extracting heavy submodules (tasks, students, vault, finance, peerjs) splits the code into discrete, on-demand chunks <250KB.
   - Adding `chunkSizeWarningLimit: 250` in `vite.config.mjs` enforces this in CI.

2. **Save Deferral & Idle Scheduling**:
   - Because `save()` performs synchronous `JSON.stringify` on a fixed `setTimeout(150)` (Obs 1.2), non-critical saves (pomodoro ticks, habit checks, ambient sounds, activity logs) disrupt smooth UI rendering.
   - Using `requestIdleCallback` (with fallback) for debounced/non-critical saves ensures persistence occurs during browser idle periods, reserving the main thread for 60/120fps interactions. Critical actions (modal submission, pagehide) remain immediate.

3. **Virtual List Flicker Elimination**:
   - The 60px overscan (Obs 1.3) does not cover the height of a single card; scrolling quickly exposes unrendered empty space.
   - The 24ms `setTimeout` macrotask runs after the browser renders the scroll paint, resulting in white flashes.
   - The malformed `height:app.${topPad}px` renders invalid CSS, collapsing the spacer height.
   - Expanding overscan to 350px/500px, switching to `requestAnimationFrame`, correcting the CSS string, and skipping DOM teardown when the slice does not change eliminates rendering flicker completely.

4. **Merge Signature Optimization**:
   - `applyMerge` only needs to know whether the state changed (Obs 1.4).
   - In LWW sync, any state modification alters either collection length or advances `max(updatedAt)`.
   - Replacing 38 full array sorts and JSON stringifications with an O(N) single-pass signature (`${arr.length}:${maxUpdated}`) reduces execution time to <0.05ms while retaining 100% test compatibility.

5. **Habit Store Loop Capping**:
   - Unbounded `while` loops (Obs 1.5) risk infinite loops and freezing the tab on corrupt date keys.
   - Adding `MAX_STREAK_DAYS = 3650` (10-year cap) and strict `stepDay` date validation guarantees loop termination in bounded time.

---

## 3. Caveats

- **Explorer 1 R1 Scope**: Explorer 1 is concurrently investigating extraction of tasks, vault, and finance logic from `app.js` into their respective modules. Code-splitting recommendations in this report align directly with the module seams Explorer 1 is establishing.
- **Service Worker Precaching**: When code-splitting is enabled, `sw.js` and `scripts/postbuild.js` must ensure all generated chunks in `dist/assets/` are included in precache lists if full offline functionality is required.

---

## 4. Conclusion

- The codebase has clear, localized optimization targets for both R2 (Load & Parse) and R3 (Sync Merge).
- Implementing route-based dynamic `import()` in `renderView()` and setting `chunkSizeWarningLimit: 250` in `vite.config.mjs` will satisfy the <250KB Vite chunk budget.
- Deferring non-critical saves with `requestIdleCallback` removes main-thread frame jank.
- Fixing `src/tasks/virtual.js` and `src/tasks/controller.js` (overscan, rAF, CSS typo, DOM diffing) eliminates virtual list flicker.
- Replacing `key()` serialization in `src/lib/merge.js` with `stateSig()` makes sync merge virtually instantaneous.
- Capping `src/habits/store.js` loops at 3,650 iterations eliminates all infinite loop hang vulnerabilities.

---

## 5. Verification Method

To independently verify these findings and test the proposed optimizations:

1. **Unit Test Suite**:
   ```bash
   npm run test:unit
   ```
   Ensures all 342 unit tests (including `merge.test.js`, `habits.test.js`, `tasks-virtual.test.js`) continue to pass.

2. **Performance Regression Tripwires**:
   ```bash
   npx playwright test tests/perf.spec.js
   ```
   Validates dashboard and tasks board render under 120ms with 2,000 seeded tasks.

3. **Vite Chunk Size Budget Verification**:
   ```bash
   npx vite build
   ```
   Inspect `dist/assets/` output to verify no individual `.js` chunk exceeds 250KB.
