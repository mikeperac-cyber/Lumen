// src/lib/merge.js
// P2P sync state merge — last-write-wins by updatedAt, with tombstones and
// per-key LWW for tagColors / incomeTypes / expenseCategories.
// Mutates ctx.state and ctx.syncMeta in place. No persistence, no rendering,
// no syncMeta.rev bump — the caller owns those side effects.

function sig(arr) {
  if (!arr || !arr.length) return '0:0';
  let max = 0;
  for (let i = 0; i < arr.length; i++) {
    const u = arr[i]?.updatedAt || 0;
    if (u > max) max = u;
  }
  return `${arr.length}:${max}`;
}

function sigAch(ach) {
  if (!ach) return '0:0';
  const keys = Object.keys(ach);
  let max = 0;
  for (let i = 0; i < keys.length; i++) {
    const u = ach[keys[i]]?.unlockedAt || 0;
    if (u > max) max = u;
  }
  return `${keys.length}:${max}`;
}

function sigMeta(obj) {
  if (!obj) return '0:0';
  const entries = Object.entries(obj);
  let max = 0;
  for (let i = 0; i < entries.length; i++) {
    const val = entries[i][1];
    const num = typeof val === 'number' ? val : 0;
    if (num > max) max = num;
  }
  return `${entries.length}:${max}`;
}

function sigTagColors(tc, meta) {
  if (!tc) return '0:0';
  const keys = Object.keys(tc);
  let max = 0;
  if (meta) {
    for (let i = 0; i < keys.length; i++) {
      const u = meta[keys[i]] || 0;
      if (u > max) max = u;
    }
  }
  return `${keys.length}:${max}`;
}

function sigStringArr(arr, meta) {
  if (!arr || !arr.length) return '0:0';
  let max = 0;
  if (meta) {
    for (let i = 0; i < arr.length; i++) {
      const u = meta[arr[i]] || 0;
      if (u > max) max = u;
    }
  }
  return `${arr.length}:${max}`;
}

function stateSig(s) {
  if (!s) return '';
  return [
    sig(s.tasks), sig(s.goals), sig(s.habits), sig(s.notes),
    sig(s.recordings), sig(s.projects), sig(s.krHistory),
    sig(s.income), sig(s.expenses), sig(s.expectedIncome), sig(s.expectedExpenses),
    sig(s.students), sig(s.attendance), sig(s.assignments), sig(s.lessonPlans),
    sig(s.vaultItems), sig(s.vaultCollections), sig(s.kanbanLists),
    sigAch(s.achievements),
    sigMeta(s._tagColorMeta), sigMeta(s._incomeTypesMeta), sigMeta(s._expenseCategoriesMeta),
    sigMeta(s._vaultItemsMeta), sigMeta(s._vaultCollectionsMeta),
    sigTagColors(s.tagColors, s._tagColorMeta),
    sigStringArr(s.incomeTypes, s._incomeTypesMeta),
    sigStringArr(s.expenseCategories, s._expenseCategoriesMeta)
  ].join('|');
}

const STANDARD_COLLECTIONS = [
  'tasks', 'goals', 'habits', 'notes', 'recordings',
  'projects', 'krHistory', 'income', 'expenses', 'expectedIncome',
  'expectedExpenses', 'students', 'attendance', 'assignments', 'lessonPlans'
];

function ensureMergeMeta(state, syncMeta) {
  if (!state._incomeTypesMeta) state._incomeTypesMeta = {};
  if (!state._expenseCategoriesMeta) state._expenseCategoriesMeta = {};
  if (!state._tagColorMeta) state._tagColorMeta = {};
  if (!syncMeta.tombstones) syncMeta.tombstones = { tasks: [], goals: [], habits: [], notes: [], recordings: [] };
  if (!syncMeta.tombstones.tagColors) syncMeta.tombstones.tagColors = {};
  if (!syncMeta.tombstones.incomeTypes) syncMeta.tombstones.incomeTypes = {};
  if (!syncMeta.tombstones.expenseCategories) syncMeta.tombstones.expenseCategories = {};
}

