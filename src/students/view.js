// src/students/view.js — student roster presentation. Pure builders following the
// vault/tasks pattern: getStudentStats' output is injected as `stats` rather than
// recomputed here.
import { esc } from '../lib/helpers.js';
import { formatStudentRevenue } from '../lib/students.js';

/**
 * @typedef {object} StudentViewCtx
 * @property {object} stats output of getStudentStats(s, collections)
 * @property {(tag:string)=>string} [tagSpan]
 * @property {(name:string,size:number)=>string} [ic]
 */

/**
 * Grid-card markup for one student in the roster.
 * @param {object} s student
 * @param {StudentViewCtx} ctx
 * @returns {string}
 */
export function studentCardHTML(s, ctx) {
  const { stats: st, tagSpan = () => '', ic = () => '' } = ctx || {};
const initials = s.name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase() || 'ST';
const currSym = s.currency === 'TRY' ? '₺' : '$';
const rateText = s.rate ? `${currSym}${s.rate.toLocaleString()}/hr` : 'Custom rate';
const revFormatted = formatStudentRevenue(st, s.currency);

return `
  <div class="student-card" data-student-id="${s.id}">
    <div class="student-card-head">
      <div class="student-avatar">${initials}</div>
      <div class="student-name-wrap">
        <h4 class="student-card-name">
          <span>${esc(s.name)}</span>
          <span class="student-status-dot ${s.status || 'active'}" title="Status: ${s.status || 'active'}"></span>
        </h4>
        <div class="student-level-tag">
          <span>📚 ${esc(s.level || 'General ESL')}</span> · <b>${rateText}</b>
        </div>
      </div>
    </div>

    <div class="student-metrics-row">
      <div class="student-metric-box">
        <span class="student-metric-num">${st.lessonsCount}</span>
        <span class="student-metric-title">Lessons</span>
      </div>
      <div class="student-metric-box">
        <span class="student-metric-num" style="color:#34d399">${revFormatted}</span>
        <span class="student-metric-title">Revenue</span>
      </div>
      <div class="student-metric-box">
        <span class="student-metric-num" style="color:${st.pendingTasks > 0 ? '#605DFF' : 'var(--muted)'}">${st.pendingTasks}</span>
        <span class="student-metric-title">Tasks/HW</span>
      </div>
    </div>

    ${s.goals ? `<div style="font-size:12px;color:var(--text);background:var(--surface2);padding:8px 10px;border-radius:8px;line-height:1.4">🎯 <b>Goal:</b> ${esc(s.goals)}</div>` : ''}

    <div class="student-card-tags">
      ${(s.tags || []).map(tg => tagSpan(tg)).join('')}
      ${st.attCount > 0 ? `<span class="badge" style="font-size:11px">📅 ${st.attCount} sessions</span>` : ''}
      ${st.assignCount > 0 ? `<span class="badge" style="font-size:11px">📋 ${st.assignCount} HW</span>` : ''}
      ${st.notesCount > 0 ? `<span class="badge" style="font-size:11px">📝 ${st.notesCount} notes</span>` : ''}
    </div>

    <div class="student-card-foot">
      <div style="display:flex;gap:5px;flex-wrap:wrap">
        <button class="btn btn-sm btn-accent std-open-dossier" data-id="${s.id}">🎓 Dossier</button>
        <button class="btn btn-sm btn-ghost std-log-att" data-student="${esc(s.name)}" title="Mark attendance">📅</button>
        <button class="btn btn-sm btn-ghost std-log-assign" data-student="${esc(s.name)}" title="Assign homework">📋</button>
        <button class="btn btn-sm btn-ghost std-log-income" data-student="${esc(s.name)}" data-curr="${s.currency || 'USD'}" data-rate="${s.rate || ''}" title="Log payment">💰</button>
      </div>
      <div style="display:flex;gap:4px">
        <button class="btn-icon std-edit-btn" data-id="${s.id}" title="Edit profile">${ic('settings', 14)}</button>
        <button class="btn-icon std-del-btn" data-id="${s.id}" data-name="${esc(s.name)}" title="Remove student" style="color:var(--red)">${ic('trash', 14)}</button>
      </div>
    </div>
  </div>`;
}

/**
 * Table-row markup for one student in the roster (table view mode).
 * @param {object} s student
 * @param {StudentViewCtx} ctx
 * @returns {string}
 */
