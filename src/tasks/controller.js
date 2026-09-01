import { STATUSES, COLORS, EMOJIS, PRIOS, CATEGORIES, RECURRENCE, COVER_COLORS, MATRIX_PAGE } from '../lib/constants.js';
import { esc, fmtShort, fmtDur, timeAgo, fileSizeStr, isoDate, shiftDays, todayISO } from '../lib/helpers.js';
import * as view from './view.js';
import * as virtual from './virtual.js';
import { isArchivedTask, MATRIX_QUADRANTS } from './view.js';
import { vaultBlobPut, vaultGuessType, VAULT_MAX_FILE } from '../vault/store.js';

const DAYS = [
  { id: 'mon', label: 'Mon' }, { id: 'tue', label: 'Tue' }, { id: 'wed', label: 'Wed' },
  { id: 'thu', label: 'Thu' }, { id: 'fri', label: 'Fri' }, { id: 'sat', label: 'Sat' }, { id: 'sun', label: 'Sun' }
];
const fileIcon = (name) => (app.fileIcon ? app.fileIcon(name) : (typeof window !== 'undefined' && window.fileIcon ? window.fileIcon(name) : '📄'));

let app = {};

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
  const len = list.length;
  if (!len) {
    if (_searchTasksCache && _searchTasksCacheLen === 0) return _searchTasksCache;
    _searchTasksCache = [];
    _searchTasksCacheLen = 0;
    _searchTasksCacheUpdated = 0;
    return _searchTasksCache;
  }
  let maxUpdated = 0;
  for (let i = 0; i < len; i++) {
    const u = list[i].updatedAt || 0;
    if (u > maxUpdated) maxUpdated = u;
  }
  if (_searchTasksCache && _searchTasksCacheLen === len && _searchTasksCacheUpdated === maxUpdated) {
    return _searchTasksCache;
  }
  _searchTasksCacheLen = len;
  _searchTasksCacheUpdated = maxUpdated;
  const out = new Array(len);
  for (let i = 0; i < len; i++) {
    const t = list[i];
    let hay = (t.title || '') + ' ' + (t.desc || '');
    if (t.tags && t.tags.length) hay += ' ' + t.tags.join(' ');
    if (t.comments && t.comments.length) {
      for (let j = 0; j < t.comments.length; j++) {
        const c = t.comments[j];
        if (c && c.text) hay += ' ' + c.text;
      }
    }
    if (t.student) hay += ' ' + t.student;
    out[i] = { t, hay: hay.toLowerCase() };
  }
  _searchTasksCache = out;
  return out;
}

export function setupTasksController(ctx) {
  app = ctx;
  if (typeof window !== 'undefined') {
    if (!window.LumenLib) window.LumenLib = {};
    if (!window.LumenLib.tasks) window.LumenLib.tasks = {};
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
    window.getSearchTasksHay = getSearchTasksHay;
  }
}

export function getInitialTaskFilter() {
  return { q: '', goal: '', tag: '', category: '' };
}

export function getInitialTaskState(presetStatus) {
  return { title: '', desc: '', status: presetStatus || 'today', priority: 'med', due: '', startDate: '', coverColor: '', coverImage: '', members: [], comments: [], attachments: [], archived: false, watchers: [], goalId: '', tags: [], category: '', recurrence: '', subtasks: [] };
}

/* ============ Tasks (kanban) ============ */
let taskFilter = getInitialTaskFilter();
// Filter the board by a tag from anywhere (tags view card, search result) — renders
// immediately even when already on #tasks (setting the same hash fires no hashchange).
export function applyTagFilter(tag) {
  taskFilter = { q: '', goal: '', tag };
  if (app.currentView && app.currentView() === 'tasks') renderTasks();
  else if (typeof location !== 'undefined') location.hash = '#tasks';
}
/* Windowed virtualization for the kanban. Each column scrolls independently, so each
   column renders only the cards near its scroll position, with spacers sized from a
   per-task height cache (estimated first, corrected after each render). */
const TASK_EST_H = 90;
const TASK_GAP = 8;
let taskVirt = {};      // status -> { top: scrollTop, heights: { taskId: px } }
let taskVirtRAF = {};   // status -> pending rAF id
let taskVirtItems = {}; // status -> current filtered task list
let taskStatusTotals = {}; // status -> true total across all tasks (unfiltered)
let taskFilterActive = false; // any of q/goal/tag filters active
let taskColShowAll = new Set(); // statuses whose column bypasses the active filter
let taskHiddenRisk = {}; // status -> count of overdue/due-soon tasks hidden by the filter
let taskHiddenRiskPrev = {}; // previous render's hidden-risk counts (for pulse detection)
let taskFilterSig = ''; // last-rendered filter signature
let taskShowArchived = false;
let taskDragging = false;
let taskViewMode = 'kanban'; // 'kanban' or 'matrix'
// per-quadrant window — keeps initial matrix DOM ~4×60 instead of 4×500
let _matrixVisible = { do: 60, schedule: 60, delegate: 60, eliminate: 60 };
let _matrixFilterSig = '';
export function matrixShowMore(id) { _matrixVisible[id] = Math.min((_matrixVisible[id] || 60) + 60, 1000); renderMatrix(); }
let taskSelectMode = false;
let taskSelected = new Set();
let lastSelectedId = null;

function bindTaskCards(scope) {
  app.$$('.task-card', scope).forEach(card => {
    card.addEventListener('dragstart', e => {
      taskDragging = true;
      e.dataTransfer.setData('text/plain', card.dataset.id);
      e.dataTransfer.effectAllowed = 'move';
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => { taskDragging = false; card.classList.remove('dragging'); });
    card.addEventListener('click', e => {
      if (e.target.closest('[data-complete]') || e.target.closest('[data-task-pomo]')) return;
      if (e.target.closest('.task-student-chip')) {
        e.stopPropagation();
        const sName = e.target.closest('.task-student-chip').dataset.openStudent;
        const std = (app.getStudentsList ? app.getStudentsList() : (typeof getStudentsList !== 'undefined' ? getStudentsList() : [])).find(x => x.name === sName);
        if (std) (app.openStudentDossier || (typeof openStudentDossier !== 'undefined' ? openStudentDossier : () => {}))(std.id || std.name);
        return;
      }
      if (e.target.closest('.tc-time')) {
        e.stopPropagation();
        (app.openTimeBreakdownModal || (typeof openTimeBreakdownModal !== 'undefined' ? openTimeBreakdownModal : () => {}))(card.dataset.id);
        return;
      }
      openTaskModal(app.state.tasks.find(t => t.id === card.dataset.id));
    });
    // Swipe-to-complete on mobile
    let touchX = 0, touchY = 0, swiping = false;
    card.addEventListener('touchstart', e => {
      const t = e.touches[0]; touchX = t.clientX; touchY = t.clientY; swiping = false;
    }, { passive: true });
    card.addEventListener('touchmove', e => {
      const t = e.touches[0];
      const dx = t.clientX - touchX;
      if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(t.clientY - touchY) * 1.5) {
        swiping = true;
        card.style.transform = `translateX(${dx * 0.6}px)`;
        card.style.opacity = String(1 - Math.abs(dx) / 400);
        card.style.transition = 'none';
      }
    }, { passive: true });
    card.addEventListener('touchend', () => {
      if (!swiping) { card.style.transform = ''; card.style.opacity = ''; card.style.transition = ''; return; }
      const dx = parseFloat(card.style.transform.match(/translateX\((.+?)px\)/)?.[1] || 0);
      card.style.transition = 'transform .25s, opacity .25s';
      card.style.transform = ''; card.style.opacity = '';
      const taskId = card.dataset.id;
      const task = app.state.tasks.find(x => x.id === taskId);
      if (!task) return;
      if (dx < -100) {
        // Swipe left → complete
        app.captureUndo('Complete task');
        const { wasDone, kr } = (app.toggleTaskDone || (typeof toggleTaskDone !== 'undefined' ? toggleTaskDone : () => ({ wasDone: false })))(task);
        app.save();
        if (app.currentView && app.currentView() === 'tasks') renderTasks(); else app.renderView();
        if (kr && app.goalProgressToast) app.goalProgressToast(task, wasDone, kr);
        app.toast(task.status === 'done' ? 'Task completed ✅' : 'Task reopened');
      } else if (dx > 100) {
        // Swipe right → move to next status
        const curIdx = STATUSES.findIndex(s => s.id === task.status);
        if (curIdx < STATUSES.length - 1 && task.status !== 'done') {
          const nextStatus = STATUSES[curIdx + 1].id;
          task.status = nextStatus;
          task.completedAt = nextStatus === 'done' ? (app.todayISO ? app.todayISO() : todayISO()) : null;
          task.updatedAt = Date.now();
          if (app.applyTaskGoalProgress) app.applyTaskGoalProgress(task, nextStatus === 'done');
          app.save();
          if (app.currentView && app.currentView() === 'tasks') renderTasks(); else app.renderView();
          app.toast(`Moved to ${STATUSES[curIdx + 1].title}`);
        }
      }
    });
    // Batch select checkbox
    if (taskSelectMode) {
      card.addEventListener('click', e => {
        const chk = e.target.closest('.task-sel-check');
        if (chk || e.shiftKey || e.ctrlKey || e.metaKey) {
          e.stopPropagation();
          e.preventDefault();
          const id = card.dataset.id;
          if (!id) return;
          if (e.shiftKey && lastSelectedId) {
            // Shift+click: select range from lastSelected to this card
            const cards = Array.from(app.$$('.task-card', scope));
            const lastIdx = cards.findIndex(c => c.dataset.id === lastSelectedId);
            const curIdx = cards.findIndex(c => c.dataset.id === id);
            if (lastIdx >= 0 && curIdx >= 0) {
              const start = Math.min(lastIdx, curIdx);
              const end = Math.max(lastIdx, curIdx);
              for (let i = start; i <= end; i++) {
                const cid = cards[i].dataset.id;
                taskSelected.add(cid);
                cards[i].classList.add('selected');
                const cb = cards[i].querySelector('.task-sel-check');
                if (cb) cb.checked = true;
              }
            }
          } else {
            // Regular click or Ctrl/Cmd+click: toggle
            if (taskSelected.has(id)) taskSelected.delete(id); else taskSelected.add(id);
            card.classList.toggle('selected', taskSelected.has(id));
            const cb = card.querySelector('.task-sel-check');
            if (cb) cb.checked = taskSelected.has(id);
          }
          lastSelectedId = id;
          const bc = app.$('#batch-count');
          if (bc) bc.textContent = taskSelected.size + ' selected';
          return;
        }
      });
    }
  });
  app.$$('[data-complete]', scope).forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    const t = app.state.tasks.find(x => x.id === b.dataset.complete);
    if (!t) return;
    app.captureUndo('Complete task');
    const { wasDone, kr } = (app.toggleTaskDone || (typeof toggleTaskDone !== 'undefined' ? toggleTaskDone : () => ({ wasDone: false })))(t);
    app.save();
    if (app.currentView && app.currentView() === 'tasks') renderTasks(); else app.renderView();
    if (kr && app.goalProgressToast) app.goalProgressToast(t, wasDone, kr);
  }));
  if (app.bindTaskPomoButtons) app.bindTaskPomoButtons(scope);
  else if (typeof bindTaskPomoButtons === 'function') bindTaskPomoButtons(scope);
}

