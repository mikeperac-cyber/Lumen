# Analysis & Patch Specification: `src/tasks/controller.js` & `src/tasks/`

**Agent**: Explorer M1.2  
**Target Subsystem**: Tasks Controller & Module (`src/tasks/controller.js`, `src/tasks/`)  
**Milestone**: M1 (Architecture & Boot Fix)  
**Date**: 2026-08-29  

---

## 1. Executive Summary

A global regex find-and-replace artifact during prior refactoring corrupted tokens across `src/tasks/controller.js`. The search-and-replace indiscriminately prefixed `$`, `state`, and `save` with `app.` even when already prefixed or inside template literals, CSS class names, HTML IDs, and regex expressions.

Additionally:
1. `app.js` (lines 10197 and 10588) invokes `getSearchTasksHay()` during global search indexing and boot idle warmup. Because `getSearchTasksHay` was not exported or defined, navigating search or cold booting with >20 tasks threw `ReferenceError: getSearchTasksHay is not defined`.
2. Virtual scrolling spacer styles in column bodies were corrupted into `style="height:app.${topPad}px;flex-shrink:0"`, breaking CSS inline height parsing and column virtual windowing.
3. DOM queries corrupted from `$$` into `app.$app.$` threw runtime type errors or failed element selection across Kanban columns, modals, Eisenhower matrix drag-and-drop, and Pomodoro presets.
4. Modal save button ID `#f-save` corrupted to `#f-app.save` broke form saving (`#f-save`) and broke behavioral integration test suites.

---

## 2. Line-by-Line Inventory of Corruptions in `src/tasks/controller.js`

### 2.1 Double-Prefixed Selector Corruptions (`app.$app.$` $\rightarrow$ `app.$$` / `$$`)

Across `src/tasks/controller.js`, the multi-element query helper `$$` (or `app.$$`) was corrupted into `app.$app.$`:

| Line | Corrupted Code | Correct Code | Impact |
|---|---|---|---|
| **47** | `app.$app.$('.task-card', scope)` | `app.$$('.task-card', scope)` | Binds task cards in column scope |
| **128** | `app.$app.$('.task-card', scope)` | `app.$$('.task-card', scope)` | Card click & menu binding in column |
| **157** | `app.$app.$('[data-complete]', scope)` | `app.$$('[data-complete]', scope)` | Card checkbox click binding in column |
| **188** | `app.$app.$('.task-card', body)` | `app.$$('.task-card', body)` | Drag/drop binding for virtual cards |
| **307** | `app.$app.$('.col-range')` | `app.$$('.col-range')` | Column jump/range indicators |
| **315** | `app.$app.$('[data-list-menu]')` | `app.$$('[data-list-menu]')` | Kanban custom list menu triggers |
| **335** | `app.$app.$('[data-list-color]')` | `app.$$('[data-list-color]')` | List header color swatch pickers |
| **339** | `app.$app.$('[data-rename-list]')` | `app.$$('[data-rename-list]')` | Rename custom Kanban list buttons |
| **360** | `app.$app.$('.col-count.pulse, .col-range.pulse')` | `app.$$('.col-count.pulse, .col-range.pulse')` | Filter match pulse animations |
| **365** | `app.$app.$('.col')` | `app.$$('.col')` | Kanban column quick-add bindings |
| **394** | `app.$app.$('.col-add')` | `app.$$('.col-add')` | Column footer quick-add inputs |
| **402** | `app.$app.$('.col')` | `app.$$('.col')` | Column dropzone drag listeners |
| **613** | `app.$app.$('[data-more]')` | `app.$$('[data-more]')` | Matrix quadrant "Show More" buttons |
| **619** | `app.$app.$('[data-more]')` | `app.$$('[data-more]')` | Matrix show more click handlers |
| **621** | `app.$app.$('.matrix-task')` | `app.$$('.matrix-task')` | Matrix task card click handlers |
| **626** | `app.$app.$('[data-complete]')` | `app.$$('[data-complete]')` | Matrix complete checkbox handlers |
| **637** | `app.$app.$('.matrix-task[draggable]', app.viewRoot())` | `app.$$('.matrix-task[draggable]', app.viewRoot())` | Matrix task dragstart handlers |
| **647** | `app.$app.$('.matrix-quad-body.drag-over', app.viewRoot())` | `app.$$('.matrix-quad-body.drag-over', app.viewRoot())` | Matrix quadrant drag cleanup |
| **650** | `app.$app.$('.matrix-quad-body', app.viewRoot())` | `app.$$('.matrix-quad-body', app.viewRoot())` | Matrix quadrant dragover/drop handlers |
| **763** | `app.$app.$('[data-cover]')` | `app.$$('[data-cover]')` | Task modal cover color swatches |
| **769** | `app.$app.$('[data-cover]')` | `app.$$('[data-cover]')` | Cover swatch click listeners |
| **845** | `app.$app.$('.subtask-row')` | `app.$$('.subtask-row')` | Subtask row drag-and-drop bindings |
| **899** | `app.$app.$('.subtask-row')` | `app.$$('.subtask-row')` | Subtask checkbox and text bindings |
| **1032**| `app.$app.$('.pomo-preset')` | `app.$$('.pomo-preset')` | Pomodoro duration preset buttons |
| **1035**| `app.$app.$('.pomo-preset')` | `app.$$('.pomo-preset')` | Pomodoro preset click handlers |
| **1082**| `app.$app.$('.subtask-row')` | `app.$$('.subtask-row')` | Subtask delete and toggle bindings |

