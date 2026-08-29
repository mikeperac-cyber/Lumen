// src/finance/store.js — finance arithmetic: filtering, monthly rollups, per-student
// balances and the overdue-payment matcher. Pure functions, no rendering — the SVG
// charts and markup stay in app.js pending a follow-on extraction, the same order
// store-before-view took for the vault, tasks and schedule modules.

/**
 * @typedef {object} FinanceFilter
 * @property {string} currency 'ALL' or a currency code
 * @property {string} student 'ALL', '__NONE__', or a student's display name
 * @property {string} [studentId] resolved FK for `student`, when it names one
 */

/**
 * Does a transaction pass the currency/student filter? Currency defaults to USD when
 * absent, matching every other place in the app that reads `entry.currency`.
 * @param {{currency?: string, student?: string, studentId?: string}} entry
 * @param {FinanceFilter} filter
 * @returns {boolean}
 */
export function matchesFinanceFilter(entry, filter) {
  const { currency = 'ALL', student = 'ALL', studentId = null } = filter || {};
  if (currency !== 'ALL' && (entry.currency || 'USD') !== currency) return false;
  if (student !== 'ALL') {
    if (student === '__NONE__') {
      if (entry.student || entry.studentId) return false;
    } else if (entry.student !== student && !(entry.studentId && entry.studentId === studentId)) {
      return false;
    }
  }
  return true;
}

/**
 * Sum of `amount` across entries dated within the given month.
 * @param {Array<{date?: string, amount?: number}>} entries
 * @param {string} monthISO 'YYYY-MM'
 * @returns {number}
 */
export function sumByMonth(entries, monthISO) {
  return (entries || [])
    .filter((e) => (e.date || '').startsWith(monthISO))
    .reduce((s, e) => s + (e.amount || 0), 0);
}

/**
 * Sum of `amount` across every entry, regardless of date.
 * @param {Array<{amount?: number}>} entries
 * @returns {number}
 */
export function sumAll(entries) {
  return (entries || []).reduce((s, e) => s + (e.amount || 0), 0);
}

const matchesStudent = (entry, student) =>
  entry.studentId ? entry.studentId === student.id : entry.student === student.name;

/**
 * Paid / Expected / Outstanding per active student, split by currency. Reads the
 * unfiltered income and expected-income lists directly — this rollup is meant to show
 * every student's full balance regardless of the page's currency/student filter.
 * @param {Array<{id:string,name:string,status?:string}>} students
 * @param {object[]} income
 * @param {object[]} expectedIncome
 * @returns {Array<{studentId:string,name:string,currency:string,paid:number,expected:number,outstanding:number,pct:number}>}
 */
export function perStudentBalances(students, income, expectedIncome) {
  const rows = [];
  for (const s of students) {
    if ((s.status || 'active') !== 'active') continue;
    const paidBy = {}, expBy = {};
    (income || []).filter((e) => matchesStudent(e, s)).forEach((e) => {
      const c = e.currency || 'USD'; paidBy[c] = (paidBy[c] || 0) + (e.amount || 0);
    });
    (expectedIncome || []).filter((e) => matchesStudent(e, s)).forEach((e) => {
      const c = e.currency || 'USD'; expBy[c] = (expBy[c] || 0) + (e.amount || 0);
    });
    const currencies = [...new Set([...Object.keys(paidBy), ...Object.keys(expBy)])];
    for (const c of currencies) {
      const paid = paidBy[c] || 0, expected = expBy[c] || 0;
      const outstanding = Math.max(0, expected - paid);
      const pct = expected ? Math.min(100, Math.round((paid / expected) * 100)) : (paid ? 100 : 0);
      rows.push({ studentId: s.id, name: s.name, currency: c, paid, expected, outstanding, pct });
    }
  }
  return rows;
}