const scheduleRAF = typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
  ? window.requestAnimationFrame
  : (typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (cb) => setTimeout(cb, 16));

const cancelRAF = typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function'
  ? window.cancelAnimationFrame
  : (typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame : (id) => clearTimeout(id));

function scheduleTaskVirtualRender(status) {
  if (taskVirtRAF[status]) return;
  taskVirtRAF[status] = scheduleRAF(() => {
    taskVirtRAF[status] = 0;
    renderTaskColumnBody(status);
  });
}

function renderTaskColumnBody(status) {
  const body = app.$(`.col-body[data-status-body="${status}"]`);
  if (!body) return;
  const items = taskVirtItems[status] || [];
  const st = taskVirt[status] || (taskVirt[status] = { top: 0, heights: {} });
  if (!items.length) {
    body.innerHTML = '<div class="empty-state" style="padding:18px 8px"><div style="font-size:14px">Drop cards here</div></div>';
    st.renderedFirst = -1;
    st.renderedLast = -1;
    st.renderedTopPad = -1;
    st.renderedBottomPad = -1;
    updateColRange(status, 0, 0, -1, false);
    return;
  }
  // The windowing maths lives in src/tasks/virtual.js — pure, and tested there.
  // This owns the DOM: measuring each card after render and feeding the heights back.
  const { first, last, topPad, bottomPad } = virtual.visibleWindow({
    items, heights: st.heights, scrollTop: st.top,
    clientHeight: body.clientHeight || 400, estHeight: TASK_EST_H,
  });

  const intTopPad = Math.round(topPad);
  const intBottomPad = Math.round(bottomPad);

  // Avoid destroying and recreating DOM nodes when visible item slice has not changed
  if (st.renderedFirst === first && st.renderedLast === last && st.renderedTopPad === intTopPad && st.renderedBottomPad === intBottomPad) {
    if (body.scrollTop !== st.top) body.scrollTop = st.top;
    updateColRange(status, items.length, first, last, intTopPad > 0 || intBottomPad > 0);
    return;
  }

  st.renderedFirst = first;
  st.renderedLast = last;
  st.renderedTopPad = intTopPad;
  st.renderedBottomPad = intBottomPad;

  body.innerHTML = (intTopPad ? `<div class="col-spacer top" style="height:${intTopPad}px;flex-shrink:0"></div>` : '') +
    items.slice(first, last + 1).map(taskCardHTML).join('') +
    (intBottomPad ? `<div class="col-spacer bottom" style="height:${intBottomPad}px;flex-shrink:0"></div>` : '');
  app.$$('.task-card', body).forEach(card => { st.heights[card.dataset.id] = card.offsetHeight + TASK_GAP; });
  if (body.scrollTop !== st.top) body.scrollTop = st.top;
  bindTaskCards(body);
  // live position indicator — shows where you are in a long column; when a filter is
  // active it becomes a clickable badge: "m / N" filtered/total, or "N" when the column
  // is set to show all its tasks despite the filter
  updateColRange(status, items.length, first, last, intTopPad > 0 || intBottomPad > 0);
}

function updateColRange(status, itemsLen, first, last, overflowing) {
  const body = app.$(`.col-body[data-status-body="${status}"]`);
  const rangeEl = body && body.closest('.col') && app.$('[data-range]', body.closest('.col'));
  if (!rangeEl) return;
  if (!taskFilterActive) {
    rangeEl.classList.remove('total', 'on');
    rangeEl.removeAttribute('title');
    rangeEl.textContent = overflowing ? `${first + 1}–${last + 1} of ${itemsLen}` : '';
    return;
  }
  const showAll = taskColShowAll.has(status);
  const trueTotal = taskStatusTotals[status] || 0;
  const hidden = showAll ? 0 : (taskHiddenRisk[status] || 0);
  rangeEl.classList.toggle('total', !showAll);
  rangeEl.classList.toggle('on', showAll);
  rangeEl.classList.toggle('warn', !showAll && hidden > 0);
  rangeEl.title = showAll
    ? `Showing all ${trueTotal} task${trueTotal === 1 ? '' : 's'} — click to return to the filtered view`
    : `${hidden ? '⚠ ' + hidden + ' hidden overdue/due-soon · ' : ''}Showing ${itemsLen} of ${trueTotal} — click to show all in this column`;
  rangeEl.textContent = showAll ? `${trueTotal}` : `${itemsLen} / ${trueTotal}`;
}

function bindColScroll(status) {
  const body = app.$(`.col-body[data-status-body="${status}"]`);
  if (!body || body.dataset.virt) return;
  body.dataset.virt = '1';
  body.addEventListener('scroll', () => {
    if (taskDragging) return; // don't swap DOM mid-drag
    const st = taskVirt[status];
    if (!st) return;
    st.top = body.scrollTop;
    scheduleTaskVirtualRender(status);
  }, { passive: true });
}

function archiveAllInList(id) {
  app.captureUndo('Archive list cards');
  app.state.tasks.forEach(t => {
    if (t.status === id) { t.archived = true; t.updatedAt = Date.now(); }
  });
  app.save();
  renderTasks();
  app.toast('Archived all cards in list');
}