---

### 2.2 Corrupted Template String Interpolations (`app.${...}` $\rightarrow$ `${...}`)

Inside template literals, `${expr}` was corrupted into `app.${expr}`:

| Line | Corrupted Code | Correct Code |
|---|---|---|
| **81** | ``card.style.transform = `translateX(app.${dx * 0.6}px)`;`` | ``card.style.transform = `translateX(${dx * 0.6}px)`;`` |
| **113** | ``app.toast(`Moved to app.${STATUSES[curIdx + 1].title}`);`` | ``app.toast(`Moved to ${STATUSES[curIdx + 1].title}`);`` |
| **170** | ``const body = app.$(`.col-body[data-status-body="app.${status}"]`);`` | ``const body = app.$(`.col-body[data-status-body="${status}"]`);`` |
| **185** | ``<div class="col-spacer top" style="height:app.${topPad}px;flex-shrink:0"></div>`` | ``<div class="col-spacer top" style="height:${topPad}px;flex-shrink:0"></div>`` |
| **187** | ``<div class="col-spacer bottom" style="height:app.${bottomPad}px;flex-shrink:0"></div>`` | ``<div class="col-spacer bottom" style="height:${bottomPad}px;flex-shrink:0"></div>`` |
| **197** | ``const body = app.$(`.col-body[data-status-body="app.${status}"]`);`` | ``const body = app.$(`.col-body[data-status-body="${status}"]`);`` |
| **203** | ``indicator.textContent = `app.${first + 1}–app.${last + 1} of app.${itemsLen}`;`` | ``indicator.textContent = `${first + 1}–${last + 1} of ${itemsLen}`;`` |
| **213** | ``headerRange.textContent = `Showing all app.${trueTotal} task${trueTotal === 1 ? '' : 's'}`;`` | ``headerRange.textContent = `Showing all ${trueTotal} task${trueTotal === 1 ? '' : 's'}`;`` |
| **214** | ``headerRange.textContent = `app.${hidden ? '⚠️ ' : ''}Showing app.${itemsLen} of app.${trueTotal} task${trueTotal === 1 ? '' : 's'}`;`` | ``headerRange.textContent = `${hidden ? '⚠️ ' : ''}Showing ${itemsLen} of ${trueTotal} task${trueTotal === 1 ? '' : 's'}`;`` |
| **215** | ``app.toast(`app.${trueTotal} task${trueTotal === 1 ? '' : 's'} · showing app.${itemsLen} / app.${trueTotal}`);`` | ``app.toast(`${trueTotal} task${trueTotal === 1 ? '' : 's'} · showing ${itemsLen} / ${trueTotal}`);`` |
| **218** | ``body.outerHTML = `<div class="col-body" data-status-body="app.${status}" ...>...</div>``` | ``body.outerHTML = `<div class="col-body" data-status-body="${status}" ...>...</div>``` |
| **284** | ``${taskHiddenRisk[s.id]} app.${s.title.toLowerCase()}`` | ``${taskHiddenRisk[s.id]} ${s.title.toLowerCase()}`` |
| **319** | ``<h3>List: app.${app.esc(l.title)}</h3><button class="btn-icon" data-close-modal>app.${ic('x', 16)}</button>`` | ``<h3>List: ${app.esc(l.title)}</h3><button class="btn-icon" data-close-modal>${app.ic('x', 16)}</button>`` |
| **320** | ``value="app.${app.esc(l.title)}"`` | ``value="${app.esc(l.title)}"`` |
| **321** | ``${COLORS.map(c => `<button class="swatch app.${c === (l.color || COLORS[0]) ? 'active' : ''}" ...></button>`).join('')}`` | ``${COLORS.map(c => `<button class="swatch ${c === (l.color || COLORS[0]) ? 'active' : ''}" ...></button>`).join('')}`` |
| **355** | ``col.dataset.status = `app.${status}`;`` | ``col.dataset.status = `${status}`;`` |
| **388** | ``app.toast(`Moved to app.${STATUSES.find(s => s.id === toStatus)?.title || toStatus}`);`` | ``app.toast(`Moved to ${STATUSES.find(s => s.id === toStatus)?.title || toStatus}`);`` |
| **500** | ``app.toast(`Updated status for app.${taskSelected.size} task(s) ✅`);`` | ``app.toast(`Updated status for ${taskSelected.size} task(s) ✅`);`` |
| **512** | ``app.toast(`Set priority to app.${p.toUpperCase()} for app.${taskSelected.size} task(s)`);`` | ``app.toast(`Set priority to ${p.toUpperCase()} for ${taskSelected.size} task(s)`);`` |
| **525** | ``app.toast(`Set due date for app.${taskSelected.size} task(s) 📅`);`` | ``app.toast(`Set due date for ${taskSelected.size} task(s) 📅`);`` |
| **549** | ``if (!confirm(`Delete app.${taskSelected.size} task(s)?`)) return;`` | ``if (!confirm(`Delete ${taskSelected.size} task(s)?`)) return;`` |
| **767** | ``<img src="app.${pendingCoverImage}" class="task-cover-preview">`` | ``<img src="${pendingCoverImage}" class="task-cover-preview">`` |
| **777** | ``data-close-modal>app.${ic('x', 16)}`` and `<option value="app.${l.id}" ...>app.${app.esc(l.title)}</option>` | ``data-close-modal>${app.ic('x', 16)}`` and `<option value="${l.id}" ...>${app.esc(l.title)}</option>` |
| **785** | Comments loop: `app.${app.esc(c.author||'You')}`, `app.${timeAgo(c.at)}`, `data-comment-del="app.${c.id}"`, `app.${ic('x', 12)}`, `app.${app.esc(c.text)}` | Cleaned of all `app.` inside `${...}` |
| **789** | Attachments loop: `app.${fileIcon(a.name)}`, `app.${app.esc(a.name)}`, `app.${fileSizeStr(a.size)}`, `data-attach-dl="app.${a.id}"`, `data-attach-del="app.${a.id}"` | Cleaned of all `app.` inside `${...}` |
| **840** | Subtasks loop: `app.${done ? 'checked' : ''}`, `data-st-check="app.${idx}"`, `value="app.${app.esc(text)}"`, `data-st-text="app.${idx}"`, `data-st-del="app.${idx}"`, `app.${ic('x', 14)}` | Cleaned of all `app.` inside `${...}` |
| **866** | ``Task: "app.${taskTitle}". Details: "app.${taskDesc}".`` | ``Task: "${taskTitle}". Details: "${taskDesc}".`` |
| **881** | ``app.toast(`✨ Added app.${steps.length} subtasks with AI!`, 'success');`` | ``app.toast(`✨ Added ${steps.length} subtasks with AI!`, 'success');`` |
| **886** | ``app.toast(`AI error: app.${err.message}`, 'error');`` | ``app.toast(`AI error: ${err.message}`, 'error');`` |
| **994** | ``<div class="pomo-clock">app.${String(mins).padStart(2, '0')}:app.${String(secs).padStart(2, '0')}</div>`` | ``<div class="pomo-clock">${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}</div>`` |
| **1001**| ``app.${ic('pause', 16)} Pause`` | ``${app.ic('pause', 16)} Pause`` |
| **1004**| ``app.${ic('play', 16)} app.${widgetRemain < widgetDur() ? 'Resume' : 'Start'}`` | ``${app.ic('play', 16)} ${widgetRemain < widgetDur() ? 'Resume' : 'Start'}`` |
| **1011**| ``<div class="pomo-meta">app.${todaySessions.length} session${todaySessions.length === 1 ? '' : 's'} today...</div>`` | ``<div class="pomo-meta">${todaySessions.length} session${todaySessions.length === 1 ? '' : 's'} today...</div>`` |

