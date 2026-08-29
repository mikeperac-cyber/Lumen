import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import {
  matchesFinanceFilter, sumByMonth, sumAll, perStudentBalances, overdueExpectedPayments,
  savingsRate, estimateRunway,
  sixMonthTrend, groupByField,
} from '../../src/finance/store.js';

const tx = (over = {}) => ({ id: 'x', amount: 100, currency: 'USD', date: '2026-08-15', ...over });

describe('matchesFinanceFilter', () => {
  it('passes everything when both filters are ALL', () => {
    assert.equal(matchesFinanceFilter(tx(), { currency: 'ALL', student: 'ALL' }), true);
  });

  it('filters by currency, defaulting a missing currency to USD', () => {
    assert.equal(matchesFinanceFilter(tx({ currency: 'TRY' }), { currency: 'USD', student: 'ALL' }), false);
    assert.equal(matchesFinanceFilter({ ...tx(), currency: undefined }, { currency: 'USD', student: 'ALL' }), true);
  });

  it('matches a named student by name or by FK id', () => {
    const byName = tx({ student: 'Ada' });
    const byId = tx({ studentId: 's1' });
    assert.equal(matchesFinanceFilter(byName, { currency: 'ALL', student: 'Ada' }), true);
    assert.equal(matchesFinanceFilter(byId, { currency: 'ALL', student: 'Ada', studentId: 's1' }), true);
    assert.equal(matchesFinanceFilter(tx({ student: 'Beto' }), { currency: 'ALL', student: 'Ada' }), false);
  });

  it('the __NONE__ filter matches only entries with no student at all', () => {
    assert.equal(matchesFinanceFilter(tx(), { currency: 'ALL', student: '__NONE__' }), true);
    assert.equal(matchesFinanceFilter(tx({ student: 'Ada' }), { currency: 'ALL', student: '__NONE__' }), false);
    assert.equal(matchesFinanceFilter(tx({ studentId: 's1' }), { currency: 'ALL', student: '__NONE__' }), false);
  });
});

describe('sumByMonth / sumAll', () => {
  it('sums only entries dated within the given month', () => {
    const entries = [tx({ amount: 10, date: '2026-08-01' }), tx({ amount: 20, date: '2026-08-31' }), tx({ amount: 999, date: '2026-07-31' })];
    assert.equal(sumByMonth(entries, '2026-08'), 30);
  });
  it('treats a missing amount as zero rather than NaN', () => {
    assert.equal(sumByMonth([tx({ amount: undefined, date: '2026-08-01' })], '2026-08'), 0);
  });
  it('sums every entry regardless of date', () => {
    assert.equal(sumAll([tx({ amount: 10 }), tx({ amount: 5, date: '2020-01-01' })]), 15);
  });
});

describe('perStudentBalances', () => {
  const student = (over = {}) => ({ id: 's1', name: 'Ada', status: 'active', ...over });

  it('rolls up paid and expected per currency for an active student', () => {
    const rows = perStudentBalances(
      [student()],
      [tx({ studentId: 's1', amount: 100, currency: 'USD' })],
      [tx({ studentId: 's1', amount: 150, currency: 'USD' })],
    );
    assert.equal(rows.length, 1);
    assert.deepEqual(rows[0], { studentId: 's1', name: 'Ada', currency: 'USD', paid: 100, expected: 150, outstanding: 50, pct: 67 });
  });

  it('matches by name when a legacy entry has no studentId', () => {
    const rows = perStudentBalances([student()], [tx({ student: 'Ada', amount: 40 })], []);
    assert.equal(rows[0].paid, 40);
  });

  it('never reports negative outstanding when paid exceeds expected', () => {
    const rows = perStudentBalances([student()], [tx({ studentId: 's1', amount: 200 })], [tx({ studentId: 's1', amount: 100 })]);
    assert.equal(rows[0].outstanding, 0);
    assert.equal(rows[0].pct, 100);
  });

  it('reports full percent when something was paid with nothing expected', () => {
    const rows = perStudentBalances([student()], [tx({ studentId: 's1', amount: 50 })], []);
    assert.equal(rows[0].pct, 100);
  });

  it('produces one row per currency a student has activity in', () => {
    const rows = perStudentBalances(
      [student()],
      [tx({ studentId: 's1', currency: 'USD', amount: 100 }), tx({ studentId: 's1', currency: 'TRY', amount: 500 })],
      [],
    );
    assert.equal(rows.length, 2);
    assert.deepEqual(rows.map((r) => r.currency).sort(), ['TRY', 'USD']);
  });

  it('skips an inactive student and a student with no activity in either direction', () => {
    const rows = perStudentBalances(
      [student({ id: 's2', name: 'Inactive', status: 'inactive' }), student({ id: 's3', name: 'NoActivity' })],
      [tx({ studentId: 's2', amount: 100 })],
      [],
    );
    assert.equal(rows.length, 0);
  });
});