export function renderTasks() {
  if (taskViewMode === 'matrix') { renderMatrix(); return; }
  ensureKanbanLists();
  const KANBAN = getKanbanLists();
  const goals = app.state.goals;
  const filtered = app.state.tasks.filter(t => {
    if (!taskShowArchived && isArchivedTask(t)) return false;
    if (taskShowArchived && !isArchivedTask(t)) return false;
    if (taskFilter.goal && t.goalId !== taskFilter.goal) return false;
    if (taskFilter.tag) {
      const tags = t.tags || [];
      const has = taskFilter.tag === 'untagged' ? tags.length === 0 : tags.includes(taskFilter.tag);
      if (!has) return false;
    }
    if (taskFilter.category && t.category !== taskFilter.category) return false;
    if (taskFilter.q) {
      const hay = (t.title + ' ' + t.desc + ' ' + (t.tags || []).join(' ') + ' ' + (t.comments||[]).map(c=>c.text).join(' ')).toLowerCase();
      if (!hay.includes(taskFilter.q.toLowerCase())) return false;
    }
    return true;
  });
  // true per-status totals (ignoring filters) so the column range badge can show filtered/total
  taskStatusTotals = {};
  app.state.tasks.forEach(t => { if (isArchivedTask(t) && !taskShowArchived) return; taskStatusTotals[t.status] = (taskStatusTotals[t.status] || 0) + 1; });
  taskFilterActive = !!(taskFilter.q || taskFilter.goal || taskFilter.tag);
  // NOTE: taskColShowAll intentionally persists across filter changes — reveals stay revealed
  // when re-filtering, so users can keep hidden work in view without re-expanding columns.
  // count overdue/due-soon tasks each column hides behind the filter (amber badge)
  const soonISO = isoDate(shiftDays(7));
  const filteredSet = new Set(filtered.map(t => t.id));
  taskHiddenRisk = {};
  app.state.tasks.forEach(t => {
    if (isArchivedTask(t)) return;
    if (t.status === 'done' || !t.due || t.due > soonISO) return;
    if (filteredSet.has(t.id)) return; // visible — not hidden
    taskHiddenRisk[t.status] = (taskHiddenRisk[t.status] || 0) + 1;
  });
  // pulse a column's badges when its hidden at-risk count grows while the filter stays put
  // (e.g. a hidden deadline crossed into the 7-day window since the last render)
  const fSig = (taskFilter.q || '') + '|' + (taskFilter.goal || '') + '|' + (taskFilter.tag || '');
  const pulseSet = new Set();
  if (fSig !== taskFilterSig) {
    taskFilterSig = fSig;
    taskHiddenRiskPrev = Object.assign({}, taskHiddenRisk); // baseline — no pulse on filter change
  } else {
    KANBAN.forEach(s => {
      if ((taskHiddenRisk[s.id] || 0) > (taskHiddenRiskPrev[s.id] || 0) && !taskColShowAll.has(s.id)) pulseSet.add(s.id);
    });
    taskHiddenRiskPrev = Object.assign({}, taskHiddenRisk);
  }
  const allByStatus = status => app.state.tasks.filter(t => t.status === status && (taskShowArchived ? isArchivedTask(t) : !isArchivedTask(t)));
  const hiddenTotal = KANBAN.reduce((sum, s) => sum + (taskColShowAll.has(s.id) ? 0 : (taskHiddenRisk[s.id] || 0)), 0);
  const riskParts = KANBAN.filter(s => !taskColShowAll.has(s.id) && (taskHiddenRisk[s.id] || 0) > 0)
    .map(s => `${taskHiddenRisk[s.id]} ${s.title.toLowerCase()}`);
  // Board chrome is built by src/tasks/view.js; this resolves per-column counts
  // (which depend on the filter and the per-column "show all" toggle) and binds below.
  const columns = KANBAN.map(s => ({
    ...s,
    count: (taskColShowAll.has(s.id) ? allByStatus(s.id) : filtered.filter(t => t.status === s.id)).length,
    warn: !!(taskFilterActive && !taskColShowAll.has(s.id) && (taskHiddenRisk[s.id] || 0)),
  }));
  app.viewRoot().innerHTML = view.taskBoardHTML({
    columns, goals, filter: taskFilter, filterActive: taskFilterActive,
    hiddenTotal, riskParts, showArchived: taskShowArchived,
    selectMode: taskSelectMode, selectedCount: taskSelected.size,
    allSelected: !!(taskSelected.size && taskSelected.size === filtered.length), ic: app.ic || (typeof ic !== 'undefined' ? ic : (n) => ''),
  });

  // windowed column bodies (Trello lists)
  Object.keys(taskVirtRAF).forEach(status => {
    if (taskVirtRAF[status]) {
      cancelRAF(taskVirtRAF[status]);
      taskVirtRAF[status] = 0;
    }
  });
  KANBAN.forEach(s => {
    taskVirtItems[s.id] = taskColShowAll.has(s.id) ? allByStatus(s.id) : filtered.filter(t => t.status === s.id);
    if (taskVirt[s.id]) {
      taskVirt[s.id].renderedFirst = -1;
      taskVirt[s.id].renderedLast = -1;
      taskVirt[s.id].renderedTopPad = -1;
      taskVirt[s.id].renderedBottomPad = -1;
    }
    renderTaskColumnBody(s.id);
    bindColScroll(s.id);
  });
  // click the filtered/total badge to cycle that column between matched and all tasks
  app.$$('.col-range').forEach(el => el.addEventListener('click', () => {
    const st = el.dataset.range;
    if (!taskFilterActive) return;
    if (taskColShowAll.has(st)) taskColShowAll.delete(st); else taskColShowAll.add(st);
    renderTasks();
  }));

  // Trello list menu (⋮) — rename, change color, archive all, delete
  app.$$('[data-list-menu]').forEach(btn => btn.addEventListener('click', e => {
    e.stopPropagation();
    const id = btn.dataset.listMenu;
    const l = getKanbanLists().find(x=>x.id===id); if (!l) return;
    const icHelper = app.ic || (typeof ic !== 'undefined' ? ic : (n) => '');
    app.openModal(`<div class="modal" style="max-width:340px"><div class="modal-head"><h3>List: ${esc(l.title)}</h3><button class="btn-icon" data-close-modal>${icHelper('x',16)}</button></div><div class="modal-body">
      <div class="field"><label for="list-rename" class="field-label">Title</label><input id="list-rename" value="${esc(l.title)}"></div>
      <div class="field"><label class="field-label" id="l-color-label">Color</label><div role="group" aria-labelledby="l-color-label" style="display:flex;gap:6px;flex-wrap:wrap">${COLORS.map(c=>`<button class="color-dot ${l.color===c?'active':''}" data-list-color="${c}" style="background:${c};width:28px;height:28px;border-radius:50%;border:2px solid ${l.color===c?'#fff':'transparent'};box-shadow:0 0 0 2px ${l.color===c?c:'transparent'}"></button>`).join('')}</div></div>
      <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
        <button class="btn btn-sm btn-accent" id="list-save">Save</button>
        <button class="btn btn-sm btn-ghost" id="list-archive-all">Archive all</button>
        <button class="btn btn-sm btn-danger" id="list-delete">Delete list</button>
      </div>
    </div></div>`);
    app.$('#list-save')?.addEventListener('click', () => {
      const nv = app.$('#list-rename').value.trim(); if (nv) renameKanbanList(id, nv);
      const sel = document.querySelector('[data-list-color].active');
      const col = sel ? sel.dataset.listColor : l.color;
      if (col !== l.color) { const ll = app.state.kanbanLists.find(x=>x.id===id); if (ll) { ll.color = col; app.save(); renderTasks(); } }
      app.closeModal();
    });
    app.$$('[data-list-color]').forEach(b=>b.addEventListener('click', ()=>{ app.$$('[data-list-color]').forEach(x=>x.classList.remove('active')); b.classList.add('active'); }));
    app.$('#list-archive-all')?.addEventListener('click', ()=>{ app.closeModal(); archiveAllInList(id); });
    app.$('#list-delete')?.addEventListener('click', ()=>{ app.closeModal(); deleteKanbanList(id); });
  }));
  app.$$('[data-rename-list]').forEach(el => el.addEventListener('dblclick', () => {
    const id = el.dataset.renameList;
    const l = getKanbanLists().find(x=>x.id===id); if (!l) return;
    const nv = prompt('Rename list', l.title);
    if (nv && nv.trim() && nv.trim()!==l.title) renameKanbanList(id, nv.trim());
  }));
  // toolbar summary of hidden at-risk work — click to reveal all of it
  const riskPill = app.$('#task-risk-pill');
  if (riskPill) riskPill.addEventListener('click', () => {
    taskColShowAll = new Set(KANBAN.map(s => s.id));
    renderTasks();
  });

  // amber pulse on column badges when a hidden deadline passed while the filter is active
  if (taskFilterActive && pulseSet.size) {
    pulseSet.forEach(status => {
      const col = app.$(`.col[data-status="${status}"]`);
      if (!col) return;
      ['.col-count', '.col-range'].forEach(sel => { const el = app.$(sel, col); if (el) el.classList.add('pulse'); });
    });
    setTimeout(() => {
      app.$$('.col-count.pulse, .col-range.pulse').forEach(el => el.classList.remove('pulse'));
    }, 2000);
  }

  // drag & drop (column-level — works with windowed bodies; card-level drag hooks are bound in bindTaskCards)
  app.$$('.col').forEach(col => {
    col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('drag-over'); });
    col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
    col.addEventListener('drop', e => {
      e.preventDefault();
      col.classList.remove('drag-over');
      const id = e.dataTransfer.getData('text/plain');
      const task = app.state.tasks.find(t => t.id === id);
      if (!task) return;
      const status = col.dataset.status;
      if (task.status !== status) {
        const completing = status === 'done';
        const wasDone = task.status === 'done';
        app.captureUndo('Move task');
        if (app.logActivity) app.logActivity('task.move', task.title + ' → ' + status, 'task');
        const oldStatus = task.status;
        task.status = status;
        task.completedAt = completing ? (app.todayISO ? app.todayISO() : todayISO()) : null;
        task.updatedAt = Date.now();
        if (app.trackProgressTime) app.trackProgressTime(task, oldStatus, status);
        const kr = app.applyTaskGoalProgress ? app.applyTaskGoalProgress(task, completing) : null;
        app.save();
        renderTasks();
        app.toast(completing ? 'Nice — task completed ✅' : `Moved to ${STATUSES.find(s => s.id === status)?.title || status}`);
        if (kr && app.goalProgressToast) app.goalProgressToast(task, wasDone, kr);
      }
    });
  });
  // add column buttons
  app.$$('.col-add').forEach(b => b.addEventListener('click', () => openTaskModal(null, b.dataset.addStatus)));
  app.$('#task-new')?.addEventListener('click', (e) => {
    try { e.currentTarget?.focus(); } catch (_) {}
    openTaskModal();
  });
  app.$('#task-add-list')?.addEventListener('click', () => {
    const t = prompt('New list title'); if (t) addKanbanList(t);
  });
  app.$('#task-show-archived')?.addEventListener('change', e => { taskShowArchived = e.target.checked; renderTasks(); });
  // drag & drop for kanban lists (reorder lists) — simple: drag header to reorder
  // (uses HTML5 DnD on .col)
  app.$$('.col').forEach(colEl => {
    const head = colEl.querySelector('.col-head'); if (!head) return;
    head.draggable = true;
    head.addEventListener('dragstart', e => { e.dataTransfer.setData('text/list', colEl.dataset.status); e.dataTransfer.effectAllowed='move'; });
    head.addEventListener('dragover', e => e.preventDefault());
    head.addEventListener('drop', e => {
      e.preventDefault();
      const src = e.dataTransfer.getData('text/list'); const dst = colEl.dataset.status;
      if (!src || src===dst) return;
      const lists = app.state.kanbanLists; const sIdx = lists.findIndex(l=>l.id===src); const dIdx = lists.findIndex(l=>l.id===dst);
      if (sIdx<0 || dIdx<0) return;
      app.captureUndo('Reorder lists');
      const [moved] = lists.splice(sIdx,1);
      lists.splice(dIdx,0,moved); app.save(); renderTasks();
    });
  });
  // Quick-add inline
  const quickInput = app.$('#quick-task-input');
  const quickAdd = () => {
    const raw = quickInput.value.trim();
    if (!raw) return;
    const parsed = app.parseNaturalLanguageTask ? app.parseNaturalLanguageTask(raw) : null;
    if (!parsed) return;
    app.captureUndo('Create task');
    app.state.tasks.push({
      id: app.uid(),
      title: parsed.title,
      desc: '',
      status: parsed.status || 'backlog',
      tags: parsed.tags || [],
      category: parsed.category || 'personal',
      priority: parsed.priority || 'med',
      due: parsed.due || '',
      startTime: parsed.startTime || '',
      goalId: parsed.goalId || '',
      projectId: parsed.projectId || '',
      recurrence: '',
      subtasks: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    quickInput.value = '';
    app.save(); renderTasks();
    if (app.logActivity) app.logActivity('task.create', parsed.title, 'task');
    app.toast('Task added: ' + parsed.title);
  };
  if (quickInput) {
    quickInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); quickAdd(); } });
    app.$('#quick-task-go')?.addEventListener('click', quickAdd);
  }
  if (app.bindFilterInput) app.bindFilterInput('#task-q', 120, v => { taskFilter.q = v; renderTasks(); });
  app.$('#task-goal')?.addEventListener('change', e => { taskFilter.goal = e.target.value; renderTasks(); });
  app.$('#task-category')?.addEventListener('change', e => { taskFilter.category = e.target.value; renderTasks(); });
  const tagChip = app.$('#task-tag-chip');
  if (tagChip) tagChip.addEventListener('click', () => { taskFilter.tag = ''; renderTasks(); });
  app.$('#task-clear-filter')?.addEventListener('click', () => { taskFilter = getInitialTaskFilter(); renderTasks(); });
  const viewToggle = app.$('#task-view-toggle');
  if (viewToggle) viewToggle.addEventListener('click', () => { taskViewMode = 'matrix'; renderTasks(); });
  // Batch operations
  const selectBtn = app.$('#task-select-mode');
  if (selectBtn) selectBtn.addEventListener('click', () => {
    taskSelectMode = !taskSelectMode;
    taskSelected.clear();
    renderTasks();
  });
  const batchCancel = app.$('#batch-cancel');
  if (batchCancel) batchCancel.addEventListener('click', () => {
    taskSelectMode = false;
    taskSelected.clear();
    renderTasks();
  });
  const batchSelectAll = app.$('#batch-select-all');
  if (batchSelectAll) batchSelectAll.addEventListener('click', () => {
    if (taskSelected.size === filtered.length) {
      taskSelected.clear();
    } else {
      filtered.forEach(t => taskSelected.add(t.id));
    }
    renderTasks();
  });
  const batchStatusSel = app.$('#batch-set-status');
  if (batchStatusSel) batchStatusSel.addEventListener('change', e => {
    const status = e.target.value;
    if (!status || !taskSelected.size) return;
    app.captureUndo('Batch change status');
    taskSelected.forEach(id => {
      const t = app.state.tasks.find(x => x.id === id);
      if (t) {
        const completing = status === 'done';
        const oldStatus = t.status;
        t.status = status;
        t.completedAt = completing ? (app.todayISO ? app.todayISO() : todayISO()) : null;
        t.updatedAt = Date.now();
        if (app.trackProgressTime) app.trackProgressTime(t, oldStatus, status);
        if (app.applyTaskGoalProgress) app.applyTaskGoalProgress(t, completing);
      }
    });
    app.save(); renderTasks();
    app.toast(`Updated status for ${taskSelected.size} task(s) ✅`);
  });
  const batchPrioSel = app.$('#batch-set-prio');
  if (batchPrioSel) batchPrioSel.addEventListener('change', e => {
    const p = e.target.value;
    if (!p || !taskSelected.size) return;
    app.captureUndo('Batch set priority');
    taskSelected.forEach(id => {
      const t = app.state.tasks.find(x => x.id === id);
      if (t) { t.priority = p; t.updatedAt = Date.now(); }
    });
    app.save(); renderTasks();
    app.toast(`Set priority to ${p.toUpperCase()} for ${taskSelected.size} task(s) ✅`);
  });
  const batchDueSel = app.$('#batch-set-due');
  if (batchDueSel) batchDueSel.addEventListener('change', e => {
    const v = e.target.value;
    if (!v || !taskSelected.size) return;
    app.captureUndo('Batch set due date');
    const newDue = v === 'today' ? (app.todayISO ? app.todayISO() : todayISO()) : v === 'tomorrow' ? isoDate(shiftDays(1)) : '';
    taskSelected.forEach(id => {
      const t = app.state.tasks.find(x => x.id === id);
      if (t) { t.due = newDue; t.updatedAt = Date.now(); }
    });
    app.save(); renderTasks();
    app.toast(`Set due date for ${taskSelected.size} task(s) 📅`);
  });
  const batchComplete = app.$('#batch-complete');
  if (batchComplete) batchComplete.addEventListener('click', () => {
    if (!taskSelected.size) return;
    app.captureUndo('Batch complete');
    taskSelected.forEach(id => {
      const t = app.state.tasks.find(x => x.id === id);
      if (t && t.status !== 'done') {
        const oldStatus = t.status;
        t.status = 'done';
        t.completedAt = app.todayISO ? app.todayISO() : todayISO();
        t.updatedAt = Date.now();
        if (app.trackProgressTime) app.trackProgressTime(t, oldStatus, 'done');
        if (app.applyTaskGoalProgress) app.applyTaskGoalProgress(t, true);
      }
    });
    if (app.playChime) app.playChime('task-done');
    else if (typeof playChime !== 'undefined') playChime('task-done');
    taskSelected.clear();
    app.save(); renderTasks();
    app.toast('Batch complete ✅');
  });
  const batchDelete = app.$('#batch-delete');
  if (batchDelete) batchDelete.addEventListener('click', () => {
    if (!taskSelected.size || !confirm(`Delete ${taskSelected.size} task(s)?`)) return;
    app.captureUndo('Batch delete');
    if (app.logActivity) app.logActivity('task.batch', taskSelected.size + ' tasks deleted', 'task');
    app.state.tasks = app.state.tasks.filter(t => !taskSelected.has(t.id));
    const tombFn = app.tombstone || (typeof tombstone !== 'undefined' ? tombstone : () => {});
    taskSelected.forEach(id => tombFn('tasks', id));
    taskSelected.clear();
    app.save(); renderTasks();
    app.toast('Batch deleted');
  });
}