---

### 2.3 HTML Class, ID, Regex, and Button Corruptions

1. **`empty-state` CSS Class**:
   - Line 175: `<div class="empty-app.state"` $\rightarrow$ `<div class="empty-state"`
2. **List Modal Save Button ID & Selector**:
   - Line 323: `<button class="btn btn-accent" id="list-app.save">Save</button>` $\rightarrow `<button class="btn btn-accent" id="list-save">Save</button>`
   - Line 328: `app.$('#list-app.save')` $\rightarrow `app.$('#list-save')`
3. **Task Modal Save Button Selector**:
   - Line 894: `app.$('#f-app.save')` $\rightarrow `app.$('#f-save')`
4. **RegExp Anchor Corruption**:
   - Line 810: `f.name.replace(/\.[^.]+app.$/, '')` $\rightarrow `f.name.replace(/\.[^.]+$/, '')`
5. **String Literals Containing `app.save`**:
   - Line 767: `Cover image ready — app.save to keep` $\rightarrow `Cover image ready — save to keep`
   - Line 773: `t.archived ? 'Will archive on app.save' : 'Will restore on app.save'` $\rightarrow `t.archived ? 'Will archive on save' : 'Will restore on save'`

---

## 3. Specification & Implementation: `getSearchTasksHay()`

