import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { applyMerge } from '../../src/lib/merge.js';

function baseState() {
  return {
    tasks: [], goals: [], habits: [], notes: [], recordings: [], projects: [],
    krHistory: [], income: [], expenses: [], expectedIncome: [], expectedExpenses: [],
    students: [], attendance: [], assignments: [], lessonPlans: [], kanbanLists: [],
    tagColors: {}, achievements: {},
    _tagColorMeta: {}, _incomeTypesMeta: {}, _expenseCategoriesMeta: {},
    incomeTypes: [], expenseCategories: [],
  };
}
function baseSyncMeta() {
  return { rev: 1, tombstones: { tasks: [], goals: [], habits: [], notes: [], recordings: [] } };
}

describe('merge.applyMerge — items', () => {
  it('adds an incoming task and reports changed', () => {
    const state = baseState();
    const syncMeta = baseSyncMeta();
    const changed = applyMerge({ state, syncMeta, inc: { tasks: [{ id: 't1', title: 'A', updatedAt: 10 }] }, incomingRev: 2 });
    assert.equal(changed, true);
    assert.equal(state.tasks.length, 1);
  });

  it('keeps the newer updatedAt on conflict', () => {
    const state = baseState();
    state.tasks = [{ id: 't1', title: 'local', updatedAt: 20 }];
    const syncMeta = baseSyncMeta();
    applyMerge({ state, syncMeta, inc: { tasks: [{ id: 't1', title: 'remote-old', updatedAt: 10 }] }, incomingRev: 2 });
    assert.equal(state.tasks[0].title, 'local');
    applyMerge({ state, syncMeta, inc: { tasks: [{ id: 't1', title: 'remote-new', updatedAt: 30 }] }, incomingRev: 3 });
    assert.equal(state.tasks[0].title, 'remote-new');
  });

  it('honors a tombstone: a deleted id is not re-added', () => {
    const state = baseState();
    const syncMeta = baseSyncMeta();
    syncMeta.tombstones.tasks = ['t1'];
    const changed = applyMerge({ state, syncMeta, inc: { tasks: [{ id: 't1', title: 'zombie', updatedAt: 99 }] }, incomingRev: 2 });
    assert.equal(state.tasks.length, 0);
    assert.equal(changed, false);
  });

  it('reports not-changed when nothing is new', () => {
    const state = baseState();
    state.tasks = [{ id: 't1', title: 'A', updatedAt: 10 }];
    const syncMeta = baseSyncMeta();
    const changed = applyMerge({ state, syncMeta, inc: { tasks: [{ id: 't1', title: 'A', updatedAt: 10 }] }, incomingRev: 2 });
    assert.equal(changed, false);
  });

  it('propagates an incoming delete into the local tombstone set', () => {
    const state = baseState();
    state.tasks = [{ id: 't1', title: 'A', updatedAt: 10 }];
    const syncMeta = baseSyncMeta();
    const changed = applyMerge({ state, syncMeta, inc: { deleted: { tasks: ['t1'] } }, incomingRev: 2 });
    assert.equal(state.tasks.length, 0);
    assert.ok(syncMeta.tombstones.tasks.includes('t1'));
    assert.equal(changed, true);
  });
});

describe('merge.applyMerge — tagColors per-key LWW', () => {
  it('applies an incoming color with a newer meta timestamp', () => {
    const state = baseState();
    const syncMeta = baseSyncMeta();
    applyMerge({ state, syncMeta, inc: { tagColors: { work: '#f00' }, _tagColorMeta: { work: 50 } }, incomingRev: 2 });
    assert.equal(state.tagColors.work, '#f00');
  });
  it('deletes a key when the incoming tombstone is newer', () => {
    const state = baseState();
    state.tagColors = { work: '#f00' };
    state._tagColorMeta = { work: 10 };
    const syncMeta = baseSyncMeta();
    applyMerge({ state, syncMeta, inc: { deleted: { tagColors: { work: 40 } } }, incomingRev: 2 });
    assert.equal(state.tagColors.work, undefined);
  });
  it('ignores an older incoming color', () => {
    const state = baseState();
    state.tagColors = { work: '#0f0' };
    state._tagColorMeta = { work: 100 };
    const syncMeta = baseSyncMeta();
    applyMerge({ state, syncMeta, inc: { tagColors: { work: '#f00' }, _tagColorMeta: { work: 50 } }, incomingRev: 2 });
    assert.equal(state.tagColors.work, '#0f0');
  });
});

