# Lumen v106 — Review Ritual + Mobile Reach — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Weekly Review from a retrospective report into a guided reflect-and-commit ritual (Shipped → Slipped → Protect next week), make the four heaviest views one-handed on a phone, and move PBKDF2 off the main thread.

**Architecture:** `reviewCtx(off)` gains `slippedRows` and `protectCandidates`. `reviewSkeletonHTML` gets a three-step ritual strip above the existing cards; `renderReview` tracks step state and persists `state.settings.reviewCommit`. The Morning Brief's candidate list reads `reviewCommit` to surface protected items first. A same-origin classic Web Worker (`src/lib/vault-worker.js`) runs PBKDF2+AES-GCM with an inline fallback. A focused mobile CSS pass fixes horizontal overflow on Tasks/Finance/Students/Schedule.

**Tech Stack:** Vanilla ES2022, Web Workers, Playwright (viewport emulation), Vitest (from v104).

**Spec:** `docs/superpowers/specs/2026-08-28-lumen-v104-v106-design.md` (§ Build C)

## Global Constraints

- **Assumes v104 shipped** (`src/lib/crypto.js`, `window.LumenLib`, Vitest). Task 5 modifies `src/lib/crypto.js`.
- **Review data model unchanged.** `reviewCtx(off)` keeps its signature and `reviewWeekCache` (`app.js:3465`); Markdown export (`app.js:3622`) keeps working.
- **Ritual is never blocking.** Collapsed by default with a single "Start weekly review" button; no overlay, no gate. Mirrors the Brief soft-nudge (`app.js:2217`).
- **Additive state only.** `state.settings.reviewCommit` is new, defaulted in `normalizeState`.
- **Offline shell green.** `./src/lib/vault-worker.js` is added to `sw.js` `SHELL`. The offline spec must still pass and encryption must still work offline.
- **Release ritual.** `sw.js` `VERSION = 'lumen-cache-v106'`; `index.html` `?v=106` (styles, themes, app, module bootstrap); git tag `v106`.
- **Desktop unaffected.** The existing smoke suite runs at the default desktop viewport; `tests/mobile.spec.js` runs at 375px. Both in CI.
- **All prior specs green**, including `behavioral.spec.js:169` (crypto round-trip) and `behavioral.spec.js:288` (weekly review MD export).

---

### Task 1: `reviewCtx` — compute Slipped rows + Protect candidates

**Files:**
- Modify: `app.js` (`reviewCtx` at `app.js:3463-3561`; reuse the decay computation pattern from `app.js:8372`)

**Interfaces:**
- Produces on the `ctx` object:
  - `slipped: { tasks: Task[], habits: Habit[], stalledKRs: {goal,kr}[] }`
  - `slippedRows: string` (HTML)
  - `protectCandidates: { id, kind: 'task'|'habit'|'goal', label }[]`

- [ ] **Step 1: Write the failing E2E probe**

In `tests/review-ritual.spec.js`:

```js
import { test, expect } from '@playwright/test';

test('reviewCtx exposes slipped items and protect candidates', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const now = Date.now();
    const iso = (d) => new Date(d).toISOString().slice(0, 10);
    state.tasks = [{ id: 'od1', title: 'Overdue thing', status: 'today', due: iso(now - 2 * 864e5), createdAt: now, updatedAt: now }];
    state.habits = [{ id: 'h1', emoji: '📚', name: 'Read', color: '#605dff', dates: {}, createdAt: now - 20 * 864e5, freqType: 'daily' }];
    save();
  });
  await page.goto('/#review');
  await page.waitForTimeout(500);
  const ctx = await page.evaluate(() => {
    const c = reviewCtx(0);
    return { slippedTasks: c.slipped.tasks.length, slippedHabits: c.slipped.habits.length, candidates: c.protectCandidates.length };
  });
  expect(ctx.slippedTasks).toBeGreaterThan(0);
  expect(ctx.slippedHabits).toBeGreaterThan(0);
  expect(ctx.candidates).toBeGreaterThan(0);
  await page.evaluate(() => { state.tasks = []; state.habits = []; save(); });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx playwright test review-ritual.spec.js -g "slipped items"`
Expected: FAIL — `c.slipped` is undefined.

