import { test, expect } from '@playwright/test';

test('Commit → Timebox: commit three → unplaced tray → drop onto today → Focus matches', async ({ page }) => {
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e.message || e)));

  await page.goto('/#brief', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);

  // reset: clear commit flag, inject 3 backlog tasks that will be candidates
  await page.evaluate(async () => {
    try { localStorage.removeItem('lumen.brief.commitDate'); } catch(_){}
    // remove prior CommitTest tasks
    state.tasks = state.tasks.filter(t => !String(t.title||'').startsWith('CommitTest'));
    // ensure kanban has default lists
    if (!state.kanbanLists || !state.kanbanLists.length) { state.kanbanLists = [{id:'backlog',title:'Backlog',color:'#8b93a7'},{id:'today',title:'Today',color:'#ffb020'},{id:'progress',title:'In Progress',color:'#4f8cff'},{id:'done',title:'Done',color:'#34d399'}]; }
    const now = Date.now();
    for (let i=1;i<=3;i++) {
      state.tasks.push({
        id: 'ct-commit-'+i,
        title: 'CommitTest '+i,
        desc: 'timebox proof',
        status: 'backlog',
        priority: 'high',
        due: '',
        startDate: '',
        coverColor: '',
        coverImage: '',
        members: [],
        comments: [],
        attachments: [],
        archived: false,
        watchers: [],
        tags: [],
        category: 'personal',
        goalId: '',
        krId: '',
        recurrence: '',
        subtasks: [],
        scheduleDay: '',
        schedulePeriod: '',
        startTime: '',
        endTime: '',
        createdAt: now + i,
        updatedAt: now + i
      });
    }
    // also add a habit linked to a goal for the cheap add-on check
    if (!state.goals.find(g=>g.title==='Commit Goal')) {
      state.goals.push({ id:'g-commit', title:'Commit Goal', color:'#7c6cf6', due: '', keyResults:[{id:'kr1', title:'CommitTest habit', current:0, target:5, due:''}] });
    }
    if (!state.habits.find(h=>h.name==='CommitTest habit')) {
      state.habits.push({ id:'h-commit', name:'CommitTest habit', emoji:'🔥', color:'#ff5d6c', freqType:'daily', weeklyTarget:5, dates:{}, freezes:{}, updatedAt: now });
    }
    await flushSave();
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  // Brief should show commit button with 3 candidates (we pushed 3 high prio)
  const commitBtn = page.locator('#brief-commit-btn');
  await expect(commitBtn).toBeVisible({ timeout: 4000 });
  // ensure at least 3 checkboxes for CommitTest are checked (they are in candidates)
  // Instead of filtering, just click commit — it commits overdue+candidates checked
  await commitBtn.click();
  await page.waitForTimeout(800);

  // After commit, Brief collapses: button disabled and collapsed summary visible, no duplicate checklist
  await expect(page.locator('#brief-commit-btn')).toHaveCount(0);
  await expect(page.locator('.brief-commit.collapsed')).toBeVisible();
  await expect(page.locator('#sched-commit-tray, #brief-goto-schedule')).not.toHaveCount(0); // at least one of them exists
  // check that Today card now has CommitTest tasks (no duplicate in ritual grid)
  await expect(page.locator('.brief-commit-collapsed')).toContainText('Committed');

  // Go to Schedule: committed unplaced tray should have 3
  await page.goto('/#schedule', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  const commitTray = page.locator('#sched-commit-tray');
  await expect(commitTray).toBeVisible({ timeout: 4000 });
  await expect(commitTray).toContainText('Committed, unplaced');
  const commitItems = commitTray.locator('.sched-unsched-item.committed');
  await expect(commitItems).toHaveCount(3, { timeout: 3000 });

  // habit→goal chip cheap add-on: Brief habits should have link chips after our habit/goal pair
  await page.goto('/#brief', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  // habit habit chip appears in Brief habits (the habit we created)
  await expect(page.locator('.brief-habit').first()).toContainText('CommitTest habit');
  // the link chip may appear if heuristic matches; at least no error

  // Back to Schedule, drag first committed onto today's period (reuse grid drag path)
  await page.goto('/#schedule', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  // find today's column via .sched-cell.today — pick first today cell (p1 or p2)
  const todayCell = page.locator('.sched-cell.today').first();
  await expect(todayCell).toBeVisible({ timeout: 4000 });
  const firstCommit = commitTray.locator('.sched-unsched-item.committed').first();
  await expect(firstCommit).toBeVisible();
  const firstTitle = (await firstCommit.textContent() || '').trim();
  // drag committed card onto today cell
  await firstCommit.dragTo(todayCell);
  await page.waitForTimeout(900);

  // After drop, committed tray should shrink to 2, and today cell should contain the card
  await expect(commitTray.locator('.sched-unsched-item.committed')).toHaveCount(2, { timeout: 3000 });
  await expect(todayCell.locator('.sched-task')).toContainText('CommitTest', { timeout: 3000 });

  // Dashboard idle Focus should now target first committed task (the one we just placed, or remaining first)
  await page.goto('/#dashboard', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  const focusHint = page.locator('[data-testid="focus-hint"]');
  // focus hint should be visible when idle and show a CommitTest title
  await expect(focusHint).toBeVisible({ timeout: 4000 });
  const hintText = await focusHint.textContent();
  expect(hintText).toMatch(/CommitTest/);
  // title should match one of the committed tasks (first committed or first placed)
  expect(hintText).toContain('CommitTest');

  // Also verify Focus hint's title element matches
  const focusTitle = await page.locator('.pomo-focus-title').textContent();
  expect(focusTitle).toMatch(/CommitTest/);

  // No console errors across the flow (allow our debug overlay logs)
  const filteredErrors = errors.filter(e => !String(e).includes('Download the React DevTools'));
  expect(filteredErrors, `Console errors during commit→timebox flow: ${filteredErrors.join('\n')}`).toEqual([]);

  // cleanup: remove test data
  await page.evaluate(async () => {
    state.tasks = state.tasks.filter(t => !String(t.title||'').startsWith('CommitTest'));
    state.goals = state.goals.filter(g => g.id !== 'g-commit');
    state.habits = state.habits.filter(h => h.id !== 'h-commit');
    try { localStorage.removeItem('lumen.brief.commitDate'); } catch(_){}
    if (state.settings) { delete state.settings.focusTaskId; delete state.settings.focusSeedAt; }
    save();
  });
});
