import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import {
  trendBarsSVG, categoryPieSVG, dailyExpenseLineSVG, overdueRowsHTML, transactionRowsHTML,
} from '../../src/finance/view.js';

describe('trendBarsSVG', () => {
  const trend = (over = {}) => ({ labels: ['Mar', 'Apr', 'May'], incomeData: [0, 0, 0], expenseData: [0, 0, 0], max: 1, ...over });

  it('draws one income bar and one expense bar per month', () => {
    const svg = trendBarsSVG(trend());
    assert.equal((svg.bars.match(/<rect/g) || []).length, 6); // 3 months x 2 bars
  });

  it('labels every month', () => {
    const svg = trendBarsSVG(trend());
    for (const m of ['Mar', 'Apr', 'May']) assert.ok(svg.bars.includes(`>${m}<`));
  });

  it('scales bar height proportionally to the max', () => {
    const svg = trendBarsSVG(trend({ incomeData: [50, 100, 0], max: 100 }));
    // isolate the income-coloured bars — the interleaved expense bars are all zero
    // here and would otherwise throw off a positional height comparison.
    const incomeHeights = [...svg.bars.matchAll(/height="([\d.]+)" fill="#34d399"/g)].map((m) => Number(m[1]));
    assert.ok(Math.abs(incomeHeights[0] * 2 - incomeHeights[1]) < 0.01);
  });

  it('a zero-value bar draws with zero height, not a negative or NaN one', () => {
    const svg = trendBarsSVG(trend({ incomeData: [0, 0, 0], expenseData: [0, 0, 0] }));
    assert.ok(!svg.bars.includes('NaN'));
    assert.ok([...svg.bars.matchAll(/height="([\d.]+)"/g)].every((m) => Number(m[1]) === 0));
  });
});

describe('categoryPieSVG', () => {
  it('draws one path per non-zero category', () => {
    const svg = categoryPieSVG({ entries: [['Rent', 60], ['Food', 40]], max: 60 }, ['#111', '#222']);
    assert.equal((svg.paths.match(/<path/g) || []).length, 2);
  });

  it('assigns colours from the palette in order, cycling if there are more categories than colours', () => {
    const svg = categoryPieSVG({ entries: [['A', 1], ['B', 1], ['C', 1]], max: 1 }, ['#111', '#222']);
    assert.ok(svg.paths.includes('fill="#111"'));
    assert.ok(svg.paths.includes('fill="#222"'));
    assert.equal((svg.paths.match(/fill="#111"/g) || []).length, 2); // A and C share the first colour
  });

  it('sets the large-arc-flag only for a slice whose own sweep exceeds half the circle', () => {
    // Rent is 60% of the total -> its arc sweeps 216°, over 180° -> large-arc-flag 1.
    // Food is 40% -> 144°, under 180° -> flag 0. Traced against the algorithm, not assumed.
    const majority = categoryPieSVG({ entries: [['Rent', 60], ['Food', 40]], max: 60 }, ['#111', '#222']);
    const flags = [...majority.paths.matchAll(/A [\d.]+ [\d.]+ 0 (\d) 1/g)].map((m) => m[1]);
    assert.deepEqual(flags, ['1', '0']);
  });

  it('reports each slice\'s share of the whole as a rounded percent, and the grand total', () => {
    const svg = categoryPieSVG({ entries: [['Rent', 75], ['Food', 25]], max: 75 }, ['#111', '#222']);
    assert.ok(svg.legend.includes('75%'));
    assert.equal(svg.total, 100);
  });

  it('produces no paths at all when every category is empty', () => {
    const svg = categoryPieSVG({ entries: [], max: 1 }, ['#111']);
    assert.equal(svg.paths, '');
    assert.equal(svg.legend, '');
    assert.equal(svg.total, 0);
  });
});

describe('dailyExpenseLineSVG', () => {
  const exp = (date, category, amount) => ({ date, category, amount });

  it('draws one line path per category that had any spending this month', () => {
    const svg = dailyExpenseLineSVG([exp('2026-08-05', 'Rent', 100), exp('2026-08-10', 'Food', 20)], '2026-08', 31, ['#111', '#222']);
    // each category's path opens with a fresh "<path"
    assert.equal((svg.paths.match(/<path/g) || []).length, 2);
  });

  it('ignores an expense from a different month', () => {
    const svg = dailyExpenseLineSVG([exp('2026-07-05', 'Rent', 100)], '2026-08', 31, ['#111']);
    assert.equal(svg.paths, '');
  });

  it('lists categories in the legend in alphabetical order', () => {
    const svg = dailyExpenseLineSVG([exp('2026-08-01', 'Zoo', 5), exp('2026-08-02', 'Ants', 5)], '2026-08', 31, ['#111', '#222']);
    assert.ok(svg.legend.indexOf('Ants') < svg.legend.indexOf('Zoo'));
  });

  it('escapes a hostile category name in the legend', () => {
    const svg = dailyExpenseLineSVG([exp('2026-08-01', '<script>x</script>', 5)], '2026-08', 31, ['#111']);
    assert.ok(!svg.legend.includes('<script>'));
  });

  it('draws a path point for every day of the month, even a day with no spend', () => {
    const svg = dailyExpenseLineSVG([exp('2026-08-01', 'Rent', 100)], '2026-08', 31, ['#111']);
    // "M x y L x y L x y ..." -> 31 coordinate commands for a 31-day month
    const coordCount = (svg.paths.match(/[ML] [\d.]+ [\d.]+/g) || []).length;
    assert.equal(coordCount, 31);
  });
});

