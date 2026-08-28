# Lumen v105 — Teaching Wedge Weave — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make student identity a real foreign key across income/attendance/assignments, link goals to students explicitly, and roll finance up per student — so the Teaching Command Hub reflects wired data, not a string-match heuristic.

**Architecture:** A one-time `normalizeState` backfill maps legacy `student` name strings to `studentId` using the student roster, keeping the name as a display fallback. New writes set both. Goals gain `linkedStudentIds: string[]`. The teaching dashboard weave, the finance view, and the student dossier all read the explicit link first and fall back to the heuristic only when no link exists.

**Tech Stack:** Vanilla ES2022, Playwright, Vitest (from v104), no new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-28-lumen-v104-v106-design.md` (§ Build B)

## Global Constraints

- **Assumes v104 shipped** (`src/lib/` + Vitest seam, `window.LumenLib`). If executing before v104, replace the `src/lib/students.js` unit tests with Playwright coverage and keep the helper inline in `app.js`.
- **No new top-level nav.** Reuse `students`, `finance`, `goals`, `schedule` views.
- **Additive state only.** `studentId`, `linkedStudentIds` are new fields; the legacy `student` name string is never deleted.
- **`normalizeState` (`app.js:756`) is the only migration point.** `getStudentsList()` (`app.js:822`) runs its own roster migration first — the FK backfill must run *after* it.
- **Release ritual.** `sw.js` `VERSION = 'lumen-cache-v105'`; `index.html` `?v=105` (styles, themes, app, and the v104 module bootstrap tag); git tag `v105`.
- **All prior Playwright specs stay green.** `behavioral.spec.js:447` (TRY currency + student name) must pass unchanged.
- **`save()` already nulls `_teachingMemo` on every mutation** (`app.js:888`) — no extra memo-invalidation wiring needed.

## Data shapes (as-built, verified)

```
student  : { id, name, level, rate, currency: 'USD'|'TRY', status: 'active'|..., email, ... }   // app.js:822
income   : { id, amount, currency, type?, category?, student?: <name>, date, description, createdAt, updatedAt }  // app.js:9101
           also written at app.js:9871 (attendance auto-bill) and app.js:10334 (lesson plan)
goal     : { id, title, desc, color, keyResults[], due, tags[], createdAt, updatedAt }          // app.js:5786
```

---

### Task 1: FK backfill — `student` name → `studentId`

**Files:**
- Create: `src/lib/students.js`
- Create: `tests/unit/students.test.js`
- Modify: `src/lib/globals.js` (add `students` namespace)
- Modify: `sw.js` (`SHELL` += `./src/lib/students.js`, `VERSION` = v105)
- Modify: `index.html` (`?v=105`)
- Modify: `app.js` (`normalizeState` at `app.js:756`; income writers at `app.js:9101`, `app.js:9871`, `app.js:10334`)

**Interfaces:**
- Produces: `backfillStudentIds(state) → { linked: number, orphans: string[] }` — mutates each entry in `state.income`, `state.expectedIncome`, `state.assignments`, `state.attendance` that has a `student` name (or `studentName`) but no `studentId`, setting `studentId` from a first-match `name → id` map. Idempotent.

- [ ] **Step 1: Write the failing unit test**

```js
// tests/unit/students.test.js
import { describe, it, expect } from 'vitest';
import { backfillStudentIds } from '../../src/lib/students.js';

const roster = [
  { id: 's-ana', name: 'Ana' },
  { id: 's-caner', name: 'Caner Yilmaz' },
];

