// src/vault/view.js — vault presentation: the type catalogue and the HTML fragment
// builders for a vault item.
//
// These are pure: everything they need that lives in app state is injected, following
// the same deps-object pattern as src/lib/parser.js. Event wiring stays in app.js —
// renderVault resolves state into a ctx, writes the markup this module returns, then
// binds it; openVaultModal is untouched. "Produce markup" and "wire up a view" are
// different ownership boundaries.
import { esc, fmtShort, isoDate, fileSizeStr } from '../lib/helpers.js';
import { COVER_COLORS, VAULT_URL_PLACEHOLDER } from '../lib/constants.js';
import { vaultTypeIcon, VAULT_SOFT_CAP } from './store.js';

export const VAULT_TYPES = [
  { id: 'link', label: 'Link', icon: '🔗' },
  { id: 'doc', label: 'Doc', icon: '📄' },
  { id: 'sheet', label: 'Sheet', icon: '📊' },
  { id: 'pdf', label: 'PDF', icon: '📕' },
  { id: 'image', label: 'Image', icon: '🖼️' },
  { id: 'video', label: 'Video', icon: '🎬' },
  { id: 'other', label: 'Other', icon: '📦' }
];

/**
 * @param {string} id
 * @returns {string} human label, or the id itself when unknown
 */
export function vaultTypeLabel(id){ const t=VAULT_TYPES.find(x=>x.id===id); return t? t.label : id; }

/**
 * Display host for a vault link. Non-URLs degrade to a truncated echo rather than
 * throwing, because users paste bare filenames and notes into the url field.
 * @param {string} url
 * @returns {string}
 */
export function vaultHost(url){
  try{ return new URL(url).hostname.replace(/^www\./,''); }catch(_){ return url ? url.slice(0,32) : ''; }
}

/**
 * Comparator: pinned first, then most recently updated.
 * @returns {number}
 */
export function vaultSort(a,b){ return (b.pinned?1:0)-(a.pinned?1:0) || b.updatedAt - a.updatedAt; }

/**
 * Every tag used across the given items, deduplicated and locale-sorted.
 * @param {Array<{tags?: string[]}>} [items]
 * @returns {string[]}
 */
export function vaultTagSet(items){
  const s=new Set(); (items||[]).forEach(v=>(v.tags||[]).forEach(t=>s.add(t)));
  return [...s].sort((a,b)=>a.localeCompare(b));
}

/**
 * @typedef {object} VaultViewDeps
 * @property {Array<{id:string,title:string,color:string}>} [collections] for the collection dot
 * @property {Array<{id:string,title:string}>} [tasks] to name linked tasks
 * @property {(tag:string)=>string} [tagSpan] renders one tag chip (owns tag colours)
 */

const collectionDot = (v, collections) => {
  const col = (collections||[]).find(c=>c.id===v.collectionId);
  return { col, html: col ? `<span class="vault-col-dot" style="background:${col.color}" title="${esc(col.title)}"></span>` : '' };
};

/**
 * Grid-card markup for one vault item.
 * @param {object} v vault item
 * @param {VaultViewDeps} [deps]
 * @returns {string}
 */
export function vaultCardHTML(v, deps){
  const { collections = [], tasks = [], tagSpan = () => '' } = deps || {};
  const { col, html: colDot } = collectionDot(v, collections);
  const tags = (v.tags||[]).map(t=>tagSpan(t)).join('');
  const meta = `${fmtShort(isoDate(new Date(v.updatedAt)))} · ${v.size ? fileSizeStr(v.size) : vaultTypeLabel(v.type)}${(v.linkedTaskIds||[]).length ? ` · ↗${v.linkedTaskIds.length}` : ''}`;
  const host = v.url ? esc(vaultHost(v.url)) : (v.fileName ? esc(v.fileName) : '');
  const desc = v.description ? `<div class="vault-desc">${esc(v.description).slice(0,140)}</div>` : '';
  const pinBadge = v.pinned ? '📌 ' : '';
  const cover = v.type==='image' && v.blobId ? `<div class="vault-cover vault-cover-img" data-vault-preview="${v.id}" title="Preview">🖼️</div>` : `<div class="vault-cover" style="background:${col? col.color : COVER_COLORS[(v.title.charCodeAt(0)||0)%COVER_COLORS.length]}">${vaultTypeIcon(v.type)}</div>`;
  return `<div class="vault-card" data-vault-id="${v.id}" data-vault-open="${v.id}">
    ${cover}
    <div class="vault-card-body">
      <div class="vault-card-title">${pinBadge}${esc(v.title)} ${colDot}</div>
      ${host ? `<div class="vault-card-host">${host}</div>` : ''}
      ${desc}
      <div class="vault-card-tags">${tags}</div>
      <div class="vault-card-meta muted">${meta}</div>
      <div class="vault-card-actions">
        <button class="btn btn-sm btn-ghost" data-vault-action="open" data-id="${v.id}">Open</button>
        <button class="btn btn-sm btn-ghost" data-vault-action="copy" data-id="${v.id}">Copy</button>
        <button class="btn btn-sm btn-ghost" data-vault-action="edit" data-id="${v.id}">Edit</button>
        <button class="btn btn-sm btn-ghost" data-vault-action="delete" data-id="${v.id}" style="color:var(--red)">Delete</button>
        <button class="btn btn-sm btn-ghost" data-vault-action="pin" data-id="${v.id}" title="Pin">${v.pinned? '📌':'📍'}</button>
      </div>
      ${ (v.linkedTaskIds||[]).length ? `<div class="vault-links muted" style="font-size:11px;margin-top:6px">↗ Tasks: ${(v.linkedTaskIds||[]).map(id=>{ const t=tasks.find(x=>x.id===id); return t? esc(t.title.slice(0,18)) : id.slice(0,6); }).join(', ')}</div>` : ''}
    </div>
  </div>`;
}

