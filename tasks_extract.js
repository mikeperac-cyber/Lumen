/* ============ Tasks (kanban) ============ */
let taskFilter = { q: '', goal: '', tag: '', category: '' };
// Filter the board by a tag from anywhere (tags view card, search result) — renders
// immediately even when already on #tasks (setting the same hash fires no hashchange).
function applyTagFilter(tag) {
  taskFilter = { q: '', goal: '', tag };
  if (currentView() === 'tasks') renderTasks();
  else location.hash = '#tasks';
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
const MATRIX_PAGE = 60; // per-quadrant window — keeps initial matrix DOM ~4×60 instead of 4×500
let _matrixVisible = { do: MATRIX_PAGE, schedule: MATRIX_PAGE, delegate: MATRIX_PAGE, eliminate: MATRIX_PAGE };
let _matrixFilterSig = '';
function matrixShowMore(id) { _matrixVisible[id] = Math.min((_matrixVisible[id] || MATRIX_PAGE) + MATRIX_PAGE, 1000); renderMatrix(); }
let taskSelectMode = false;
let taskSelected = new Set();
let lastSelectedId = null;
function bindTaskCards(scope) {
  $$('.task-card', scope).forEach(card => {
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
        const std = getStudentsList().find(x => x.name === sName);
        if (std) openStudentDossier(std.id || std.name);
        return;
      }
      if (e.target.closest('.tc-time')) {
        e.stopPropagation();
        openTimeBreakdownModal(card.dataset.id);
        return;
      }
      openTaskModal(state.tasks.find(t => t.id === card.dataset.id));
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
      const task = state.tasks.find(x => x.id === taskId);
      if (!task) return;
      if (dx < -100) {
        // Swipe left → complete
        captureUndo('Complete task');
        const { wasDone, kr } = toggleTaskDone(task);
        save();
        if (currentView() === 'tasks') renderTasks(); else renderView();
        if (kr) goalProgressToast(task, wasDone, kr);
        toast(task.status === 'done' ? 'Task completed ✅' : 'Task reopened');
      } else if (dx > 100) {
        // Swipe right → move to next status
        const curIdx = STATUSES.findIndex(s => s.id === task.status);
        if (curIdx < STATUSES.length - 1 && task.status !== 'done') {
          const nextStatus = STATUSES[curIdx + 1].id;
          task.status = nextStatus;
          task.completedAt = nextStatus === 'done' ? todayISO() : null;
          task.updatedAt = Date.now();
          applyTaskGoalProgress(task, nextStatus === 'done');
          save();
          if (currentView() === 'tasks') renderTasks(); else renderView();
          toast(`Moved to ${STATUSES[curIdx + 1].title}`);
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
            const cards = Array.from($$('.task-card', scope));
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
          const bc = $('#batch-count');
          if (bc) bc.textContent = taskSelected.size + ' selected';
          return;
        }
      });
    }
  });
  $$('[data-complete]', scope).forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    const t = state.tasks.find(x => x.id === b.dataset.complete);
    if (!t) return;
    captureUndo('Complete task');
    const { wasDone, kr } = toggleTaskDone(t);
    save();
    if (currentView() === 'tasks') renderTasks(); else renderView();
    if (kr) goalProgressToast(t, wasDone, kr);
  }));
  bindTaskPomoButtons(scope);
}
function renderTaskColumnBody(status) {
  const body = $(`.col-body[data-status-body="${status}"]`);
  if (!body) return;
  const items = taskVirtItems[status] || [];
  const st = taskVirt[status] || (taskVirt[status] = { top: 0, heights: {} });
  if (!items.length) {
    body.innerHTML = '<div class="empty-state" style="padding:18px 8px"><div style="font-size:14px">Drop cards here</div></div>';
    updateColRange(status, 0, 0, -1, false);
    return;
  }
  // The windowing maths lives in src/tasks/virtual.js — pure, and tested there.
  // This owns the DOM: measuring each card after render and feeding the heights back.
  const { first, last, topPad, bottomPad } = TasksView.visibleWindow({
    items, heights: st.heights, scrollTop: st.top,
    clientHeight: body.clientHeight || 400, estHeight: TASK_EST_H,
  });
  body.innerHTML = (topPad ? `<div style="height:${topPad}px;flex-shrink:0"></div>` : '') +
    items.slice(first, last + 1).map(taskCardHTML).join('') +
    (bottomPad ? `<div style="height:${bottomPad}px;flex-shrink:0"></div>` : '');
  $$('.task-card', body).forEach(card => { st.heights[card.dataset.id] = card.offsetHeight + TASK_GAP; });
  if (body.scrollTop !== st.top) body.scrollTop = st.top;
  bindTaskCards(body);
  // live position indicator — shows where you are in a long column; when a filter is
  // active it becomes a clickable badge: "m / N" filtered/total, or "N" when the column
  // is set to show all its tasks despite the filter
  updateColRange(status, items.length, first, last, topPad > 0 || bottomPad > 0);
}
function updateColRange(status, itemsLen, first, last, overflowing) {
  const body = $(`.col-body[data-status-body="${status}"]`);
  const rangeEl = body && body.closest('.col') && $('[data-range]', body.closest('.col'));
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
  const body = $(`.col-body[data-status-body="${status}"]`);
  if (!body || body.dataset.virt) return;
  body.dataset.virt = '1';
  body.addEventListener('scroll', () => {
    if (taskDragging) return; // don't swap DOM mid-drag
    const st = taskVirt[status];
    if (!st) return;
    st.top = body.scrollTop;
    if (taskVirtRAF[status]) return;
    // macrotask throttle (works even when the tab is throttled and rAF never fires)
    taskVirtRAF[status] = setTimeout(() => { taskVirtRAF[status] = 0; renderTaskColumnBody(status); }, 24);
  });
}
function renderTasks() {
  if (taskViewMode === 'matrix') { renderMatrix(); return; }
  ensureKanbanLists();
  const KANBAN = getKanbanLists();
  const goals = state.goals;
  const filtered = state.tasks.filter(t => {
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
  state.tasks.forEach(t => { if (isArchivedTask(t) && !taskShowArchived) return; taskStatusTotals[t.status] = (taskStatusTotals[t.status] || 0) + 1; });
  taskFilterActive = !!(taskFilter.q || taskFilter.goal || taskFilter.tag);
  // NOTE: taskColShowAll intentionally persists across filter changes — reveals stay revealed
  // when re-filtering, so users can keep hidden work in view without re-expanding columns.
  // count overdue/due-soon tasks each column hides behind the filter (amber badge)
  const soonISO = isoDate(shiftDays(7));
  const filteredSet = new Set(filtered.map(t => t.id));
  taskHiddenRisk = {};
  state.tasks.forEach(t => {
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
  const allByStatus = status => state.tasks.filter(t => t.status === status && (taskShowArchived ? isArchivedTask(t) : !isArchivedTask(t)));
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
  viewRoot().innerHTML = TasksView.taskBoardHTML({
    columns, goals, filter: taskFilter, filterActive: taskFilterActive,
    hiddenTotal, riskParts, showArchived: taskShowArchived,
    selectMode: taskSelectMode, selectedCount: taskSelected.size,
    allSelected: !!(taskSelected.size && taskSelected.size === filtered.length), ic,
  });

  // windowed column bodies (Trello lists)
  taskVirtRAF = {};
  KANBAN.forEach(s => {
    taskVirtItems[s.id] = taskColShowAll.has(s.id) ? allByStatus(s.id) : filtered.filter(t => t.status === s.id);
    renderTaskColumnBody(s.id);
    bindColScroll(s.id);
  });
  // click the filtered/total badge to cycle that column between matched and all tasks
  $$('.col-range').forEach(el => el.addEventListener('click', () => {
    const st = el.dataset.range;
    if (!taskFilterActive) return;
    if (taskColShowAll.has(st)) taskColShowAll.delete(st); else taskColShowAll.add(st);
    renderTasks();
  }));

  // Trello list menu (⋮) — rename, change color, archive all, delete
  $$('[data-list-menu]').forEach(btn => btn.addEventListener('click', e => {
    e.stopPropagation();
    const id = btn.dataset.listMenu;
    const l = getKanbanLists().find(x=>x.id===id); if (!l) return;
    openModal(`<div class="modal" style="max-width:340px"><div class="modal-head"><h3>List: ${esc(l.title)}</h3><button class="btn-icon" data-close-modal>${ic('x',16)}</button></div><div class="modal-body">
      <div class="field"><label for="list-rename" class="field-label">Title</label><input id="list-rename" value="${esc(l.title)}"></div>
      <div class="field"><label class="field-label" id="l-color-label">Color</label><div role="group" aria-labelledby="l-color-label" style="display:flex;gap:6px;flex-wrap:wrap">${COLORS.map(c=>`<button class="color-dot ${l.color===c?'active':''}" data-list-color="${c}" style="background:${c};width:28px;height:28px;border-radius:50%;border:2px solid ${l.color===c?'#fff':'transparent'};box-shadow:0 0 0 2px ${l.color===c?c:'transparent'}"></button>`).join('')}</div></div>
      <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
        <button class="btn btn-sm btn-accent" id="list-save">Save</button>
        <button class="btn btn-sm btn-ghost" id="list-archive-all">Archive all</button>
        <button class="btn btn-sm btn-danger" id="list-delete">Delete list</button>
      </div>
    </div></div>`);
    $('#list-save')?.addEventListener('click', () => {
      const nv = $('#list-rename').value.trim(); if (nv) renameKanbanList(id, nv);
      const sel = document.querySelector('[data-list-color].active');
      const col = sel ? sel.dataset.listColor : l.color;
      if (col !== l.color) { const ll = state.kanbanLists.find(x=>x.id===id); if (ll) { ll.color = col; save(); renderTasks(); } }
      closeModal();
    });
    $$('[data-list-color]').forEach(b=>b.addEventListener('click', ()=>{ $$('[data-list-color]').forEach(x=>x.classList.remove('active')); b.classList.add('active'); }));
    $('#list-archive-all')?.addEventListener('click', ()=>{ closeModal(); archiveAllInList(id); });
    $('#list-delete')?.addEventListener('click', ()=>{ closeModal(); deleteKanbanList(id); });
  }));
  $$('[data-rename-list]').forEach(el => el.addEventListener('dblclick', () => {
    const id = el.dataset.renameList;
    const l = getKanbanLists().find(x=>x.id===id); if (!l) return;
    const nv = prompt('Rename list', l.title);
    if (nv && nv.trim() && nv.trim()!==l.title) renameKanbanList(id, nv.trim());
  }));
  // toolbar summary of hidden at-risk work — click to reveal all of it
  const riskPill = $('#task-risk-pill');
  if (riskPill) riskPill.addEventListener('click', () => {
    taskColShowAll = new Set(KANBAN.map(s => s.id));
    renderTasks();
  });

  // amber pulse on column badges when a hidden deadline passed while the filter is active
  if (taskFilterActive && pulseSet.size) {
    pulseSet.forEach(status => {
      const col = $(`.col[data-status="${status}"]`);
      if (!col) return;
      ['.col-count', '.col-range'].forEach(sel => { const el = $(sel, col); if (el) el.classList.add('pulse'); });
    });
    setTimeout(() => {
      $$('.col-count.pulse, .col-range.pulse').forEach(el => el.classList.remove('pulse'));
    }, 2000);
  }

  // drag & drop (column-level — works with windowed bodies; card-level drag hooks are bound in bindTaskCards)
  $$('.col').forEach(col => {
    col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('drag-over'); });
    col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
    col.addEventListener('drop', e => {
      e.preventDefault();
      col.classList.remove('drag-over');
      const id = e.dataTransfer.getData('text/plain');
      const task = state.tasks.find(t => t.id === id);
      if (!task) return;
      const status = col.dataset.status;
      if (task.status !== status) {
        const completing = status === 'done';
        const wasDone = task.status === 'done';
        captureUndo('Move task');
        logActivity('task.move', task.title + ' → ' + status, 'task');
        const oldStatus = task.status;
        task.status = status;
        task.completedAt = completing ? todayISO() : null;
        task.updatedAt = Date.now();
        trackProgressTime(task, oldStatus, status);
        const kr = applyTaskGoalProgress(task, completing);
        save();
        renderTasks();
        toast(completing ? 'Nice — task completed ✅' : `Moved to ${STATUSES.find(s => s.id === status).title}`);
        if (kr) goalProgressToast(task, wasDone, kr);
      }
    });
  });
  // add column buttons
  $$('.col-add').forEach(b => b.addEventListener('click', () => openTaskModal(null, b.dataset.addStatus)));
  $('#task-new').addEventListener('click', () => openTaskModal());
  $('#task-add-list')?.addEventListener('click', () => {
    const t = prompt('New list title'); if (t) addKanbanList(t);
  });
  $('#task-show-archived')?.addEventListener('change', e => { taskShowArchived = e.target.checked; renderTasks(); });
  // drag & drop for kanban lists (reorder lists) — simple: drag header to reorder
  // (uses HTML5 DnD on .col)
  $$('.col').forEach(colEl => {
    const head = colEl.querySelector('.col-head'); if (!head) return;
    head.draggable = true;
    head.addEventListener('dragstart', e => { e.dataTransfer.setData('text/list', colEl.dataset.status); e.dataTransfer.effectAllowed='move'; });
    head.addEventListener('dragover', e => e.preventDefault());
    head.addEventListener('drop', e => {
      e.preventDefault();
      const src = e.dataTransfer.getData('text/list'); const dst = colEl.dataset.status;
      if (!src || src===dst) return;
      const lists = state.kanbanLists; const sIdx = lists.findIndex(l=>l.id===src); const dIdx = lists.findIndex(l=>l.id===dst);
      if (sIdx<0 || dIdx<0) return;
      captureUndo('Reorder lists');
      const [moved] = lists.splice(sIdx,1);
      lists.splice(dIdx,0,moved); save(); renderTasks();
    });
  });
  // Quick-add inline
  const quickInput = $('#quick-task-input');
  const quickAdd = () => {
    const raw = quickInput.value.trim();
    if (!raw) return;
    const parsed = parseNaturalLanguageTask(raw);
    if (!parsed) return;
    captureUndo('Create task');
    state.tasks.push({
      id: uid(),
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
    save(); renderTasks();
    logActivity('task.create', parsed.title, 'task');
    toast('Task added: ' + parsed.title);
  };
  if (quickInput) {
    quickInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); quickAdd(); } });
    $('#quick-task-go').addEventListener('click', quickAdd);
  }
  bindFilterInput('#task-q', 120, v => { taskFilter.q = v; renderTasks(); });
  $('#task-goal').addEventListener('change', e => { taskFilter.goal = e.target.value; renderTasks(); });
  $('#task-category').addEventListener('change', e => { taskFilter.category = e.target.value; renderTasks(); });
  const tagChip = $('#task-tag-chip');
  if (tagChip) tagChip.addEventListener('click', () => { taskFilter.tag = ''; renderTasks(); });
  $('#task-clear-filter').addEventListener('click', () => { taskFilter = { q: '', goal: '', tag: '', category: '' }; renderTasks(); });
  const viewToggle = $('#task-view-toggle');
  if (viewToggle) viewToggle.addEventListener('click', () => { taskViewMode = 'matrix'; renderTasks(); });
  // Batch operations
  const selectBtn = $('#task-select-mode');
  if (selectBtn) selectBtn.addEventListener('click', () => {
    taskSelectMode = !taskSelectMode;
    taskSelected.clear();
    renderTasks();
  });
  const batchCancel = $('#batch-cancel');
  if (batchCancel) batchCancel.addEventListener('click', () => {
    taskSelectMode = false;
    taskSelected.clear();
    renderTasks();
  });
  const batchSelectAll = $('#batch-select-all');
  if (batchSelectAll) batchSelectAll.addEventListener('click', () => {
    if (taskSelected.size === filtered.length) {
      taskSelected.clear();
    } else {
      filtered.forEach(t => taskSelected.add(t.id));
    }
    renderTasks();
  });
  const batchStatusSel = $('#batch-set-status');
  if (batchStatusSel) batchStatusSel.addEventListener('change', e => {
    const status = e.target.value;
    if (!status || !taskSelected.size) return;
    captureUndo('Batch change status');
    taskSelected.forEach(id => {
      const t = state.tasks.find(x => x.id === id);
      if (t) {
        const completing = status === 'done';
        const oldStatus = t.status;
        t.status = status;
        t.completedAt = completing ? todayISO() : null;
        t.updatedAt = Date.now();
        trackProgressTime(t, oldStatus, status);
        applyTaskGoalProgress(t, completing);
      }
    });
    save(); renderTasks();
    toast(`Updated status for ${taskSelected.size} task(s) ✅`);
  });
  const batchPrioSel = $('#batch-set-prio');
  if (batchPrioSel) batchPrioSel.addEventListener('change', e => {
    const p = e.target.value;
    if (!p || !taskSelected.size) return;
    captureUndo('Batch set priority');
    taskSelected.forEach(id => {
      const t = state.tasks.find(x => x.id === id);
      if (t) { t.priority = p; t.updatedAt = Date.now(); }
    });
    save(); renderTasks();
    toast(`Set priority to ${p.toUpperCase()} for ${taskSelected.size} task(s) ✅`);
  });
  const batchDueSel = $('#batch-set-due');
  if (batchDueSel) batchDueSel.addEventListener('change', e => {
    const v = e.target.value;
    if (!v || !taskSelected.size) return;
    captureUndo('Batch set due date');
    const newDue = v === 'today' ? todayISO() : v === 'tomorrow' ? isoDate(shiftDays(1)) : '';
    taskSelected.forEach(id => {
      const t = state.tasks.find(x => x.id === id);
      if (t) { t.due = newDue; t.updatedAt = Date.now(); }
    });
    save(); renderTasks();
    toast(`Set due date for ${taskSelected.size} task(s) 📅`);
  });
  const batchComplete = $('#batch-complete');
  if (batchComplete) batchComplete.addEventListener('click', () => {
    if (!taskSelected.size) return;
    captureUndo('Batch complete');
    taskSelected.forEach(id => {
      const t = state.tasks.find(x => x.id === id);
      if (t && t.status !== 'done') {
        const oldStatus = t.status;
        t.status = 'done';
        t.completedAt = todayISO();
        t.updatedAt = Date.now();
        trackProgressTime(t, oldStatus, 'done');
        applyTaskGoalProgress(t, true);
      }
    });
    playChime('task-done');
    taskSelected.clear();
    save(); renderTasks();
    toast('Batch complete ✅');
  });
  const batchDelete = $('#batch-delete');
  if (batchDelete) batchDelete.addEventListener('click', () => {
    if (!taskSelected.size || !confirm(`Delete ${taskSelected.size} task(s)?`)) return;
    captureUndo('Batch delete');
    logActivity('task.batch', taskSelected.size + ' tasks deleted', 'task');
    state.tasks = state.tasks.filter(t => !taskSelected.has(t.id));
    taskSelected.forEach(id => tombstone('tasks', id));
    taskSelected.clear();
    save(); renderTasks();
    toast('Batch deleted');
  });
}

// Card markup is owned by src/tasks/view.js; this resolves state into it.
function taskCardHTML(t) {
  return TasksView.taskCardHTML(t, {
    goals: state.goals, vaultItems: state.vaultItems, tagSpan, ic,
    selectMode: taskSelectMode, selectedIds: taskSelected, pomoHTML: taskPomoHTML,
  });
}