- [ ] **Step 3: Compute slipped + candidates in `reviewCtx`**

Before the `ctx = { ... }` assembly (`app.js:3548`), add:

```js
// ---- Slipped: work that fell behind in this window ----
const slippedTasks = state.tasks.filter(t => t.due && t.due >= w.startISO && t.due <= w.endISO && t.status !== 'done');
const slippedHabits = state.habits.filter(h => {
  let misses = 0;
  for (let i = 0; i < 7; i++) { const k = wkKeys[i]; if (k <= today && !h.dates[k]) misses++; }
  return misses >= 2;
});
const stalledKRs = [];
state.goals.forEach(g => (g.keyResults || []).forEach(kr => {
  const hist = (state.krHistory || []).filter(x => x.krId === kr.id);
  const movedThisWeek = hist.some(x => x.at >= wkStartMs && x.at <= wkEndMs);
  if (!movedThisWeek && (kr.current || 0) < (kr.target || 1)) stalledKRs.push({ goal: g, kr });
}));

const slippedRows =
  (slippedTasks.slice(0, 6).map(t => `<div class="slip-row" data-goto="tasks">⛔ <span class="t-title">${esc(t.title)}</span><span class="due-chip overdue">${fmtShort(t.due)}</span></div>`).join('')) +
  (slippedHabits.map(h => `<div class="slip-row" data-goto="habits">${h.emoji} <span class="t-title">${esc(h.name)}</span><span class="muted">2+ misses</span></div>`).join('')) +
  (stalledKRs.slice(0, 4).map(({ goal, kr }) => `<div class="slip-row" data-goto="goals">🎯 <span class="t-title">${esc(goal.title)} — ${esc(kr.title)}</span><span class="muted">no progress</span></div>`).join(''))
  || '<div class="muted" style="font-size:12px;padding:6px 0">Nothing slipped. Clean week.</div>';

const protectCandidates = [
  ...slippedHabits.map(h => ({ id: h.id, kind: 'habit', label: `${h.emoji} ${h.name}` })),
  ...state.goals.filter(g => g.due && g.due >= today && g.due <= isoDate(shiftDays(14))).map(g => ({ id: g.id, kind: 'goal', label: `🎯 ${g.title}` })),
  ...slippedTasks.slice(0, 5).map(t => ({ id: t.id, kind: 'task', label: `⛔ ${t.title}` })),
];
```

Add `slipped: { tasks: slippedTasks, habits: slippedHabits, stalledKRs }, slippedRows, protectCandidates` to the `ctx` object literal.

- [ ] **Step 4: Run E2E**

Run: `npx playwright test review-ritual.spec.js -g "slipped items"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app.js tests/review-ritual.spec.js
git commit -m "feat: reviewCtx computes slipped tasks/habits/KRs and protect candidates"
```

---

### Task 2: Ritual strip — markup, step advance, `reviewCommit` persistence

**Files:**
- Modify: `app.js` (`reviewSkeletonHTML` at `app.js:3562`, `renderReview` at `app.js:3610`, `normalizeState` at `app.js:756`)
- Modify: `styles.css` (ritual strip)

**Interfaces:**
- Produces: `state.settings.reviewCommit = { weekStart: string, taskIds: string[], habitIds: string[], goalIds: string[], at: number }`.
- Consumes: `ctx.slippedRows`, `ctx.protectCandidates`, `ctx.statTasks`, `ctx.hiddenOverdue`.

- [ ] **Step 1: Write the failing E2E test**

```js
test('weekly review ritual: start → protect a habit → commit persists', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const now = Date.now();
    const iso = (d) => new Date(d).toISOString().slice(0, 10);
    state.habits = [{ id: 'h1', emoji: '📚', name: 'Read', color: '#605dff', dates: {}, createdAt: now - 20 * 864e5, freqType: 'daily' }];
    state.tasks = [{ id: 'od1', title: 'Slipped', status: 'today', due: iso(now - 2 * 864e5), createdAt: now, updatedAt: now }];
    if (!state.settings) state.settings = {};
    delete state.settings.reviewCommit;
    save();
  });
  await page.goto('/#review');
  await page.waitForTimeout(500);
  await page.click('#ritual-start');
  await page.waitForTimeout(200);
  await page.click('#ritual-next');                       // Shipped -> Slipped
  await page.waitForTimeout(150);
  await page.click('#ritual-next');                       // Slipped -> Protect
  await page.waitForTimeout(150);
  await page.click('.protect-pick[data-kind="habit"][data-id="h1"]');
  await page.click('#ritual-finish');
  await page.waitForTimeout(300);
  const rc = await page.evaluate(() => state.settings.reviewCommit);
  expect(rc.habitIds).toContain('h1');
  expect(rc.weekStart).toBeTruthy();
  await page.evaluate(() => { state.habits = []; state.tasks = []; delete state.settings.reviewCommit; save(); });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx playwright test review-ritual.spec.js -g "ritual: start"`