/**
 * List-row markup for one vault item.
 * @param {object} v vault item
 * @param {VaultViewDeps} [deps]
 * @returns {string}
 */
export function vaultRowHTML(v, deps){
  const { collections = [], tagSpan = () => '' } = deps || {};
  const { html: colDot } = collectionDot(v, collections);
  const tags = (v.tags||[]).map(t=>tagSpan(t)).join('');
  const host = v.url ? esc(vaultHost(v.url)) : '';
  return `<div class="vault-row" data-vault-id="${v.id}">
    <span class="vault-row-icon">${vaultTypeIcon(v.type)}</span>
    <span class="vault-row-title">${v.pinned?'📌 ':''}${esc(v.title)} ${colDot}</span>
    <span class="vault-row-host muted">${host}</span>
    <span class="vault-row-tags">${tags}</span>
    <span class="vault-row-meta muted">${fmtShort(isoDate(new Date(v.updatedAt)))}</span>
    <button class="btn btn-xs btn-ghost" data-vault-action="open" data-id="${v.id}">Open</button>
    <button class="btn btn-xs btn-ghost" data-vault-action="edit" data-id="${v.id}">Edit</button>
  </div>`;
}

/**
 * @typedef {object} VaultViewCtx
 * @property {object[]} items      items surviving the current filter
 * @property {object[]} allItems   every vault item, for totals and the tag list
 * @property {object[]} collections
 * @property {{q:string,type:string,tag:string,collection:string}} filter
 * @property {'grid'|'list'} viewMode
 * @property {number} quotaUsed    bytes, already summed by the caller
 * @property {object[]} [tasks]
 * @property {(tag:string)=>string} [tagSpan]
 * @property {(name:string,size:number)=>string} [ic] icon renderer
 */

/**
 * The whole vault view as markup. Pure: the caller resolves state and hands it over,
 * then owns setting innerHTML and binding the result. Event wiring stays in app.js —
 * it reaches into a dozen app closures, which is a different ownership boundary.
 * @param {VaultViewCtx} ctx
 * @returns {string}
 */
