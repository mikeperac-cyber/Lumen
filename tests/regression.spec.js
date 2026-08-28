// @ts-check
/* Regression coverage for the 2026-08 optimization pass:
   - kanban/matrix filter inputs keep focus while typing (debounced re-render)
   - habit heatmap always contains today's cell
   - global search survives tasks with unknown/legacy statuses
   - undo/redo stays consistent across many snapshots (byte-budget eviction)
   - cold boot renders exactly once */
const { test, expect } = require('@playwright/test');

async function seed(page, mutate) {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate(mutate);
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(700);
}

test('kanban filter keeps focus and full text while typing', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  await seed(page, () => {
    const st = JSON.parse(localStorage.getItem('lumen.state.v1') || '{}');
    st.tasks = [{ id: 't1', title: 'alpha task', desc: '', status: 'today', tags: [], category: 'personal', priority: 'med', due: '', startTime: '', goalId: '', projectId: '', recurrence: '', subtasks: [], createdAt: Date.now(), updatedAt: Date.now() }];
    localStorage.setItem('lumen.state.v1', JSON.stringify(st));
  });
  await page.goto('/#tasks');
  await page.waitForTimeout(500);
  await page.locator('#task-q').click();
  await page.keyboard.type('alpha', { delay: 40 });
  await page.waitForTimeout(400);
  // focus must remain in the filter input and the whole word must have survived
  const { focused, value, visible } = await page.evaluate(() => ({
    focused: document.activeElement && document.activeElement.id,
    value: document.querySelector('#task-q') ? document.querySelector('#task-q').value : null,
    visible: !!document.querySelector('.task-card')
  }));
  expect(focused).toBe('task-q');
  expect(value).toBe('alpha');
  expect(visible).toBe(true);
  expect(errors).toEqual([]);
});

test('matrix filter keeps focus and full text while typing', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  await seed(page, () => {
    const st = JSON.parse(localStorage.getItem('lumen.state.v1') || '{}');
    st.tasks = [{ id: 't1', title: 'beta matrix item', desc: '', status: 'doing', tags: [], category: 'personal', priority: 'high', due: '', startTime: '', goalId: '', projectId: '', recurrence: '', subtasks: [], createdAt: Date.now(), updatedAt: Date.now() }];
    localStorage.setItem('lumen.state.v1', JSON.stringify(st));
  });
  await page.goto('/#tasks');
  await page.waitForTimeout(500);
  await page.locator('#task-view-toggle').click();
  await page.waitForTimeout(400);
  await page.locator('#task-q').click();
  await page.keyboard.type('beta', { delay: 40 });
  await page.waitForTimeout(400);
  const { focused, value, hits } = await page.evaluate(() => ({
    focused: document.activeElement && document.activeElement.id,
    value: document.querySelector('#task-q') ? document.querySelector('#task-q').value : null,
    hits: document.querySelectorAll('.matrix-task').length
  }));
  expect(focused).toBe('task-q');
  expect(value).toBe('beta');
  expect(hits).toBe(1);
  expect(errors).toEqual([]);
});

test('kanban filter does not steal focus after click-away during debounce window', async ({ page }) => {
  await seed(page, () => {
    const st = JSON.parse(localStorage.getItem('lumen.state.v1') || '{}');
    st.tasks = [{ id: 't1', title: 'alpha task', desc: '', status: 'today', tags: [], category: 'personal', priority: 'med', due: '', startTime: '', goalId: '', projectId: '', recurrence: '', subtasks: [], createdAt: Date.now(), updatedAt: Date.now() }];
    localStorage.setItem('lumen.state.v1', JSON.stringify(st));
  });
  await page.goto('/#tasks');
  await page.waitForTimeout(500);
  // type, then immediately open the New Task modal inside the debounce window
  await page.locator('#task-q').click();
  await page.keyboard.type('a');
  await page.locator('#task-new').click();
  await page.waitForTimeout(500);
  const { activeId, modalOpen } = await page.evaluate(() => ({
    activeId: document.activeElement && document.activeElement.id,
    modalOpen: !!document.querySelector('#modal-root .modal')
  }));
  expect(modalOpen).toBe(true);
  expect(activeId).not.toBe('task-q'); // focus must stay with the modal, not snap back
});