Expected: FAIL — no `#ritual-start`.

- [ ] **Step 3: Default `reviewCommit` in `normalizeState`**

```js
if (state.settings && !state.settings.reviewCommit) state.settings.reviewCommit = null;
```

- [ ] **Step 4: Add the ritual strip to `reviewSkeletonHTML`**

Insert at the top of the returned string, before `<div class="stats">`:

```html
<div class="card ritual-strip" id="ritual-strip">
  <div class="ritual-head">
    <span>🧭 Weekly ritual</span>
    <span class="muted" id="ritual-status"></span>
  </div>
  <div id="ritual-body"></div>
</div>
```

- [ ] **Step 5: Render the ritual in `renderReview`**

Add a module-level `let ritualStep = 0;`. After the toolbar/cards are updated (end of `renderReview`, `app.js:3697`), call a new `renderRitual(ctx)`:

```js
function currentWeekStartISO() { return weekRange(0).startISO; }

function renderRitual(ctx) {
  const body = document.querySelector('#ritual-body');
  const statusEl = document.querySelector('#ritual-status');
  if (!body) return;
  const rc = state.settings.reviewCommit;
  const doneThisWeek = rc && rc.weekStart === currentWeekStartISO();
  if (doneThisWeek && ritualStep === 0) {
    statusEl.textContent = `✅ done · protecting ${rc.taskIds.length + rc.habitIds.length + rc.goalIds.length}`;
    body.innerHTML = `<button class="btn btn-ghost btn-sm" id="ritual-restart">Review again</button>`;
    body.querySelector('#ritual-restart').onclick = () => { ritualStep = 1; renderRitual(ctx); };
    return;
  }
  if (ritualStep === 0) {
    statusEl.textContent = '';
    body.innerHTML = `<button class="btn btn-accent btn-sm" id="ritual-start">Start weekly review</button>`;
    body.querySelector('#ritual-start').onclick = () => { ritualStep = 1; renderRitual(ctx); };
    return;
  }
  const steps = ['Shipped', 'Slipped', 'Protect next week'];
  statusEl.textContent = `Step ${ritualStep}/3 · ${steps[ritualStep - 1]}`;
  let inner = '';
  if (ritualStep === 1) {
    inner = `<div class="ritual-panel"><b>✅ ${ctx.statTasks} tasks shipped</b> · ${ctx.statHabitsLabel} · ${ctx.statGoals} avg goal progress</div>`;
  } else if (ritualStep === 2) {
    inner = `<div class="ritual-panel">${ctx.slippedRows}</div>`;
  } else {
    const picks = ctx.protectCandidates.map(c =>
      `<button type="button" class="protect-pick" data-kind="${c.kind}" data-id="${c.id}">${esc(c.label)}</button>`).join('')
      || '<span class="muted">Nothing to carry forward — you are on top of it.</span>';
    inner = `<div class="ritual-panel"><div class="muted" style="font-size:12px;margin-bottom:6px">Pick up to 3 to surface first in tomorrow's Brief:</div><div class="protect-picks">${picks}</div></div>`;
  }
  const nav = ritualStep < 3
    ? `<button class="btn btn-sm" id="ritual-next">Next →</button>`
    : `<button class="btn btn-sm btn-accent" id="ritual-finish">Finish & commit</button>`;
  body.innerHTML = inner + `<div class="ritual-nav">${nav}<button class="btn btn-sm btn-ghost" id="ritual-cancel">Cancel</button></div>`;

  body.querySelectorAll('.protect-pick').forEach(b => b.onclick = () => {
    const active = body.querySelectorAll('.protect-pick.active').length;
    if (!b.classList.contains('active') && active >= 3) return;
    b.classList.toggle('active');
  });
  const next = body.querySelector('#ritual-next');
  if (next) next.onclick = () => { ritualStep++; renderRitual(ctx); };
  const fin = body.querySelector('#ritual-finish');
  if (fin) fin.onclick = () => {
    const picked = [...body.querySelectorAll('.protect-pick.active')];
    state.settings.reviewCommit = {
      weekStart: currentWeekStartISO(),
      taskIds: picked.filter(p => p.dataset.kind === 'task').map(p => p.dataset.id),
      habitIds: picked.filter(p => p.dataset.kind === 'habit').map(p => p.dataset.id),
      goalIds: picked.filter(p => p.dataset.kind === 'goal').map(p => p.dataset.id),
      at: Date.now(),
    };
    save();
    ritualStep = 0;
    renderRitual(ctx);
    toast('Weekly review committed 🧭');
  };
  body.querySelector('#ritual-cancel').onclick = () => { ritualStep = 0; renderRitual(ctx); };
}
```

Wire the `.slip-row[data-goto]` click in `renderReview`'s one-time binding block (`app.js:3613`):

```js
$('#ritual-body') && document.addEventListener('click', e => {
  const s = e.target.closest('.slip-row'); if (s && s.dataset.goto) location.hash = '#' + s.dataset.goto;
});
```

(Prefer a delegated listener attached once to `#ritual-strip`.)