describe('merge.applyMerge — incomeTypes union + tombstone', () => {
  it('unions a new income type', () => {
    const state = baseState();
    state.incomeTypes = ['ESL'];
    const syncMeta = baseSyncMeta();
    applyMerge({ state, syncMeta, inc: { incomeTypes: ['ESL', 'IELTS'], _incomeTypesMeta: { IELTS: 5 } }, incomingRev: 2 });
    assert.deepEqual([...state.incomeTypes].sort(), ['ESL', 'IELTS']);
  });
});

describe('merge.applyMerge — vaultItems/Collections LWW + tombstone migration', () => {
  it('vaultItems: newer updatedAt wins', () => {
    const state = baseState();
    state.vaultItems = [{ id: 'v1', title: 'local', updatedAt: 20 }];
    state._vaultItemsMeta = { v1: 20 };
    const syncMeta = baseSyncMeta();
    syncMeta.tombstones.vaultItems = [];
    syncMeta.tombstones.vaultCollections = {};
    applyMerge({ state, syncMeta, inc: { vaultItems: [{ id: 'v1', title: 'remote-old', updatedAt: 10 }], _vaultItemsMeta: { v1: 10 } }, incomingRev: 2 });
    assert.equal(state.vaultItems[0].title, 'local');
    applyMerge({ state, syncMeta, inc: { vaultItems: [{ id: 'v1', title: 'remote-new', updatedAt: 30 }], _vaultItemsMeta: { v1: 30 } }, incomingRev: 3 });
    assert.equal(state.vaultItems[0].title, 'remote-new');
  });
  it('vaultItems tombstone array blocks re-add', () => {
    const state = baseState();
    const syncMeta = baseSyncMeta();
    syncMeta.tombstones.vaultItems = ['v1'];
    syncMeta.tombstones.vaultCollections = {};
    const changed = applyMerge({ state, syncMeta, inc: { vaultItems: [{ id: 'v1', title: 'zombie', updatedAt: 99 }], _vaultItemsMeta: { v1: 99 } }, incomingRev: 2 });
    assert.equal(state.vaultItems.length, 0);
    // meta still advances, so overall changed is true (item blocked but meta updated)
    assert.equal(changed, true);
  });
  it('vaultCollections tombstone object blocks re-add and migrates [] vs {}', () => {
    const state = baseState();
    state.vaultCollections = [{ id: 'col1', title: 'Keep', updatedAt: 10 }];
    state._vaultCollectionsMeta = { col1: 10 };
    const syncMeta = baseSyncMeta();
    syncMeta.tombstones.vaultItems = [];
    syncMeta.tombstones.vaultCollections = { col1: Date.now() };
    const changed = applyMerge({ state, syncMeta, inc: { vaultCollections: [{ id: 'col1', title: 'zombie', updatedAt: 99 }], _vaultCollectionsMeta: { col1: 99 } }, incomingRev: 2 });
    assert.equal(state.vaultCollections.length, 0);
    assert.equal(changed, true);
  });
  it('migrates legacy vault tombstones [] vs {} without throwing', () => {
    const state = baseState();
    const syncMeta = baseSyncMeta();
    syncMeta.tombstones.vaultItems = ['old1'];
    syncMeta.tombstones.vaultCollections = ['oldCol'];
    assert.doesNotThrow(() => applyMerge({ state, syncMeta, inc: { vaultItems: [], vaultCollections: [] }, incomingRev: 2 }));
    assert.ok(typeof syncMeta.tombstones.vaultCollections === 'object' && !Array.isArray(syncMeta.tombstones.vaultCollections));
  });
});