export function vaultViewHTML(ctx) {
  const {
    items = [], allItems = [], collections = [], viewMode = 'grid',
    quotaUsed = 0, tasks = [], tagSpan = () => '', ic = () => '',
  } = ctx || {};
  const filter = (ctx && ctx.filter) || {};
  const deps = { collections, tasks, tagSpan };
  const allTags = vaultTagSet(allItems);
  const total = allItems.length;
  const typeCounts = VAULT_TYPES.map(t=>({id:t.id,label:t.label,icon:t.icon,count: allItems.filter(v=>v.type===t.id).length}));
  const selectedType = filter.type || '';
  const selectedTag = filter.tag || '';
  const selectedCol = filter.collection || '';
  const q = filter.q || '';
  const colChips = [`<button class="vault-chip ${!selectedCol?'active':''}" data-vault-col="">All</button>`, `<button class="vault-chip ${selectedCol==='__none'?'active':''}" data-vault-col="__none">Unsorted</button>`, ...collections.map(c=>`<button class="vault-chip ${selectedCol===c.id?'active':''}" data-vault-col="${c.id}" style="${selectedCol===c.id? `background:${c.color}22;border-color:${c.color}44;color:${c.color}`:''}"><span class="vault-col-dot" style="background:${c.color}"></span> ${esc(c.title)}</button>`) ].join('');
  const typeChips = [`<button class="vault-chip ${!selectedType?'active':''}" data-vault-type="">All</button>`, ...typeCounts.map(tc=>`<button class="vault-chip ${selectedType===tc.id?'active':''}" data-vault-type="${tc.id}">${tc.icon} ${tc.label} <span class="vault-chip-count">${tc.count}</span></button>`)].join('');
  const tagOpts = ['<option value="">All tags</option>', ...allTags.map(t=>`<option value="${esc(t)}" ${t===selectedTag?'selected':''}>#${esc(t)}</option>`)].join('');
  const colOpts = ['<option value="">All collections</option>', '<option value="__none">Unsorted</option>', ...collections.map(c=>`<option value="${c.id}" ${c.id===selectedCol?'selected':''}>${esc(c.title)}</option>`)].join('');
  const grid = viewMode==='grid'
    ? `<div class="vault-grid">${items.map(v=>vaultCardHTML(v, deps)).join('') || `<div class="empty-state" style="grid-column:1/-1"><div class="es-icon">🔐</div>No vault items match your filters<button class="btn btn-sm btn-ghost" id="vault-clear-filters" style="margin-top:8px">Clear filters</button></div>`}</div>`
    : `<div class="vault-list">${items.map(v=>vaultRowHTML(v, deps)).join('') || `<div class="empty-state"><div class="es-icon">🔐</div>No vault items match</div>`}</div>`;
  return `
    <div class="vault-toolbar">
      <input type="text" class="search-input" id="vault-q" placeholder="Search vault…" value="${esc(q)}" style="min-width:180px">
      <select id="vault-type">${['<option value="">All types</option>', ...VAULT_TYPES.map(t=>`<option value="${t.id}" ${t.id===selectedType?'selected':''}>${t.icon} ${t.label}</option>`)].join('')}</select>
      <select id="vault-tag">${tagOpts}</select>
      <select id="vault-col">${colOpts}</select>
      <button class="btn btn-sm btn-ghost" id="vault-clear">Clear</button>
      <div style="flex:1"></div>
      <div class="vault-view-toggle">
        <button class="btn btn-sm ${viewMode==='grid'?'btn-accent':''}" data-vault-view="grid">Grid</button>
        <button class="btn btn-sm ${viewMode==='list'?'btn-accent':''}" data-vault-view="list">List</button>
      </div>
      <button class="btn btn-accent" id="vault-add">${ic('plus',14)} Add link</button>
      <label class="btn btn-ghost" style="cursor:pointer">⬆ Upload <input type="file" id="vault-upload" class="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp,.mp4,.webm,.txt,.md,.csv"></label>
    </div>
    <div class="vault-collections-bar">
      <div class="vault-chips" id="vault-col-chips">${colChips}</div>
      <button class="btn btn-sm btn-ghost" id="vault-add-col">+ New collection</button>
    </div>
    <div class="vault-type-bar" style="display:flex;gap:6px;flex-wrap:wrap;margin:10px 0">${typeChips}</div>
    <div class="vault-meta muted" style="font-size:12px;margin:8px 0">${items.length} of ${total} items${q? ` for "${esc(q)}"` : ''} · ${quotaUsed? fileSizeStr(quotaUsed) : '0 B'} used${quotaUsed>VAULT_SOFT_CAP? ' · ⚠️ near quota':''}</div>
    <div class="vault-drop" id="vault-drop">${grid}</div>
    ${!total? `<div class="card" style="margin-top:14px"><div class="empty-state"><div class="es-icon">📦</div>No vault items — drop a PDF or paste a link<div style="margin-top:10px;display:flex;gap:8px;justify-content:center"><button class="btn btn-accent btn-sm" id="vault-empty-add">Add link</button><label class="btn btn-ghost btn-sm" style="cursor:pointer">Upload file <input type="file" id="vault-empty-upload" class="hidden"></label></div></div></div>`:''}
  `;
}

/**
 * Dashboard widget: type counts plus the six most relevant items.
 * @param {object[]} allItems every vault item
 * @param {boolean} [isPinned=true]
 * @returns {string}
 */
