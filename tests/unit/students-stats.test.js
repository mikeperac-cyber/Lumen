import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { getStudentStats, formatStudentRevenue } from '../../src/lib/students.js';

const student = (over = {}) => ({ id: 's1', name: 'Ada', ...over });
const collections = (over = {}) => ({
  income: [], expectedIncome: [], tasks: [], notes: [], attendance: [], assignments: [], lessonPlans: [], ...over,
});

describe('getStudentStats', () => {
  it('counts income matched by studentId even when the name string is stale', () => {
    // The entry was logged before the student was renamed: the FK is right, the
    // display name on the transaction is not. This is the exact shape a rename or an
    // auto-billed attendance entry produces.
    const stats = getStudentStats(student({ name: 'New Name' }), collections({
      income: [{ studentId: 's1', student: 'Old Name', amount: 100, currency: 'USD' }],
    }));
    assert.equal(stats.usdPaid, 100);
    assert.equal(stats.lessonsCount, 1);
  });

  it('still matches legacy entries that only carry the name, no FK', () => {
    const stats = getStudentStats(student(), collections({
      income: [{ student: 'Ada', amount: 50, currency: 'USD' }],
    }));
    assert.equal(stats.usdPaid, 50);
  });

  it('does not double-count an entry that matches both by name and by FK', () => {
    const stats = getStudentStats(student(), collections({
      income: [{ studentId: 's1', student: 'Ada', amount: 50, currency: 'USD' }],
    }));
    assert.equal(stats.lessonsCount, 1);
    assert.equal(stats.usdPaid, 50);
  });

  it('never attributes another student’s income', () => {
    const stats = getStudentStats(student(), collections({
      income: [{ studentId: 's2', student: 'Someone Else', amount: 999, currency: 'USD' }],
    }));
    assert.equal(stats.usdPaid, 0);
    assert.equal(stats.lessonsCount, 0);
  });

  it('splits paid totals by currency', () => {
    const stats = getStudentStats(student(), collections({
      income: [{ studentId: 's1', amount: 100, currency: 'USD' }, { studentId: 's1', amount: 500, currency: 'TRY' }],
    }));
    assert.equal(stats.usdPaid, 100);
    assert.equal(stats.tryPaid, 500);
  });

  it('counts expected (pending) income the same FK-first way as actual income', () => {
    const stats = getStudentStats(student({ name: 'New Name' }), collections({
      expectedIncome: [{ studentId: 's1', student: 'Old Name', amount: 100 }],
    }));
    assert.equal(stats.pendingCount, 1);
  });

  it('counts open tasks assigned to the student by name', () => {
    const stats = getStudentStats(student(), collections({
      tasks: [{ student: 'Ada', status: 'today' }, { student: 'Ada', status: 'done' }, { student: 'Someone Else', status: 'today' }],
    }));
    assert.equal(stats.pendingTasks, 1);
  });

  it('counts attendance, assignments and lesson plans by FK or by name', () => {
    const stats = getStudentStats(student({ name: 'New Name' }), collections({
      attendance: [{ studentId: 's1', studentName: 'Old Name' }],
      assignments: [{ studentName: 'New Name' }],
      lessonPlans: [{ studentId: 's1' }],
    }));
    assert.equal(stats.attCount, 1);
    assert.equal(stats.assignCount, 1);
    assert.equal(stats.plansCount, 1);
  });
});

describe('formatStudentRevenue', () => {
  it('leads with the student\'s own currency', () => {
    assert.equal(formatStudentRevenue({ usdPaid: 100, tryPaid: 0 }, 'USD'), '$100');
    assert.equal(formatStudentRevenue({ usdPaid: 0, tryPaid: 500 }, 'TRY'), '₺500');
  });

  it('appends the other currency only when there is activity in it', () => {
    assert.equal(formatStudentRevenue({ usdPaid: 100, tryPaid: 500 }, 'USD'), '$100 · ₺500');
    assert.equal(formatStudentRevenue({ usdPaid: 100, tryPaid: 0 }, 'TRY'), '₺0 · $100');
  });

  it('formats large amounts with thousands separators', () => {
    assert.equal(formatStudentRevenue({ usdPaid: 12345, tryPaid: 0 }, 'USD'), '$12,345');
  });
});