// Card markup is owned by src/tasks/view.js; this resolves app.state into it.
function taskCardHTML(t) {
  return view.taskCardHTML(t, {
    goals: app.state.goals, vaultItems: app.state.vaultItems, tagSpan: app.tagSpan || (typeof tagSpan !== 'undefined' ? tagSpan : (s) => `<span class="tag">#${esc(s)}</span>`), ic: app.ic || (typeof ic !== 'undefined' ? ic : (n) => ''),
    selectMode: taskSelectMode, selectedIds: taskSelected, pomoHTML: app.taskPomoHTML || (typeof taskPomoHTML !== 'undefined' ? taskPomoHTML : () => ''),
  });
}

/* ============ Eisenhower Matrix View ============ */
export function renderMatrix() {
  const sig = JSON.stringify(taskFilter);
  if (sig !== _matrixFilterSig) { _matrixFilterSig = sig; _matrixVisible = { do: 60, schedule: 60, delegate: 60, eliminate: 60 }; }
  const filtered = app.state.tasks.filter(t => {
    if (taskFilter.goal && t.goalId !== taskFilter.goal) return false;
    if (taskFilter.tag) {
      const tags = t.tags || [];
      const has = taskFilter.tag === 'untagged' ? tags.length === 0 : tags.includes(taskFilter.tag);
      if (!has) return false;
    }
    if (taskFilter.category && t.category !== taskFilter.category) return false;
    if (taskFilter.q) {
      const hay = (t.title + ' ' + t.desc + ' ' + (t.tags || []).join(' ')).toLowerCase();
      if (!hay.includes(taskFilter.q.toLowerCase())) return false;
    }
    return t.status !== 'done';
  });
  const now = new Date();
  function isUrgent(t) {
    if (!t.due) return false;
    const diff = (new Date(t.due + 'T00:00:00') - now) / 86400000;
    return diff <= 3; // due within 3 days
  }
  function isImportant(t) {
    return t.priority === 'high' || t.goalId;
  }
  const q1 = filtered.filter(t => isUrgent(t) && isImportant(t));
  const q2 = filtered.filter(t => !isUrgent(t) && isImportant(t));
  const q3 = filtered.filter(t => isUrgent(t) && !isImportant(t));
  const q4 = filtered.filter(t => !isUrgent(t) && !isImportant(t));
  // Grid markup is owned by src/tasks/view.js; the urgent/important split and the
  // per-quadrant window stay here, with the filter app.state they depend on.
  app.viewRoot().innerHTML = view.matrixHTML({
    tasksByQuadrant: { do: q1, schedule: q2, delegate: q3, eliminate: q4 },
    limits: _matrixVisible, goals: app.state.goals, filter: taskFilter, ic: app.ic || (typeof ic !== 'undefined' ? ic : (n) => ''),
  });
  // Bind
  app.$('#task-view-toggle').addEventListener('click', () => { taskViewMode = 'kanban'; renderTasks(); });
  if (app.bindFilterInput) app.bindFilterInput('#task-q', 120, v => { taskFilter.q = v; renderMatrix(); });
  app.$('#task-goal')?.addEventListener('change', e => { taskFilter.goal = e.target.value; renderMatrix(); });
  app.$('#task-category')?.addEventListener('change', e => { taskFilter.category = e.target.value; renderMatrix(); });
  const tc = app.$('#task-tag-chip');
  if (tc) tc.addEventListener('click', () => { taskFilter.tag = ''; renderMatrix(); });
  app.$('#task-clear-filter')?.addEventListener('click', () => { taskFilter = getInitialTaskFilter(); renderMatrix(); });
  app.$('#task-new')?.addEventListener('click', (e) => {
    try { e.currentTarget?.focus(); } catch (_) {}
    openTaskModal();
  });
  app.$$('[data-more]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); matrixShowMore(b.dataset.more); }));
  // IntersectionObserver virtualization: auto-expand when 'Show more' scrolls into view (keeps drag handlers intact)
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(ent => { if (ent.isIntersecting) { const id = ent.target.dataset.more; if (id) { io.unobserve(ent.target); matrixShowMore(id); } } });
    }, { root: null, rootMargin: '200px' });
    app.$$('[data-more]').forEach(b => io.observe(b));
  }
  app.$$('.matrix-task').forEach(el => el.addEventListener('click', e => {
    if (e.target.closest('[data-complete]')) return;
    const t = app.state.tasks.find(x => x.id === el.dataset.id);
    if (t) openTaskModal(t);
  }));
  app.$$('[data-complete]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    const t = app.state.tasks.find(x => x.id === b.dataset.complete);
    if (!t) return;
    app.captureUndo('Complete task');
    const { wasDone, kr } = (app.toggleTaskDone || (typeof toggleTaskDone !== 'undefined' ? toggleTaskDone : () => ({ wasDone: false })))(t);
    app.save(); renderMatrix();
    if (kr && app.goalProgressToast) app.goalProgressToast(t, wasDone, kr);
  }));
  // ---- Drag & drop for matrix ----
  let draggedTaskId = null;
  app.$$('.matrix-task[draggable]', app.viewRoot()).forEach(el => {
    el.addEventListener('dragstart', e => {
      draggedTaskId = el.dataset.id;
      el.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', el.dataset.id);
    });
    el.addEventListener('dragend', () => {
      draggedTaskId = null;
      el.classList.remove('dragging');
      app.$$('.matrix-quad-body.drag-over', app.viewRoot()).forEach(z => z.classList.remove('drag-over'));
    });
  });
  app.$$('.matrix-quad-body', app.viewRoot()).forEach(zone => {
    zone.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      zone.classList.add('drag-over');
    });
    zone.addEventListener('dragleave', e => {
      if (!zone.contains(e.relatedTarget)) zone.classList.remove('drag-over');
    });
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      const taskId = e.dataTransfer.getData('text/plain');
      const task = app.state.tasks.find(t => t.id === taskId);
      if (!task) return;
      const targetQuad = zone.dataset.quad;
      // Determine target quadrant's urgency/importance from its position
      const quadMap = { do: { urgent: true, important: true }, schedule: { urgent: false, important: true }, delegate: { urgent: true, important: false }, eliminate: { urgent: false, important: false } };
      const target = quadMap[targetQuad];
      if (!target) return;
      // Check if task is already in this quadrant — if so, reorder
      const srcQuad = getTaskQuad(task, isUrgent, isImportant);
      if (srcQuad === targetQuad) {
        // Reorder: find drop position among siblings
        const siblings = Array.from(zone.querySelectorAll('.matrix-task'));
        const afterEl = siblings.reduce((closest, child) => {
          const box = child.getBoundingClientRect();
          const offset = e.clientY - box.top - box.height / 2;
          if (offset < 0 && offset > closest.offset) return { offset, element: child };
          return closest;
        }, { offset: -Infinity, element: null }).element;
        // Move in app.state: remove from tasks array, insert at the right position
        app.captureUndo('Reorder matrix');
        const taskIdx = app.state.tasks.indexOf(task);
        app.state.tasks.splice(taskIdx, 1);
        if (afterEl) {
          const afterId = afterEl.dataset.id;
          const afterIdx = app.state.tasks.findIndex(t => t.id === afterId);
          app.state.tasks.splice(afterIdx, 0, task);
        } else {
          app.state.tasks.push(task);
        }
        app.save(); renderMatrix();
        return;
      }
      // Move to a different quadrant: change priority or due date
      app.captureUndo('Move between quadrants');
      if (target.important && !isImportant(task)) {
        task.priority = 'high';
      } else if (!target.important && isImportant(task)) {
        // Remove importance: lower priority and remove goal link
        if (task.priority === 'high') task.priority = 'med';
        if (target.urgent) {
          // Delegate: keep urgency, remove importance
          task.goalId = '';
        } else {
          // Eliminate: remove both
          task.goalId = '';
          task.priority = 'low';
        }
      }
      if (target.urgent && !isUrgent(task)) {
        // Set due date to within 3 days
        task.due = isoDate(shiftDays(Math.floor(Math.random() * 3) + 1));
      } else if (!target.urgent && isUrgent(task)) {
        // Push due date out beyond 3 days
        task.due = isoDate(shiftDays(7 + Math.floor(Math.random() * 7)));
      }
      task.updatedAt = Date.now();
      app.save(); renderMatrix();
      const quadObj = MATRIX_QUADRANTS.find(q => q.id === targetQuad) || {};
      app.toast('Task moved to ' + (quadObj.title || targetQuad));
    });
  });
  function getTaskQuad(t, urgentFn, importantFn) {
    const u = urgentFn(t), i = importantFn(t);
    if (u && i) return 'do';
    if (!u && i) return 'schedule';
    if (u && !i) return 'delegate';
    return 'eliminate';
  }
}

