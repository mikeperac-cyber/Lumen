/* ============ Eisenhower Matrix View ============ */
function renderMatrix() {
  const sig = JSON.stringify(taskFilter);
  if (sig !== _matrixFilterSig) { _matrixFilterSig = sig; _matrixVisible = { do: MATRIX_PAGE, schedule: MATRIX_PAGE, delegate: MATRIX_PAGE, eliminate: MATRIX_PAGE }; }
  const filtered = state.tasks.filter(t => {
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
  function isUrgent(t) {
    if (!t.due) return false;
    const diff = (new Date(t.due + 'T00:00:00') - new Date()) / 86400000;
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
  // per-quadrant window stay here, with the filter state they depend on.
  viewRoot().innerHTML = TasksView.matrixHTML({
    tasksByQuadrant: { do: q1, schedule: q2, delegate: q3, eliminate: q4 },
    limits: _matrixVisible, goals: state.goals, filter: taskFilter, ic,
  });
  // Bind
  $('#task-view-toggle').addEventListener('click', () => { taskViewMode = 'kanban'; renderTasks(); });
  bindFilterInput('#task-q', 120, v => { taskFilter.q = v; renderMatrix(); });
  $('#task-goal').addEventListener('change', e => { taskFilter.goal = e.target.value; renderMatrix(); });
  $('#task-category').addEventListener('change', e => { taskFilter.category = e.target.value; renderMatrix(); });
  const tc = $('#task-tag-chip');
  if (tc) tc.addEventListener('click', () => { taskFilter.tag = ''; renderMatrix(); });
  $('#task-clear-filter').addEventListener('click', () => { taskFilter = { q: '', goal: '', tag: '', category: '' }; renderMatrix(); });
  $('#task-new').addEventListener('click', () => openTaskModal());
  $$('[data-more]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); matrixShowMore(b.dataset.more); }));
  // IntersectionObserver virtualization: auto-expand when 'Show more' scrolls into view (keeps drag handlers intact)
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(ent => { if (ent.isIntersecting) { const id = ent.target.dataset.more; if (id) { io.unobserve(ent.target); matrixShowMore(id); } } });
    }, { root: null, rootMargin: '200px' });
    $$('[data-more]').forEach(b => io.observe(b));
  }
  $$('.matrix-task').forEach(el => el.addEventListener('click', e => {
    if (e.target.closest('[data-complete]')) return;
    const t = state.tasks.find(x => x.id === el.dataset.id);
    if (t) openTaskModal(t);
  }));
  $$('[data-complete]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    const t = state.tasks.find(x => x.id === b.dataset.complete);
    if (!t) return;
    captureUndo('Complete task');
    const { wasDone, kr } = toggleTaskDone(t);
    save(); renderMatrix();
    if (kr) goalProgressToast(t, wasDone, kr);
  }));
  // ---- Drag & drop for matrix ----
  let draggedTaskId = null;
  $$('.matrix-task[draggable]', viewRoot()).forEach(el => {
    el.addEventListener('dragstart', e => {
      draggedTaskId = el.dataset.id;
      el.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', el.dataset.id);
    });
    el.addEventListener('dragend', () => {
      draggedTaskId = null;
      el.classList.remove('dragging');
      $$('.matrix-quad-body.drag-over', viewRoot()).forEach(z => z.classList.remove('drag-over'));
    });
  });
  $$('.matrix-quad-body', viewRoot()).forEach(zone => {
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
      const task = state.tasks.find(t => t.id === taskId);
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
        // Move in state: remove from tasks array, insert at the right position
        captureUndo('Reorder matrix');
        const taskIdx = state.tasks.indexOf(task);
        state.tasks.splice(taskIdx, 1);
        if (afterEl) {
          const afterId = afterEl.dataset.id;
          const afterIdx = state.tasks.findIndex(t => t.id === afterId);
          state.tasks.splice(afterIdx, 0, task);
        } else {
          state.tasks.push(task);
        }
        save(); renderMatrix();
        return;
      }
      // Move to a different quadrant: change priority or due date
      captureUndo('Move between quadrants');
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
      save(); renderMatrix();
      toast('Task moved to ' + (quadrants.find(q => q.id === targetQuad) || {}).title);
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

function krOptionsHTML(goalId, selected) { return TasksView.krOptionsHTML(goalId, selected, state.goals); }
function openTaskModal(task, presetStatus) {
  const t = task || { title: '', desc: '', status: presetStatus || 'today', priority: 'med', due: '', startDate: '', coverColor: '', coverImage: '', members: [], comments: [], attachments: [], archived:false, watchers:[], goalId: '', tags: [], category: '', recurrence: '', subtasks: [] };
  if (!t.comments) t.comments = []; if (!t.attachments) t.attachments = []; if (!t.members) t.members = [];
  // Form markup is owned by src/tasks/view.js; this resolves state into it, opens the
  // modal, and owns the ~360 lines of binding below.
  openModal(TasksView.taskModalHTML(t, {
    isEdit: !!task, lists: getKanbanLists(), goals: state.goals,
    students: getStudentsList(), vaultItems: state.vaultItems,
    days: DAYS, periods: getPeriods(),
    vaultPickerHTML: vaultLinkPickerHTML(t.vaultIds || []), ic,
  }));
  $('#f-goal').addEventListener('change', e => {
    const krSel = $('#f-kr');
    if (krSel) krSel.innerHTML = krOptionsHTML(e.target.value, '');
  });
  // Period picker → auto-fill start/end times from dynamic intervals
  const schedPeriodEl = $('#f-sched-period');
  if (schedPeriodEl) schedPeriodEl.addEventListener('change', e => {
    const pid = e.target.value;
    const p = getPeriods().find(x=>x.id===pid);
    const st = $('#f-start-time'), en = $('#f-end-time');
    if (p) { if (st) st.value = p.start || ''; if (en) en.value = p.end || ''; }
    else { if (st) st.value = ''; if (en) en.value = ''; }
  });
  // Also sync when scheduleDay changes? keep times from period
  $('#f-dup')?.addEventListener('click', () => { if (task) { duplicateTaskById(task.id); closeModal(); } });
  $('#f-share')?.addEventListener('click', () => { if (task) shareText(task.title, (task.desc || '') + (task.due ? '\nDue: ' + task.due : '')); });
  // Trello cover picker
  let pendingCoverColor = t.coverColor || '';
  let pendingCoverImage = t.coverImage || '';
  $$('[data-cover]').forEach(b=>b.addEventListener('click', ()=>{ $$('[data-cover]').forEach(x=>x.classList.remove('active')); b.classList.add('active'); pendingCoverColor = b.dataset.cover; if (pendingCoverColor==='#00000000') pendingCoverColor=''; }));
  $('#f-cover-file')?.addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    if (f.size > 2*1024*1024) { toast('Image too large (max 2MB)', 'error'); return; }
    const reader = new FileReader(); reader.onload = () => { pendingCoverImage = reader.result; const prev = document.querySelector('.cover-preview'); if (prev) prev.innerHTML = `<img src="${pendingCoverImage}" style="max-width:100%;max-height:120px;border-radius:8px;border:1px solid var(--border)">`; else document.getElementById('f-cover-picker').insertAdjacentHTML('afterend', `<div class="cover-preview" style="margin-top:8px"><img src="${pendingCoverImage}" style="max-width:100%;max-height:120px;border-radius:8px"></div>`); toast('Cover image ready — save to keep'); }; reader.readAsDataURL(f);
  });
  $('#f-cover-clear')?.addEventListener('click', ()=>{ pendingCoverImage=''; pendingCoverColor=''; $$('[data-cover]').forEach(x=>x.classList.remove('active')); const prev=document.querySelector('.cover-preview'); if(prev) prev.remove(); });
  // Watch toggle
  $('#f-watch-toggle')?.addEventListener('click', ()=>{ const isWatched = (t.watchers||[]).includes('me'); if (!t.watchers) t.watchers=[]; if(isWatched) t.watchers = t.watchers.filter(x=>x!=='me'); else t.watchers.push('me'); $('#f-watch-toggle').textContent = t.watchers.includes('me') ? '👁 Watching' : '👁 Watch'; toast(t.watchers.includes('me') ? 'Watching' : 'Unwatched'); });
  // Archive toggle
  $('#f-archive-toggle')?.addEventListener('click', ()=>{ t.archived = !t.archived; $('#f-archive-toggle').textContent = t.archived ? '↩ Restore' : '🗄 Archive'; toast(t.archived ? 'Will archive on save' : 'Will restore on save'); });
  // Move card (Trello)
  $('#f-move-card')?.addEventListener('click', ()=>{
    const lists = getKanbanLists();
    openModal(`<div class="modal" style="max-width:340px"><div class="modal-head"><h3>Move card</h3><button class="btn-icon" data-close-modal>${ic('x',16)}</button></div><div class="modal-body"><div class="field"><label for="move-list" class="field-label">List</label><select id="move-list">${lists.map(l=>`<option value="${l.id}" ${l.id===t.status?'selected':''}>${esc(l.title)}</option>`).join('')}</select></div><div class="field"><label for="move-pos" class="field-label">Position</label><select id="move-pos"><option value="top">Top</option><option value="bottom" selected>Bottom</option></select></div></div><div class="modal-foot"><button class="btn btn-ghost" data-close-modal>Cancel</button><button class="btn btn-accent" id="move-confirm">Move</button></div></div>`);
    $('#move-confirm')?.addEventListener('click', ()=>{
      const nl = $('#move-list').value; const pos = $('#move-pos').value;
      if (nl && task) { captureUndo('Move card'); task.status = nl; task.updatedAt=Date.now(); if(pos==='top'){ const idx=state.tasks.indexOf(task); state.tasks.splice(idx,1); state.tasks.unshift(task); } save(); renderView(); closeModal(); openTaskModal(task); toast('Moved to '+ (lists.find(l=>l.id===nl)?.title||nl)); }
    });
  });
  $('#f-copy-card')?.addEventListener('click', ()=>{ if(task) { duplicateTaskById(task.id); } });
  // Comments
  const renderComments = ()=>{ const list=$('#f-comments-list'); if(!list) return; list.innerHTML = (t.comments||[]).slice().reverse().map(c=>`<div class="comment-row" style="padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--surface2)"><div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:12px">${esc(c.author||'You')}</b><span class="muted" style="font-size:11px">${timeAgo(c.at)} <button class="btn-icon" data-comment-del="${c.id}" title="Delete">${ic('x',12)}</button></span></div><div style="font-size:13px;margin-top:4px;white-space:pre-wrap">${esc(c.text)}</div></div>`).join('') || '<div class="muted" style="font-size:12px">No comments yet — ask a question or leave a note.</div>'; list.querySelectorAll('[data-comment-del]').forEach(b=>b.addEventListener('click', ()=>{ t.comments = (t.comments||[]).filter(x=>x.id!==b.dataset.commentDel); renderComments(); toast('Comment deleted'); })); };
  $('#f-comment-add')?.addEventListener('click', ()=>{ const inp=$('#f-comment-input'); const txt=inp.value.trim(); if(!txt) return; if(!t.comments) t.comments=[]; t.comments.push({id:uid(), text:txt, at:Date.now(), author:'You'}); inp.value=''; renderComments(); });
  $('#f-comment-input')?.addEventListener('keydown', e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); $('#f-comment-add').click(); } });
  // Attachments
  const renderAttach = ()=>{ const list=$('#f-attachments-list'); if(!list) return; list.innerHTML = (t.attachments||[]).map(a=>`<div class="attach-row" style="display:flex;align-items:center;gap:8px;padding:6px 8px;border:1px solid var(--border);border-radius:8px"><span>${fileIcon(a.name)}</span><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis">${esc(a.name)} <span class="muted" style="font-size:11px">${fileSizeStr(a.size)} · ${a.mime||''}</span></span><button class="btn btn-xs btn-ghost" data-attach-dl="${a.id}">⬇</button><button class="btn btn-xs btn-ghost" data-attach-del="${a.id}">✕</button></div>`).join('') || '<div class="muted" style="font-size:12px">No files yet — attach images, PDFs, etc.</div>';
    list.querySelectorAll('[data-attach-del]').forEach(b=>b.addEventListener('click', async ()=>{ const id=b.dataset.attachDel; const att=(t.attachments||[]).find(x=>x.id===id); if(att && att.blobId) try{ await blobDelete(att.blobId); }catch(_){} t.attachments=(t.attachments||[]).filter(x=>x.id!==id); renderAttach(); }));
    list.querySelectorAll('[data-attach-dl]').forEach(b=>b.addEventListener('click', async ()=>{ const att=(t.attachments||[]).find(x=>x.id===b.dataset.attachDl); if(!att) return; try{ const blob=await blobGet(att.blobId); if(!blob){ toast('File not found', 'error'); return; } const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=att.name; a.click(); setTimeout(()=>URL.revokeObjectURL(url),3000); }catch(_){ toast('Download failed','error'); } }));
  };
  $('#f-attach-file')?.addEventListener('change', async e=>{
    const files=[...e.target.files]; if(!files.length) return;
    if(!t.attachments) t.attachments=[];
    for(const f of files){
      if(f.size>5*1024*1024){ toast(f.name+' too large (5MB max)','error'); continue; }
      const blobId='attach-'+uid();
      try{ await blobPut(blobId, f); t.attachments.push({id:uid(), name:f.name, size:f.size, mime:f.type, blobId}); }catch(_){ toast('Save failed','error'); }
    }
    renderAttach(); e.target.value='';
  });
  // Vault picker: create new vault item inline + choose from vault storage
  $('#f-vault-new')?.addEventListener('click', ()=>{ closeModal(); openVaultModal(); setTimeout(()=> openTaskModal(task, presetStatus), 400); });
  $('#f-vault-attach')?.addEventListener('change', async e=>{
    const f=e.target.files[0]; if(!f) return;
    if(f.size>VAULT_MAX_FILE){ toast('File too large — 10MB max','error'); e.target.value=''; return; }
    // create vault item from file then link
    const blobId='vault-'+uid(); try{ await vaultBlobPut(blobId, f); }catch(_){ toast('Save failed','error'); return; }
    const vItem={ id: uid(), title: f.name.replace(/\.[^.]+$/,''), url:'', description:'Attached via task', type: vaultGuessType(f.name,f.type), tags:[], collectionId:null, fileName:f.name, mime:f.type, size:f.size, blobId, linkedTaskIds: task? [task.id] : [], linkedGoalIds:[], linkedNoteIds:[], linkedStudentIds:[], pinned:false, createdAt:Date.now(), updatedAt:Date.now() };
    state.vaultItems.unshift(vItem); if(!state._vaultItemsMeta) state._vaultItemsMeta={}; state._vaultItemsMeta[vItem.id]=Date.now();
    if(!t.vaultIds) t.vaultIds=[]; t.vaultIds.push(vItem.id);
    vItem.linkedTaskIds=[task?.id].filter(Boolean);
    // also copy as attachment for convenience
    try{ const blob=await vaultBlobGet(blobId); if(blob){ const attachId='attach-'+uid(); await blobPut(attachId, blob); if(!t.attachments) t.attachments=[]; t.attachments.push({id:uid(), name:f.name, size:f.size, mime:f.type, blobId:attachId}); } }catch(_){}
    toast('Vault file created & attached ✅'); const picker=$('#f-vault-picker'); if(picker) picker.innerHTML=vaultLinkPickerHTML(t.vaultIds||[]);
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
    const container = $('#f-subtasks');
    if (!container) return;
    const idx = container.children.length;
    const row = document.createElement('div');
    row.className = 'subtask-row';
    row.dataset.stIdx = idx;
    row.innerHTML = `<input type="checkbox" class="st-check" ${done ? 'checked' : ''} data-st-check="${idx}"><input type="text" class="st-input" value="${esc(text)}" placeholder="Subtask…" data-st-text="${idx}"><button class="btn-icon st-del" data-st-del="${idx}" title="Remove">${ic('x', 14)}</button>`;
    container.appendChild(row);
    bindSubtaskRow(row);
    if (autoFocus) row.querySelector('.st-input')?.focus();
  }
  $$('.subtask-row').forEach(row => bindSubtaskRow(row));
  $('#f-add-subtask').addEventListener('click', () => addSubtaskRow('', false, true));

  // AI Task Breakdown
  const aiBtn = $('#f-ai-subtasks');
  if (aiBtn) {
    aiBtn.addEventListener('click', async () => {
      const taskTitle = $('#f-title').value.trim();
      const taskDesc = $('#f-desc').value.trim();
      if (!taskTitle) {
        toast('Enter a task title first', 'error');
        $('#f-title').focus();
        return;
      }
      if (!state.settings.geminiApiKey) {
        toast('Add your Gemini API key in Settings → AI Assistant 🤖', 'error');
        return;
      }
      aiBtn.disabled = true;
      aiBtn.textContent = '✨ Breaking down…';
      try {
        const prompt = `Break down this task into 3 to 5 clear, concise, actionable subtasks. Task: "${taskTitle}". Details: "${taskDesc}". Return ONLY a valid JSON array of short action strings, for example: ["Step 1", "Step 2", "Step 3"]. No extra text, no markdown.`;
        const res = await callGemini(prompt, 'You are a task planning assistant. Output ONLY valid JSON array.');
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
          toast(`✨ Added ${steps.length} subtasks with AI!`, 'success');
        } else {
          toast('Could not parse AI response', 'error');
        }
      } catch (err) {
        toast(err.message === 'NO_API_KEY' ? 'Set your Gemini API key in Settings' : `AI error: ${err.message}`, 'error');
      } finally {
        aiBtn.disabled = false;
        aiBtn.textContent = '✨ AI Breakdown';
      }
    });
  }
  // Save handler
  $('#f-save').addEventListener('click', () => {
    const title = $('#f-title').value.trim();
    if (!title) { toast('Give the task a title', 'error'); return; }
    // Collect subtasks
    const subtasks = [];
    $$('.subtask-row').forEach(row => {
      const text = row.querySelector('.st-input').value.trim();
      const done = row.querySelector('.st-check').checked;
      if (text) subtasks.push({ text, done, id: uid() });
    });
    const data = {
      title,
      desc: $('#f-desc').value.trim(),
      status: $('#f-status').value,
      priority: $('#f-prio').value,
      student: $('#f-student')?.value || undefined,
      due: $('#f-due').value,
      startDate: $('#f-start')?.value || '',
      coverColor: pendingCoverColor,
      coverImage: pendingCoverImage,
      members: ($('#f-members')?.value || '').split(',').map(s=>s.trim()).filter(Boolean),
      comments: t.comments || [],
      attachments: t.attachments || [],
      archived: !!t.archived,
      watchers: t.watchers || [],
      category: $('#f-category').value,
      recurrence: $('#f-recurrence').value,
      goalId: $('#f-goal').value,
      scheduleDay: $('#f-sched-day').value,
      schedulePeriod: $('#f-sched-period').value,
      startTime: $('#f-start-time').value || '',
      endTime: $('#f-end-time').value || '',
      tags: $('#f-tags').value.split(',').map(s => s.trim()).filter(Boolean),
      vaultIds: [...document.querySelectorAll('#f-vault-picker input:checked')].map(i=>i.value),
      subtasks
    };
    const krSel = $('#f-kr');
    if (krSel) data.krId = krSel.value;
    captureUndo(task ? 'Edit task' : 'Create task');
    // sync reverse vault links
    const prevVaultIds = task ? (task.vaultIds||[]) : [];
    const newVaultIds = data.vaultIds || [];
    const allVaultIds = new Set([...prevVaultIds, ...newVaultIds]);
    allVaultIds.forEach(vid=>{
      const v=state.vaultItems.find(x=>x.id===vid); if(!v) return;
      if(!Array.isArray(v.linkedTaskIds)) v.linkedTaskIds=[];
      const shouldHave=newVaultIds.includes(vid);
      const has=v.linkedTaskIds.includes(task?.id || data.id || '');
      // for new task, task.id not yet known — will be assigned below, handle after
      if(shouldHave && !has && task && task.id) { v.linkedTaskIds.push(task.id); v.updatedAt=Date.now(); if(!state._vaultItemsMeta) state._vaultItemsMeta={}; state._vaultItemsMeta[v.id]=Date.now(); }
      if(!shouldHave && has && task && task.id) { v.linkedTaskIds=v.linkedTaskIds.filter(id=>id!==task.id); v.updatedAt=Date.now(); if(!state._vaultItemsMeta) state._vaultItemsMeta={}; state._vaultItemsMeta[v.id]=Date.now(); }
    });
    if (task) {
      const oldStatus = task.status;
      Object.assign(task, data); task.updatedAt = Date.now();
      if (oldStatus !== data.status) trackProgressTime(task, oldStatus, data.status);
      logActivity('task.edit', data.title, 'task');
    } else {
      const newId=uid();
      const newTask=Object.assign({ id: newId, createdAt: Date.now(), completedAt: null, updatedAt: Date.now() }, data);
      state.tasks.unshift(newTask);
      // link new task to vault items (reverse)
      (data.vaultIds||[]).forEach(vid=>{
        const v=state.vaultItems.find(x=>x.id===vid); if(!v) return;
        if(!Array.isArray(v.linkedTaskIds)) v.linkedTaskIds=[];
        if(!v.linkedTaskIds.includes(newId)){ v.linkedTaskIds.push(newId); v.updatedAt=Date.now(); if(!state._vaultItemsMeta) state._vaultItemsMeta={}; state._vaultItemsMeta[v.id]=Date.now(); }
      });
      logActivity('task.create', data.title, 'task');
    }
    save(); closeModal(); renderView();
    toast(task ? 'Task updated' : 'Task added ✅');
  });
  const del = $('#f-delete');
  if (del) del.addEventListener('click', () => {
    captureUndo('Delete task');
    logActivity('task.delete', task.title, 'task');
    state.tasks = state.tasks.filter(x => x.id !== task.id);
    tombstone('tasks', task.id);
    save(); closeModal(); renderView(); toast('Task deleted');
  });
  // Pomodoro widget in modal
  if (task) {
    let widgetMins = 25;
    let widgetRunning = false;
    let widgetTimer = null;
    let widgetRemain = 25 * 60;
    const widgetDur = () => widgetMins * 60;
    const ringFill = $('#pomo-ring-fill');
    const ringTime = $('#pomo-ring-time');
    const actionBtn = $('#pomo-action-btn');
    const resetBtn = $('#pomo-reset-btn');
    const sessionsInfo = $('#pomo-sessions-info');
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
          actionBtn.innerHTML = `${ic('pause', 16)} Pause`;
          actionBtn.classList.add('pomo-running');
        } else {
          actionBtn.innerHTML = `${ic('play', 16)} ${widgetRemain < widgetDur() ? 'Resume' : 'Start'}`;
          actionBtn.classList.remove('pomo-running');
        }
      }
      if (sessionsInfo) {
        const today = todayISO();
        const todaySessions = (state.pomoHistory || []).filter(s => s.taskId === task.id && s.startedAt && new Date(s.startedAt).toISOString().slice(0, 10) === today);
        sessionsInfo.textContent = `${todaySessions.length} session${todaySessions.length === 1 ? '' : 's'} today`;
      }
    }
    function widgetTick() {
      widgetRemain--;
      if (widgetRemain <= 0) {
        widgetRemain = 0;
        widgetRunning = false;
        clearInterval(widgetTimer);
        recordPomoSession(task.id, widgetDur(), true);
        if (state.settings.pomodoroDate === todayISO()) state.settings.pomodoroCount++;
        else { state.settings.pomodoroDate = todayISO(); state.settings.pomodoroCount = 1; }
        save();
        toast('🍅 Focus session complete!', 'success');
        offerFocusHabitProtect();
        if (currentView() === 'tasks') renderTasks();
        else renderView();
      }
      updateWidgetUI();
    }
    // Duration presets
    $$('.pomo-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        if (widgetRunning) { toast('Pause the timer first', 'error'); return; }
        $$('.pomo-preset').forEach(b => b.classList.remove('active'));
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
        if (elapsed > 0) recordPomoSession(task.id, elapsed, false);
        save();
        toast('🍅 Focus paused — ' + fmtDur(elapsed) + ' logged');
        updateWidgetUI();
      } else {
        if (taskPomo.running && taskPomo.taskId !== task.id) stopTaskPomo(true);
        widgetRunning = true;
        widgetTimer = setInterval(widgetTick, 1000);
        toast('🍅 Focus started — stay in the zone!');
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
    // Sync with external task pomo state if this task is the active one
    if (taskPomo.running && taskPomo.taskId === task.id) {
      widgetRunning = true;
      widgetRemain = taskPomo.remain;
      widgetMins = taskPomo.dur / 60;
      widgetTimer = setInterval(widgetTick, 1000);
    }
    updateWidgetUI();
  }
  // Save as template
  $('#f-template').addEventListener('click', () => {
    const title = $('#f-title').value.trim();
    if (!title) { toast('Give the task a title first', 'error'); return; }
    if (!state.templates) state.templates = [];
    const subtasks = [];
    $$('.subtask-row').forEach(row => {
      const text = row.querySelector('.st-input').value.trim();
      if (text) subtasks.push({ text, done: false, id: uid() });
    });
    state.templates.push({
      id: uid(),
      title,
      desc: $('#f-desc').value.trim(),
      status: $('#f-status').value,
      priority: $('#f-prio').value,
      category: $('#f-category').value,
      recurrence: $('#f-recurrence').value,
      goalId: $('#f-goal').value,
      scheduleDay: $('#f-sched-day').value,
      schedulePeriod: $('#f-sched-period').value,
      startTime: $('#f-start-time').value || '',
      endTime: $('#f-end-time').value || '',
      tags: $('#f-tags').value.split(',').map(s => s.trim()).filter(Boolean),
      subtasks,
      createdAt: Date.now()
    });
    save();
    toast('Template saved 📋');
  });
}

