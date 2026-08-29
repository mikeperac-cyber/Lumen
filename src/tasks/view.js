// src/tasks/view.js — task presentation. Pure builders: everything from app state is
// injected, the same deps pattern as src/vault/view.js. renderTasks and openTaskModal
// stay in app.js; they own filtering, drag-and-drop and the DOM wiring.
import { esc, fmtShort, todayISO } from '../lib/helpers.js';
import { PRIOS, CATEGORIES, RECURRENCE, COVER_COLORS, MATRIX_PAGE } from '../lib/constants.js';

/**
 * @param {object} t task
 * @returns {boolean} archived by flag or by status
 */
export function isArchivedTask(t) { return !!t.archived || t.status === 'archived'; }

/**
 * Chips describing what a task links to — its goal, key result and vault items.
 * @param {object} t task
 * @param {{goals?: object[], vaultItems?: object[]}} [ctx]
 * @returns {string} empty when the task links to nothing that still exists
 */
export function linkGraphForTask(t, ctx) {
  const { goals = [], vaultItems = [] } = ctx || {};
  let out='';
  if (t && t.goalId){
    const g = goals.find(x => x.id === t.goalId);
    if (g){
      let kr = null;
      if (t.krId) kr = (g.keyResults || []).find(k => k.id === t.krId);
      if (!kr && t.advancedKrId) kr = (g.keyResults || []).find(k => k.id === t.advancedKrId);
      if (!kr) kr = (g.keyResults || []).find(k => k.current < k.target);
      if (kr) out += `<span class="link-chip" title="Links to key result ${esc(kr.title)}">→ ${esc(g.title)} · ${esc(kr.title)} ${kr.current}/${kr.target}</span>`;
      else out += `<span class="link-chip" title="Linked goal">→ ${esc(g.title)}</span>`;
    }
  }
  if (t && Array.isArray(t.vaultIds) && t.vaultIds.length){
    const vchips = t.vaultIds.map(id=>{ const v=vaultItems.find(x=>x.id===id); return v? `<span class="link-chip vault-chip-link" data-vault-task="${v.id}" title="Vault: ${esc(v.title)}">🔗 ${esc(v.title.slice(0,20))}</span>` : ''; }).join('');
    out += (out? ' ' : '') + vchips;
  }
  return out;
}

/**
 * @typedef {object} TaskCardCtx
 * @property {object[]} [goals]
 * @property {object[]} [vaultItems]
 * @property {(tag:string)=>string} [tagSpan]
 * @property {(name:string,size:number)=>string} [ic]
 * @property {boolean} [selectMode]
 * @property {Set<string>} [selectedIds]
 * @property {(t:object)=>string} [pomoHTML] the focus timer reads live state, so the
 *   caller renders it and this module places the result
 */

/**
 * Kanban card markup for one task.
 * @param {object} t task
 * @param {TaskCardCtx} [ctx]
 * @returns {string}
 */
