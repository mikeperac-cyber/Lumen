// src/finance/view.js — finance chart SVG. Pure geometry builders, no rendering
// decisions beyond what shape each chart needs; app.js resolves state and injects
// the palette. Data prep (sixMonthTrend, groupByField) lives in src/finance/store.js.
import { esc, fmtM } from '../lib/helpers.js';

/**
 * The 6-month income/expense bar chart.
 * @param {{labels: string[], incomeData: number[], expenseData: number[], max: number}} trend from sixMonthTrend
 * @returns {{bars: string, grid: string}}
 */
export function trendBarsSVG(trend) {
  const { labels, incomeData, expenseData, max } = trend;
  const bw = 560, bh = 160, bp = 20, bph = 28;
  const bcw = bw - bp * 2, bch = bh - bph * 2;
  const bxStep = bcw / labels.length;
  const barW = bxStep * 0.35;
  const bars = labels.map((lbl, i) => {
    const x = bp + i * bxStep + bxStep * 0.15;
    const incH = (incomeData[i] / max) * bch;
    const expH = (expenseData[i] / max) * bch;
    return `<rect x="${x}" y="${bph + bch - incH}" width="${barW}" height="${incH}" fill="#34d399" rx="2"/>
            <rect x="${x + barW + 2}" y="${bph + bch - expH}" width="${barW}" height="${expH}" fill="#ff5d6c" rx="2"/>
            <text x="${bp + i * bxStep + bxStep / 2}" y="${bh - 6}" text-anchor="middle" fill="var(--muted)" font-size="10">${lbl}</text>`;
  }).join('');
  const grid = [0, 0.5, 1].map((p) => `<line x1="${bp}" y1="${bph + p * bch}" x2="${bp + bcw}" y2="${bph + p * bch}" stroke="var(--border)" stroke-width="1" stroke-dasharray="2 4"/>`).join('');
  return { bars, grid };
}

/**
 * The expense-by-category donut. `total` is the grand total across all slices,
 * needed for the label drawn at the donut's centre.
 * @param {{entries: Array<[string, number]>}} grouped from groupByField
 * @param {string[]} colors cycled if there are more categories than colours
 * @param {'USD'|'TRY'} [currency] for the legend's per-category amount
 * @returns {{paths: string, legend: string, total: number}}
 */
export function categoryPieSVG(grouped, colors, currency = 'USD') {
  const { entries } = grouped;
  const total = entries.reduce((s, [, a]) => s + a, 0);
  const r = 55, cx = 70, cy = 70;
  const segs = [];
  let angle = -Math.PI / 2;
  entries.forEach(([cat, amt], i) => {
    const frac = total ? amt / total : 0;
    const endAngle = angle + frac * 2 * Math.PI;
    const color = colors[i % colors.length];
    if (frac > 0) {
      const x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle);
      const x2 = cx + r * Math.cos(endAngle), y2 = cy + r * Math.sin(endAngle);
      const large = frac > 0.5 ? 1 : 0;
      const path = `M ${cx} ${cy} L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z`;
      segs.push({ path, color, cat, amt, pct: Math.round(frac * 100) });
    }
    angle = endAngle;
  });
  const paths = segs.map((s) => `<path d="${s.path}" fill="${s.color}" stroke="var(--surface)" stroke-width="2"/>`).join('');
  const legend = segs.map((s) => `<div class="vd-legend-item"><span class="vd-legend-dot" style="background:${s.color}"></span>${esc(s.cat)} <b>${fmtM(s.amt, currency)}</b> <span class="muted">(${s.pct}%)</span></div>`).join('');
  return { paths, legend, total };
}

/**
 * Daily-expense line chart, one line per category with any spend this month. A day
 * with no spend for a category still gets a point at zero, so every line spans the
 * full width of the month.
 * @param {object[]} expenses
 * @param {string} monthISO 'YYYY-MM'
 * @param {number} daysInMonth
 * @param {string[]} colors cycled if there are more categories than colours
 * @returns {{paths: string, legend: string, xLabels: string, grid: string}}
 */
export function dailyExpenseLineSVG(expenses, monthISO, daysInMonth, colors) {
  const w = 600, h = 200, p = 30, ph = 30;
  const cw = w - p * 2, ch = h - ph * 2;

  const dailyByCat = {};
  const cats = new Set();
  expenses.filter((e) => (e.date || '').startsWith(monthISO)).forEach((e) => {
    const day = parseInt((e.date || '').slice(8), 10);
    if (!day || day > daysInMonth) return;
    const cat = e.category || 'Other';
    cats.add(cat);
    if (!dailyByCat[day]) dailyByCat[day] = {};
    dailyByCat[day][cat] = (dailyByCat[day][cat] || 0) + (e.amount || 0);
  });
  const sortedCats = [...cats].sort();

  const maxDaily = Math.max(1, ...Object.values(dailyByCat).map((d) => Object.values(d).reduce((s, v) => s + v, 0)));
  const xStep = cw / Math.max(daysInMonth - 1, 1);
  const yScale = (v) => ph + ch - (v / maxDaily) * ch;

  const grid = [0, 0.25, 0.5, 0.75, 1].map((f) => `<line x1="${p}" y1="${ph + f * ch}" x2="${p + cw}" y2="${ph + f * ch}" stroke="var(--border)" stroke-width="1" stroke-dasharray="2 4"/>`).join('');
  const paths = sortedCats.map((cat, ci) => {
    const color = colors[ci % colors.length];
    let d = '';
    for (let day = 1; day <= daysInMonth; day++) {
      const val = (dailyByCat[day] || {})[cat] || 0;
      const x = p + (day - 1) * xStep, y = yScale(val);
      d += `${day === 1 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)} `;
    }
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
  }).join('');
  const legend = sortedCats.map((cat, ci) => `<span class="vd-chart-legend-item"><span class="vd-legend-dot" style="background:${colors[ci % colors.length]}"></span>${esc(cat)}</span>`).join('');
  const xLabels = [1, 5, 10, 15, 20, 25, daysInMonth].filter((d) => d <= daysInMonth).map((d) => `<text x="${p + (d - 1) * xStep}" y="${h - 6}" text-anchor="middle" fill="var(--muted)" font-size="9">${d}</text>`).join('');

  return { paths, legend, xLabels, grid };
}

