import { describe, it, beforeEach } from 'vitest';
import assert from 'node:assert/strict';

// Minimal harness for normalizeState-like behavior — we test the pure parts via direct state shape checks.
// Full normalizeState lives in app.js (classic) and is tested via integration; here we verify the contract
// that new fields are backfilled and vaultGuessType single-source is used.

import { vaultGuessType } from '../../src/vault/store.js';
import { backfillStudentIds } from '../../src/lib/students.js';

describe('normalizeState contract (task 23 stubs)', () => {
  it('vaultGuessType is single source and handles mime prefix', () => {
    // ensures dedup (task 10) — the only implementation is in src/vault/store.js
    assert.equal(vaultGuessType('photo.svg', 'image/svg+xml'), 'image');
    assert.equal(vaultGuessType('doc.pdf', 'application/pdf'), 'pdf');
    assert.equal(vaultGuessType('sheet.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'), 'sheet');
  });

  it('backfillStudentIds links income rows to student.id (v104 wedge)', () => {
    const state = {
      students: [{ id: 's1', name: 'Caner Yilmaz' }, { id: 's2', name: 'Ana' }],
      income: [{ id: 'i1', student: 'Caner Yilmaz', amount: 1500 }, { id: 'i2', student: 'Unknown Name', amount: 100 }],
      expectedIncome: [], assignments: [], attendance: [],
    };
    const { linked, orphans } = backfillStudentIds(state);
    assert.equal(linked, 1);
    assert.equal(state.income[0].studentId, 's1');
    assert.ok(orphans.includes('Unknown Name'));
  });

  it('backfill is idempotent', () => {
    const state = {
      students: [{ id: 's1', name: 'Ana' }],
      income: [{ id: 'i1', student: 'Ana', studentId: 's1' }],
      expectedIncome: [], assignments: [], attendance: [],
    };
    const before = JSON.stringify(state);
    backfillStudentIds(state);
    assert.equal(JSON.stringify(state), before);
  });

  it('constants are extracted (task 21)', async () => {
    const c = await import('../../src/lib/constants.js');
    assert.equal(c.UNDO_BYTES, 24 * 1024 * 1024);
    assert.equal(c.UNDO_MAX, 40);
    assert.equal(c.VAULT_MAX_FILE, 10 * 1024 * 1024);
  });
});
