// src/lib/merge.js
// P2P sync state merge — last-write-wins by updatedAt, with tombstones and
// per-key LWW for tagColors / incomeTypes / expenseCategories.
// Mutates ctx.state and ctx.syncMeta in place. No persistence, no rendering,
// no syncMeta.rev bump — the caller owns those side effects.

/**
 * @param {{state:object, syncMeta:object, inc:object, incomingRev:number}} ctx
 * @returns {boolean} whether anything changed
 */
export function applyMerge({ state, syncMeta, inc, incomingRev }) {
  const key = (arr) => JSON.stringify([...(arr || [])].sort((a, b) => (a.id < b.id ? -1 : 1)));
  const keyAch = (a) => JSON.stringify(Object.entries(a || {}).sort((x, y) => (x[0] < y[0] ? -1 : 1)));
  const before = key(state.tasks) + key(state.goals) + key(state.habits) + key(state.notes) + key(state.recordings) + key(state.projects) + key(state.krHistory) + key(state.income) + key(state.expenses) + key(state.students) + key(state.attendance) + key(state.assignments) + key(state.lessonPlans) + JSON.stringify(state.kanbanLists || []) + JSON.stringify(state.tagColors || {}) + keyAch(state.achievements);
  const mergeOne = (local, incoming, tombKey) => {
    const tomb = new Set(syncMeta.tombstones[tombKey] || []);
    ((inc.deleted && inc.deleted[tombKey]) || []).forEach((id) => tomb.add(id));
    syncMeta.tombstones[tombKey] = [...tomb];
    const byId = new Map();
    (local || []).forEach((it) => { if (!tomb.has(it.id)) byId.set(it.id, it); });
    (incoming || []).forEach((it) => {
      if (!it || !it.id || tomb.has(it.id)) return;
      const ex = byId.get(it.id);
      if (!ex || (it.updatedAt || 0) > (ex.updatedAt || 0)) byId.set(it.id, it);
    });
    return [...byId.values()];
  };
  state.tasks = mergeOne(state.tasks, inc.tasks, 'tasks');
  state.goals = mergeOne(state.goals, inc.goals, 'goals');
  state.habits = mergeOne(state.habits, inc.habits, 'habits');
  state.notes = mergeOne(state.notes, inc.notes, 'notes');
  state.recordings = mergeOne(state.recordings, inc.recordings, 'recordings');
  state.projects = mergeOne(state.projects, inc.projects, 'projects');
  state.krHistory = mergeOne(state.krHistory, inc.krHistory, 'krHistory');
  state.income = mergeOne(state.income, inc.income, 'income');
  state.expenses = mergeOne(state.expenses, inc.expenses, 'expenses');
  state.expectedIncome = mergeOne(state.expectedIncome, inc.expectedIncome, 'expectedIncome');
  state.expectedExpenses = mergeOne(state.expectedExpenses, inc.expectedExpenses, 'expectedExpenses');
  state.students = mergeOne(state.students, inc.students, 'students');
  state.attendance = mergeOne(state.attendance, inc.attendance, 'attendance');
  state.assignments = mergeOne(state.assignments, inc.assignments, 'assignments');
  state.lessonPlans = mergeOne(state.lessonPlans, inc.lessonPlans, 'lessonPlans');
  // Merge income types (per-field timestamp) — deterministic LWW with deletions
  if (!state._incomeTypesMeta) state._incomeTypesMeta = {};
  if (!state._expenseCategoriesMeta) state._expenseCategoriesMeta = {};
  if (!state._tagColorMeta) state._tagColorMeta = {};
  if (!syncMeta.tombstones) syncMeta.tombstones = { tasks: [], goals: [], habits: [], notes: [], recordings: [] };
  if (!syncMeta.tombstones.tagColors) syncMeta.tombstones.tagColors = {};
  if (!syncMeta.tombstones.incomeTypes) syncMeta.tombstones.incomeTypes = {};
  if (!syncMeta.tombstones.expenseCategories) syncMeta.tombstones.expenseCategories = {};
  const incTagMeta = inc._tagColorMeta || {};
  const incIncomeMeta = inc._incomeTypesMeta || {};
  const incExpenseMeta = inc._expenseCategoriesMeta || {};
  // tagColors per-key LWW
  if (inc.tagColors || Object.keys(incTagMeta).length || inc.deleted) {
    if (!state.tagColors) state.tagColors = {};
    const incomingDeletes = (inc.deleted && inc.deleted.tagColors) || incTagMeta._deleted || {};
    // handle explicit deletions via tombstones
    const allKeys = new Set([...Object.keys(state.tagColors), ...Object.keys(inc.tagColors || {}), ...Object.keys(incTagMeta), ...Object.keys(syncMeta.tombstones.tagColors || {})]);
    void allKeys;
    // also merge incoming deletes
    Object.entries(incomingDeletes).forEach(([k, ts]) => {
      const localTs = state._tagColorMeta[k] || 0;
      const tombTs = syncMeta.tombstones.tagColors[k] || 0;
      if (ts > localTs && ts > tombTs) { delete state.tagColors[k]; state._tagColorMeta[k] = ts; syncMeta.tombstones.tagColors[k] = ts; }
    });
    // merge tombstones from inc.deleted.tagColors if it's object map
    if (inc.deleted && inc.deleted.tagColors && typeof inc.deleted.tagColors === 'object' && !Array.isArray(inc.deleted.tagColors)) {
      Object.entries(inc.deleted.tagColors).forEach(([k, ts]) => {
        const cur = syncMeta.tombstones.tagColors[k] || 0;
        if (ts > cur) syncMeta.tombstones.tagColors[k] = ts;
        const localTs = state._tagColorMeta[k] || 0;
        if (ts > localTs) { delete state.tagColors[k]; state._tagColorMeta[k] = ts; }
      });
    }
    Object.entries(inc.tagColors || {}).forEach(([k, v]) => {
      const incTs = incTagMeta[k] || incomingRev || 0;
      const localTs = state._tagColorMeta[k] || 0;
      const tombTs = syncMeta.tombstones.tagColors[k] || 0;
      if (incTs > localTs && incTs > tombTs) {
        if (v) { state.tagColors[k] = v; state._tagColorMeta[k] = incTs; delete syncMeta.tombstones.tagColors[k]; }
        else { delete state.tagColors[k]; state._tagColorMeta[k] = incTs; syncMeta.tombstones.tagColors[k] = incTs; }
      }
    });
    // deletions represented as null in inc.tagColors with timestamp
    Object.entries(inc.tagColors || {}).forEach(([k, v]) => {
      if (v == null) {
        const incTs = incTagMeta[k] || incomingRev || 0;
        const localTs = state._tagColorMeta[k] || 0;
        if (incTs > localTs) { delete state.tagColors[k]; state._tagColorMeta[k] = incTs; syncMeta.tombstones.tagColors[k] = incTs; }
      }
    });
  }
  // incomeTypes per-item LWW (union + deletions via meta)
  if (Array.isArray(inc.incomeTypes)) {
    const curSet = new Set(state.incomeTypes || []);
    inc.incomeTypes.forEach((item) => {
      const incTs = incIncomeMeta[item] || incomingRev || 0;
      const localTs = state._incomeTypesMeta[item] || 0;
      const tombTs = syncMeta.tombstones.incomeTypes[item] || 0;
      if (incTs > localTs && incTs > tombTs) { curSet.add(item); state._incomeTypesMeta[item] = incTs; delete syncMeta.tombstones.incomeTypes[item]; }
    });
    // handle deletions: if inc is missing an item that we have but tombstone newer
    Object.entries(syncMeta.tombstones.incomeTypes).forEach(([item, ts]) => {
      const localTs = state._incomeTypesMeta[item] || 0;
      if (ts > localTs) curSet.delete(item);
    });
    // also check for explicit deletes in inc.deleted
    const incDel = (inc.deleted && inc.deleted.incomeTypes) || {};
    if (typeof incDel === 'object' && !Array.isArray(incDel)) {
      Object.entries(incDel).forEach(([item, ts]) => {
        const cur = syncMeta.tombstones.incomeTypes[item] || 0;
        if (ts > cur) { syncMeta.tombstones.incomeTypes[item] = ts; curSet.delete(item); state._incomeTypesMeta[item] = ts; }
      });
    }
    state.incomeTypes = [...curSet];
  }
  // expenseCategories per-item LWW
  if (Array.isArray(inc.expenseCategories)) {
    const curSet = new Set(state.expenseCategories || []);
    inc.expenseCategories.forEach((item) => {
      const incTs = incExpenseMeta[item] || incomingRev || 0;
      const localTs = state._expenseCategoriesMeta[item] || 0;
      const tombTs = syncMeta.tombstones.expenseCategories[item] || 0;
      if (incTs > localTs && incTs > tombTs) { curSet.add(item); state._expenseCategoriesMeta[item] = incTs; delete syncMeta.tombstones.expenseCategories[item]; }
    });
    Object.entries(syncMeta.tombstones.expenseCategories).forEach(([item, ts]) => {
      const localTs = state._expenseCategoriesMeta[item] || 0;
      if (ts > localTs) curSet.delete(item);
    });
    const incDel2 = (inc.deleted && inc.deleted.expenseCategories) || {};
    if (typeof incDel2 === 'object' && !Array.isArray(incDel2)) {
      Object.entries(incDel2).forEach(([item, ts]) => {
        const cur = syncMeta.tombstones.expenseCategories[item] || 0;
        if (ts > cur) { syncMeta.tombstones.expenseCategories[item] = ts; curSet.delete(item); state._expenseCategoriesMeta[item] = ts; }
      });
    }
    state.expenseCategories = [...curSet];
  }
  // Merge kanban lists (Trello) — union, incoming wins for same id
  if (Array.isArray(inc.kanbanLists) && inc.kanbanLists.length) {
    const map = new Map((state.kanbanLists || []).map((l) => [l.id, l]));
    inc.kanbanLists.forEach((l) => { if (l && l.id) map.set(l.id, l); });
    state.kanbanLists = [...map.values()];
  }
  state.achievements = Object.assign({}, state.achievements || {});
  Object.keys(inc.achievements || {}).forEach((k) => {
    const iu = (inc.achievements[k] || {}).unlockedAt || 0;
    if (!state.achievements[k] || iu > ((state.achievements[k] || {}).unlockedAt || 0)) state.achievements[k] = inc.achievements[k];
  });
  const changed = before !== key(state.tasks) + key(state.goals) + key(state.habits) + key(state.notes) + key(state.recordings) + key(state.projects) + key(state.krHistory) + key(state.income) + key(state.expenses) + key(state.students) + key(state.attendance) + key(state.assignments) + key(state.lessonPlans) + JSON.stringify(state.kanbanLists || []) + JSON.stringify(state.tagColors || {}) + keyAch(state.achievements);
  return changed;
}
