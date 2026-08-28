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