export function vaultWidgetHTML(allItems, isPinned = true) {
  const top = (allItems||[]).slice().sort(vaultSort).slice(0,6);
  const counts = { link:0, doc:0, sheet:0, pdf:0, image:0, video:0, other:0, pinned:0 };
  allItems.forEach(v=>{ if(counts[v.type]!==undefined) counts[v.type]++; else counts.other++; if(v.pinned) counts.pinned++; });
  const total = allItems.length;
  const headerCounts = total ? `${total} items · ${counts.link} links · ${counts.pdf} PDFs · ${counts.sheet} Sheets · ${counts.pinned} pinned` : 'No items yet';
  const summaryHTML = `<div class="vault-widget-summary muted" style="font-size:11px;margin-bottom:8px">${headerCounts}</div>`;
  const body = total ? top.map(v=>`<div class="vault-mini" data-vault-mini="${v.id}"><span>${vaultTypeIcon(v.type)}</span><span class="vault-mini-title">${esc(v.title)}</span><span class="muted" style="font-size:11px">${esc(vaultHost(v.url||''))}</span><span class="tag">${esc(v.type)}</span>${(v.linkedTaskIds||[]).length?`<span class="muted">↗${v.linkedTaskIds.length}</span>`:''}</div>`).join('') : `<div class="empty-state" style="padding:18px"><div class="es-icon">🔐</div>No vault items — drop a PDF or paste a link<div style="margin-top:10px;display:flex;gap:8px;justify-content:center"><button class="btn btn-sm btn-accent" id="vault-widget-add">+ Add link</button><label class="btn btn-sm btn-ghost" style="cursor:pointer">⬆ Upload <input type="file" id="vault-widget-upload" class="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.mp4,.webm"></label></div><div class="vault-drop-zone muted" style="margin-top:10px;border:1px dashed var(--border);border-radius:8px;padding:10px" data-vault-drop>Drop file here</div></div>`;
  const foldClass = !isPinned ? 'dw-folded' : '';
  return `<div class="card ${foldClass}" data-dw="vault">
    <h3 class="card-title dw-head"><span>🔐 Personal Vault</span><a class="link-btn" href="#vault">Open Vault →</a><button class="pin-toggle btn-icon ${isPinned ? 'pinned' : ''}" data-dw-pin="vault" aria-pressed="${isPinned ? 'true' : 'false'}" title="Pin widget">📌</button></h3>
    <div class="dw-body vault-widget-body">${summaryHTML}${body}</div>
  </div>`;
}

/**
 * The add/edit vault item form. Pure: every list it renders is handed in, and the
 * caller opens the modal and binds it. The pickers are capped at the same limits
 * app.js used, so a large workspace cannot render thousands of checkboxes.
 * @param {object} v the item being edited, or a blank one
 * @param {object} [ctx] { isEdit, pendingFile, collections, tasks, goals, notes, students, ic }
 * @returns {string}
 */