/**
 * Expected income/expense entries whose due date has arrived with no matching actual
 * transaction. A match requires the same type (income) or category (expense), an
 * amount within $1 (protects against rounding, not a real tolerance for a different
 * payment), and the same calendar month — a payment made in an adjacent month is not
 * matched, so it keeps showing as overdue. That is the existing behaviour, carried
 * over rather than silently changed.
 * @param {object[]} expectedIncome
 * @param {object[]} expectedExpenses
 * @param {object[]} income
 * @param {object[]} expenses
 * @param {string} todayISO
 * @returns {Array<object & {kind: 'income'|'expense'}>}
 */
export function overdueExpectedPayments(expectedIncome, expectedExpenses, income, expenses, todayISO) {
  const sameMonth = (a, b) => (a || '').slice(0, 7) === (b || '').slice(0, 7);
  const isDue = (e) => (e.date || '') <= todayISO;

  const unpaidIncome = (expectedIncome || [])
    .filter((e) => isDue(e) && !(income || []).some((i) =>
      i.type === e.type && Math.abs(i.amount - e.amount) < 1 && sameMonth(i.date, e.date)))
    .map((e) => ({ ...e, kind: 'income' }));

  const unpaidExpenses = (expectedExpenses || [])
    .filter((e) => isDue(e) && !(expenses || []).some((x) =>
      x.category === e.category && Math.abs(x.amount - e.amount) < 1 && sameMonth(x.date, e.date)))
    .map((e) => ({ ...e, kind: 'expense' }));

  return [...unpaidIncome, ...unpaidExpenses];
}

/**
 * What fraction of this month's income was not spent, as a whole percent.
 * @param {number} monthIncome
 * @param {number} monthExpense
 * @returns {number}
 */
export function savingsRate(monthIncome, monthExpense) {
  return monthIncome > 0 ? Math.round(((monthIncome - monthExpense) / monthIncome) * 100) : 0;
}

/**
 * Months of runway at the given burn rate. '0.0' when there is nothing saved or
 * nothing being spent, rather than Infinity or a divide-by-zero NaN.
 * @param {number} totalNet
 * @param {number} avgMonthlyBurn
 * @returns {string} one decimal place, to match the UI's existing format
 */
export function estimateRunway(totalNet, avgMonthlyBurn) {
  return totalNet > 0 && avgMonthlyBurn > 0 ? (totalNet / avgMonthlyBurn).toFixed(1) : '0.0';
}

/**
 * Net income/expense per month for the six months ending on `referenceDate`,
 * oldest first — the data behind the trend chart. `max` is at least 1 so a chart
 * dividing by it never divides by zero.
 * @param {object[]} income
 * @param {object[]} expenses
 * @param {Date} referenceDate
 * @returns {{labels: string[], incomeData: number[], expenseData: number[], max: number}}
 */
export function sixMonthTrend(income, expenses, referenceDate) {
  const labels = [], incomeData = [], expenseData = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(referenceDate);
    d.setDate(1); // avoid setMonth rolling over on a day that doesn't exist in the target month
    d.setMonth(d.getMonth() - i);
    const monthISO = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    labels.push(d.toLocaleDateString(undefined, { month: 'short' }));
    incomeData.push(sumByMonth(income, monthISO));
    expenseData.push(sumByMonth(expenses, monthISO));
  }
  return { labels, incomeData, expenseData, max: Math.max(...incomeData, ...expenseData, 1) };
}

/**
 * Sums entries within a month, grouped by a field (type, category, ...), sorted
 * largest first. A missing field value falls back to "Other" rather than being
 * dropped. Shared by income-by-type and expense-by-category, which were previously
 * two copies of the identical loop.
 * @param {object[]} entries
 * @param {string} monthISO
 * @param {string} field
 * @returns {{entries: Array<[string, number]>, max: number}}
 */
export function groupByField(entries, monthISO, field) {
  const totals = {};
  entries.filter((e) => (e.date || '').startsWith(monthISO)).forEach((e) => {
    const key = e[field] || 'Other';
    totals[key] = (totals[key] || 0) + (e.amount || 0);
  });
  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  return { entries: sorted, max: sorted.length ? sorted[0][1] : 1 };
}