/**
 * Overdue-payment rows for the finance dashboard's "expected but not received" list.
 * `now` is a millisecond timestamp rather than a live clock read, so days-late is
 * deterministic and testable. A missing `e.date` falls back to `todayISO`, matching
 * the caller's own filter (an entry with no date is treated as due exactly today,
 * not as an invalid date that would compute NaN days late).
 * @param {Array<object & {kind:'income'|'expense'}>} items from overdueExpectedPayments
 * @param {number} now reference timestamp (ms)
 * @param {string} [todayISO] fallback for an entry with no date
 * @returns {string}
 */
export function overdueRowsHTML(items, now, todayISO = '') {
  if (!items.length) return '<div class="muted" style="padding:12px 0;font-size:13px">✅ All expected payments received on time.</div>';
  return items.map((e) => {
    const isInc = e.kind === 'income';
    const curr = e.currency || 'USD';
    const daysLate = Math.floor((now - new Date((e.date || todayISO) + 'T00:00:00').getTime()) / 86400000);
    return `<div class="fin-overdue-row ${isInc ? 'inc' : 'exp'}">
      <span class="fin-overdue-icon">${isInc ? '📈' : '📉'}</span>
      <div class="fin-overdue-info">
        <div class="fin-overdue-title">${esc(isInc ? e.type || 'Income' : e.category || 'Expense')} — ${fmtM(e.amount, curr)}${e.student ? ` <span class="badge" style="background:rgba(81,141,191,.15);color:#518DBF;border-radius:8px;padding:0 5px;font-size:10px">🎓 ${esc(e.student)}</span>` : ''}</div>
        <div class="fin-overdue-sub">Expected ${e.date} · ${daysLate > 0 ? daysLate + ' day' + (daysLate === 1 ? '' : 's') + ' late' : 'Due today'} · ${esc(e.description || 'No description')}</div>
      </div>
      <span class="fin-overdue-badge ${daysLate > 0 ? 'late' : 'due'}">${daysLate > 0 ? daysLate + 'd late' : 'Due'}</span>
    </div>`;
  }).join('');
}

/**
 * The recent-transactions table body. Income and expense entries are pre-merged and
 * sorted by the caller (most recent first, capped to however many should show).
 * @param {Array<object & {kind:'income'|'expense'}>} items
 * @param {{ic?: (name:string,size:number)=>string}} [ctx]
 * @returns {string}
 */
export function transactionRowsHTML(items, ctx) {
  const { ic = () => '' } = ctx || {};
  if (!items.length) return '<div class="muted" style="padding:18px 0;text-align:center;font-size:13px">No transactions found matching the selected filters.</div>';
  return `<div style="overflow-x:auto"><table class="fin-tx-table">
        <thead><tr><th scope="col">Date</th><th scope="col">Type</th><th scope="col">Source/Category</th><th scope="col">Student / Client</th><th scope="col">Description</th><th scope="col">Amount</th><th scope="col"></th></tr></thead>
        <tbody>${items.map((e) => {
          const isInc = e.kind === 'income';
          const cat = isInc ? (e.type || '—') : (e.category || '—');
          const curr = e.currency || 'USD';
          return `<tr class="fin-tx-row ${isInc ? 'inc' : 'exp'}">
            <td class="fin-tx-date">${e.date || '—'}</td>
            <td>${isInc ? '📈 Income' : '📉 Expense'}</td>
            <td><b>${esc(cat)}</b></td>
            <td>${e.student ? `<span class="badge" style="background:rgba(81,141,191,.15);color:#518DBF;border:1px solid rgba(81,141,191,.3);padding:2px 8px;border-radius:12px;font-size:11.5px">🎓 ${esc(e.student)}</span>` : '<span class="muted">—</span>'}</td>
            <td>${esc(e.description || '—')}</td>
            <td class="fin-tx-amt ${isInc ? 'fin-pos' : 'fin-neg'}">${isInc ? '+' : '−'}${fmtM(e.amount, curr)}</td>
            <td><button class="btn-icon fin-tx-del" data-del-tx="${e.id}" data-kind="${e.kind}" title="Delete">${ic('trash', 13)}</button></td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>`;
}
