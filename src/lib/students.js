// src/lib/students.js
// Foreign-key backfill: legacy `student` display names -> canonical `studentId`.

/**
 * Walk income/expectedIncome/assignments/attendance and set `studentId` on any
 * entry that has a `student` (or `studentName`) name but no id yet. Idempotent.
 * Keeps the original name string as a display fallback.
 * @param {object} state
 * @returns {{linked:number, orphans:string[]}}
 */
export function backfillStudentIds(state) {
  const roster = Array.isArray(state.students) ? state.students : [];
  const nameToId = new Map();
  for (const s of roster) {
    if (s && s.name && !nameToId.has(s.name)) nameToId.set(s.name, s.id);
  }
  let linked = 0;
  const orphans = new Set();
  const collections = ['income', 'expectedIncome', 'assignments', 'attendance'];
  for (const key of collections) {
    const list = Array.isArray(state[key]) ? state[key] : [];
    for (const entry of list) {
      if (!entry || entry.studentId) continue;
      const name = entry.student || entry.studentName;
      if (!name) continue;
      const id = nameToId.get(name);
      if (id) { entry.studentId = id; linked++; }
      else { orphans.add(name); }
    }
  }
  return { linked, orphans: [...orphans] };
}

const matchesStudent = (entry, s, nameField = 'student') =>
  entry.studentId ? entry.studentId === s.id : entry[nameField] === s.name;

/**
 * Per-student rollup used by both the roster card and the dossier. FK-first on every
 * collection that carries a `studentId`, falling back to the display-name string for
 * legacy entries — matching the pattern the dossier already used. The roster's
 * previous version checked only the name string for income and expected income,
 * which undercounted a student the moment their income was FK-linked but the name on
 * the transaction went stale (a rename, or an entry auto-billed before the rename).
 * @param {{id:string,name:string}} s
 * @param {object} collections { income, expectedIncome, tasks, notes, attendance, assignments, lessonPlans }
 * @returns {{lessonsCount:number,usdPaid:number,tryPaid:number,pendingCount:number,pendingTasks:number,notesCount:number,attCount:number,assignCount:number,plansCount:number}}
 */
export function getStudentStats(s, collections) {
  const {
    income = [], expectedIncome = [], tasks = [], notes = [],
    attendance = [], assignments = [], lessonPlans = [],
  } = collections || {};

  const sInc = income.filter((e) => matchesStudent(e, s));
  const sExpInc = expectedIncome.filter((e) => matchesStudent(e, s));
  const sAtt = attendance.filter((a) => matchesStudent(a, s, 'studentName'));
  const sAssign = assignments.filter((a) => matchesStudent(a, s, 'studentName'));
  const sPlans = lessonPlans.filter((p) => matchesStudent(p, s, 'studentName'));
  // Tasks and notes carry no studentId field — name is the only signal available.
  const sTasks = tasks.filter((t) => t.student === s.name);
  const sNotes = notes.filter((n) => n.student === s.name);

  return {
    lessonsCount: sInc.length,
    usdPaid: sInc.filter((e) => (e.currency || 'USD') === 'USD').reduce((sum, e) => sum + (e.amount || 0), 0),
    tryPaid: sInc.filter((e) => e.currency === 'TRY').reduce((sum, e) => sum + (e.amount || 0), 0),
    pendingCount: sExpInc.length,
    pendingTasks: sTasks.filter((t) => t.status !== 'done').length,
    notesCount: sNotes.length,
    attCount: sAtt.length,
    assignCount: sAssign.length,
    plansCount: sPlans.length,
  };
}

/**
 * "$100 · ₺500" — leads with the student's own currency, appends the other only when
 * there is activity in it. Shared by the roster grid card and the roster table row,
 * which previously computed this identically but separately.
 * @param {{usdPaid:number,tryPaid:number}} stats from getStudentStats
 * @param {'USD'|'TRY'} currency the student's primary currency
 * @returns {string}
 */
export function formatStudentRevenue(stats, currency) {
  const { usdPaid, tryPaid } = stats;
  return currency === 'TRY'
    ? `₺${tryPaid.toLocaleString()}${usdPaid > 0 ? ` · $${usdPaid.toLocaleString()}` : ''}`
    : `$${usdPaid.toLocaleString()}${tryPaid > 0 ? ` · ₺${tryPaid.toLocaleString()}` : ''}`;
}