export function taskCardHTML(t, ctx) {
  const {
    goals = [], vaultItems = [], tagSpan = () => '', ic = () => '',
    selectMode = false, selectedIds = new Set(), pomoHTML = () => '',
  } = ctx || {};
  const goal = goals.find(g => g.id === t.goalId);
  const p = PRIOS[t.priority] || PRIOS.med;
  const overdue = t.due && t.due < todayISO() && t.status !== 'done';
  const tags = (t.tags || []).map(tg => tagSpan(tg)).join('');
  const cat = CATEGORIES.find(c => c.id === t.category);
  const catBadge = cat ? `<span class="badge cat-badge" style="background:${cat.color}22;color:${cat.color};border:1px solid ${cat.color}44">${cat.label}</span>` : '';
  const subtasks = t.subtasks || [];
  const subDone = subtasks.filter(s => s.done).length;
  const subProg = subtasks.length ? `<span class="subtask-prog ${subDone === subtasks.length ? 'done' : ''}">✓ ${subDone}/${subtasks.length}</span>` : '';
  const subBar = subtasks.length ? `<div class="subtask-bar-track" title="${subDone} of ${subtasks.length} subtasks completed"><div class="subtask-bar-fill" style="width:${Math.round((subDone / subtasks.length) * 100)}%"></div></div>` : '';
  const recBadge = t.recurrence ? `<span class="badge rec-badge">🔄 ${RECURRENCE.find(r => r.id === t.recurrence)?.label || t.recurrence}</span>` : '';
  const safeCoverColor = (t.coverColor && /^#[0-9a-fA-F]{3,8}$/.test(t.coverColor) && t.coverColor !== '#00000000') ? t.coverColor : '';
  const safeCoverSrc = (t.coverImage && /^data:image\/(png|jpeg|webp|gif);base64,/.test(t.coverImage)) ? t.coverImage : '';
  const coverBar = safeCoverColor ? `<div class="tc-cover" style="background:${window.LumenLib.helpers.safeAttr(safeCoverColor)}"></div>` : '';
  const coverImg = safeCoverSrc ? `<div class="tc-cover-img"><img src="${window.LumenLib.helpers.safeAttr(safeCoverSrc)}" alt="cover" loading="lazy" style="width:100%;height:90px;object-fit:cover;border-radius:8px 8px 0 0"></div>` : '';
  const commentsBadge = (t.comments && t.comments.length) ? `<span class="tc-icon-badge" title="${t.comments.length} comment${t.comments.length===1?'':'s'}">💬 ${t.comments.length}</span>` : '';
  const attachesBadge = (t.attachments && t.attachments.length) ? `<span class="tc-icon-badge" title="${t.attachments.length} file${t.attachments.length===1?'':'s'}">📎 ${t.attachments.length}</span>` : '';
  const membersBadge = (t.members && t.members.length) ? `<span class="tc-icon-badge" title="${t.members.length} member${t.members.length===1?'':'s'}">👤 ${t.members.length}</span>` : '';
  const startBadge = t.startDate ? `<span class="due-chip" title="Start ${t.startDate}">${fmtShort(t.startDate)} →</span>` : '';
  const archivedCls = isArchivedTask(t) ? ' archived' : '';
  const selChecked = selectedIds.has(t.id) ? ' checked' : '';
  const selBox = selectMode ? `<input type="checkbox" class="task-sel-check" data-sel-id="${t.id}"${selChecked}>` : '';
  return `<div class="task-card${archivedCls} ${selectMode ? 'select-mode' : ''}${selectedIds.has(t.id) ? ' selected' : ''}" draggable="${selectMode ? 'false' : 'true'}" data-id="${t.id}">
    ${coverImg || coverBar}
    <div class="tc-top">
      ${selBox}
      <button class="check-circle ${t.status === 'done' ? 'done' : ''}" data-complete="${t.id}" title="Mark done">${ic('check', 12)}</button>
      <div style="flex:1;min-width:0">
        <div class="tc-title">${esc(t.title)} ${isArchivedTask(t)?'<span class="badge" style="background:#8b93a7;color:#fff;font-size:10px">archived</span>':''}</div>
        ${t.desc ? `<div class="tc-desc">${esc(t.desc)}</div>` : ''}
      </div>
    </div>
    <div class="tc-meta">
      <span class="badge ${p.cls}">${p.label}</span>
      ${t.student ? `<span class="badge task-student-chip" data-open-student="${esc(t.student)}" style="cursor:pointer;background:rgba(81,141,191,.15);color:#518DBF;border:1px solid rgba(81,141,191,.3);padding:1px 6px;border-radius:10px;font-size:11px" title="🎓 View ${esc(t.student)} dossier">🎓 ${esc(t.student)}</span>` : ''}
      ${catBadge}
      ${goal ? `<span class="goal-chip" style="background:${goal.color}">${esc(goal.title)}</span>` : ''}
      ${linkGraphForTask(t, { goals, vaultItems })}
      ${startBadge}
      ${t.due ? `<span class="due-chip ${overdue ? 'overdue' : ''}">${overdue ? '⚠ ' : ''}${fmtShort(t.due)}</span>` : ''}
      ${recBadge}
      ${subProg}
      ${commentsBadge}
      ${attachesBadge}
      ${membersBadge}
    </div>
    ${subBar}
    ${(t.totalProgressTime || t.status === 'progress') ? `<div class="tc-time"><span class="time-icon">⏱</span> ${t.status === 'progress' ? '<span class="time-live" data-progress-start="' + (t.progressStartedAt || '') + '"></span>' : fmtProgressTime(t.totalProgressTime)}</div>` : ''}
    ${pomoHTML(t)}
    ${tags ? `<div class="tc-foot"><span></span><span class="tc-meta" style="margin-top:0">${tags}</span></div>` : ''}
  </div>`;
}

/**
 * @typedef {object} TaskBoardCtx
 * @property {Array<{id:string,title:string,color:string,count:number,warn:boolean}>} columns
 *   one per kanban list; count and warn are resolved by the caller, which owns the filter
 * @property {object[]} [goals]
 * @property {{q:string,goal:string,category:string,tag:string}} [filter]
 * @property {boolean} [filterActive]
 * @property {number} [hiddenTotal] risky tasks the active filter is hiding
 * @property {string[]} [riskParts] per-column descriptions of what is hidden
 * @property {boolean} [showArchived]
 * @property {boolean} [selectMode]
 * @property {number} [selectedCount]
 * @property {boolean} [allSelected]
 * @property {(name:string,size:number)=>string} [ic]
 */

/**
 * The kanban board chrome — toolbar, quick-add, columns and the batch bar. Column
 * bodies are left empty on purpose: app.js fills them through renderTaskColumnBody,
 * which windows long lists as you scroll.
 * @param {TaskBoardCtx} ctx
 * @returns {string}
 */
export function taskBoardHTML(ctx) {
  const {
    columns = [], goals = [], filterActive = false, hiddenTotal = 0, riskParts = [],
    showArchived = false, selectMode = false, selectedCount = 0, allSelected = false, ic = () => '',
  } = ctx || {};
  const filter = (ctx && ctx.filter) || {};
  const cols = columns.map(s => {
    return `<div class="col" data-status="${s.id}">
      <div class="col-head"><span class="col-dot" style="background:${s.color}"></span><span class="col-title" data-rename-list="${s.id}" title="Double-click to rename">${esc(s.title)}</span><span class="col-count${s.warn ? ' warn' : ''}">${s.count}</span><span class="col-range" data-range="${s.id}"></span><button class="btn-icon col-menu" data-list-menu="${s.id}" title="List actions">⋮</button></div>
      <div class="col-body" data-status-body="${s.id}"></div>
      <button class="col-add" data-add-status="${s.id}">${ic('plus', 14)} Add card</button>
    </div>`;
  }).join('');

  return `
    <div class="toolbar">
      <input type="text" class="search-input" id="task-q" placeholder="Search tasks…" value="${esc(filter.q)}">
      <select id="task-goal">
        <option value="">All goals</option>
        ${goals.map(g => `<option value="${g.id}" ${g.id === filter.goal ? 'selected' : ''}>${esc(g.title)}</option>`).join('')}
      </select>
      <select id="task-category">
        <option value="">All categories</option>
        ${CATEGORIES.map(c => `<option value="${c.id}" ${c.id === filter.category ? 'selected' : ''}>${c.label}</option>`).join('')}
      </select>
      ${filter.tag ? `<span class="task-tag-chip" id="task-tag-chip" title="Clear tag filter">#${esc(filter.tag)} ✕</span>` : ''}
      ${filterActive && hiddenTotal > 0 ? `<span class="risk-pill" id="task-risk-pill" title="Hidden overdue/due-soon — ${riskParts.join(' · ')}. Click to show all hidden tasks">⚠ ${hiddenTotal} hidden overdue/due-soon</span>` : ''}
      <button class="btn btn-ghost" id="task-clear-filter">Clear</button>
      <div style="flex:1"></div>
      <label class="btn btn-ghost" style="gap:6px"><input type="checkbox" id="task-show-archived" ${showArchived?'checked':''}> 🗄 Archived</label>
      <button class="btn btn-ghost" id="task-add-list">${ic('plus',14)} Add List</button>
      <button class="btn btn-ghost" id="task-select-mode" title="Select multiple tasks">${selectMode ? ic('check', 14) + ' Exit select' : ic('check-square', 14) + ' Select'}</button>
      <button class="btn btn-ghost" id="task-view-toggle">${ic('target', 14)} Matrix</button>
      <button class="btn btn-accent" id="task-new">${ic('plus', 15)} New card</button>
    </div>
    <div class="quick-add-bar">
      <input type="text" class="input" id="quick-task-input" placeholder="⚡ Quick add (e.g. 'Review deck tomorrow at 3pm !high #work')" style="flex:1;font-size:14px;padding:10px 14px;border-radius:10px">
      <button class="btn btn-accent" id="quick-task-go">${ic('plus', 15)} Add</button>
    </div>
    <div class="kanban">${cols}</div>
    ${selectMode ? `
      <div class="batch-bar" id="task-batch-bar">
        <span class="batch-count" id="batch-count">${selectedCount} selected</span>
        <button class="btn btn-sm btn-ghost" id="batch-select-all">${allSelected ? 'Deselect all' : 'Select all'}</button>
        <div class="batch-actions">
          <select class="batch-select" id="batch-set-status">
            <option value="">Move to…</option>
            ${columns.map(s => `<option value="${s.id}">${esc(s.title)}</option>`).join('')}
          </select>
          <select class="batch-select" id="batch-set-prio">
            <option value="">Priority…</option>
            <option value="high">High (!high)</option>
            <option value="med">Medium (!med)</option>
            <option value="low">Low (!low)</option>
          </select>
          <select class="batch-select" id="batch-set-due">
            <option value="">Due…</option>
            <option value="today">Today</option>
            <option value="tomorrow">Tomorrow</option>
            <option value="clear">Clear date</option>
          </select>
          <button class="btn btn-sm btn-accent" id="batch-complete">${ic('check', 13)} Complete</button>
          <button class="btn btn-sm btn-danger" id="batch-delete" title="Delete selected tasks">${ic('trash', 13)}</button>
          <button class="btn btn-sm btn-ghost" id="batch-cancel" title="Close select mode">✕</button>
        </div>
      </div>` : ''}`;
}

/**
 * Key-result options for a goal, with the current selection marked.
 * @param {string} goalId
 * @param {string} selected key-result id
 * @param {object[]} [goals]
 * @returns {string}
 */
export function krOptionsHTML(goalId, selected, goals) {
  goals = goals || [];
  const g = goals.find(x => x.id === goalId);
  const opts = [`<option value="">Auto — first incomplete</option>`];
  (g && g.keyResults || []).forEach(kr => {
    const done = kr.current >= kr.target;
    opts.push(`<option value="${kr.id}" ${kr.id === selected ? 'selected' : ''}>${esc(kr.title)}${done ? ' ✓' : ''}${kr.current >= 1 ? ` (${kr.current}/${kr.target})` : ''}</option>`);
  });
  return opts.join('');
}

/**
 * The add/edit task form. Pure: the lists, goals, students, schedule periods and the
 * vault picker are all handed in; the caller opens the modal and binds the result.
 * @param {object} t the task being edited, or a blank one
 * @param {object} [ctx] { isEdit, lists, goals, students, vaultItems, days, periods, vaultPickerHTML, ic }
 * @returns {string}
 */
export function taskModalHTML(t, ctx) {
  const {
    isEdit = false, lists = [], goals = [], students = [], vaultItems = [],
    days = [], periods = [], vaultPickerHTML = '', ic = () => '',
  } = ctx || {};
  const vaultPicker = () => vaultPickerHTML;
  const statusOpts = lists.map(s => `<option value="${s.id}" ${s.id === t.status ? 'selected' : ''}>${esc(s.title)}</option>`).join('');
  const prioOpts = Object.keys(PRIOS).map(k => `<option value="${k}" ${k === t.priority ? 'selected' : ''}>${PRIOS[k].label}</option>`).join('');
  const catOpts = CATEGORIES.map(c => `<option value="${c.id}" ${c.id === t.category ? 'selected' : ''}>${c.label}</option>`).join('');
  const studentList = students;
  const studentOpts = studentList.map(s => `<option value="${esc(s.name)}" ${s.name === (t.student || '') ? 'selected' : ''}>🎓 ${esc(s.name)}</option>`).join('');
  const recOpts = RECURRENCE.map(r => `<option value="${r.id}" ${r.id === (t.recurrence || '') ? 'selected' : ''}>${r.label}</option>`).join('');
  const goalOpts = goals.map(g => `<option value="${g.id}" ${g.id === t.goalId ? 'selected' : ''}>${esc(g.title)}</option>`).join('');
  const subtaskRows = (t.subtasks || []).map((st, i) => `<div class="subtask-row" data-st-idx="${i}"><input type="checkbox" ${st.done ? 'checked' : ''} class="st-check" data-st-check="${i}"><input type="text" class="st-input" value="${esc(st.text)}" placeholder="Subtask…" data-st-text="${i}"><button class="btn-icon st-del" data-st-del="${i}" title="Remove">${ic('x', 14)}</button></div>`).join('');
  return `
    <div class="modal">
      <div class="modal-head"><h3>${isEdit ? 'Edit task' : 'New task'}</h3><button class="btn-icon" data-close-modal>${ic('x', 16)}</button></div>
      <div class="modal-body">
        <div class="field"><label for="f-title" class="field-label">Title</label><input id="f-title" type="text" value="${esc(t.title)}" placeholder="What needs doing?"></div>
        <div class="field"><label class="field-label" id="f-cover-label">Cover (Trello)</label><div class="cover-picker" id="f-cover-picker" role="group" aria-labelledby="f-cover-label" style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">${COVER_COLORS.map(c=>`<button type="button" class="cover-dot ${t.coverColor===c?'active':''}" data-cover="${c}" style="background:${c};width:28px;height:28px;border-radius:6px;border:2px solid ${t.coverColor===c?'#fff':'transparent'};box-shadow:0 0 0 2px ${t.coverColor===c?c:'transparent'};${c==='#00000000'?'border:1px dashed #8b93a7;background:transparent':''}" title="${c==='#00000000'?'No cover':c}">${c==='#00000000'?'✕':''}</button>`).join('')}<label class="btn btn-sm btn-ghost" style="margin-left:8px">🖼️ Image<input type="file" id="f-cover-file" accept="image/*" class="hidden"></label>${t.coverImage?`<button class="btn btn-sm btn-ghost" id="f-cover-clear">Clear</button></div><div class="cover-preview" style="margin-top:8px"><img src="${window.LumenLib.helpers.safeAttr(/^data:image\/(png|jpeg|webp|gif);base64,/.test(t.coverImage) ? t.coverImage : '')}" style="max-width:100%;max-height:120px;border-radius:8px;border:1px solid var(--border)"></div>`:'</div>'}</div>
        <div class="field"><label for="f-desc" class="field-label">Description</label><textarea id="f-desc" rows="3" placeholder="Optional details…">${esc(t.desc)}</textarea></div>
        <div class="field-row">
          <div class="field"><label for="f-status" class="field-label">Status</label><select id="f-status">${statusOpts}</select></div>
          <div class="field"><label for="f-prio" class="field-label">Priority</label><select id="f-prio">${prioOpts}</select></div>
        </div>
        <div class="field-row">
          <div class="field"><label for="f-student" class="field-label">Student (optional)</label><select id="f-student"><option value="">— None —</option>${studentOpts}</select></div>
          <div class="field"><label for="f-category" class="field-label">Category</label><select id="f-category"><option value="">— None —</option>${catOpts}</select></div>
        </div>
        <div class="field"><label for="f-members" class="field-label">Members (Trello, comma separated)</label><input id="f-members" type="text" value="${esc((t.members||[]).join(', '))}" placeholder="alice, bob, carol"></div>
        <div class="field-row">
          <div class="field"><label for="f-start" class="field-label">Start date</label><input id="f-start" type="date" value="${t.startDate || ''}"></div>
          <div class="field"><label for="f-due" class="field-label">Due date</label><input id="f-due" type="date" value="${t.due || ''}"></div>
        </div>
        <div class="field"><label for="f-goal" class="field-label">Goal</label><select id="f-goal"><option value="">— None —</option>${goalOpts}</select></div>
        <div class="field-row">
          <div class="field"><label for="f-recurrence" class="field-label">Recurrence</label><select id="f-recurrence">${recOpts}</select></div>
        </div>
        <div class="field-row">
          <div class="field"><label for="f-sched-day" class="field-label">Schedule day</label><select id="f-sched-day"><option value="">— None —</option>${days.map(d => `<option value="${d.id}" ${d.id === (t.scheduleDay || '') ? 'selected' : ''}>${d.label}</option>`).join('')}</select></div>
          <div class="field"><label for="f-sched-period" class="field-label">Period</label><select id="f-sched-period"><option value="">— None —</option>${periods.map(p => `<option value="${p.id}" ${p.id === (t.schedulePeriod || '') ? 'selected' : ''}>${esc(p.label)} — ${p.time}</option>`).join('')}</select></div>
        </div>
        <div class="field-row">
          <div class="field"><label for="f-start-time" class="field-label">Start time</label><input id="f-start-time" type="time" value="${t.startTime || ''}"></div>
          <div class="field"><label for="f-end-time" class="field-label">End time</label><input id="f-end-time" type="time" value="${t.endTime || ''}"></div>
        </div>
        <div class="field"><label for="f-kr" class="field-label">Key result (optional) — completing this task advances it</label><select id="f-kr">${krOptionsHTML(t.goalId, t.krId, goals)}</select></div>
        <div class="field"><label class="field-label" id="f-vault-links-label">Vault links (attach resources)</label>
          <div id="f-vault-picker" role="group" aria-labelledby="f-vault-links-label">${vaultPicker(t.vaultIds||[])}</div>
          <div style="margin-top:6px;display:flex;gap:6px"><button class="btn btn-sm btn-ghost" id="f-vault-new">+ Create vault item</button><label class="btn btn-sm btn-ghost" style="cursor:pointer">📎 Choose from Vault<input type="file" id="f-vault-attach" class="hidden"></label></div>
        </div>
        <div class="field"><label for="f-tags" class="field-label">Tags (comma separated)</label><input id="f-tags" type="text" value="${esc((t.tags || []).join(', '))}" placeholder="work, focus, errand"></div>
        <div class="field">
          <label class="field-label" id="f-subtasks-label">Subtasks (Trello checklist)</label>
          <div id="f-subtasks" role="group" aria-labelledby="f-subtasks-label">${subtaskRows}</div>
          <div style="display:flex;gap:8px;margin-top:6px">
            <button class="btn btn-ghost btn-sm" id="f-add-subtask">${ic('plus', 14)} Add checklist item</button>
            <button class="btn btn-sm btn-ai" id="f-ai-subtasks">✨ AI Breakdown</button>
          </div>
        </div>
        <div class="field"><label class="field-label" id="f-attachments-label">Attachments (Trello)</label>
          <div id="f-attachments-list" role="group" aria-labelledby="f-attachments-label" style="display:flex;flex-direction:column;gap:6px;margin-bottom:8px">${(t.attachments||[]).map(a=>`<div class="attach-row" style="display:flex;align-items:center;gap:8px;padding:6px 8px;border:1px solid var(--border);border-radius:8px"><span>${fileIcon(a.name)}</span><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis">${esc(a.name)} <span class="muted" style="font-size:11px">${fileSizeStr(a.size)} · ${a.mime||''}</span></span><button class="btn btn-xs btn-ghost" data-attach-dl="${a.id}">⬇</button><button class="btn btn-xs btn-ghost" data-attach-del="${a.id}">✕</button></div>`).join('') || '<div class="muted" style="font-size:12px">No files yet — attach images, PDFs, etc.</div>'}</div>
          <label class="btn btn-sm btn-ghost" style="cursor:pointer">📎 Add file<input type="file" id="f-attach-file" class="hidden" multiple></label>
          <span class="muted" style="font-size:11px;margin-left:8px">Stored locally in IndexedDB — offline.</span>
        </div>
        <div class="field"><label class="field-label" id="f-comments-label">Comments (Trello)</label>
          <div id="f-comments-list" role="group" aria-labelledby="f-comments-label" style="display:flex;flex-direction:column;gap:8px;margin-bottom:8px;max-height:180px;overflow-y:auto">${(t.comments||[]).slice().reverse().map(c=>`<div class="comment-row" style="padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--surface2)"><div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:12px">${esc(c.author||'You')}</b><span class="muted" style="font-size:11px">${timeAgo(c.at)} <button class="btn-icon" data-comment-del="${c.id}" title="Delete">${ic('x',12)}</button></span></div><div style="font-size:13px;margin-top:4px;white-space:pre-wrap">${esc(c.text)}</div></div>`).join('') || '<div class="muted" style="font-size:12px">No comments yet — ask a question or leave a note.</div>'}</div>
          <div style="display:flex;gap:8px"><input id="f-comment-input" type="text" placeholder="Write a comment…" style="flex:1"><button class="btn btn-accent btn-sm" id="f-comment-add">Comment</button></div>
        </div>
        <div class="field" role="group" aria-labelledby="f-card-actions-label" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <label class="field-label" id="f-card-actions-label" style="margin:0">Card actions</label>
          <button class="btn btn-sm btn-ghost" id="f-archive-toggle">${t.archived? '↩ Restore' : '🗄 Archive'}</button>
          <button class="btn btn-sm btn-ghost" id="f-move-card">↔ Move</button>
          <button class="btn btn-sm btn-ghost" id="f-copy-card">⧉ Copy</button>
          <button class="btn btn-sm btn-ghost" id="f-watch-toggle">${(t.watchers||[]).includes('me')? '👁 Watching' : '👁 Watch'}</button>
        </div>
        ${(t.goalId || (t.vaultIds||[]).length) ? `<div class="modal-link-graph">${t.goalId? linkGraphForTask(t, { goals, vaultItems })+' <span class="muted" style="font-size:11px">· completes → KR auto-advances</span>' : ''} ${(t.vaultIds||[]).map(id=>{ const v=vaultItems.find(x=>x.id===id); return v? `<span class="link-chip" title="Vault: ${esc(v.title)}">🔗 ${esc(v.title.slice(0,22))}</span>`:''}).join(' ')}</div>` : ''}
        ${isEdit ? `<div class="modal-pomo-widget" id="f-pomo-widget">
          <label class="field-label">🍅 Focus timer</label>
          <div class="pomo-widget-body">
            <div class="pomo-ring-wrap">
              <svg class="pomo-ring" viewBox="0 0 120 120">
                <circle class="pomo-ring-bg" cx="60" cy="60" r="52"/>
                <circle class="pomo-ring-fill" cx="60" cy="60" r="52" id="pomo-ring-fill"/>
              </svg>
              <div class="pomo-ring-time" id="pomo-ring-time">25:00</div>
            </div>
            <div class="pomo-widget-controls">
              <div class="pomo-presets" id="pomo-presets">
                <button class="btn btn-ghost btn-sm pomo-preset" data-pomo-preset="15">15m</button>
                <button class="btn btn-ghost btn-sm pomo-preset active" data-pomo-preset="25">25m</button>
                <button class="btn btn-ghost btn-sm pomo-preset" data-pomo-preset="45">45m</button>
                <button class="btn btn-ghost btn-sm pomo-preset" data-pomo-preset="60">60m</button>
              </div>
              <div class="pomo-widget-btns">
                <button class="btn btn-accent pomo-action-btn" id="pomo-action-btn">${ic('play', 16)} Start</button>
                <button class="btn btn-ghost pomo-action-btn" id="pomo-reset-btn">${ic('stop', 16)} Reset</button>
              </div>
              <div class="pomo-sessions-info" id="pomo-sessions-info">0 sessions today</div>
            </div>
          </div>
        </div>` : ''}
      </div>
      <div class="modal-foot">
        ${isEdit ? `<button class="btn btn-danger" id="f-delete">Delete</button>` : ''}
        ${isEdit ? `<button class="btn btn-ghost" id="f-dup" title="Duplicate task">⧉ Duplicate</button><button class="btn btn-ghost" id="f-share" title="Share task">↗ Share</button>` : ''}
        <div style="flex:1"></div>
        <button class="btn btn-ghost" id="f-template" title="Save as template">📋 Template</button>
        <button class="btn btn-ghost" data-close-modal>Cancel</button>
        <button class="btn btn-accent" id="f-save">Save</button>
      </div>
    </div>`;
}

/** Quadrant definitions — titles, subtitles and colours are presentation. */
export const MATRIX_QUADRANTS = [
  { id: 'do', title: '🔥 Do First', sub: 'Urgent & Important', color: '#ff5d6c' },
  { id: 'schedule', title: '📅 Schedule', sub: 'Not Urgent & Important', color: '#4f8cff' },
  { id: 'delegate', title: '📤 Delegate', sub: 'Urgent & Not Important', color: '#ffb020' },
  { id: 'eliminate', title: '🗑️ Eliminate', sub: 'Not Urgent & Not Important', color: '#8b93a7' }
];

/**
 * The Eisenhower matrix. Which task lands in which quadrant is the caller’s call --
 * it owns the urgent/important rules and the filter. This renders the grid, windows
 * each quadrant to its limit and offers the remainder.
 * @param {object} ctx { tasksByQuadrant, limits, goals, filter, ic }
 * @returns {string}
 */
export function matrixHTML(ctx) {
  const {
    tasksByQuadrant = {}, limits = {}, goals = [], ic = () => '',
  } = ctx || {};
  const filter = (ctx && ctx.filter) || {};
  const quadrants = MATRIX_QUADRANTS.map(q => ({ ...q, tasks: tasksByQuadrant[q.id] || [] }));
  function matrixTaskHTML(t) {
    const overdue = t.due && t.due < todayISO();
    return `<div class="matrix-task" data-id="${t.id}" draggable="true">
      <span class="matrix-task-grip" title="Drag to reorder or move">⠿</span>
      <button class="check-circle" data-complete="${t.id}" title="Mark done">${ic('check', 11)}</button>
      <span class="matrix-task-title${overdue ? ' overdue' : ''}">${esc(t.title)}</span>
      ${t.due ? `<span class="matrix-task-due${overdue ? ' overdue' : ''}">${fmtShort(t.due)}</span>` : ''}
    </div>`;
  }
  return `
    <div class="toolbar">
      <input type="text" class="search-input" id="task-q" placeholder="Search tasks…" value="${esc(filter.q)}">
      <select id="task-goal"><option value="">All goals</option>${goals.map(g => `<option value="${g.id}" ${g.id === filter.goal ? 'selected' : ''}>${esc(g.title)}</option>`).join('')}</select>
      <select id="task-category"><option value="">All categories</option>${CATEGORIES.map(c => `<option value="${c.id}" ${c.id === filter.category ? 'selected' : ''}>${c.label}</option>`).join('')}</select>
      ${filter.tag ? `<span class="task-tag-chip" id="task-tag-chip">#${esc(filter.tag)} ✕</span>` : ''}
      <button class="btn btn-ghost" id="task-clear-filter">Clear</button>
      <div style="flex:1"></div>
      <button class="btn btn-ghost" id="task-view-toggle">${ic('check-square', 14)} Kanban</button>
      <button class="btn btn-accent" id="task-new">${ic('plus', 15)} New task</button>
    </div>
     <div class="matrix-grid">
      ${quadrants.map(q => {
        const lim = (limits[q.id] || MATRIX_PAGE);
        const vis = q.tasks.slice(0, lim);
        const more = q.tasks.length - vis.length;
        const moreBtn = more > 0 ? `<button class="btn btn-ghost matrix-more" data-more="${q.id}">Show ${Math.min(MATRIX_PAGE, more)} more (${more} remaining)</button>` : '';
        return `<div class="matrix-quadrant">
        <div class="matrix-quad-head" style="border-color:${q.color}">
          <span>${q.title}</span>
          <span class="matrix-quad-count" style="color:${q.color}">${q.tasks.length}</span>
        </div>
        <div class="matrix-quad-sub">${q.sub}</div>
        <div class="matrix-quad-body" data-quad="${q.id}">${vis.map(matrixTaskHTML).join('') + moreBtn || '<div class="matrix-quad-empty">Drop tasks here</div>'}</div>
      </div>`;
      }).join('')}
    </div>`;
}