export function studentRowHTML(s, ctx) {
  const { stats: st, ic = () => '' } = ctx || {};
const currSym = s.currency === 'TRY' ? '₺' : '$';
const rateText = s.rate ? `${currSym}${s.rate.toLocaleString()}/hr` : '—';
const revFormatted = formatStudentRevenue(st, s.currency);
return `
  <tr>
    <td><b>🎓 ${esc(s.name)}</b></td>
    <td>${esc(s.level || 'General')}</td>
    <td><b>${rateText}</b></td>
    <td><span class="student-status-dot ${s.status || 'active'}"></span> <span style="font-size:12px;text-transform:capitalize">${s.status || 'active'}</span></td>
    <td><b>${st.lessonsCount}</b></td>
    <td style="color:#34d399;font-weight:700">${revFormatted}</td>
    <td>${st.attCount > 0 ? `<span class="badge">${st.attCount} sessions</span>` : '<span class="muted">0</span>'}</td>
    <td>${st.assignCount > 0 ? `<span class="badge" style="background:rgba(96,93,255,.15);color:var(--accent)">${st.assignCount} tasks</span>` : '<span class="muted">0</span>'}</td>
    <td style="white-space:nowrap;text-align:right">
      <button class="btn btn-sm btn-ghost std-open-dossier" data-id="${s.id}">Dossier</button>
      <button class="btn btn-sm btn-ghost std-log-income" data-student="${esc(s.name)}" data-curr="${s.currency || 'USD'}" data-rate="${s.rate || ''}">💰</button>
      <button class="btn-icon std-edit-btn" data-id="${s.id}">${ic('settings', 13)}</button>
      <button class="btn-icon std-del-btn" data-id="${s.id}" data-name="${esc(s.name)}" style="color:var(--red)">${ic('trash', 13)}</button>
    </td>
  </tr>`;
}

/**
 * The attendance sub-tab: stats, filter toolbar, and the session table.
 * @param {object} ctx { attendance, filter, ic }
 * @returns {string}
 */