- [ ] **Step 6: Style the ritual strip**

```css
.ritual-strip { border-left: 3px solid var(--accent); }
.ritual-head { display: flex; justify-content: space-between; font-weight: 600; margin-bottom: 8px; }
.ritual-panel { background: var(--surface2); border-radius: 9px; padding: 10px 12px; font-size: 13px; }
.slip-row { display: flex; gap: 8px; align-items: center; padding: 4px 0; cursor: pointer; }
.slip-row .t-title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.protect-picks { display: flex; flex-wrap: wrap; gap: 6px; }
.protect-pick { font-size: 12px; padding: 5px 10px; border: 1px solid var(--border); border-radius: 999px; background: var(--surface); cursor: pointer; }
.protect-pick.active { background: var(--accent); color: #fff; border-color: var(--accent); }
.ritual-nav { display: flex; gap: 8px; margin-top: 10px; }
```

- [ ] **Step 7: Run E2E**

Run: `npx playwright test review-ritual.spec.js -g "ritual: start" && npx playwright test smoke.spec.js -g "review"`
Expected: PASS, zero console errors.

- [ ] **Step 8: Commit**

```bash
git add app.js styles.css tests/review-ritual.spec.js
git commit -m "feat: weekly review ritual strip (Shipped/Slipped/Protect) persisting reviewCommit"
```

---

### Task 3: Brief candidates surface `reviewCommit` items first

**Files:**
- Modify: `app.js` (`getBriefCandidates` — grep for its definition)

**Interfaces:**
- Consumes: `state.settings.reviewCommit.taskIds`.

- [ ] **Step 1: Write the failing E2E test**

```js
test('protected tasks from the weekly review lead the Brief candidates', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const now = Date.now();
    state.tasks = [
      { id: 'a', title: 'Ordinary backlog', status: 'backlog', priority: 'med', due: '', createdAt: now, updatedAt: now },
      { id: 'b', title: 'Protected carryover', status: 'backlog', priority: 'low', due: '', createdAt: now, updatedAt: now },
    ];
    if (!state.settings) state.settings = {};
    state.settings.reviewCommit = { weekStart: 'x', taskIds: ['b'], habitIds: [], goalIds: [], at: now };
    save();
  });
  await page.goto('/#brief');
  await page.waitForTimeout(500);
  const firstCandidate = await page.locator('.brief-commit-grid .brief-commit-row .t-title').first().innerText();
  expect(firstCandidate).toContain('Protected carryover');
  await page.evaluate(() => { state.tasks = []; delete state.settings.reviewCommit; save(); });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx playwright test review-ritual.spec.js -g "lead the Brief"`
Expected: FAIL.

- [ ] **Step 3: Reorder in `getBriefCandidates`**