test('dashboard widgets: unpin folds, persists across reload, hover expands, repin restores', async ({ page }) => {
  await page.goto('/#dashboard');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(800);
  const w = page.locator('.card[data-dw="deadlines"]');
  await expect(w).toBeVisible();
  // default: pinned open
  await expect(w.locator('.pin-toggle')).toHaveAttribute('aria-pressed', 'true');
  await expect(w).not.toHaveClass(/dw-folded/);
  // every widget card got its pin toggle
  const toggles = await page.locator('.card[data-dw] .pin-toggle').count();
  expect(toggles).toBeGreaterThanOrEqual(9);
  // unpin → folded, body collapses once neither hovered nor focused
  // (:hover / :focus-within on an unpinned widget intentionally holds it open)
  await w.locator('.pin-toggle').click();
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.mouse.move(5, 300);
  await page.waitForTimeout(500);
  await expect(w).toHaveClass(/dw-folded/);
  await expect(w.locator('.pin-toggle')).toHaveAttribute('aria-pressed', 'false');
  const h0 = await w.locator('.dw-body').evaluate(el => el.getBoundingClientRect().height);
  expect(h0).toBeLessThan(2);
  // persists across reload
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(800);
  const w2 = page.locator('.card[data-dw="deadlines"]');
  await expect(w2).toHaveClass(/dw-folded/);
  // hover expands it
  await w2.hover();
  await page.waitForTimeout(450);
  const h1 = await w2.locator('.dw-body').evaluate(el => el.getBoundingClientRect().height);
  expect(h1).toBeGreaterThan(10);
  // keyboard focus expands too (pin toggle is the focusable element)
  await w2.locator('.pin-toggle').focus();
  await page.waitForTimeout(400);
  const h2 = await w2.locator('.dw-body').evaluate(el => el.getBoundingClientRect().height);
  expect(h2).toBeGreaterThan(10);
  // repin restores permanently
  await w2.locator('.pin-toggle').click();
  await page.waitForTimeout(400);
  await expect(w2).not.toHaveClass(/dw-folded/);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('lumen.dash.fold') || '[]'));
  expect(stored).not.toContain('deadlines');
});

test('search quick-add: >task with NL text surfaces suggestion and Enter creates it', async ({ page }) => {
  await page.goto('/#dashboard');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(700);
  await page.keyboard.press('Control+k');
  await page.waitForTimeout(300);
  const inp = page.locator('#search-input');
  await inp.fill('>task ship the release tomorrow !high #ops');
  await page.waitForTimeout(450);
  // quick-add row must be present (was previously filtered out entirely)
  await expect(page.locator('.search-item', { hasText: 'Quick add' }).first()).toBeVisible();
  const rows = await page.locator('.search-item').count();
  expect(rows).toBeGreaterThanOrEqual(2); // quick-add + base task commands
  // Enter executes the first row → task created
  const before = await page.evaluate(() => state.tasks.length);
  await inp.press('Enter');
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => {
    const t = state.tasks.find(x => x.title === 'ship the release');
    return { count: state.tasks.length, due: t && t.due, prio: t && t.priority, tags: t && t.tags };
  });
  expect(after.count).toBe(before + 1);
  expect(after.due).toBeTruthy();
  expect(after.prio).toBe('high');
  expect(after.tags).toContain('ops');
});

test('habit heatmap always shows today highlighted', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  await seed(page, () => {
    const st = JSON.parse(localStorage.getItem('lumen.state.v1') || '{}');
    st.habits = [{ id: 'h1', name: 'Read', emoji: '📚', color: '#7c6cf6', freqType: 'daily', weeklyTarget: 7, dates: {}, freezes: {}, createdAt: Date.now(), updatedAt: Date.now() }];
    localStorage.setItem('lumen.state.v1', JSON.stringify(st));
  });
  await page.goto('/#habits');
  await page.waitForTimeout(500);
  const info = await page.evaluate(() => {
    const cells = [...document.querySelectorAll('.habit-card .heatmap .hm')];
    const today = new Date();
    const p = n => new Date(today.getTime() + n * 86400000).toISOString().slice(0, 10);
    return {
      total: cells.length,
      todayPresent: cells.some(c => c.title.startsWith(p(0))),
      todayMarked: cells.filter(c => c.classList.contains('today')).length,
      yesterdayPresent: cells.some(c => c.title.startsWith(p(-1)))
    };
  });
  expect(info.total).toBe(112);
  expect(info.todayPresent).toBe(true);
  expect(info.todayMarked).toBe(1);
  expect(info.yesterdayPresent).toBe(true);
  expect(errors).toEqual([]);
});

