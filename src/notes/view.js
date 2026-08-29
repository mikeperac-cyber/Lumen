// src/notes/view.js — note presentation. Pure builders following the vault/tasks
// pattern: everything from app state is injected. `renderMd` and `tagSpan` are handed
// in because their implementations (markdown rendering, tag colour) live elsewhere.
import { esc, fmtWhen } from '../lib/helpers.js';

/**
 * List-row markup for one note.
 * @param {object} n note
 * @param {{selectedId?: string, tagSpan?: (t:string)=>string, ic?: (name:string,size:number)=>string}} [ctx]
 * @returns {string}
 */
export function noteItemHTML(n, ctx) {
  const { selectedId = '', tagSpan = () => '', ic = () => '' } = ctx || {};
const titleText = esc(n.title) || (n.audioId ? 'Voice memo' : 'Untitled');
return `<div class="note-item ${n.id === selectedId ? 'active' : ''}" data-note="${n.id}">
  <div class="ni-title">
    ${n.pinned ? ic('pin', 13) : ''}
    ${n.audioId ? '<span class="ni-voice-icon">🎙️</span>' : ''}
    <span class="ni-title-text">${titleText}</span>
  </div>
  ${n.content ? `<div class="ni-snippet">${esc(n.content.replace(/[#*`>_-]/g, '').slice(0, 90))}</div>` : ''}
  <div class="ni-meta">
    <span class="ni-date">${fmtWhen(n.updatedAt)}</span>
    ${n.student ? `<span class="badge" style="background:rgba(81,141,191,.15);color:#518DBF;border:1px solid rgba(81,141,191,.3);padding:0 5px;border-radius:8px;font-size:10px">🎓 ${esc(n.student)}</span>` : ''}
    ${(n.tags || []).slice(0, 3).map(t => tagSpan(t)).join('')}
    <button class="btn-icon pin-btn ${n.pinned ? 'on' : ''}" data-pin="${n.id}" title="${n.pinned ? 'Unpin' : 'Pin'}">${ic('pin', 13)}</button>
  </div>
</div>`;
}

/**
 * The note editor pane: title, tag/student row, and either a raw textarea or
 * rendered markdown, depending on `preview`.
 * @param {object} note
 * @param {{preview?: boolean, students?: object[], renderMd?: (md:string)=>string, tagSpan?: (t:string)=>string, ic?: (name:string,size:number)=>string}} [ctx]
 * @returns {string}
 */
export function noteEditorHTML(note, ctx) {
  const { preview = false, students = [], renderMd = () => '', tagSpan = () => '', ic = () => '' } = ctx || {};
return `<div class="note-editor">
  <div class="note-editor-head">
    <input id="ne-title" type="text" value="${esc(note.title)}" placeholder="Untitled note">
    <button class="btn btn-sm btn-ghost" id="ne-extract" title="Extract checklist items into Kanban tasks">${ic('check-square', 13)} Extract Tasks</button>
    <button class="btn btn-sm btn-ghost" id="ne-vault-insert" title="Insert vault link">🔗 Vault</button>
    <button class="btn btn-sm btn-ai" id="ne-ai-polish" title="Polish note and generate bullet summary with AI">✨ Polish</button>
    <button class="btn btn-sm btn-ghost" id="ne-preview">${preview ? 'Edit' : 'Preview'}</button>
    <button class="btn-icon ${note.pinned ? 'pin-btn on' : 'pin-btn'}" id="ne-pin" title="Pin">${ic('pin', 15)}</button>
    <button class="btn-icon" id="ne-del" title="Delete note" style="color:var(--red)">${ic('trash', 15)}</button>
  </div>
  <div class="note-tags-row">
    ${(note.tags || []).map(t => tagSpan(t)).join('')}
    <select id="ne-student" style="font-size:12px;padding:3px 8px;border-radius:6px;width:auto">
      <option value="">— No Student / General —</option>
      ${students.map(s => `<option value="${esc(s.name)}" ${s.name === (note.student || '') ? 'selected' : ''}>🎓 ${esc(s.name)}</option>`).join('')}
    </select>
    <input id="ne-tags" type="text" value="${esc((note.tags || []).join(', '))}" placeholder="tags, comma separated">
  </div>
  ${note.audioId ? `<div class="audio-box"><span>🎙️</span><span class="audio-title">Voice memo attached</span><button class="btn btn-sm btn-ghost" id="ne-audio-play">${ic('play', 13)} Play</button></div>` : ''}
  <div class="note-editor-body">
    ${preview
      ? `<div class="note-preview">${renderMd(note.content)}</div>`
      : `<textarea class="note-textarea" id="ne-content" placeholder="Write your thoughts… Use - [ ] for interactive checklists">${esc(note.content)}</textarea>`}
  </div>
</div>`;
}