export function vaultModalHTML(v, ctx) {
  const {
    isEdit = false, pendingFile = null, collections = [],
    tasks = [], goals = [], notes = [], students = [], ic = () => '',
  } = ctx || {};
  const colOpts=['<option value="">— None —</option>', ...collections.map(c=>`<option value="${c.id}" ${c.id===v.collectionId?'selected':''}>${esc(c.title)}</option>`)].join('');
  const typeOpts=VAULT_TYPES.map(t=>`<option value="${t.id}" ${t.id===v.type?'selected':''}>${t.icon} ${t.label}</option>`).join('');
  const taskOpts = tasks.slice(0,80).map(t=>`<label class="vault-link-check"><input type="checkbox" value="${t.id}" ${ (v.linkedTaskIds||[]).includes(t.id)?'checked':''}> ${esc(t.title.slice(0,40))}</label>`).join('');
  const goalOpts = goals.slice(0,30).map(g=>`<label class="vault-link-check"><input type="checkbox" value="${g.id}" ${ (v.linkedGoalIds||[]).includes(g.id)?'checked':''}> ${esc(g.title.slice(0,40))}</label>`).join('');
  const noteOpts = notes.slice(0,30).map(n=>`<label class="vault-link-check"><input type="checkbox" value="${n.id}" ${ (v.linkedNoteIds||[]).includes(n.id)?'checked':''}> ${esc((n.title||'Untitled').slice(0,40))}</label>`).join('');
  const studentOpts = students.slice(0,50).map(s=>`<label class="vault-link-check"><input type="checkbox" value="${s.id}" ${ (v.linkedStudentIds||[]).includes(s.id)?'checked':''}> 🎓 ${esc(s.name)}</label>`).join('');
  return `<div class="modal" style="max-width:560px">
    <div class="modal-head"><h3>${isEdit?'Edit vault item':'New vault item'}</h3><button class="btn-icon" data-close-modal>${ic('x',16)}</button></div>
    <div class="modal-body">
      <div class="field"><label for="vm-title" class="field-label">Title *</label><input id="vm-title" type="text" value="${esc(v.title)}" placeholder="Design doc, invoice, tutorial…"></div>
      <div class="field"><label for="vm-url" class="field-label">URL (https://) — optional if file attached</label><input id="vm-url" type="url" value="${esc(v.url)}" placeholder="${VAULT_URL_PLACEHOLDER}"></div>
      <div class="field"><label for="vm-desc" class="field-label">Description</label><textarea id="vm-desc" rows="2" placeholder="What is this?">${esc(v.description||'')}</textarea></div>
      <div class="field-row">
        <div class="field"><label for="vm-type" class="field-label">Type</label><select id="vm-type">${typeOpts}</select></div>
        <div class="field"><label for="vm-col" class="field-label">Collection</label><select id="vm-col">${colOpts}</select></div>
      </div>
      <div class="field"><label for="vm-tags" class="field-label">Tags (comma separated)</label><input id="vm-tags" type="text" value="${esc((v.tags||[]).join(', '))}" placeholder="work, design, invoice"></div>
      <div class="field"><label class="field-label" id="vm-file-label">File (optional, 10MB max, plain blob)</label>
        <div class="vault-file-drop" id="vm-drop" role="group" aria-labelledby="vm-file-label" style="border:1px dashed var(--border);border-radius:10px;padding:12px;text-align:center;background:var(--surface2)">
          <div id="vm-file-info" class="muted" style="font-size:12.5px">${pendingFile? esc(pendingFile.name)+' · '+fileSizeStr(pendingFile.size) : (v.fileName? esc(v.fileName)+' · '+fileSizeStr(v.size||0) : 'Drop file here or choose')}</div>
          <label class="btn btn-sm btn-ghost" style="margin-top:8px;cursor:pointer">📎 Choose file<input type="file" id="vm-file" class="hidden" onchange="window.handleVmFileChange && window.handleVmFileChange(this)" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp,.txt,.md,.csv,.mp4,.webm"></label>
          ${v.blobId? `<button class="btn btn-sm btn-ghost" id="vm-file-clear" style="margin-left:6px">✕ Remove</button>` : ''}
        </div>
        <div class="muted" style="font-size:11px;margin-top:6px">Blobs stay IDB-only · never in JSON snapshot · quota 100MB soft cap · large >10MB stays link-only</div>
      </div>
      <div class="field"><label class="field-label" id="vm-tasks-label">Linked tasks</label><div class="vault-link-grid" id="vm-tasks" role="group" aria-labelledby="vm-tasks-label">${taskOpts||'<span class="muted" style="font-size:12px">No tasks</span>'}</div></div>
      <div class="field"><label class="field-label" id="vm-goals-label">Linked goals</label><div class="vault-link-grid" id="vm-goals" role="group" aria-labelledby="vm-goals-label">${goalOpts||'<span class="muted" style="font-size:12px">No goals</span>'}</div></div>
      <div class="field"><label class="field-label" id="vm-notes-label">Linked notes</label><div class="vault-link-grid" id="vm-notes" role="group" aria-labelledby="vm-notes-label">${noteOpts||'<span class="muted" style="font-size:12px">No notes</span>'}</div></div>
      <div class="field"><label class="field-label" id="vm-students-label">Linked students</label><div class="vault-link-grid" id="vm-students" role="group" aria-labelledby="vm-students-label">${studentOpts||'<span class="muted" style="font-size:12px">No students</span>'}</div></div>
      <div class="field"><label style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600"><input type="checkbox" id="vm-pinned" ${v.pinned?'checked':''}> 📌 Pinned (shows first in Vault & Dashboard)</label></div>
    </div>
    <div class="modal-foot">
      ${isEdit? `<button class="btn btn-danger" id="vm-delete">Delete</button>` : ''}
      <div style="flex:1"></div>
      <button class="btn btn-ghost" data-close-modal>Cancel</button>
      <button class="btn btn-accent" id="vm-save">Save</button>
    </div>
  </div>`;
}

/**
 * Checkbox list of vault items, for linking one to a task/goal/note.
 * @param {string[]} selectedIds
 * @param {object[]} [items] already sorted by the caller, or sorted here
 * @returns {string}
*/
export function vaultLinkPickerHTML(selectedIds, items){
  const sorted=(items||[]).slice().sort(vaultSort);
  if(!sorted.length) return '<div class="muted" style="font-size:12px">No vault items — <a href="#vault" data-close-modal>create one</a></div>';
  return `<div class="vault-picker">${sorted.map(v=>`<label class="vault-picker-row"><input type="checkbox" value="${v.id}" ${selectedIds.includes(v.id)?'checked':''}> <span>${vaultTypeIcon(v.type)}</span> <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(v.title)}</span> <span class="muted" style="font-size:11px">${esc(v.type)}</span></label>`).join('')}</div>`;
}