describe('backfillStudentIds', () => {
  it('sets studentId from a name match and keeps the name', () => {
    const state = { students: roster, income: [{ id: 'i1', student: 'Caner Yilmaz', amount: 1500 }], expectedIncome: [], assignments: [], attendance: [] };
    const r = backfillStudentIds(state);
    expect(state.income[0].studentId).toBe('s-caner');
    expect(state.income[0].student).toBe('Caner Yilmaz');
    expect(r.linked).toBe(1);
    expect(r.orphans).toEqual([]);
  });

  it('is idempotent — a second run changes nothing', () => {
    const state = { students: roster, income: [{ id: 'i1', student: 'Ana', studentId: 's-ana' }], expectedIncome: [], assignments: [], attendance: [] };
    const r = backfillStudentIds(state);
    expect(r.linked).toBe(0);
  });

  it('leaves an unmatched name unlinked and reports it as an orphan', () => {
    const state = { students: roster, income: [{ id: 'i1', student: 'Nobody', amount: 10 }], expectedIncome: [], assignments: [], attendance: [] };
    const r = backfillStudentIds(state);
    expect(state.income[0].studentId).toBeUndefined();
    expect(r.orphans).toEqual(['Nobody']);
  });

  it('handles the assignments studentName field', () => {
    const state = { students: roster, income: [], expectedIncome: [], assignments: [{ id: 'a1', studentName: 'Ana' }], attendance: [] };
    backfillStudentIds(state);
    expect(state.assignments[0].studentId).toBe('s-ana');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test:unit -- students`
Expected: FAIL — module missing.

- [ ] **Step 3: Write `src/lib/students.js`**

```js
// src/lib/students.js
// Foreign-key backfill: legacy `student` display names -> canonical `studentId`.

/**
 * @param {object} state
 * @returns {{linked:number, orphans:string[]}}
 */
export function backfillStudentIds(state) {
  const roster = Array.isArray(state.students) ? state.students : [];
  const nameToId = new Map();
  for (const s of roster) {
    if (s && s.name && !nameToId.has(s.name)) nameToId.set(s.name, s.id);
  }
  let linked = 0;
  const orphans = new Set();
  const collections = ['income', 'expectedIncome', 'assignments', 'attendance'];
  for (const key of collections) {
    const list = Array.isArray(state[key]) ? state[key] : [];
    for (const entry of list) {
      if (!entry || entry.studentId) continue;
      const name = entry.student || entry.studentName;
      if (!name) continue;
      const id = nameToId.get(name);
      if (id) { entry.studentId = id; linked++; }
      else { orphans.add(name); }
    }
  }
  return { linked, orphans: [...orphans] };
}
```

- [ ] **Step 4: Run the unit test**

Run: `npm run test:unit -- students`
Expected: PASS.

- [ ] **Step 5: Register the namespace + SW**

`src/lib/globals.js`: `import * as studentsLib from './students.js';` and `students: studentsLib`. Update the `regression.spec.js` bootstrap key list to include `'students'`. `sw.js`: `VERSION = 'lumen-cache-v105'`, add `'./src/lib/students.js'` to `SHELL`. `index.html`: bump the four `?v=104` → `?v=105`.

- [ ] **Step 6: Call the backfill from `normalizeState`**

In `normalizeState` (`app.js:756`), after `getStudentsList()` has been called at least once (add `getStudentsList();` at the top of the relevant block if not already guaranteed), add:

```js
try {
  const { linked, orphans } = window.LumenLib.students.backfillStudentIds(state);
  if (linked && typeof logActivity === 'function') {
    logActivity('finance.fk', `Linked ${linked} finance/attendance rows to students`, 'finance');
  }
  if (orphans.length && typeof logActivity === 'function') {
    logActivity('finance.orphan', `${orphans.length} rows reference an unknown student: ${orphans.slice(0, 3).join(', ')}`, 'finance');
  }
} catch (e) { console.warn('studentId backfill skipped', e); }
```

- [ ] **Step 7: Write `studentId` on new income writes**

At `app.js:9101` (the finance entry writer), the `entry` object literal already has `student: student || undefined`. Add `studentId` — resolve it from the roster by the chosen name:

```js
const _sid = (getStudentsList().find(s => s.name === student) || {}).id;
const entry = { id: uid(), amount: Math.round(amount * 100) / 100, currency,
  type: isIncome ? category : undefined, category: !isIncome ? category : undefined,
  student: student || undefined, studentId: _sid || undefined,
  date, description, createdAt: Date.now(), updatedAt: Date.now() };
```

At `app.js:9871` (attendance auto-bill) and `app.js:10334` (lesson plan), the pushed income object has `student: studentName` / `student: ...`. Add `studentId:` resolved the same way, or — better — these two sites already know the student object; pass its `.id` directly. Add `studentId: student.id` (attendance modal has the student in scope) / the lesson-plan equivalent.

- [ ] **Step 8: Write the E2E backfill assertion**

In `tests/wedge.spec.js` (created in Task 7, but add this case now if writing tests-first per task):

```js
test('legacy income is FK-linked to a student on load', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    state.students = [{ id: 's-caner', name: 'Caner Yilmaz', currency: 'TRY', rate: 1500, status: 'active', level: 'IELTS' }];
    state.income = [{ id: 'i1', student: 'Caner Yilmaz', amount: 1500, currency: 'TRY', date: '2026-08-01' }];
    save();
  });
  await page.reload();
  await page.waitForTimeout(600);
  const sid = await page.evaluate(() => state.income[0].studentId);
  expect(sid).toBe('s-caner');
  await page.evaluate(() => { state.students = []; state.income = []; save(); });
});
```

- [ ] **Step 9: Run unit + E2E**

Run: `npm run test:unit -- students && npx playwright test wedge.spec.js -g "FK-linked"`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add src/lib/students.js src/lib/globals.js tests/unit/students.test.js tests/wedge.spec.js sw.js index.html app.js
git commit -m "feat: backfill income/attendance studentId FK from legacy student names (v105)"
```

---

### Task 2: `goal.linkedStudentIds` + goal modal multi-select + card chips

**Files:**
- Modify: `app.js` (`openGoalModal` at `app.js:5738`, the save handler at `app.js:5782-5790`, `normalizeState` at `app.js:756`, the goal card renderer)
- Modify: `styles.css` (chip-toggle row, goal card student chips)

**Interfaces:**
- Consumes: `getStudentsList()` for the option list.
- Produces: `goal.linkedStudentIds: string[]` (default `[]`), persisted in the goal `data` object.

- [ ] **Step 1: Write the failing E2E test**

In `tests/wedge.spec.js`:

```js
test('goal modal links students and persists linkedStudentIds', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    state.students = [{ id: 's-ana', name: 'Ana', status: 'active', currency: 'USD', rate: 35, level: 'ESL' }];
    state.goals = [];
    save();
  });
  await page.goto('/#goals');
  await page.waitForTimeout(400);
  await page.click('button:has-text("New goal"), #goals-add, .empty-state button');
  await page.waitForTimeout(300);
  await page.fill('#g-title', 'IELTS 8.0');
  await page.click('.g-student-toggle[data-sid="s-ana"]');
  await page.click('#g-save');
  await page.waitForTimeout(400);
  const linked = await page.evaluate(() => state.goals[0].linkedStudentIds);
  expect(linked).toEqual(['s-ana']);
  await page.evaluate(() => { state.students = []; state.goals = []; save(); });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx playwright test wedge.spec.js -g "goal modal links"`
Expected: FAIL — no `.g-student-toggle` element.

- [ ] **Step 3: Default the field in `normalizeState`**

In `normalizeState` (`app.js:756`), in the goals-normalizing loop:

```js
(state.goals || []).forEach(g => { if (!Array.isArray(g.linkedStudentIds)) g.linkedStudentIds = []; });
```

- [ ] **Step 4: Add the multi-select to `openGoalModal`**

In `openGoalModal` (`app.js:5738`), after the `g` default object add `linkedStudentIds: []` to the fallback. Build the toggle row and insert it into the modal body after the Key results field:

```js
const _students = getStudentsList();
const linkedSet = new Set(g.linkedStudentIds || []);
const studentToggles = _students.length ? `
  <div class="field"><label class="field-label">Linked students</label>
    <div class="g-student-toggles">
      ${_students.map(s => `<button type="button" class="g-student-toggle${linkedSet.has(s.id) ? ' active' : ''}" data-sid="${s.id}">🎓 ${esc(s.name)}</button>`).join('')}
    </div>
  </div>` : '';
```

Insert `${studentToggles}` into the modal HTML string after the `Key results` `.field` block. Add the click binding alongside the swatch bindings:

```js
$$('.g-student-toggle').forEach(b => b.addEventListener('click', () => b.classList.toggle('active')));
```

- [ ] **Step 5: Persist in the save handler**

At `app.js:5786` where `const data = { title, desc, color, keyResults, due, tags }` is built, add:

```js
linkedStudentIds: $$('.g-student-toggle.active').map(b => b.dataset.sid),
```

- [ ] **Step 6: Render chips on the goal card**

In the goal card renderer, where tags render, add (when `g.linkedStudentIds?.length`):

```js
${(g.linkedStudentIds || []).map(id => {
  const s = getStudentsList().find(x => x.id === id);
  return s ? `<span class="chip chip-student">🎓 ${esc(s.name)}</span>` : '';
}).join('')}
```

- [ ] **Step 7: Style**

In `styles.css` add:

```css
.g-student-toggles { display: flex; flex-wrap: wrap; gap: 6px; }
.g-student-toggle { font-size: 12px; padding: 4px 9px; border: 1px solid var(--border); border-radius: 999px; background: var(--surface2); cursor: pointer; }
.g-student-toggle.active { background: var(--accent); color: #fff; border-color: var(--accent); }
.chip-student { background: rgba(96,93,255,.12); color: var(--accent); border: 1px solid rgba(96,93,255,.28); font-size: 11px; padding: 2px 7px; border-radius: 999px; }
```

- [ ] **Step 8: Run E2E**

Run: `npx playwright test wedge.spec.js -g "goal modal links" && npx playwright test smoke.spec.js -g "goals"`
Expected: PASS, zero console errors.

- [ ] **Step 9: Commit**

```bash
git add app.js styles.css tests/wedge.spec.js
git commit -m "feat: link goals to students (goal.linkedStudentIds) with modal toggles and card chips"
```

---

### Task 3: Teaching dashboard weave — explicit link first

**Files:**
- Modify: `app.js` (`teachingDashboardHTML` at `app.js:2697-2715`)

**Interfaces:**
- Consumes: `goal.linkedStudentIds` (Task 2), `entry.studentId` (Task 1).

- [ ] **Step 1: Write the failing E2E test**

In `tests/wedge.spec.js`:

```js
test('teaching hub weave uses the explicit goal-student link', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    state.students = [{ id: 's-x', name: 'Zeynep', status: 'active', currency: 'TRY', rate: 1200, level: 'IELTS' }];
    state.goals = [{ id: 'g-x', title: 'Band 7 by December', color: '#605dff', keyResults: [], linkedStudentIds: ['s-x'], createdAt: Date.now(), updatedAt: Date.now() }];
    state.income = [{ id: 'i-x', studentId: 's-x', student: 'Zeynep', amount: 1200, currency: 'TRY', date: '2026-08-10' }];
    save();
  });
  await page.goto('/#dashboard');
  await page.waitForTimeout(600);
  const hub = await page.locator('[data-dw="teaching"]').innerText();
  expect(hub).toContain('Zeynep');
  expect(hub).toContain('Band 7 by December');
  await page.evaluate(() => { state.students = []; state.goals = []; state.income = []; save(); });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx playwright test wedge.spec.js -g "explicit goal-student link"`
Expected: likely FAIL — the heuristic `w.length > 3 && gt.includes(w)` won't match "Zeynep" against "Band 7 by December".

- [ ] **Step 3: Rewrite the weave in `teachingDashboardHTML`**

Replace the `linkedGoals` computation (`app.js:2703-2707`):

```js
const explicit = state.goals.filter(g => (g.linkedStudentIds || []).includes(s.id)).slice(0, 2);
const linkedGoals = explicit.length ? explicit : state.goals.filter(g => {
  const q = (s.name + ' ' + (s.level || '') + ' ' + (s.goals || '')).toLowerCase();
  const gt = g.title.toLowerCase();
  return q.split(/\s+/).some(w => w.length > 3 && gt.includes(w));
}).slice(0, 2);
```

Replace the income match (`app.js:2708`):

```js
const incFor = (state.income || []).filter(e => e.studentId ? e.studentId === s.id : (e.student === s.name));
```

Group `totalPaid` by currency and render with `fmtM`:

```js
const paidByCur = incFor.reduce((m, e) => { const c = e.currency || 'USD'; m[c] = (m[c] || 0) + (e.amount || 0); return m; }, {});
const paidStr = Object.entries(paidByCur).map(([c, v]) => fmtM(v, c)).join(' · ');
```

Use `paidStr` instead of `$${totalPaid}` at `app.js:2713`.

- [ ] **Step 4: Run E2E**

Run: `npx playwright test wedge.spec.js -g "explicit goal-student link" && npx playwright test smoke.spec.js -g "dashboard"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app.js tests/wedge.spec.js
git commit -m "feat: teaching hub weave prefers explicit goal-student links; per-currency paid totals"
```

---

### Task 4: Per-student finance rollup card

**Files:**
- Modify: `app.js` (`renderFinance` at `app.js:8563`; the student filter dropdown at `app.js:8757-8759`; the filter fn at `app.js:8575-8580`)
- Modify: `styles.css` (rollup bars)

**Interfaces:**
- Consumes: `entry.studentId`, `student.currency`, `fmtM(v, curr)`.

- [ ] **Step 1: Write the failing E2E test**

In `tests/wedge.spec.js`:

```js
test('finance shows a per-student Paid / Expected / Outstanding rollup', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    state.students = [{ id: 's-c', name: 'Caner', status: 'active', currency: 'TRY', rate: 1500, level: 'IELTS' }];
    state.income = [{ id: 'i1', studentId: 's-c', student: 'Caner', amount: 1500, currency: 'TRY', date: '2026-08-01' }];
    state.expectedIncome = [{ id: 'e1', studentId: 's-c', student: 'Caner', amount: 4500, currency: 'TRY', date: '2026-08-01' }];
    save();
  });
  await page.goto('/#finance');
  await page.waitForTimeout(600);
  const card = await page.locator('#fin-per-student').innerText();
  expect(card).toContain('Caner');
  expect(card).toMatch(/₺1,?500/);   // paid
  expect(card).toMatch(/₺3,?000/);   // outstanding = 4500 - 1500
  await page.evaluate(() => { state.students = []; state.income = []; state.expectedIncome = []; save(); });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx playwright test wedge.spec.js -g "per-student"`
Expected: FAIL — no `#fin-per-student`.

- [ ] **Step 3: Build the rollup in `renderFinance`**

Add, before the final HTML assembly:

```js
const perStudent = getStudentsList()
  .filter(s => (s.status || 'active') === 'active')
  .map(s => {
    const paidBy = {}, expBy = {};
    (state.income || []).filter(e => e.studentId ? e.studentId === s.id : e.student === s.name)
      .forEach(e => { const c = e.currency || 'USD'; paidBy[c] = (paidBy[c] || 0) + (e.amount || 0); });
    (state.expectedIncome || []).filter(e => e.studentId ? e.studentId === s.id : e.student === s.name)
      .forEach(e => { const c = e.currency || 'USD'; expBy[c] = (expBy[c] || 0) + (e.amount || 0); });
    const curs = [...new Set([...Object.keys(paidBy), ...Object.keys(expBy)])];
    if (!curs.length) return '';
    const rows = curs.map(c => {
      const paid = paidBy[c] || 0, expd = expBy[c] || 0, out = Math.max(0, expd - paid);
      const pct = expd ? Math.min(100, Math.round(paid / expd * 100)) : (paid ? 100 : 0);
      return `<div class="fps-row">
        <span class="fps-name">🎓 ${esc(s.name)}</span>
        <div class="fps-bar"><div class="fps-fill" style="width:${pct}%"></div></div>
        <span class="fps-nums">${fmtM(paid, c)} / ${fmtM(expd, c)} · <b>${fmtM(out, c)} due</b></span>
      </div>`;
    }).join('');
    return rows;
  }).filter(Boolean).join('');

const perStudentCard = perStudent ? `<div class="card" id="fin-per-student">
  <h3 class="card-title"><span>🎓 Per-student balance</span><a class="link-btn" href="#students">Students →</a></h3>
  ${perStudent}
</div>` : '';
```

Insert `${perStudentCard}` into the finance view HTML near the other cards.

- [ ] **Step 4: Make the student filter FK-aware**

Change the dropdown options (`app.js:8757-8759`) to use `s.id` as the value:

```js
...studentList.map(s => `<option value="${s.id}" ${_finStudentFilter === s.id ? 'selected' : ''}>🎓 ${esc(s.name)}</option>`)
```

Change the filter fn (`app.js:8575-8580`):

```js
if (_finStudentFilter !== 'ALL') {
  if (_finStudentFilter === '__NONE__') { if (e.student || e.studentId) return false; }
  else {
    const s = getStudentsList().find(x => x.id === _finStudentFilter);
    if (e.studentId ? e.studentId !== _finStudentFilter : e.student !== (s && s.name)) return false;
  }
}
```

- [ ] **Step 5: Style**

```css
.fps-row { display: grid; grid-template-columns: minmax(90px,1fr) 2fr minmax(140px,auto); gap: 10px; align-items: center; padding: 5px 0; font-size: 12.5px; }
.fps-bar { height: 7px; background: var(--surface2); border-radius: 4px; overflow: hidden; }
.fps-fill { height: 100%; background: #34d399; }
.fps-nums { text-align: right; color: var(--muted); white-space: nowrap; }
@media (max-width: 640px) { .fps-row { grid-template-columns: 1fr; } .fps-nums { text-align: left; } }
```

- [ ] **Step 6: Run E2E**

Run: `npx playwright test wedge.spec.js -g "per-student" && npx playwright test behavioral.spec.js -g "Finance tracker supports TRY"`
Expected: PASS (the TRY behavioral test must still pass — verify its student-filter interaction still works with id-valued options; if it selects by visible label, it is unaffected).

- [ ] **Step 7: Commit**

```bash
git add app.js styles.css tests/wedge.spec.js
git commit -m "feat: per-student Paid/Expected/Outstanding finance rollup; FK-aware student filter"
```

---

### Task 5: Dossier — linked goals strip + prefilled Log income

**Files:**
- Modify: `app.js` (`openStudentDossier` at `app.js:10372`)

**Interfaces:**
- Consumes: `goal.linkedStudentIds`, `goalProgress(g)`, the finance entry modal opener (identify its function name near `app.js:9101`).

- [ ] **Step 1: Write the failing E2E test**

```js
test('student dossier shows linked-goal chips with progress', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    state.students = [{ id: 's-d', name: 'Deniz', status: 'active', currency: 'USD', rate: 40, level: 'ESL' }];
    state.goals = [{ id: 'g-d', title: 'CEFR C1', color: '#605dff',
      keyResults: [{ id: 'k1', title: 'Vocab', target: 100, current: 40 }],
      linkedStudentIds: ['s-d'], createdAt: Date.now(), updatedAt: Date.now() }];
    save();
  });
  await page.goto('/#students');
  await page.waitForTimeout(400);
  await page.evaluate(() => openStudentDossier('s-d'));
  await page.waitForTimeout(400);
  const modal = await page.locator('.modal').innerText();
  expect(modal).toContain('CEFR C1');
  expect(modal).toMatch(/\d+%/);
  await page.evaluate(() => { state.students = []; state.goals = []; save(); });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx playwright test wedge.spec.js -g "dossier shows linked-goal"`
Expected: FAIL.

- [ ] **Step 3: Add the linked-goals strip**

In `openStudentDossier(studentId)`, after the header, compute and render:

```js
const linkedGoals = (state.goals || []).filter(g => (g.linkedStudentIds || []).includes(studentId));
const goalStrip = linkedGoals.length ? `<div class="dossier-goals">
  ${linkedGoals.map(g => `<span class="chip chip-student">🎯 ${esc(g.title)} · ${goalProgress(g)}%</span>`).join('')}
</div>` : '';
```

Insert `${goalStrip}` into the dossier modal body.

- [ ] **Step 4: Prefill the Log income button**

Find the dossier's finance tab / "Log Income" control. Change its handler to open the finance entry modal with prefill. If the finance modal opener does not accept a prefill argument, add an optional `prefill` param:

```js
// where the finance entry modal opens (near app.js:9101):
function openFinanceEntryModal(kind, prefill) {
  // ... existing setup ...
  // if (prefill) { set the student <select> to prefill.studentId's name, currency to prefill.currency, rate hint to prefill.rate }
}
```

Dossier call:

```js
onclick="openFinanceEntryModal('income', { studentId: '${studentId}', student: ${JSON.stringify(student.name)}, currency: '${student.currency || 'USD'}', rate: ${student.rate || 0} })"
```

- [ ] **Step 5: Run E2E**

Run: `npx playwright test wedge.spec.js -g "dossier" && npx playwright test behavioral.spec.js -g "Students folder allows customizable"`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app.js tests/wedge.spec.js
git commit -m "feat: student dossier linked-goal chips + prefilled Log Income"
```

---

### Task 6: Lesson-plan → task studentId propagation

**Files:**
- Modify: `app.js` (Lesson Planning Workstation "Create tasks" action, `app.js:10086`+)

**Interfaces:**
- Consumes: the lesson plan's `studentId` (or `studentName` → resolve).
- Produces: tasks created from a lesson plan carry `studentId` and `student`.

- [ ] **Step 1: Write the failing E2E test**

```js
test('tasks created from a lesson plan carry the studentId', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    state.students = [{ id: 's-l', name: 'Lale', status: 'active', currency: 'USD', rate: 30, level: 'ESL' }];
    state.lessonPlans = [{ id: 'lp1', title: 'Unit 3 review', studentId: 's-l', status: 'planned',
      activities: [{ id: 'ac1', text: 'Prep flashcards' }], createdAt: Date.now(), updatedAt: Date.now() }];
    state.tasks = [];
    save();
  });
  await page.goto('/#schedule');   // or wherever lesson planning lives
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    // call the create-tasks action directly by its function name (identify during Step 3)
    createTasksFromLessonPlan('lp1');
  });
  await page.waitForTimeout(300);
  const t = await page.evaluate(() => state.tasks.find(x => x.title.includes('flashcards')));
  expect(t.studentId).toBe('s-l');
  await page.evaluate(() => { state.students = []; state.lessonPlans = []; state.tasks = []; save(); });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx playwright test wedge.spec.js -g "lesson plan carry"`
Expected: FAIL (task has no `studentId`).

- [ ] **Step 3: Identify and patch the create-tasks action**

Grep: `grep -n "lessonPlan" app.js | grep -i "task"`. In the handler that maps plan activities → `state.tasks.push({...})`, add `studentId: plan.studentId || (getStudentsList().find(s => s.name === plan.studentName) || {}).id` and `student:` the resolved name, plus `category: 'work'`.

- [ ] **Step 4: Run E2E**

Run: `npx playwright test wedge.spec.js -g "lesson plan carry" && npx playwright test smoke.spec.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app.js tests/wedge.spec.js
git commit -m "feat: propagate studentId onto tasks created from lesson plans"
```

---

### Task 7: Full wedge scenario spec + release

**Files:**
- Modify: `tests/wedge.spec.js` (end-to-end scenario)
- Modify: `README.md` (mention the teaching weave)

- [ ] **Step 1: Write the full-scenario test**

```js
test('end-to-end: student → linked goal → income → dossier + hub + finance all agree', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    state.students = [{ id: 's-caner', name: 'Caner Yilmaz', status: 'active', currency: 'TRY', rate: 1500, level: 'IELTS' }];
    state.goals = [{ id: 'g-ielts', title: 'IELTS 8.0', color: '#605dff',
      keyResults: [{ id: 'k1', title: 'Mock score', target: 8, current: 6 }],
      linkedStudentIds: ['s-caner'], createdAt: Date.now(), updatedAt: Date.now() }];
    state.income = [{ id: 'i1', studentId: 's-caner', student: 'Caner Yilmaz', amount: 1500, currency: 'TRY', date: '2026-08-05' }];
    state.expectedIncome = [{ id: 'e1', studentId: 's-caner', student: 'Caner Yilmaz', amount: 6000, currency: 'TRY', date: '2026-08-01' }];
    save();
  });

  await page.goto('/#dashboard');
  await page.waitForTimeout(500);
  expect(await page.locator('[data-dw="teaching"]').innerText()).toContain('IELTS 8.0');

  await page.goto('/#finance');
  await page.waitForTimeout(500);
  const fin = await page.locator('#fin-per-student').innerText();
  expect(fin).toMatch(/₺4,?500 due/);   // 6000 - 1500

  await page.goto('/#students');
  await page.waitForTimeout(300);
  await page.evaluate(() => openStudentDossier('s-caner'));
  await page.waitForTimeout(300);
  expect(await page.locator('.modal').innerText()).toContain('IELTS 8.0');

  await page.evaluate(() => { state.students = []; state.goals = []; state.income = []; state.expectedIncome = []; save(); });
});
```

- [ ] **Step 2: Run the whole wedge spec**

Run: `npx playwright test wedge.spec.js`
Expected: all cases PASS.

- [ ] **Step 3: Run everything**

Run: `npm run test:all`
Expected: unit green; all Playwright green (prior 44+ plus new wedge cases).

- [ ] **Step 4: Verify release ritual**

Run: `grep -n "lumen-cache-v105" sw.js && grep -c "v=105" index.html`
Expected: v105 present; index.html count ≥ 3.

- [ ] **Step 5: Update `README.md`**

Add one line under Key Features → Teaching: "Goals link directly to students; finance rolls up Paid / Expected / Outstanding per student and currency."

- [ ] **Step 6: Commit and tag**

```bash
git add tests/wedge.spec.js README.md
git commit -m "test: full teaching-wedge scenario (student ↔ goal ↔ finance ↔ dossier)"
git tag v105
```

---

## Self-Review

**Spec coverage:**
- FK canonicalization in `normalizeState` after `getStudentsList` → Task 1. ✅
- New writes set both `studentId` + `student` → Task 1 Step 7. ✅
- `goal.linkedStudentIds` + modal + card chips → Task 2. ✅
- Weave prefers explicit link, heuristic fallback → Task 3. ✅
- Per-student finance rollup by currency → Task 4. ✅
- Dossier linked-goal chips + prefilled Log income → Task 5. ✅
- Lesson-plan → task `studentId` → Task 6. ✅
- Orphan / ambiguous-name logging → Task 1 Steps 3, 6. ✅
- Migration safety (unmatched name still renders) → Task 1 Step 1 test 3; Task 7. ✅

**Placeholder scan:** Task 5 Step 4 and Task 6 Step 3 require identifying an exact function name by grep during execution (the finance-entry modal opener; the lesson-plan create-tasks handler) — the grep command and the change to make are both specified. Task 6's test references `createTasksFromLessonPlan('lp1')` as the assumed name; Step 3 says to confirm it. Acceptable — these are "confirm the name, then apply this exact change" not "figure out what to do".

**Type consistency:** `backfillStudentIds(state) → {linked, orphans}` (Task 1) matches its test and the `normalizeState` call. `goal.linkedStudentIds` is `string[]` everywhere (Tasks 2, 3, 5, 7). `entry.studentId` is the student's `id` string everywhere (Tasks 1, 3, 4). Filter dropdown value switched from `s.name` to `s.id` consistently in Task 4 Step 4.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-08-28-lumen-v105-teaching-wedge-weave.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks.

**2. Inline Execution** — executing-plans, batch with checkpoints.

**Which approach?**