function mergeCollectionEntities(state, inc, mergeOne) {
  STANDARD_COLLECTIONS.forEach((key) => {
    state[key] = mergeOne(state[key], inc[key], key);
  });
}

function mergeTagColors(state, syncMeta, inc, incomingRev) {
  const incTagMeta = inc._tagColorMeta || {};
  if (!inc.tagColors && !Object.keys(incTagMeta).length && !inc.deleted) return;

  if (!state.tagColors) state.tagColors = {};
  const incomingDeletes = (inc.deleted && (inc.deleted.tagColors || inc.deleted._deleted)) || {};

  Object.entries(incomingDeletes).forEach(([k, ts]) => {
    const localTs = state._tagColorMeta[k] || 0;
    const tombTs = syncMeta.tombstones.tagColors[k] || 0;
    if (ts > localTs && ts > tombTs) {
      delete state.tagColors[k];
      state._tagColorMeta[k] = ts;
      syncMeta.tombstones.tagColors[k] = ts;
    }
  });

  if (inc.deleted && inc.deleted.tagColors && typeof inc.deleted.tagColors === 'object' && !Array.isArray(inc.deleted.tagColors)) {
    Object.entries(inc.deleted.tagColors).forEach(([k, ts]) => {
      const cur = syncMeta.tombstones.tagColors[k] || 0;
      if (ts > cur) syncMeta.tombstones.tagColors[k] = ts;
      const localTs = state._tagColorMeta[k] || 0;
      if (ts > localTs) {
        delete state.tagColors[k];
        state._tagColorMeta[k] = ts;
      }
    });
  }

  Object.entries(inc.tagColors || {}).forEach(([k, v]) => {
    const incTs = incTagMeta[k] || incomingRev || 0;
    const localTs = state._tagColorMeta[k] || 0;
    const tombTs = syncMeta.tombstones.tagColors[k] || 0;
    if (incTs > localTs && incTs > tombTs) {
      if (v) {
        state.tagColors[k] = v;
        state._tagColorMeta[k] = incTs;
        delete syncMeta.tombstones.tagColors[k];
      } else {
        delete state.tagColors[k];
        state._tagColorMeta[k] = incTs;
        syncMeta.tombstones.tagColors[k] = incTs;
      }
    }
  });

  Object.entries(inc.tagColors || {}).forEach(([k, v]) => {
    if (v == null) {
      const incTs = incTagMeta[k] || incomingRev || 0;
      const localTs = state._tagColorMeta[k] || 0;
      if (incTs > localTs) {
        delete state.tagColors[k];
        state._tagColorMeta[k] = incTs;
        syncMeta.tombstones.tagColors[k] = incTs;
      }
    }
  });
}