describe('overdueRowsHTML', () => {
  const item = (over = {}) => ({ id: 'e1', kind: 'income', amount: 100, currency: 'USD', date: '2026-08-01', type: 'ESL', category: '', student: '', description: '', ...over });
  const NOW = new Date('2026-08-15T00:00:00').getTime();

  it('says every payment is on time when there is nothing overdue', () => {
    const html = overdueRowsHTML([], NOW);
    assert.ok(html.includes('All expected payments received on time'));
  });

  it('distinguishes income (📈) from expense (📉) rows', () => {
    const html = overdueRowsHTML([item({ kind: 'income' }), item({ id: 'e2', kind: 'expense' })], NOW);
    assert.ok(html.includes('📈'));
    assert.ok(html.includes('📉'));
  });

  it('labels an income row by type and an expense row by category', () => {
    const inc = overdueRowsHTML([item({ kind: 'income', type: 'IELTS' })], NOW);
    assert.ok(inc.includes('IELTS'));
    const exp = overdueRowsHTML([item({ kind: 'expense', category: 'Rent' })], NOW);
    assert.ok(exp.includes('Rent'));
  });

  it('counts whole days late from the reference time, not calendar days naively', () => {
    const html = overdueRowsHTML([item({ date: '2026-08-10' })], NOW); // 5 days before "now"
    assert.ok(html.includes('5d late'));
    assert.ok(html.includes('5 days late'));
  });

  it('says "Due today" rather than "0 days late" for a payment expected today', () => {
    const html = overdueRowsHTML([item({ date: '2026-08-15' })], NOW);
    assert.ok(html.includes('Due today'));
    assert.ok(!html.includes('0d late'));
  });

  it('uses singular "day" for exactly one day late', () => {
    const html = overdueRowsHTML([item({ date: '2026-08-14' })], NOW);
    assert.ok(html.includes('1 day late'));
    assert.ok(!html.includes('1 days late'));
  });

  it('escapes a hostile student name and description', () => {
    const html = overdueRowsHTML([item({ student: '<img src=x onerror=1>', description: '<script>a</script>' })], NOW);
    assert.ok(!html.includes('<img src=x'));
    assert.ok(!html.includes('<script>'));
  });

  it('treats a missing date as due today via the todayISO fallback, not as an invalid date', () => {
    const html = overdueRowsHTML([item({ date: '' })], NOW, '2026-08-15');
    assert.ok(html.includes('Due today'));
    assert.ok(!html.includes('NaN'));
  });
});

describe('transactionRowsHTML', () => {
  const tx = (over = {}) => ({ id: 't1', kind: 'income', amount: 100, currency: 'USD', date: '2026-08-01', type: 'ESL', category: '', student: '', description: '', ...over });

  it('shows the empty state when there are no transactions', () => {
    assert.ok(transactionRowsHTML([]).includes('No transactions found'));
  });

  it('signs income positive and expense negative', () => {
    const html = transactionRowsHTML([tx({ kind: 'income', amount: 50 }), tx({ id: 't2', kind: 'expense', amount: 30 })]);
    assert.ok(html.includes('+$50'));
    assert.ok(html.includes('−$30'));
  });

  it('shows an income row\'s type and an expense row\'s category as the source', () => {
    const inc = transactionRowsHTML([tx({ kind: 'income', type: 'IELTS' })]);
    assert.ok(inc.includes('IELTS'));
    const exp = transactionRowsHTML([tx({ kind: 'expense', category: 'Rent' })]);
    assert.ok(exp.includes('Rent'));
  });

  it('escapes a hostile description and student name', () => {
    const html = transactionRowsHTML([tx({ description: '<script>a</script>', student: '<img src=x onerror=1>' })]);
    assert.ok(!html.includes('<script>'));
    assert.ok(!html.includes('<img src=x'));
  });

  it('carries the entry id and kind for the delete control', () => {
    const html = transactionRowsHTML([tx({ id: 'zzz', kind: 'expense' })]);
    assert.ok(html.includes('data-del-tx="zzz"'));
    assert.ok(html.includes('data-kind="expense"'));
  });
});