### 3.1 Problem Statement
In `app.js`:
- Line 10197: `const taskHits = getSearchTasksHay().filter(e => !q || e.hay.includes(q)).map(e => e.t)...`
- Line 10588 (idle warmup): `_whenIdle(() => { try { getSearchTasksHay(); ... } catch (_) {} });`

When `getSearchTasksHay` is missing:
- Opening global search (`Ctrl+K`) crashes or omits tasks.
- App boot logs errors during idle memoization warming.

### 3.2 Design Requirements
1. **Input**: Optional `tasks` array (defaults to `app.state.tasks` or `window.state.tasks`).
2. **Output**: Array of `{ t, hay }` objects:
   - `t`: The task object reference.
   - `hay`: Lowercase concatenated string of `title`, `desc`, `tags`, and all `comments[].text`:
     ```javascript
     const hay = (
       t.title + ' ' +
       (t.desc || '') + ' ' +
       (t.tags || []).join(' ') + ' ' +
       (t.comments || []).map(c => c.text || '').join(' ')
     ).toLowerCase();
     ```
3. **Performance / Memoization**:
   - Tasks may number in the thousands.
   - Fast cache validation based on list reference, length, and max `updatedAt` timestamp.
4. **Export Requirements**:
   - Exported as named function from `src/tasks/controller.js` (and `src/tasks/store.js` if desired).
   - Attached to `window.LumenLib.tasks.getSearchTasksHay`.
   - Accessible via global / window scope when called from `app.js`.