Grep: `grep -n "function getBriefCandidates" app.js`. At the end of the function, before returning the sliced list, apply a stable priority bump:

```js
const rc = (state.settings && state.settings.reviewCommit) || null;
const protectedIds = new Set(rc ? rc.taskIds : []);
list.sort((a, b) => (protectedIds.has(b.id) ? 1 : 0) - (protectedIds.has(a.id) ? 1 : 0));
```

(Keep the existing sort as the tiebreaker — apply this as a second, stable pass.)

- [ ] **Step 4: Run E2E**

Run: `npx playwright test review-ritual.spec.js -g "lead the Brief" && npx playwright test commit-timebox.spec.js`
Expected: PASS (the commit-timebox flow must be unaffected).

- [ ] **Step 5: Commit**

```bash
git add app.js tests/review-ritual.spec.js
git commit -m "feat: Brief candidates surface weekly-review protected tasks first"
```

---

### Task 4: Markdown export — "Protecting next week" section

**Files:**
- Modify: `app.js` (MD export builder at `app.js:3622-3666`)

- [ ] **Step 1: Write the failing E2E test**

```js
test('weekly review markdown includes a Protecting next week section', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const now = Date.now();
    state.habits = [{ id: 'h1', emoji: '📚', name: 'Read', color: '#605dff', dates: {}, createdAt: now }];
    if (!state.settings) state.settings = {};
    state.settings.reviewCommit = { weekStart: 'x', taskIds: [], habitIds: ['h1'], goalIds: [], at: now };
    save();
  });
  await page.goto('/#review');
  await page.waitForTimeout(400);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('#rev-export-md'),
  ]);
  const stream = await download.createReadStream();
  let text = ''; for await (const c of stream) text += c;
  expect(text).toContain('## 🛡️ Protecting Next Week');
  expect(text).toContain('Read');
  await page.evaluate(() => { state.habits = []; delete state.settings.reviewCommit; save(); });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx playwright test review-ritual.spec.js -g "Protecting next week section"`
Expected: FAIL.

- [ ] **Step 3: Append the section in the MD builder**

After the Teaching block (`app.js:3665`), before `const blob = new Blob(...)`:

```js
const rc = (state.settings && state.settings.reviewCommit) || null;
if (rc && (rc.taskIds.length || rc.habitIds.length || rc.goalIds.length)) {
  md += `\n## 🛡️ Protecting Next Week\n`;
  rc.taskIds.forEach(id => { const t = state.tasks.find(x => x.id === id); if (t) md += `- [ ] **${t.title}**\n`; });
  rc.habitIds.forEach(id => { const h = state.habits.find(x => x.id === id); if (h) md += `- ${h.emoji} **${h.name}** — keep the streak\n`; });
  rc.goalIds.forEach(id => { const g = state.goals.find(x => x.id === id); if (g) md += `- 🎯 **${g.title}** — deadline approaching\n`; });
}
```

- [ ] **Step 4: Run E2E**

Run: `npx playwright test review-ritual.spec.js -g "Protecting next week section" && npx playwright test behavioral.spec.js -g "Weekly review markdown export"`
Expected: PASS (the existing export test must still pass).

- [ ] **Step 5: Commit**

```bash
git add app.js tests/review-ritual.spec.js
git commit -m "feat: weekly review markdown adds a Protecting Next Week section"
```

---

### Task 5: PBKDF2 Web Worker with inline fallback

**Files:**
- Create: `src/lib/vault-worker.js`
- Modify: `src/lib/crypto.js` (worker-aware `encryptVaultBackup` / `decryptVaultBackup`)
- Modify: `tests/unit/crypto.test.js`
- Modify: `sw.js` (`SHELL` += `./src/lib/vault-worker.js`, `VERSION` = v106)
- Modify: `index.html` (`?v=106`)

**Interfaces:**
- `encryptVaultBackup(plainText, password, opts?)` / `decryptVaultBackup(envelopeObj, password, opts?)` — `opts.workerFactory?: () => Worker`. When `Worker` is undefined or the factory/worker throws, fall back to the current inline path. Public 2-arg calls in `app.js` keep working.

- [ ] **Step 1: Write the failing unit test**

Add to `tests/unit/crypto.test.js`:

```js
describe('crypto worker fallback', () => {
  it('encrypts via the inline path when the workerFactory throws', async () => {
    const badFactory = () => { throw new Error('no worker here'); };
    const envelope = await encryptVaultBackup('payload', 'pw', { workerFactory: badFactory });
    const plain = await decryptVaultBackup(JSON.parse(envelope), 'pw', { workerFactory: badFactory });
    expect(plain).toBe('payload');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test:unit -- crypto`
Expected: FAIL — `encryptVaultBackup` ignores a third argument / no fallback path defined.

- [ ] **Step 3: Write `src/lib/vault-worker.js`**

```js
// src/lib/vault-worker.js
// Classic Web Worker: PBKDF2 + AES-GCM off the main thread.
self.onmessage = async (e) => {
  const { op, plainText, envelope, password, id } = e.data;
  try {
    const enc = new TextEncoder();
    const km = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']);
    const b642 = (b64) => { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
    const buf2 = (buf) => { const u = new Uint8Array(buf); let s = ''; for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); };
    if (op === 'encrypt') {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, km, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
      const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plainText));
      self.postMessage({ id, ok: true, result: JSON.stringify({ lumenEncrypted: true, version: 1, salt: buf2(salt), iv: buf2(iv), data: buf2(ct), exportedAt: Date.now() }, null, 2) });
    } else {
      const salt = b642(envelope.salt), iv = b642(envelope.iv), ct = b642(envelope.data).buffer;
      const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, km, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
      const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
      self.postMessage({ id, ok: true, result: new TextDecoder().decode(pt) });
    }
  } catch (err) {
    self.postMessage({ id, ok: false, error: String(err && err.message || err) });
  }
};
```

- [ ] **Step 4: Add worker orchestration to `src/lib/crypto.js`**

Rename the current bodies to `encryptInline` / `decryptInline` (keep them exported for tests), then:

```js
function runWorker(factory, message) {
  return new Promise((resolve, reject) => {
    let worker;
    try { worker = factory(); } catch (e) { reject(e); return; }
    const id = Math.random().toString(36).slice(2);
    const timer = setTimeout(() => { try { worker.terminate(); } catch (_) {} reject(new Error('WORKER_TIMEOUT')); }, 8000);
    worker.onmessage = (e) => {
      if (e.data.id !== id) return;
      clearTimeout(timer);
      try { worker.terminate(); } catch (_) {}
      e.data.ok ? resolve(e.data.result) : reject(new Error(e.data.error));
    };
    worker.onerror = (e) => { clearTimeout(timer); try { worker.terminate(); } catch (_) {} reject(e.error || new Error('WORKER_ERROR')); };
    worker.postMessage({ ...message, id });
  });
}

const defaultFactory = () =>
  (typeof Worker !== 'undefined' ? new Worker(new URL('./vault-worker.js', import.meta.url)) : null);

export async function encryptVaultBackup(plainText, password, opts = {}) {
  const factory = opts.workerFactory || defaultFactory;
  if (factory && typeof Worker !== 'undefined') {
    try { return await runWorker(factory, { op: 'encrypt', plainText, password }); } catch (_) { /* fall through */ }
  }
  return encryptInline(plainText, password);
}

export async function decryptVaultBackup(envelopeObj, password, opts = {}) {
  if (!envelopeObj.lumenEncrypted || !envelopeObj.salt || !envelopeObj.iv || !envelopeObj.data) {
    throw new Error('Not a valid Lumen encrypted vault file.');
  }
  const factory = opts.workerFactory || defaultFactory;
  if (factory && typeof Worker !== 'undefined') {
    try { return await runWorker(factory, { op: 'decrypt', envelope: envelopeObj, password }); }
    catch (e) { if (/WORKER_/.test(String(e.message))) { /* fall through */ } else throw new Error('Incorrect vault password or damaged data.'); }
  }
  return decryptInline(envelopeObj, password);
}
```

Note: in the Node/Vitest environment `Worker` is undefined, so tests exercise the inline path; the explicit `badFactory` test proves the try/catch fallback.

- [ ] **Step 5: Update SW + index.html**

`sw.js`: `VERSION = 'lumen-cache-v106'`; add `'./src/lib/vault-worker.js'` to `SHELL`. `index.html`: bump the four `?v=105` → `?v=106`.

- [ ] **Step 6: Run unit + E2E**

Run: `npm run test:unit -- crypto && npx playwright test behavioral.spec.js -g "AES-GCM encrypted vault"`
Expected: PASS. The browser test now runs through the worker path; the round-trip must still succeed.

- [ ] **Step 7: Add an offline-encryption E2E assertion**

In `tests/offline.spec.js` (or a new `tests/offline-crypto.spec.js` using `playwright.offline.config.js`), after the app boots with the server dead, run `window.LumenLib.crypto.encryptVaultBackup('x','y')` then decrypt and assert equality — proving the worker file is precached.

- [ ] **Step 8: Commit**

```bash
git add src/lib/vault-worker.js src/lib/crypto.js tests/unit/crypto.test.js tests/offline*.spec.js sw.js index.html
git commit -m "feat: run vault PBKDF2 in a Web Worker with inline fallback (v106)"
```

---

### Task 6: Mobile reach — Tasks / Finance / Students / Schedule at 375px

**Files:**
- Modify: `styles.css` (consolidated `@media (max-width: 860px)` and `(max-width: 640px)` rules)
- Create: `tests/mobile.spec.js`

- [ ] **Step 1: Write the failing mobile spec**

```js
// tests/mobile.spec.js
import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 375, height: 812 } });