function mergeStringCategoryTypes(state, syncMeta, inc, incomingRev) {
  const incIncomeMeta = inc._incomeTypesMeta || {};
  if (Array.isArray(inc.incomeTypes)) {
    const curSet = new Set(state.incomeTypes || []);
    inc.incomeTypes.forEach((item) => {
      const incTs = incIncomeMeta[item] || incomingRev || 0;
      const localTs = state._incomeTypesMeta[item] || 0;
      const tombTs = syncMeta.tombstones.incomeTypes[item] || 0;
      if (incTs > localTs && incTs > tombTs) {
        curSet.add(item);
        state._incomeTypesMeta[item] = incTs;
        delete syncMeta.tombstones.incomeTypes[item];
      }
    });
    Object.entries(syncMeta.tombstones.incomeTypes).forEach(([item, ts]) => {
      const localTs = state._incomeTypesMeta[item] || 0;
      if (ts > localTs) curSet.delete(item);
    });
    const incDel = (inc.deleted && inc.deleted.incomeTypes) || {};
    if (typeof incDel === 'object' && !Array.isArray(incDel)) {
      Object.entries(incDel).forEach(([item, ts]) => {
        const cur = syncMeta.tombstones.incomeTypes[item] || 0;
        if (ts > cur) {
          syncMeta.tombstones.incomeTypes[item] = ts;
          curSet.delete(item);
          state._incomeTypesMeta[item] = ts;
        }
      });
    }
    state.incomeTypes = [...curSet];
  }

  const incExpenseMeta = inc._expenseCategoriesMeta || {};
  if (Array.isArray(inc.expenseCategories)) {
    const curSet = new Set(state.expenseCategories || []);
    inc.expenseCategories.forEach((item) => {
      const incTs = incExpenseMeta[item] || incomingRev || 0;
      const localTs = state._expenseCategoriesMeta[item] || 0;
      const tombTs = syncMeta.tombstones.expenseCategories[item] || 0;
      if (incTs > localTs && incTs > tombTs) {
        curSet.add(item);
        state._expenseCategoriesMeta[item] = incTs;
        delete syncMeta.tombstones.expenseCategories[item];
      }
    });
    Object.entries(syncMeta.tombstones.expenseCategories).forEach(([item, ts]) => {
      const localTs = state._expenseCategoriesMeta[item] || 0;
      if (ts > localTs) curSet.delete(item);
    });
    const incDel2 = (inc.deleted && inc.deleted.expenseCategories) || {};
    if (typeof incDel2 === 'object' && !Array.isArray(incDel2)) {
      Object.entries(incDel2).forEach(([item, ts]) => {
        const cur = syncMeta.tombstones.expenseCategories[item] || 0;
        if (ts > cur) {
          syncMeta.tombstones.expenseCategories[item] = ts;
          curSet.delete(item);
          state._expenseCategoriesMeta[item] = ts;
        }
      });
    }
    state.expenseCategories = [...curSet];
  }
}

function mergeKanbanLists(state, inc) {
  if (Array.isArray(inc.kanbanLists) && inc.kanbanLists.length) {
    const map = new Map((state.kanbanLists || []).map((l) => [l.id, l]));
    inc.kanbanLists.forEach((l) => { if (l && l.id) map.set(l.id, l); });
    state.kanbanLists = [...map.values()];
  }
}