describe('overdueExpectedPayments', () => {
  const expected = (over = {}) => ({ id: 'e1', amount: 100, currency: 'USD', date: '2026-08-01', type: 'ESL', ...over });
  const actual = (over = {}) => ({ id: 'a1', amount: 100, currency: 'USD', date: '2026-08-03', type: 'ESL', ...over });
  const TODAY = '2026-08-15';

  it('flags an expected income with no matching actual payment', () => {
    const out = overdueExpectedPayments([expected()], [], [], [], TODAY);
    assert.equal(out.length, 1);
    assert.equal(out[0].kind, 'income');
  });

  it('clears the flag once a matching payment exists in the same month', () => {
    const out = overdueExpectedPayments([expected()], [], [actual()], [], TODAY);
    assert.equal(out.length, 0);
  });

  it('matches within a small rounding tolerance, not exactly', () => {
    const out = overdueExpectedPayments([expected({ amount: 100 })], [], [actual({ amount: 100.5 })], [], TODAY);
    assert.equal(out.length, 0);
  });

  it('does not match a payment for a different type', () => {
    const out = overdueExpectedPayments([expected({ type: 'ESL' })], [], [actual({ type: 'IELTS' })], [], TODAY);
    assert.equal(out.length, 1);
  });

  it('does not match a payment made in a different month', () => {
    const out = overdueExpectedPayments([expected({ date: '2026-08-01' })], [], [actual({ date: '2026-07-30' })], [], TODAY);
    assert.equal(out.length, 1);
  });

  it('does not flag an expected payment whose date has not arrived yet', () => {
    const out = overdueExpectedPayments([expected({ date: '2026-09-01' })], [], [], [], TODAY);
    assert.equal(out.length, 0);
  });

  it('matches an expected expense by category rather than type', () => {
    const expExp = { id: 'ee1', amount: 50, currency: 'USD', date: '2026-08-01', category: 'Rent' };
    const paidExp = { id: 'p1', amount: 50, currency: 'USD', date: '2026-08-05', category: 'Rent' };
    assert.equal(overdueExpectedPayments([], [expExp], [], [], TODAY).length, 1);
    assert.equal(overdueExpectedPayments([], [expExp], [], [paidExp], TODAY).length, 0);
  });
});

describe('savingsRate', () => {
  it('is the fraction of income left after expenses, as a whole percent', () => {
    assert.equal(savingsRate(1000, 700), 30);
  });
  it('is zero when there is no income, not NaN or negative infinity', () => {
    assert.equal(savingsRate(0, 500), 0);
  });
});

describe('estimateRunway', () => {
  it('is zero months when there is nothing saved or nothing being spent', () => {
    assert.equal(estimateRunway(0, 500), '0.0');
    assert.equal(estimateRunway(1000, 0), '0.0');
  });
  it('divides savings by the average monthly burn', () => {
    assert.equal(estimateRunway(2500, 1000), '2.5');
  });
});

describe('sixMonthTrend', () => {
  const REF = new Date(2026, 7, 15); // August 2026
  const tx = (date, amount) => ({ date, amount });

  it('spans the six months ending on the reference month, oldest first', () => {
    const trend = sixMonthTrend([], [], REF);
    assert.deepEqual(trend.labels, ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug']);
  });

  it('sums income and expenses into the matching month bucket', () => {
    const trend = sixMonthTrend(
      [tx('2026-08-01', 100), tx('2026-06-01', 50)],
      [tx('2026-08-02', 30)],
      REF,
    );
    assert.equal(trend.incomeData[5], 100); // Aug
    assert.equal(trend.incomeData[3], 50); // Jun
    assert.equal(trend.expenseData[5], 30);
  });

  it('excludes a transaction outside the six-month window', () => {
    const trend = sixMonthTrend([tx('2025-01-01', 999)], [], REF);
    assert.equal(trend.incomeData.reduce((s, v) => s + v, 0), 0);
  });

  it('reports a max of at least 1, never zero, so a chart never divides by zero', () => {
    assert.equal(sixMonthTrend([], [], REF).max, 1);
  });

  it('reports the true peak across both series', () => {
    const trend = sixMonthTrend([tx('2026-08-01', 500)], [tx('2026-08-01', 200)], REF);
    assert.equal(trend.max, 500);
  });
});

describe('groupByField', () => {
  const tx = (over) => ({ amount: 0, date: '2026-08-01', ...over });

  it('sums amounts by field value within the given month', () => {
    const g = groupByField([tx({ type: 'ESL', amount: 100 }), tx({ type: 'ESL', amount: 50 }), tx({ type: 'IELTS', amount: 30 })], '2026-08', 'type');
    assert.deepEqual(g.entries, [['ESL', 150], ['IELTS', 30]]);
  });

  it('sorts entries largest first', () => {
    const g = groupByField([tx({ type: 'B', amount: 10 }), tx({ type: 'A', amount: 90 })], '2026-08', 'type');
    assert.deepEqual(g.entries.map((e) => e[0]), ['A', 'B']);
  });

  it('falls back to "Other" when the field is missing', () => {
    const g = groupByField([tx({ amount: 20 })], '2026-08', 'type');
    assert.deepEqual(g.entries, [['Other', 20]]);
  });

  it('excludes entries outside the given month', () => {
    const g = groupByField([tx({ type: 'ESL', amount: 100, date: '2026-07-01' })], '2026-08', 'type');
    assert.deepEqual(g.entries, []);
  });

  it('reports the top entry\'s amount as max, or 1 when there are no entries', () => {
    assert.equal(groupByField([tx({ type: 'A', amount: 40 })], '2026-08', 'type').max, 40);
    assert.equal(groupByField([], '2026-08', 'type').max, 1);
  });
});