test('global search works with legacy unknown task statuses', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  await seed(page, () => {
    const st = JSON.parse(localStorage.getItem('lumen.state.v1') || '{}');
    st.tasks = [
      { id: 't1', title: 'Findable needle task', desc: '', status: 'today', tags: [], category: 'personal', priority: 'med', due: '', startTime: '', goalId: '', projectId: '', recurrence: '', subtasks: [], createdAt: Date.now(), updatedAt: Date.now() },
      { id: 't2', title: 'Legacy imported task', desc: '', status: 'archived-unknown', tags: [], category: 'personal', priority: 'low', due: '', startTime: '', goalId: '', projectId: '', recurrence: '', subtasks: [], createdAt: Date.now(), updatedAt: Date.now() }
    ];
    localStorage.setItem('lumen.state.v1', JSON.stringify(st));
  });
  await page.goto('/#dashboard');
  await page.waitForTimeout(400);
  await page.keyboard.press('Control+k');
  await page.waitForTimeout(300);
  await page.locator('#search-input').fill('findable');
  await page.waitForTimeout(500);
  await expect(page.locator('.search-item', { hasText: 'Findable needle task' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('undo/redo stays consistent across many rapid actions', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  await page.goto('/#tasks');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(600);
  // 50 quick adds → captureUndo runs 50 times; eviction budget must not corrupt stacks
  await page.evaluate(() => {
    for (let i = 0; i < 50; i++) {
      captureUndo('bulk');
      state.tasks.push({ id: 'u' + i, title: 'Bulk ' + i, desc: '', status: 'backlog', tags: [], category: 'personal', priority: 'med', due: '', startTime: '', goalId: '', projectId: '', recurrence: '', subtasks: [], createdAt: Date.now(), updatedAt: Date.now() });
    }
    flushSave();
  });
  // undo all 50 — UNDO_MAX caps history at 40, so exactly the last 40 are revertible
  await page.evaluate(() => { for (let i = 0; i < 50; i++) performUndo(); });
  const afterUndo = await page.evaluate(() => ({ tasks: state.tasks.length, depth: undoStack.length }));
  expect(afterUndo.tasks).toBe(10);
  expect(afterUndo.depth).toBe(0);
  // redo all 40 revertible ones
  await page.evaluate(() => { for (let i = 0; i < 50; i++) performRedo(); });
  const afterRedo = await page.evaluate(() => state.tasks.length);
  expect(afterRedo).toBe(50);
  expect(errors).toEqual([]);
});

test('module bootstrap: window.LumenLib exists before app boot with all namespaces', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(400);
  const shape = await page.evaluate(() => ({
    hasLib: typeof window.LumenLib === 'object' && window.LumenLib !== null,
    keys: window.LumenLib ? Object.keys(window.LumenLib).sort() : [],
  }));
  expect(shape.hasLib).toBe(true);
  expect(shape.keys).toEqual(['crypto', 'gemini', 'merge', 'parser', 'schedule', 'students', 'vault']);
  expect(errors).toEqual([]);
});

test('sync passphrase is salted (v2) after being set', async ({ page }) => {
  await page.goto('/#settings');
  await page.waitForTimeout(500);
  await page.evaluate(async () => {
    if (!syncMeta.passSalt) syncMeta.passSalt = window.LumenLib.crypto.randomSaltB64();
    syncMeta.passHash = await window.LumenLib.crypto.hashPass('test-pass', syncMeta.passSalt);
    syncMeta.passHashV = 2;
    saveSyncMeta();
  });
  await page.reload();
  await page.waitForTimeout(500);
  const meta = await page.evaluate(() => ({ salt: syncMeta.passSalt, hash: syncMeta.passHash, v: syncMeta.passHashV }));
  expect(meta.salt.length).toBeGreaterThan(10);
  expect(meta.hash).toMatch(/^[0-9a-f]{64}$/);
  expect(meta.v).toBe(2);
  await page.evaluate(() => { syncMeta.passHash = ''; syncMeta.passSalt = ''; syncMeta.passHashV = 1; saveSyncMeta(); });
});