function krOptionsHTML(goalId, selected) { return view.krOptionsHTML(goalId, selected, app.state.goals); }

export function openTaskModal(task, presetStatus) {
  const t = task || getInitialTaskState(presetStatus);
  if (!t.comments) t.comments = []; if (!t.attachments) t.attachments = []; if (!t.members) t.members = [];
  // Form markup is owned by src/tasks/view.js; this resolves app.state into it, opens the
  // modal, and owns the ~360 lines of binding below.
  const icHelper = app.ic || (typeof ic !== 'undefined' ? ic : (n) => '');
  const vaultPicker = app.vaultLinkPickerHTML ? app.vaultLinkPickerHTML(t.vaultIds || []) : (typeof vaultLinkPickerHTML !== 'undefined' ? vaultLinkPickerHTML(t.vaultIds || []) : '');
  app.openModal(view.taskModalHTML(t, {
    isEdit: !!task, lists: getKanbanLists(), goals: app.state.goals,
    students: app.getStudentsList ? app.getStudentsList() : (typeof getStudentsList !== 'undefined' ? getStudentsList() : []),
    vaultItems: app.state.vaultItems,
    days: DAYS, periods: app.getPeriods ? app.getPeriods() : (typeof getPeriods !== 'undefined' ? getPeriods() : []),
    vaultPickerHTML: vaultPicker, ic: icHelper,
  }));
  app.$('#f-goal')?.addEventListener('change', e => {
    const krSel = app.$('#f-kr');
    if (krSel) krSel.innerHTML = krOptionsHTML(e.target.value, '');
  });
  // Period picker → auto-fill start/end times from dynamic intervals
  const schedPeriodEl = app.$('#f-sched-period');
  if (schedPeriodEl) schedPeriodEl.addEventListener('change', e => {
    const pid = e.target.value;
    const periodsList = app.getPeriods ? app.getPeriods() : (typeof getPeriods !== 'undefined' ? getPeriods() : []);
    const p = periodsList.find(x=>x.id===pid);
    const st = app.$('#f-start-time'), en = app.$('#f-end-time');
    if (p) { if (st) st.value = p.start || ''; if (en) en.value = p.end || ''; }
    else { if (st) st.value = ''; if (en) en.value = ''; }
  });
  // Also sync when scheduleDay changes? keep times from period
  app.$('#f-dup')?.addEventListener('click', () => { if (task) { (app.duplicateTaskById || (typeof duplicateTaskById !== 'undefined' ? duplicateTaskById : () => {}))(task.id); app.closeModal(); } });
  app.$('#f-share')?.addEventListener('click', () => { if (task) (app.shareText || (typeof shareText !== 'undefined' ? shareText : () => {}))(task.title, (task.desc || '') + (task.due ? '\nDue: ' + task.due : '')); });
  // Trello cover picker
  let pendingCoverColor = t.coverColor || '';
  let pendingCoverImage = t.coverImage || '';
  app.$$('[data-cover]').forEach(b=>b.addEventListener('click', ()=>{ app.$$('[data-cover]').forEach(x=>x.classList.remove('active')); b.classList.add('active'); pendingCoverColor = b.dataset.cover; if (pendingCoverColor==='#00000000') pendingCoverColor=''; }));
  app.$('#f-cover-file')?.addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    if (f.size > 2*1024*1024) { app.toast('Image too large (max 2MB)', 'error'); return; }
    const reader = new FileReader(); reader.onload = () => { pendingCoverImage = reader.result; const prev = document.querySelector('.cover-preview'); if (prev) prev.innerHTML = `<img src="${pendingCoverImage}" style="max-width:100%;max-height:120px;border-radius:8px;border:1px solid var(--border)">`; else document.getElementById('f-cover-picker').insertAdjacentHTML('afterend', `<div class="cover-preview" style="margin-top:8px"><img src="${pendingCoverImage}" style="max-width:100%;max-height:120px;border-radius:8px"></div>`); app.toast('Cover image ready — save to keep'); }; reader.readAsDataURL(f);
  });
  app.$('#f-cover-clear')?.addEventListener('click', ()=>{ pendingCoverImage=''; pendingCoverColor=''; app.$$('[data-cover]').forEach(x=>x.classList.remove('active')); const prev=document.querySelector('.cover-preview'); if(prev) prev.remove(); });
  // Watch toggle
  app.$('#f-watch-toggle')?.addEventListener('click', ()=>{ const isWatched = (t.watchers||[]).includes('me'); if (!t.watchers) t.watchers=[]; if(isWatched) t.watchers = t.watchers.filter(x=>x!=='me'); else t.watchers.push('me'); app.$('#f-watch-toggle').textContent = t.watchers.includes('me') ? '👁 Watching' : '👁 Watch'; app.toast(t.watchers.includes('me') ? 'Watching' : 'Unwatched'); });
  // Archive toggle
  app.$('#f-archive-toggle')?.addEventListener('click', ()=>{ t.archived = !t.archived; app.$('#f-archive-toggle').textContent = t.archived ? '↩ Restore' : '🗄 Archive'; app.toast(t.archived ? 'Will archive on save' : 'Will restore on save'); });
  // Move card (Trello)
  app.$('#f-move-card')?.addEventListener('click', ()=>{
    const lists = getKanbanLists();
    app.openModal(`<div class="modal" style="max-width:340px"><div class="modal-head"><h3>Move card</h3><button class="btn-icon" data-close-modal>${icHelper('x',16)}</button></div><div class="modal-body"><div class="field"><label for="move-list" class="field-label">List</label><select id="move-list">${lists.map(l=>`<option value="${l.id}" ${l.id===t.status?'selected':''}>${esc(l.title)}</option>`).join('')}</select></div><div class="field"><label for="move-pos" class="field-label">Position</label><select id="move-pos"><option value="top">Top</option><option value="bottom" selected>Bottom</option></select></div></div><div class="modal-foot"><button class="btn btn-ghost" data-close-modal>Cancel</button><button class="btn btn-accent" id="move-confirm">Move</button></div></div>`);
    app.$('#move-confirm')?.addEventListener('click', ()=>{
      const nl = app.$('#move-list').value; const pos = app.$('#move-pos').value;
      if (nl && task) { app.captureUndo('Move card'); task.status = nl; task.updatedAt=Date.now(); if(pos==='top'){ const idx=app.state.tasks.indexOf(task); app.state.tasks.splice(idx,1); app.state.tasks.unshift(task); } app.save(); app.renderView(); app.closeModal(); openTaskModal(task); app.toast('Moved to '+ (lists.find(l=>l.id===nl)?.title||nl)); }
    });
  });
  app.$('#f-copy-card')?.addEventListener('click', ()=>{ if(task) { (app.duplicateTaskById || (typeof duplicateTaskById !== 'undefined' ? duplicateTaskById : () => {}))(task.id); } });
  // Comments
  const renderComments = ()=>{ const list=app.$('#f-comments-list'); if(!list) return; list.innerHTML = (t.comments||[]).slice().reverse().map(c=>`<div class="comment-row" style="padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--surface2)"><div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:12px">${esc(c.author||'You')}</b><span class="muted" style="font-size:11px">${timeAgo(c.at)} <button class="btn-icon" data-comment-del="${c.id}" title="Delete">${icHelper('x',12)}</button></span></div><div style="font-size:13px;margin-top:4px;white-space:pre-wrap">${esc(c.text)}</div></div>`).join('') || '<div class="muted" style="font-size:12px">No comments yet — ask a question or leave a note.</div>'; list.querySelectorAll('[data-comment-del]').forEach(b=>b.addEventListener('click', ()=>{ t.comments = (t.comments||[]).filter(x=>x.id!==b.dataset.commentDel); renderComments(); app.toast('Comment deleted'); })); };
  app.$('#f-comment-add')?.addEventListener('click', ()=>{ const inp=app.$('#f-comment-input'); const txt=inp.value.trim(); if(!txt) return; if(!t.comments) t.comments=[]; t.comments.push({id:app.uid(), text:txt, at:Date.now(), author:'You'}); inp.value=''; renderComments(); });
  app.$('#f-comment-input')?.addEventListener('keydown', e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); app.$('#f-comment-add').click(); } });
  // Attachments
  const renderAttach = ()=>{ const list=app.$('#f-attachments-list'); if(!list) return; list.innerHTML = (t.attachments||[]).map(a=>`<div class="attach-row" style="display:flex;align-items:center;gap:8px;padding:6px 8px;border:1px solid var(--border);border-radius:8px"><span>${fileIcon(a.name)}</span><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis">${esc(a.name)} <span class="muted" style="font-size:11px">${fileSizeStr(a.size)} · ${a.mime||''}</span></span><button class="btn btn-xs btn-ghost" data-attach-dl="${a.id}">⬇</button><button class="btn btn-xs btn-ghost" data-attach-del="${a.id}">✕</button></div>`).join('') || '<div class="muted" style="font-size:12px">No files yet — attach images, PDFs, etc.</div>';
    list.querySelectorAll('[data-attach-del]').forEach(b=>b.addEventListener('click', async ()=>{ const id=b.dataset.attachDel; const att=(t.attachments||[]).find(x=>x.id===id); if(att && att.blobId) try{ await (app.blobDelete || (typeof blobDelete !== 'undefined' ? blobDelete : async () => {}))(att.blobId); }catch(_){} t.attachments=(t.attachments||[]).filter(x=>x.id!==id); renderAttach(); }));
    list.querySelectorAll('[data-attach-dl]').forEach(b=>b.addEventListener('click', async ()=>{ const att=(t.attachments||[]).find(x=>x.id===b.dataset.attachDl); if(!att) return; try{ const blob=await (app.blobGet || (typeof blobGet !== 'undefined' ? blobGet : async () => null))(att.blobId); if(!blob){ app.toast('File not found', 'error'); return; } const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=att.name; a.click(); setTimeout(()=>URL.revokeObjectURL(url),3000); }catch(_){ app.toast('Download failed','error'); } }));
  };
  app.$('#f-attach-file')?.addEventListener('change', async e=>{
    const files=[...e.target.files]; if(!files.length) return;
    if(!t.attachments) t.attachments=[];
    for(const f of files){
      if(f.size>5*1024*1024){ app.toast(f.name+' too large (5MB max)','error'); continue; }
      const blobId='attach-'+app.uid();
      try{ await (app.blobPut || (typeof blobPut !== 'undefined' ? blobPut : async () => {}))(blobId, f); t.attachments.push({id:app.uid(), name:f.name, size:f.size, mime:f.type, blobId}); }catch(_){ app.toast('Save failed','error'); }
    }
    renderAttach(); e.target.value='';
  });
  // Vault picker: create new vault item inline + choose from vault storage
  app.$('#f-vault-new')?.addEventListener('click', ()=>{ app.closeModal(); if (app.openVaultModal) app.openVaultModal(); else if (typeof openVaultModal !== 'undefined') openVaultModal(); setTimeout(()=> openTaskModal(task, presetStatus), 400); });
  app.$('#f-vault-attach')?.addEventListener('change', async e=>{
    const f=e.target.files[0]; if(!f) return;
    if(f.size>VAULT_MAX_FILE){ app.toast('File too large — 10MB max','error'); e.target.value=''; return; }
    // create vault item from file then link
    const blobId='vault-'+app.uid(); try{ await vaultBlobPut(blobId, f); }catch(_){ app.toast('Save failed','error'); return; }
    const vItem={ id: app.uid(), title: f.name.replace(/\.[^.]+$/,''), url:'', description:'Attached via task', type: vaultGuessType(f.name,f.type), tags:[], collectionId:null, fileName:f.name, mime:f.type, size:f.size, blobId, linkedTaskIds: task? [task.id] : [], linkedGoalIds:[], linkedNoteIds:[], linkedStudentIds:[], pinned:false, createdAt:Date.now(), updatedAt:Date.now() };
    app.state.vaultItems.unshift(vItem); if(!app.state._vaultItemsMeta) app.state._vaultItemsMeta={}; app.state._vaultItemsMeta[vItem.id]=Date.now();
    if(!t.vaultIds) t.vaultIds=[]; t.vaultIds.push(vItem.id);
    vItem.linkedTaskIds=[task?.id].filter(Boolean);
    // also copy as attachment for convenience
    try{ const blob=await (app.vaultBlobGet ? app.vaultBlobGet(blobId) : null); if(blob){ const attachId='attach-'+app.uid(); await (app.blobPut ? app.blobPut(attachId, blob) : null); if(!t.attachments) t.attachments=[]; t.attachments.push({id:app.uid(), name:f.name, size:f.size, mime:f.type, blobId:attachId}); } }catch(_){}
    app.toast('Vault file created & attached ✅'); const picker=app.$('#f-vault-picker'); if(picker) picker.innerHTML = app.vaultLinkPickerHTML ? app.vaultLinkPickerHTML(t.vaultIds||[]) : (typeof vaultLinkPickerHTML !== 'undefined' ? vaultLinkPickerHTML(t.vaultIds||[]) : '');
    e.target.value='';
  });
  // Subtask management
  function bindSubtaskRow(row) {
    const input = row.querySelector('.st-input');
    const delBtn = row.querySelector('.st-del');
    if (delBtn) delBtn.addEventListener('click', () => row.remove());
    if (input) {
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addSubtaskRow('', false, true);
        }
      });
    }
  }
  function addSubtaskRow(text = '', done = false, autoFocus = false) {
    const container = app.$('#f-subtasks');
    if (!container) return;
    const idx = container.children.length;
    const row = document.createElement('div');
    row.className = 'subtask-row';
    row.dataset.stIdx = idx;
    row.innerHTML = `<input type="checkbox" class="st-check" ${done ? 'checked' : ''} data-st-check="${idx}"><input type="text" class="st-input" value="${esc(text)}" placeholder="Subtask…" data-st-text="${idx}"><button class="btn-icon st-del" data-st-del="${idx}" title="Remove">${icHelper('x', 14)}</button>`;
    container.appendChild(row);
    bindSubtaskRow(row);
    if (autoFocus) row.querySelector('.st-input')?.focus();
  }
  app.$$('.subtask-row').forEach(row => bindSubtaskRow(row));
  app.$('#f-add-subtask')?.addEventListener('click', () => addSubtaskRow('', false, true));

  // AI Task Breakdown
  const aiBtn = app.$('#f-ai-subtasks');
  if (aiBtn) {
    aiBtn.addEventListener('click', async () => {
      const taskTitle = app.$('#f-title').value.trim();
      const taskDesc = app.$('#f-desc').value.trim();
      if (!taskTitle) {
        app.toast('Enter a task title first', 'error');
        app.$('#f-title').focus();
        return;
      }
      if (!app.state.settings.geminiApiKey) {
        app.toast('Add your Gemini API key in Settings → AI Assistant 🤖', 'error');
        return;
      }
      aiBtn.disabled = true;
      aiBtn.textContent = '✨ Breaking down…';
      try {
        const prompt = `Break down this task into 3 to 5 clear, concise, actionable subtasks. Task: "${taskTitle}". Details: "${taskDesc}". Return ONLY a valid JSON array of short action strings, for example: ["Step 1", "Step 2", "Step 3"]. No extra text, no markdown.`;
        const geminiFn = app.callGemini || (typeof callGemini !== 'undefined' ? callGemini : async () => '');
        const res = await geminiFn(prompt, 'You are a task planning assistant. Output ONLY valid JSON array.');
        let steps = [];
        try {
          const cleaned = res.replace(/```json/gi, '').replace(/```/g, '').trim();
          steps = JSON.parse(cleaned);
        } catch (_) {
          steps = res.split('\n').map(l => l.replace(/^[-*•\d.)\s]+/, '').trim()).filter(Boolean);
        }
        if (Array.isArray(steps) && steps.length) {
          steps.forEach(st => {
            if (typeof st === 'string' && st.trim()) {
              addSubtaskRow(st.trim(), false, false);
            }
          });
          app.toast(`✨ Added ${steps.length} subtasks with AI!`, 'success');
        } else {
          app.toast('Could not parse AI response', 'error');
        }
      } catch (err) {
        app.toast(err.message === 'NO_API_KEY' ? 'Set your Gemini API key in Settings' : `AI error: ${err.message}`, 'error');
      } finally {
        aiBtn.disabled = false;
        aiBtn.textContent = '✨ AI Breakdown';
      }
    });
  }
  // Save handler
  app.$('#f-save')?.addEventListener('click', () => {
    const title = app.$('#f-title').value.trim();
    if (!title) { app.toast('Give the task a title', 'error'); return; }
    // Collect subtasks
    const subtasks = [];
    app.$$('.subtask-row').forEach(row => {
      const text = row.querySelector('.st-input').value.trim();
      const done = row.querySelector('.st-check').checked;
      if (text) subtasks.push({ text, done, id: app.uid() });
    });
    const data = {
      title,
      desc: app.$('#f-desc').value.trim(),
      status: app.$('#f-status').value,
      priority: app.$('#f-prio').value,
      student: app.$('#f-student')?.value || undefined,
      due: app.$('#f-due').value,
      startDate: app.$('#f-start')?.value || '',
      coverColor: pendingCoverColor,
      coverImage: pendingCoverImage,
      members: (app.$('#f-members')?.value || '').split(',').map(s=>s.trim()).filter(Boolean),
      comments: t.comments || [],
      attachments: t.attachments || [],
      archived: !!t.archived,
      watchers: t.watchers || [],
      category: app.$('#f-category').value,
      recurrence: app.$('#f-recurrence').value,
      goalId: app.$('#f-goal').value,
      scheduleDay: app.$('#f-sched-day').value,
      schedulePeriod: app.$('#f-sched-period').value,
      startTime: app.$('#f-start-time').value || '',
      endTime: app.$('#f-end-time').value || '',
      tags: app.$('#f-tags').value.split(',').map(s => s.trim()).filter(Boolean),
      vaultIds: [...document.querySelectorAll('#f-vault-picker input:checked')].map(i=>i.value),
      subtasks
    };
    const krSel = app.$('#f-kr');
    if (krSel) data.krId = krSel.value;
    app.captureUndo(task ? 'Edit task' : 'Create task');
    // sync reverse vault links
    const prevVaultIds = task ? (task.vaultIds||[]) : [];
    const newVaultIds = data.vaultIds || [];
    const allVaultIds = new Set([...prevVaultIds, ...newVaultIds]);
    allVaultIds.forEach(vid=>{
      const v=app.state.vaultItems.find(x=>x.id===vid); if(!v) return;
      if(!Array.isArray(v.linkedTaskIds)) v.linkedTaskIds=[];
      const shouldHave=newVaultIds.includes(vid);
      const has=v.linkedTaskIds.includes(task?.id || data.id || '');
      // for new task, task.id not yet known — will be assigned below, handle after
      if(shouldHave && !has && task && task.id) { v.linkedTaskIds.push(task.id); v.updatedAt=Date.now(); if(!app.state._vaultItemsMeta) app.state._vaultItemsMeta={}; app.state._vaultItemsMeta[v.id]=Date.now(); }
      if(!shouldHave && has && task && task.id) { v.linkedTaskIds=v.linkedTaskIds.filter(id=>id!==task.id); v.updatedAt=Date.now(); if(!app.state._vaultItemsMeta) app.state._vaultItemsMeta={}; app.state._vaultItemsMeta[v.id]=Date.now(); }
    });
    if (task) {
      const oldStatus = task.status;
      Object.assign(task, data); task.updatedAt = Date.now();
      if (oldStatus !== data.status && app.trackProgressTime) app.trackProgressTime(task, oldStatus, data.status);
      if (app.logActivity) app.logActivity('task.edit', data.title, 'task');
    } else {
      const newId=app.uid();
      const newTask=Object.assign({ id: newId, createdAt: Date.now(), completedAt: null, updatedAt: Date.now() }, data);
      app.state.tasks.unshift(newTask);
      // link new task to vault items (reverse)
      (data.vaultIds||[]).forEach(vid=>{
        const v=app.state.vaultItems.find(x=>x.id===vid); if(!v) return;
        if(!Array.isArray(v.linkedTaskIds)) v.linkedTaskIds=[];
        if(!v.linkedTaskIds.includes(newId)){ v.linkedTaskIds.push(newId); v.updatedAt=Date.now(); if(!app.state._vaultItemsMeta) app.state._vaultItemsMeta={}; app.state._vaultItemsMeta[v.id]=Date.now(); }
      });
      if (app.logActivity) app.logActivity('task.create', data.title, 'task');
    }
    app.save(); app.closeModal(); app.renderView();
    app.toast(task ? 'Task updated' : 'Task added ✅');
  });
  const del = app.$('#f-delete');
  if (del) del.addEventListener('click', () => {
    app.captureUndo('Delete task');
    if (app.logActivity) app.logActivity('task.delete', task.title, 'task');
    app.state.tasks = app.state.tasks.filter(x => x.id !== task.id);
    const tombFn = app.tombstone || (typeof tombstone !== 'undefined' ? tombstone : () => {});
    tombFn('tasks', task.id);
    app.save(); app.closeModal(); app.renderView(); app.toast('Task deleted');
  });
  // Pomodoro widget in modal
  if (task) {
    let widgetMins = 25;
    let widgetRunning = false;
    let widgetTimer = null;
    let widgetRemain = 25 * 60;
    const widgetDur = () => widgetMins * 60;
    const ringFill = app.$('#pomo-ring-fill');
    const ringTime = app.$('#pomo-ring-time');
    const actionBtn = app.$('#pomo-action-btn');
    const resetBtn = app.$('#pomo-reset-btn');
    const sessionsInfo = app.$('#pomo-sessions-info');
    const circumference = 2 * Math.PI * 52;
    if (ringFill) {
      ringFill.style.strokeDasharray = circumference;
      ringFill.style.strokeDashoffset = 0;
    }
    function updateWidgetUI() {
      const mins = Math.floor(widgetRemain / 60);
      const secs = widgetRemain % 60;
      if (ringTime) ringTime.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      if (ringFill) {
        const pct = 1 - widgetRemain / widgetDur();
        ringFill.style.strokeDashoffset = circumference * (1 - pct);
      }
      if (actionBtn) {
        if (widgetRunning) {
          actionBtn.innerHTML = `${icHelper('pause', 16)} Pause`;
          actionBtn.classList.add('pomo-running');
        } else {
          actionBtn.innerHTML = `${icHelper('play', 16)} ${widgetRemain < widgetDur() ? 'Resume' : 'Start'}`;
          actionBtn.classList.remove('pomo-running');
        }
      }
      if (sessionsInfo) {
        const today = app.todayISO ? app.todayISO() : todayISO();
        const todaySessions = (app.state.pomoHistory || []).filter(s => s.taskId === task.id && s.startedAt && new Date(s.startedAt).toISOString().slice(0, 10) === today);
        sessionsInfo.textContent = `${todaySessions.length} session${todaySessions.length === 1 ? '' : 's'} today`;
      }
    }
    function widgetTick() {
      widgetRemain--;
      if (widgetRemain <= 0) {
        widgetRemain = 0;
        widgetRunning = false;
        clearInterval(widgetTimer);
        const recordPomoFn = app.recordPomoSession || (typeof recordPomoSession !== 'undefined' ? recordPomoSession : () => {});
        recordPomoFn(task.id, widgetDur(), true);
        const todayStr = app.todayISO ? app.todayISO() : todayISO();
        if (app.state.settings.pomodoroDate === todayStr) app.state.settings.pomodoroCount++;
        else { app.state.settings.pomodoroDate = todayStr; app.state.settings.pomodoroCount = 1; }
        app.save();
        app.toast('🍅 Focus session complete!', 'success');
        if (app.offerFocusHabitProtect) app.offerFocusHabitProtect();
        else if (typeof offerFocusHabitProtect !== 'undefined') offerFocusHabitProtect();
        if (app.currentView && app.currentView() === 'tasks') renderTasks();
        else app.renderView();
      }
      updateWidgetUI();
    }
    // Duration presets
    app.$$('.pomo-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        if (widgetRunning) { app.toast('Pause the timer first', 'error'); return; }
        app.$$('.pomo-preset').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        widgetMins = parseInt(btn.dataset.pomoPreset, 10) || 25;
        widgetRemain = widgetDur();
        updateWidgetUI();
      });
    });
    // Start / Pause
    if (actionBtn) actionBtn.addEventListener('click', () => {
      if (widgetRunning) {
        widgetRunning = false;
        clearInterval(widgetTimer);
        const elapsed = widgetDur() - widgetRemain;
        if (elapsed > 0) {
          const recordPomoFn = app.recordPomoSession || (typeof recordPomoSession !== 'undefined' ? recordPomoSession : () => {});
          recordPomoFn(task.id, elapsed, false);
        }
        app.save();
        app.toast('🍅 Focus paused — ' + fmtDur(elapsed) + ' logged');
        updateWidgetUI();
      } else {
        if (typeof taskPomo !== 'undefined' && taskPomo && taskPomo.running && taskPomo.taskId !== task.id && typeof stopTaskPomo === 'function') stopTaskPomo(true);
        widgetRunning = true;
        widgetTimer = setInterval(widgetTick, 1000);
        app.toast('🍅 Focus started — stay in the zone!');
        updateWidgetUI();
      }
    });
    // Reset
    if (resetBtn) resetBtn.addEventListener('click', () => {
      widgetRunning = false;
      clearInterval(widgetTimer);
      widgetRemain = widgetDur();
      updateWidgetUI();
    });
    // Sync with external task pomo app.state if this task is the active one
    if (typeof taskPomo !== 'undefined' && taskPomo && taskPomo.running && taskPomo.taskId === task.id) {
      widgetRunning = true;
      widgetRemain = taskPomo.remain;
      widgetMins = taskPomo.dur / 60;
      widgetTimer = setInterval(widgetTick, 1000);
    }
    updateWidgetUI();
  }
  // Save as template
  app.$('#f-template')?.addEventListener('click', () => {
    const title = app.$('#f-title').value.trim();
    if (!title) { app.toast('Give the task a title first', 'error'); return; }
    if (!app.state.templates) app.state.templates = [];
    const subtasks = [];
    app.$$('.subtask-row').forEach(row => {
      const text = row.querySelector('.st-input').value.trim();
      if (text) subtasks.push({ text, done: false, id: app.uid() });
    });
    app.state.templates.push({
      id: app.uid(),
      title,
      desc: app.$('#f-desc').value.trim(),
      status: app.$('#f-status').value,
      priority: app.$('#f-prio').value,
      category: app.$('#f-category').value,
      recurrence: app.$('#f-recurrence').value,
      goalId: app.$('#f-goal').value,
      scheduleDay: app.$('#f-sched-day').value,
      schedulePeriod: app.$('#f-sched-period').value,
      startTime: app.$('#f-start-time').value || '',
      endTime: app.$('#f-end-time').value || '',
      tags: app.$('#f-tags').value.split(',').map(s => s.trim()).filter(Boolean),
      subtasks,
      createdAt: Date.now()
    });
    app.save();
    app.toast('Template saved 📋');
  });
}

export function getKanbanLists() {
  if (!app.state.kanbanLists) {
    app.state.kanbanLists = [
      { id: 'backlog', title: 'Backlog', color: 'none' },
      { id: 'today', title: 'Today', color: 'none' },
      { id: 'done', title: 'Done', color: 'none' }
    ];
  }
  return app.state.kanbanLists;
}

export function addKanbanList(title) {
  const lists = getKanbanLists();
  lists.push({ id: app.uid(), title, color: 'none' });
  app.save();
  renderTasks();
}

export function renameKanbanList(id, title) {
  const lists = getKanbanLists();
  const list = lists.find(x => x.id === id);
  if (list) {
    list.title = title;
    app.save();
    renderTasks();
  }
}

export function deleteKanbanList(id) {
  if (['backlog', 'today', 'done'].includes(id)) {
    app.toast('Cannot delete default lists', 'error');
    return;
  }
  app.state.kanbanLists = getKanbanLists().filter(x => x.id !== id);
  app.state.tasks.forEach(t => {
    if (t.status === id) { t.status = 'backlog'; t.updatedAt = Date.now(); }
  });
  app.save();
  renderTasks();
}

export function ensureKanbanLists() {
  getKanbanLists();
}