const VIEWS = ['tasks', 'finance', 'students', 'schedule'];

for (const view of VIEWS) {
  test(`#${view} has no horizontal body overflow on a phone`, async ({ page }) => {
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`/#${view}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(600);
    const overflow = await page.evaluate(() => document.body.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${view} body overflows by ${overflow}px`).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
  });
}

test('kanban columns scroll and snap horizontally on a phone', async ({ page }) => {
  await page.goto('/#tasks');
  await page.waitForTimeout(500);
  const kb = page.locator('.kanban');
  const canScroll = await kb.evaluate((el) => el.scrollWidth > el.clientWidth + 10);
  expect(canScroll).toBe(true);
  const snap = await kb.evaluate((el) => getComputedStyle(el).scrollSnapType);
  expect(snap).toContain('x');
});
```

- [ ] **Step 2: Run it to verify it fails / find the overflow**

Run: `npx playwright test mobile.spec.js`
Expected: at least one view FAILS with a positive overflow. Note which.

- [ ] **Step 3: Add the consolidated mobile rules to `styles.css`**

```css
@media (max-width: 860px) {
  .topbar { position: sticky; top: 0; z-index: 30; }
  .topbar-right { flex-wrap: wrap; gap: 6px; }
  .search-input, .task-filter-input { width: 100%; min-width: 0; }
  /* wide grids collapse */
  .finance-grid, .students-grid, .lesson-grid, .dash-grid { grid-template-columns: 1fr !important; }
  /* any residual wide table scrolls inside its own box, not the page */
  .finance-table-wrap, .students-table-wrap, .lesson-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  table.data-table { min-width: 560px; }
}
@media (max-width: 640px) {
  .stats { grid-template-columns: repeat(2, 1fr); }
  .kanban .col { min-width: 82vw; scroll-snap-align: start; }
  .col-head { position: sticky; top: 0; background: var(--surface); z-index: 2; }
  .btn { min-height: 40px; }
  .modal { max-width: 96vw; }
}
```

Adjust the selector names to the actual classes found in `styles.css` during Step 2 (grep the failing view's container class). Do **not** remove existing breakpoint rules — add or tighten.

- [ ] **Step 4: Re-run the mobile spec, iterate**

Run: `npx playwright test mobile.spec.js`
Expected: PASS for all four views + kanban.

- [ ] **Step 5: Confirm desktop is unchanged**

Run: `npx playwright test smoke.spec.js regression.spec.js`
Expected: all green at the default viewport.

- [ ] **Step 6: Commit**

```bash
git add styles.css tests/mobile.spec.js
git commit -m "feat: mobile reflow for Tasks/Finance/Students/Schedule; sticky topbar; 375px spec"
```

---

### Task 7: Full ritual scenario + release

**Files:**
- Modify: `tests/review-ritual.spec.js` (end-to-end)
- Modify: `README.md`

- [ ] **Step 1: Write the end-to-end scenario**

```js
test('end-to-end: ritual commit flows into the next Brief and the export', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const now = Date.now();
    const iso = (d) => new Date(d).toISOString().slice(0, 10);
    state.habits = [{ id: 'h1', emoji: '📚', name: 'Read', color: '#605dff', dates: {}, createdAt: now - 20 * 864e5, freqType: 'daily' }];
    state.tasks = [{ id: 't1', title: 'Carry me', status: 'backlog', priority: 'low', due: '', createdAt: now, updatedAt: now }];
    if (!state.settings) state.settings = {};
    delete state.settings.reviewCommit;
    save();
  });
  await page.goto('/#review');
  await page.waitForTimeout(400);
  await page.click('#ritual-start');
  await page.click('#ritual-next');
  await page.click('#ritual-next');
  await page.waitForTimeout(150);
  await page.click('.protect-pick[data-kind="habit"][data-id="h1"]');
  await page.click('.protect-pick[data-kind="task"][data-id="t1"]');
  await page.click('#ritual-finish');
  await page.waitForTimeout(300);

  await page.goto('/#brief');
  await page.waitForTimeout(400);
  expect(await page.locator('.brief-commit-grid .t-title').first().innerText()).toContain('Carry me');

  await page.evaluate(() => { state.habits = []; state.tasks = []; delete state.settings.reviewCommit; save(); });
});
```

- [ ] **Step 2: Run the whole ritual spec**

Run: `npx playwright test review-ritual.spec.js`
Expected: all PASS.

- [ ] **Step 3: Run everything**

Run: `npm run test:all`
Expected: unit green; all Playwright green including `mobile.spec.js` and `offline*.spec.js`.

- [ ] **Step 4: Verify the release ritual**

Run: `grep -n "lumen-cache-v106" sw.js && grep -c "v=106" index.html && grep -n "vault-worker" sw.js`
Expected: v106 present; `index.html` count ≥ 3; `vault-worker.js` in `SHELL`.

- [ ] **Step 5: Update `README.md`**

Under Morning Brief & Weekly Review: "The Weekly Review is a guided ritual — Shipped, Slipped, and Protect Next Week — that feeds tomorrow's Brief." Under Security: "Vault encryption runs in a Web Worker so the UI never freezes."

- [ ] **Step 6: Commit and tag**

```bash
git add tests/review-ritual.spec.js README.md
git commit -m "test: full weekly-review ritual scenario feeding the Brief"
git tag v106
```

---

## Self-Review

**Spec coverage:**
- `reviewCtx` slipped + protect candidates → Task 1. ✅
- Three-step ritual strip, non-blocking, `reviewCommit` persist → Task 2. ✅
- Brief candidates read `reviewCommit` → Task 3. ✅
- MD export "Protecting Next Week" → Task 4. ✅
- PBKDF2 Web Worker + inline fallback, unchanged public signatures → Task 5. ✅
- Offline: worker in `SHELL`, offline-encryption assertion → Task 5 Steps 5, 7. ✅
- Mobile reflow for 4 views + sticky topbar + 375px spec → Task 6. ✅
- Desktop unaffected (smoke/regression at default viewport) → Task 6 Step 5. ✅
- Release ritual → Tasks 5, 7. ✅

**Placeholder scan:** Task 3 Step 3 and Task 6 Step 3 require a grep to bind exact identifiers (`getBriefCandidates` internals; the real wide-grid class names) — the grep and the exact edit are both given. Task 2 Step 5's delegated-listener note ("prefer a delegated listener attached once") is guidance on top of a working snippet, not a gap. No "TODO"/"handle edge cases"/"similar to" placeholders.

**Type consistency:** `state.settings.reviewCommit` shape `{ weekStart, taskIds, habitIds, goalIds, at }` is identical in Tasks 2, 3, 4, 7. `protectCandidates` items `{ id, kind, label }` with `kind ∈ {'task','habit','goal'}` match between Task 1 (producer) and Task 2 (`data-kind`/`data-id` consumer). `encryptVaultBackup(plainText, password, opts?)` third-arg `opts.workerFactory` matches the test and the `defaultFactory` path in Task 5.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-08-28-lumen-v106-review-ritual-mobile.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks.

**2. Inline Execution** — executing-plans, batch with checkpoints.

**Which approach?**
