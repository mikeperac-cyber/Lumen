import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { backfillStudentIds } from '../../src/lib/students.js';

const roster = [
  { id: 's-ana', name: 'Ana' },
  { id: 's-caner', name: 'Caner Yilmaz' },
];

describe('backfillStudentIds', () => {
  it('sets studentId from a name match and keeps the name', () => {
    const state = { students: roster, income: [{ id: 'i1', student: 'Caner Yilmaz', amount: 1500 }], expectedIncome: [], assignments: [], attendance: [] };
    const r = backfillStudentIds(state);
    assert.equal(state.income[0].studentId, 's-caner');
    assert.equal(state.income[0].student, 'Caner Yilmaz');
    assert.equal(r.linked, 1);
    assert.deepEqual(r.orphans, []);
  });

  it('is idempotent — a second run changes nothing', () => {
    const state = { students: roster, income: [{ id: 'i1', student: 'Ana', studentId: 's-ana' }], expectedIncome: [], assignments: [], attendance: [] };
    const r = backfillStudentIds(state);
    assert.equal(r.linked, 0);
  });

  it('leaves an unmatched name unlinked and reports it as an orphan', () => {
    const state = { students: roster, income: [{ id: 'i1', student: 'Nobody', amount: 10 }], expectedIncome: [], assignments: [], attendance: [] };
    const r = backfillStudentIds(state);
    assert.equal(state.income[0].studentId, undefined);
    assert.deepEqual(r.orphans, ['Nobody']);
  });

  it('handles the assignments studentName field', () => {
    const state = { students: roster, income: [], expectedIncome: [], assignments: [{ id: 'a1', studentName: 'Ana' }], attendance: [] };
    backfillStudentIds(state);
    assert.equal(state.assignments[0].studentId, 's-ana');
  });

  it('keeps the first id when two students share a name', () => {
    const dup = [{ id: 's-1', name: 'Sam' }, { id: 's-2', name: 'Sam' }];
    const state = { students: dup, income: [{ id: 'i1', student: 'Sam' }], expectedIncome: [], assignments: [], attendance: [] };
    backfillStudentIds(state);
    assert.equal(state.income[0].studentId, 's-1');
  });
});