function mergeVault(state, syncMeta, inc, incomingRev, mergeOne) {
  if (!state._vaultItemsMeta) state._vaultItemsMeta = {};
  if (!state._vaultCollectionsMeta) state._vaultCollectionsMeta = {};
  if (!syncMeta.tombstones) syncMeta.tombstones = {};
  if (!syncMeta.tombstones.vaultItems) syncMeta.tombstones.vaultItems = [];
  if (!syncMeta.tombstones.vaultCollections) syncMeta.tombstones.vaultCollections = {};

  const normalizeVaultTomb = (key) => {
    const v = syncMeta.tombstones[key];
    if (Array.isArray(v)) return new Set(v);
    if (v && typeof v === 'object') return new Set(Object.keys(v).filter((k) => v[k]));
    return new Set();
  };

  if (Array.isArray(inc.vaultItems) || (inc.deleted && inc.deleted.vaultItems)) {
    const origVaultTomb = syncMeta.tombstones.vaultItems;
    const isObj = origVaultTomb && typeof origVaultTomb === 'object' && !Array.isArray(origVaultTomb);
    if (isObj) syncMeta.tombstones.vaultItems = Object.keys(origVaultTomb).filter((k) => origVaultTomb[k]);
    state.vaultItems = mergeOne(state.vaultItems || [], inc.vaultItems || [], 'vaultItems');

    const incMeta = inc._vaultItemsMeta || {};
    Object.entries(incMeta).forEach(([id, ts]) => {
      const localTs = state._vaultItemsMeta[id] || 0;
      if (ts > localTs) state._vaultItemsMeta[id] = ts;
    });

    (inc.vaultItems || []).forEach((v) => {
      if (!v || !v.id) return;
      const ts = v.updatedAt || incomingRev || 0;
      if (ts > (state._vaultItemsMeta[v.id] || 0)) state._vaultItemsMeta[v.id] = ts;
    });

    if (inc.deleted && inc.deleted.vaultItems && typeof inc.deleted.vaultItems === 'object' && !Array.isArray(inc.deleted.vaultItems)) {
      Object.entries(inc.deleted.vaultItems).forEach(([id, ts]) => {
        const cur = (typeof syncMeta.tombstones.vaultItems === 'object' && !Array.isArray(syncMeta.tombstones.vaultItems)) ? (syncMeta.tombstones.vaultItems[id] || 0) : 0;
        if (ts > cur) {
          if (Array.isArray(syncMeta.tombstones.vaultItems)) {
            if (!syncMeta.tombstones.vaultItems.includes(id)) syncMeta.tombstones.vaultItems.push(id);
          } else syncMeta.tombstones.vaultItems[id] = ts;
          state._vaultItemsMeta[id] = ts;
          state.vaultItems = (state.vaultItems || []).filter((x) => x.id !== id);
        }
      });
    }
  } else if (inc.vaultItems) {
    const incMeta = inc._vaultItemsMeta || {};
    Object.entries(incMeta).forEach(([id, ts]) => {
      if (ts > (state._vaultItemsMeta[id] || 0)) state._vaultItemsMeta[id] = ts;
    });
  }

  if (Array.isArray(inc.vaultCollections)) {
    const tombSet = normalizeVaultTomb('vaultCollections');
    const incDeleted = inc.deleted && inc.deleted.vaultCollections;
    const delIds = incDeleted ? (Array.isArray(incDeleted) ? incDeleted : Object.keys(incDeleted).filter((k) => incDeleted[k])) : [];
    delIds.forEach((id) => tombSet.add(id));

    const tombObj = {};
    tombSet.forEach((id) => tombObj[id] = (syncMeta.tombstones.vaultCollections[id] || incDeleted?.[id] || Date.now()));
    syncMeta.tombstones.vaultCollections = tombObj;

    const map = new Map((state.vaultCollections || []).filter((c) => !tombSet.has(c.id)).map((c) => [c.id, c]));
    (inc.vaultCollections || []).forEach((c) => {
      if (!c || !c.id || tombSet.has(c.id)) return;
      const ex = map.get(c.id);
      const incTs = (inc._vaultCollectionsMeta && inc._vaultCollectionsMeta[c.id]) || c.updatedAt || incomingRev || 0;
      const localTs = state._vaultCollectionsMeta[c.id] || 0;
      if (!ex || incTs > localTs) {
        map.set(c.id, c);
        state._vaultCollectionsMeta[c.id] = incTs;
      }
    });
    state.vaultCollections = [...map.values()];

    Object.entries(inc._vaultCollectionsMeta || {}).forEach(([id, ts]) => {
      if (ts > (state._vaultCollectionsMeta[id] || 0)) state._vaultCollectionsMeta[id] = ts;
    });
  }
}

function mergeAchievements(state, inc) {
  state.achievements = Object.assign({}, state.achievements || {});
  Object.keys(inc.achievements || {}).forEach((k) => {
    const iu = (inc.achievements[k] || {}).unlockedAt || 0;
    if (!state.achievements[k] || iu > ((state.achievements[k] || {}).unlockedAt || 0)) state.achievements[k] = inc.achievements[k];
  });
}

/**
 * @param {{state:object, syncMeta:object, inc:object, incomingRev:number}} ctx
 * @returns {boolean} whether anything changed
 */
export function applyMerge({ state, syncMeta, inc, incomingRev }) {
  const before = stateSig(state);
  ensureMergeMeta(state, syncMeta);

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

  mergeCollectionEntities(state, inc, mergeOne);
  mergeTagColors(state, syncMeta, inc, incomingRev);
  mergeStringCategoryTypes(state, syncMeta, inc, incomingRev);
  mergeKanbanLists(state, inc);
  mergeVault(state, syncMeta, inc, incomingRev, mergeOne);
  mergeAchievements(state, inc);

  const changed = before !== stateSig(state);
  return changed;
}