export function attendanceTabHTML(ctx) {
  const { attendance = [], filter = 'ALL', ic = () => '' } = ctx || {};
const presentCount = attendance.filter(a => a.status === 'present').length;
const lateCount = attendance.filter(a => a.status === 'late').length;
const absentCount = attendance.filter(a => a.status === 'absent').length;
const totalSessions = attendance.length;
const attRate = totalSessions ? Math.round(((presentCount + lateCount) / totalSessions) * 100) : 100;
const punctRate = (presentCount + lateCount) ? Math.round((presentCount / (presentCount + lateCount)) * 100) : 100;
const totalHours = Math.round((attendance.reduce((sum, a) => sum + (parseInt(a.duration, 10) || 60), 0) / 60) * 10) / 10;

const filteredAtt = attendance.filter(a => {
  if (filter !== 'ALL' && a.status !== filter) return false;
  return true;
});

return `
  <div class="students-stats">
    <div class="student-stat-card">
      <div class="student-stat-icon" style="background:rgba(96,93,255,.12);color:var(--accent)">📅</div>
      <div>
        <div class="student-stat-val">${totalSessions}</div>
        <div class="student-stat-lbl">Total Sessions Taught</div>
      </div>
    </div>
    <div class="student-stat-card">
      <div class="student-stat-icon" style="background:rgba(52,211,153,.12);color:#34d399">🎯</div>
      <div>
        <div class="student-stat-val" style="color:#34d399">${attRate}%</div>
        <div class="student-stat-lbl">Attendance Rate</div>
      </div>
    </div>
    <div class="student-stat-card">
      <div class="student-stat-icon" style="background:rgba(81,141,191,.12);color:#518DBF">⏱️</div>
      <div>
        <div class="student-stat-val" style="color:#518DBF">${punctRate}%</div>
        <div class="student-stat-lbl">Punctuality Score</div>
      </div>
    </div>
    <div class="student-stat-card">
      <div class="student-stat-icon" style="background:rgba(255,176,32,.12);color:#f59e0b">⏳</div>
      <div>
        <div class="student-stat-val">${totalHours} hrs</div>
        <div class="student-stat-lbl">Total Teaching Time</div>
      </div>
    </div>
  </div>

  <div class="students-toolbar">
    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;flex:1">
      <span style="font-size:13px;font-weight:600;margin-right:4px">Status:</span>
      <button class="btn btn-sm ${filter === 'ALL' ? 'btn-accent' : 'btn-ghost'}" data-att-filter="ALL">All (${attendance.length})</button>
      <button class="btn btn-sm ${filter === 'present' ? 'btn-accent' : 'btn-ghost'}" data-att-filter="present">🟢 Present (${presentCount})</button>
      <button class="btn btn-sm ${filter === 'late' ? 'btn-accent' : 'btn-ghost'}" data-att-filter="late">🟡 Late (${lateCount})</button>
      <button class="btn btn-sm ${filter === 'absent' ? 'btn-accent' : 'btn-ghost'}" data-att-filter="absent">🔴 Absent (${absentCount})</button>
    </div>
    <button class="btn btn-accent" id="att-new-btn">${ic('plus', 14)} Mark Attendance</button>
  </div>

  ${filteredAtt.length ? `
    <div class="card" style="overflow-x:auto">
      <table class="fin-tx-table">
        <thead>
          <tr>
            <th scope="col">Date &amp; Time</th>
            <th scope="col">Student</th>
            <th scope="col">Status</th>
            <th scope="col">Duration</th>
            <th scope="col">Topic / Covered Subject</th>
            <th scope="col">Session Notes</th>
            <th scope="col">Billing</th>
            <th scope="col"></th>
          </tr>
        </thead>
        <tbody>
          ${filteredAtt.map(a => `
            <tr>
              <td><b>${a.date || '—'}</b> ${a.time ? `<span class="muted" style="font-size:12px">at ${a.time}</span>` : ''}</td>
              <td><b>🎓 ${esc(a.studentName)}</b></td>
              <td><span class="att-status-badge ${a.status}">${a.status === 'present' ? '🟢 Present' : a.status === 'late' ? '🟡 Late' : a.status === 'absent' ? '🔴 Absent' : a.status === 'rescheduled' ? '🔵 Rescheduled' : '⚪ Excused'}</span></td>
              <td>${a.duration || 60} mins</td>
              <td><b>${esc(a.topic || 'General Lesson')}</b></td>
              <td style="max-width:220px;font-size:12.5px">${esc(a.notes || '—')}</td>
              <td>${a.billed ? `<span class="badge" style="background:rgba(52,211,153,.15);color:#34d399">💰 Billed (${fmtM(a.rate || 0, a.currency || 'USD')})</span>` : '<span class="muted">Unbilled</span>'}</td>
              <td style="white-space:nowrap;text-align:right">
                <button class="btn-icon att-del-btn" data-id="${a.id}" style="color:var(--red)" title="Delete entry">${ic('trash', 14)}</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>` : `<div class="card muted" style="padding:36px;text-align:center">No attendance logs found. <button class="btn btn-sm btn-accent" id="att-empty-add" style="margin-left:8px">+ Mark Attendance</button></div>`}
`;
}

/**
 * The assignments sub-tab: stats, filter toolbar, and the assignment card grid.
 * @param {object} ctx { assignments, filter, today, ic }
 * @returns {string}
 */
export function assignmentsTabHTML(ctx) {
  const { assignments = [], filter = 'ALL', today = '', ic = () => '' } = ctx || {};
const assignedCount = assignments.filter(a => a.status === 'assigned').length;
const submittedCount = assignments.filter(a => a.status === 'submitted').length;
const reviewedCount = assignments.filter(a => a.status === 'reviewed' || a.status === 'completed').length;
const overdueCount = assignments.filter(a => a.dueDate && a.dueDate < today && a.status !== 'completed').length;

const filteredAssign = assignments.filter(a => {
  if (filter !== 'ALL' && a.status !== filter) return false;
  return true;
});

return `
  <div class="students-stats">
    <div class="student-stat-card">
      <div class="student-stat-icon" style="background:rgba(96,93,255,.12);color:var(--accent)">📋</div>
      <div>
        <div class="student-stat-val">${assignedCount}</div>
        <div class="student-stat-lbl">Active / Assigned</div>
      </div>
    </div>
    <div class="student-stat-card">
      <div class="student-stat-icon" style="background:rgba(81,141,191,.12);color:#518DBF">📥</div>
      <div>
        <div class="student-stat-val" style="color:#518DBF">${submittedCount}</div>
        <div class="student-stat-lbl">Submitted (Needs Grading)</div>
      </div>
    </div>
    <div class="student-stat-card">
      <div class="student-stat-icon" style="background:rgba(52,211,153,.12);color:#34d399">⭐</div>
      <div>
        <div class="student-stat-val" style="color:#34d399">${reviewedCount}</div>
        <div class="student-stat-lbl">Graded / Completed</div>
      </div>
    </div>
    <div class="student-stat-card">
      <div class="student-stat-icon" style="background:rgba(239,68,68,.12);color:#ef4444">⚠️</div>
      <div>
        <div class="student-stat-val" style="color:${overdueCount > 0 ? '#ef4444' : 'var(--muted)'}">${overdueCount}</div>
        <div class="student-stat-lbl">Overdue Submissions</div>
      </div>
    </div>
  </div>

  <div class="students-toolbar">
    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;flex:1">
      <span style="font-size:13px;font-weight:600;margin-right:4px">Filter:</span>
      <button class="btn btn-sm ${filter === 'ALL' ? 'btn-accent' : 'btn-ghost'}" data-assign-filter="ALL">All (${assignments.length})</button>
      <button class="btn btn-sm ${filter === 'assigned' ? 'btn-accent' : 'btn-ghost'}" data-assign-filter="assigned">Assigned</button>
      <button class="btn btn-sm ${filter === 'submitted' ? 'btn-accent' : 'btn-ghost'}" data-assign-filter="submitted">Submitted</button>
      <button class="btn btn-sm ${filter === 'reviewed' ? 'btn-accent' : 'btn-ghost'}" data-assign-filter="reviewed">Graded / Reviewed</button>
    </div>
    <button class="btn btn-accent" id="assign-new-btn">${ic('plus', 14)} Assign Homework</button>
  </div>

  ${filteredAssign.length ? `
    <div class="assignment-grid">
      ${filteredAssign.map(a => {
        const isOverdue = a.dueDate && a.dueDate < today && a.status !== 'completed';
        return `
          <div class="assignment-card">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
              <div>
                <span class="badge" style="font-size:11px;margin-bottom:4px">🎓 ${esc(a.studentName)}</span>
                <h4 style="margin:0 0 4px;font-size:15px;color:var(--text)">${esc(a.title)}</h4>
              </div>
              <span class="badge" style="text-transform:capitalize;background:${a.status === 'submitted' ? 'rgba(81,141,191,.2)' : a.status === 'reviewed' ? 'rgba(52,211,153,.2)' : 'var(--surface2)'}">${a.status}</span>
            </div>

            ${a.description ? `<p style="margin:0;font-size:12.5px;color:var(--text);line-height:1.45">${esc(a.description)}</p>` : ''}

            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12px;margin-top:auto">
              <div style="display:flex;align-items:center;gap:6px">
                <span>📅 Due:</span>
                <b style="color:${isOverdue ? '#ef4444' : 'var(--text)'}">${a.dueDate || 'No due date'} ${isOverdue ? '⚠️ Overdue' : ''}</b>
              </div>
              ${a.score ? `<div class="assignment-grade-badge">⭐ ${esc(a.score)}</div>` : ''}
            </div>

            ${a.feedback ? `<div style="background:var(--surface2);padding:8px 10px;border-radius:6px;font-size:12px;line-height:1.4">💬 <b>Teacher Feedback:</b> ${esc(a.feedback)}</div>` : ''}

            <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--border);padding-top:10px;margin-top:4px">
              <button class="btn btn-sm btn-accent assign-grade-btn" data-id="${a.id}">📝 Review &amp; Grade</button>
              <div style="display:flex;gap:4px">
                <button class="btn-icon assign-edit-btn" data-id="${a.id}">${ic('settings', 13)}</button>
                <button class="btn-icon assign-del-btn" data-id="${a.id}" style="color:var(--red)">${ic('trash', 13)}</button>
              </div>
            </div>
          </div>`;
      }).join('')}
    </div>` : `<div class="card muted" style="padding:36px;text-align:center">No assignments found. <button class="btn btn-sm btn-accent" id="assign-empty-add" style="margin-left:8px">+ Assign Homework</button></div>`}
`;
}

/**
 * The lesson-plans sub-tab: stats, filter toolbar, and the plan card grid.
 * @param {object} ctx { lessonPlans, filter, ic }
 * @returns {string}
 */
export function lessonPlansTabHTML(ctx) {
  const { lessonPlans = [], filter = 'ALL', ic = () => '' } = ctx || {};
const plannedCount = lessonPlans.filter(p => p.status === 'planned').length;
const deliveredCount = lessonPlans.filter(p => p.status === 'delivered').length;
const draftCount = lessonPlans.filter(p => p.status === 'draft').length;

const filteredPlans = lessonPlans.filter(p => {
  if (filter !== 'ALL' && p.status !== filter) return false;
  return true;
});

return `
  <div class="students-stats">
    <div class="student-stat-card">
      <div class="student-stat-icon" style="background:rgba(96,93,255,.12);color:var(--accent)">📖</div>
      <div>
        <div class="student-stat-val">${plannedCount}</div>
        <div class="student-stat-lbl">Planned Lessons</div>
      </div>
    </div>
    <div class="student-stat-card">
      <div class="student-stat-icon" style="background:rgba(52,211,153,.12);color:#34d399">✅</div>
      <div>
        <div class="student-stat-val" style="color:#34d399">${deliveredCount}</div>
        <div class="student-stat-lbl">Delivered Lessons</div>
      </div>
    </div>
    <div class="student-stat-card">
      <div class="student-stat-icon" style="background:rgba(255,176,32,.12);color:#f59e0b">📝</div>
      <div>
        <div class="student-stat-val">${draftCount}</div>
        <div class="student-stat-lbl">Draft Plans</div>
      </div>
    </div>
  </div>

  <div class="students-toolbar">
    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;flex:1">
      <span style="font-size:13px;font-weight:600;margin-right:4px">Status:</span>
      <button class="btn btn-sm ${filter === 'ALL' ? 'btn-accent' : 'btn-ghost'}" data-plan-filter="ALL">All (${lessonPlans.length})</button>
      <button class="btn btn-sm ${filter === 'planned' ? 'btn-accent' : 'btn-ghost'}" data-plan-filter="planned">Planned</button>
      <button class="btn btn-sm ${filter === 'delivered' ? 'btn-accent' : 'btn-ghost'}" data-plan-filter="delivered">Delivered</button>
    </div>
    <button class="btn btn-accent" id="plan-new-btn">${ic('plus', 14)} Create Lesson Plan</button>
  </div>

  ${filteredPlans.length ? `
    <div class="lesson-plans-grid">
      ${filteredPlans.map(p => `
        <div class="lesson-plan-card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
            <div>
              <div style="display:flex;gap:6px;align-items:center;margin-bottom:4px">
                <span class="badge" style="font-size:11px">🎓 ${esc(p.studentName || 'All Students')}</span>
                <span class="badge" style="font-size:11px;background:var(--surface2)">📚 ${esc(p.level || 'General')}</span>
              </div>
              <h3 style="margin:0 0 4px;font-size:16px;color:var(--text)">${esc(p.title)}</h3>
              <div class="muted" style="font-size:12px">📅 ${p.date || 'Flexible Date'} · ⏱️ ${p.duration || 60} mins</div>
            </div>
            <span class="badge" style="text-transform:capitalize;background:${p.status === 'delivered' ? 'rgba(52,211,153,.2)' : 'rgba(96,93,255,.2)'}">${p.status || 'planned'}</span>
          </div>

          ${p.objective ? `
            <div class="lesson-stage-block" style="border-left:3px solid var(--accent)">
              <div class="lesson-stage-title">🎯 Lesson Objective</div>
              <div>${esc(p.objective)}</div>
            </div>` : ''}

          <div style="display:flex;flex-direction:column;gap:6px">
            ${p.warmUp ? `<div class="lesson-stage-block"><div class="lesson-stage-title">⏱️ Warm-up (5-10m)</div><div>${esc(p.warmUp)}</div></div>` : ''}
            ${p.mainActivity ? `<div class="lesson-stage-block"><div class="lesson-stage-title">💡 Main Guided Activity</div><div>${esc(p.mainActivity)}</div></div>` : ''}
            ${p.wrapUpHomework ? `<div class="lesson-stage-block"><div class="lesson-stage-title">📦 Wrap-up &amp; Homework</div><div>${esc(p.wrapUpHomework)}</div></div>` : ''}
          </div>

          <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--border);padding-top:12px;margin-top:auto">
            <button class="btn btn-sm btn-accent plan-deliver-btn" data-id="${p.id}">${p.status === 'delivered' ? '✅ Re-deliver' : '🚀 Deliver Lesson'}</button>
            <div style="display:flex;gap:4px">
              <button class="btn-icon plan-edit-btn" data-id="${p.id}">${ic('settings', 14)}</button>
              <button class="btn-icon plan-del-btn" data-id="${p.id}" style="color:var(--red)">${ic('trash', 14)}</button>
            </div>
          </div>
        </div>`).join('')}
    </div>` : `<div class="card muted" style="padding:36px;text-align:center">No lesson plans created yet. <button class="btn btn-sm btn-accent" id="plan-empty-add" style="margin-left:8px">+ Create Lesson Plan</button></div>`}
`;
}