### 3.3 Reference Implementation

```javascript
let _searchTasksCache = null;
let _searchTasksCacheLen = -1;
let _searchTasksCacheUpdated = 0;

/**
 * Returns pre-indexed lowercase search haystack objects for tasks.
 * @param {Array<object>} [tasks]
 * @returns {Array<{t: object, hay: string}>}
 */
export function getSearchTasksHay(tasks) {
  const list = tasks || (app && app.state && app.state.tasks) || (typeof window !== 'undefined' && window.state && window.state.tasks) || [];
  let maxUpdated = 0;
  for (let i = 0; i < list.length; i++) {
    if (list[i].updatedAt > maxUpdated) maxUpdated = list[i].updatedAt;
  }
  if (_searchTasksCache && _searchTasksCacheLen === list.length && _searchTasksCacheUpdated === maxUpdated) {
    return _searchTasksCache;
  }
  _searchTasksCacheLen = list.length;
  _searchTasksCacheUpdated = maxUpdated;
  _searchTasksCache = list.map(t => ({
    t,
    hay: (
      (t.title || '') + ' ' +
      (t.desc || '') + ' ' +
      (t.tags || []).join(' ') + ' ' +
      (t.comments || []).map(c => c.text || '').join(' ')
    ).toLowerCase()
  }));
  return _searchTasksCache;
}
```

---

## 4. Virtual Scrolling Spacer Specification

### 4.1 Requirement in `src/tasks/controller.js` & `src/tasks/view.js`
When column tasks exceed windowing thresholds, `src/tasks/virtual.js` computes `{ start, end, topPad, bottomPad }`.
The spacer elements in `renderColumnBodyVirtual` must render as:
```html
<div class="col-spacer top" style="height:${topPad}px;flex-shrink:0"></div>
<!-- ...rendered cards... -->
<div class="col-spacer bottom" style="height:${bottomPad}px;flex-shrink:0"></div>
```
When corrupted as `style="height:app.${topPad}px;flex-shrink:0"`, browsers reject the CSS style property, resulting in `height: 0`, causing scroll jumping and visual collapse of the column list.

---

## 5. Interface Contract & Module Exports (`setupTasksController`)

In `src/tasks/controller.js`:
```javascript
export function setupTasksController(ctx) {
  app = ctx;
  window.LumenLib = window.LumenLib || {};
  window.LumenLib.tasks = window.LumenLib.tasks || {};
  Object.assign(window.LumenLib.tasks, {
    renderTasks,
    renderMatrix,
    openTaskModal,
    applyTagFilter,
    matrixShowMore,
    getSearchTasksHay,
    getKanbanLists,
    addKanbanList,
    renameKanbanList,
    deleteKanbanList,
    ensureKanbanLists
  });
  // Global bridge for legacy app.js callers
  if (typeof window !== 'undefined') {
    window.getSearchTasksHay = getSearchTasksHay;
  }
}
```

Named exports from `src/tasks/controller.js`:
- `setupTasksController`
- `renderTasks`
- `renderMatrix`
- `openTaskModal`
- `applyTagFilter`
- `matrixShowMore`
- `getSearchTasksHay`
- `getKanbanLists`
- `addKanbanList`
- `renameKanbanList`
- `deleteKanbanList`
- `ensureKanbanLists`
- `taskSelected`
- `taskSelectMode`

---

## 6. Verification and Test Plan

1. **Unit Tests**:
   - Run `npx vitest run tests/unit/tasks-view.test.js`
   - Run `npx vitest run tests/unit/tasks-virtual.test.js`
2. **Smoke Test**:
   - Run `npx playwright test tests/smoke.spec.js` (assert 0 console errors across all 19 hash routes).
3. **Behavioral Tests**:
   - Run `npx playwright test tests/behavioral.spec.js` (task creation, editing, `#f-save`, subtask drag & drop).
4. **Module Contract Test**:
   - Run `npx playwright test tests/module-scope.spec.js` (modal binding, task controllers).
