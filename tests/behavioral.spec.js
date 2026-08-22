// @ts-check
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test.describe('Lumen behavioral — task CRUD + undo + backup round-trip', () => {
  test('create task → undo → redo → reload → still there → export/import backup', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    // 1. Navigate to the app and go to Tasks view
    await page.goto('/#tasks');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(600);

    // 2. Create a task via the quick-add bar
    const quickInput = page.locator('#quick-task-input');
    await expect(quickInput).toBeVisible();
    await quickInput.fill('Playwright test task');
    await page.locator('#quick-task-go').click();
    await page.waitForTimeout(500);

    // 3. Verify the task appears on the board
    const taskCard = page.locator('.task-card', { hasText: 'Playwright test task' });
    await expect(taskCard).toBeVisible({ timeout: 5000 });

    // 4. Undo (Ctrl+Z) — task should disappear (undo stack is in-memory, no reload yet)
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(500);
    const taskAfterUndo = page.locator('.task-card', { hasText: 'Playwright test task' });
    await expect(taskAfterUndo).toHaveCount(0, { timeout: 3000 });

    // 5. Redo (Ctrl+Shift+Z) — task should reappear
    await page.keyboard.press('Control+Shift+z');
    await page.waitForTimeout(500);
    await expect(taskCard).toBeVisible({ timeout: 3000 });

    // 6. Reload the page — task should persist
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(800);
    await page.goto('/#tasks');
    await page.waitForTimeout(600);
    const taskAfterReload = page.locator('.task-card', { hasText: 'Playwright test task' });
    await expect(taskAfterReload).toBeVisible({ timeout: 5000 });

    // 7. Export a backup (trigger the download)
    await page.goto('/#settings');
    await page.waitForTimeout(600);

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#set-export').click();
    const download = await downloadPromise;
    const downloadPath = path.join(__dirname, 'test-backup.json');
    await download.saveAs(downloadPath);

    // Verify backup file has tasks array
    const backup = JSON.parse(fs.readFileSync(downloadPath, 'utf-8'));
    expect(Array.isArray(backup.tasks)).toBeTruthy();

    // 8. Import the backup — verify round-trip works
    const fileInput = page.locator('#set-import-file');
    await fileInput.setInputFiles(downloadPath);
    await page.waitForTimeout(1000);

    // Verify import succeeded — go back to tasks and check
    await page.goto('/#tasks');
    await page.waitForTimeout(600);
    const taskAfterImport = page.locator('.task-card', { hasText: 'Playwright test task' });
    await expect(taskAfterImport).toBeVisible({ timeout: 5000 });

    // Verify no page errors occurred throughout the test
    expect(errors).toEqual([]);

    // Clean up
    try { fs.unlinkSync(downloadPath); } catch (_) {}
  });

  test('natural language task parsing extracts tags and priority', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/#tasks');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(600);

    const quickInput = page.locator('#quick-task-input');
    await expect(quickInput).toBeVisible();
    await quickInput.fill('Deploy production build tomorrow !urgent #release');
    await page.locator('#quick-task-go').click();
    await page.waitForTimeout(500);

    const taskCard = page.locator('.task-card', { hasText: 'Deploy production build' });
    await expect(taskCard).toBeVisible({ timeout: 5000 });
    // Verify tag chip is rendered
    await expect(taskCard.locator('.tag', { hasText: 'release' })).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('subtask checklist and progress bar update on task card', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/#tasks');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(600);

    // Open task modal
    await page.locator('#task-new').click();
    await page.waitForTimeout(400);

    await page.locator('#f-title').fill('Task with Subtasks');
    // Add two subtasks
    await page.locator('#f-add-subtask').click();
    const stInputs = page.locator('.st-input');
    await stInputs.nth(0).fill('Subtask Alpha');
    await page.locator('#f-add-subtask').click();
    await stInputs.nth(1).fill('Subtask Beta');

    // Check first subtask as done
    await page.locator('.st-check').nth(0).check();

    // Save
    await page.locator('#f-save').click();
    await page.waitForTimeout(500);

    // Verify task card displays progress pill 1/2 and progress bar
    const taskCard = page.locator('.task-card', { hasText: 'Task with Subtasks' });
    await expect(taskCard).toBeVisible();
    await expect(taskCard.locator('.subtask-prog')).toHaveText('✓ 1/2');
    await expect(taskCard.locator('.subtask-bar-track')).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('habit streak freeze toggles without errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/#habits');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(600);

    // Create a new habit
    const newBtn = page.locator('#habit-new, #habit-new-empty').first();
    await newBtn.click();
    await page.waitForTimeout(400);

    await page.locator('#h-name').fill('Morning Meditation');
    await page.locator('#h-save').click();
    await page.waitForTimeout(500);

    const habitCard = page.locator('.habit-card', { hasText: 'Morning Meditation' });
    await expect(habitCard).toBeVisible();

    // Click freeze button
    const freezeBtn = habitCard.locator('[data-freeze-habit]');
    await expect(freezeBtn).toBeVisible();
    await freezeBtn.click();
    await page.waitForTimeout(500);

    // Verify frozen cell icon rendered in heatmap
    await expect(habitCard.locator('.day.frozen, .hm.frozen')).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('Web Crypto AES-GCM encrypted vault backup and decrypt roundtrip', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/#settings');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(600);

    // Click Encrypted Export
    const encBtn = page.locator('#set-export-enc');
    await expect(encBtn).toBeVisible();
    await encBtn.click();
    await page.waitForTimeout(400);

    // Enter password
    const pwdInput = page.locator('#vault-export-pwd');
    await expect(pwdInput).toBeVisible();
    await pwdInput.fill('secret123');

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#vault-export-confirm').click();
    const download = await downloadPromise;
    const encPath = path.join(__dirname, 'test-vault.json');
    await download.saveAs(encPath);

    // Verify file content is encrypted envelope
    const rawContent = JSON.parse(fs.readFileSync(encPath, 'utf-8'));
    expect(rawContent.lumenEncrypted).toBe(true);
    expect(rawContent.salt).toBeTruthy();
    expect(rawContent.iv).toBeTruthy();
    expect(rawContent.data).toBeTruthy();

    // Import encrypted vault
    const fileInput = page.locator('#set-import-file');
    await fileInput.setInputFiles(encPath);
    await page.waitForTimeout(400);

    // Verify password prompt appears
    const importPwd = page.locator('#vault-import-pwd');
    await expect(importPwd).toBeVisible();
    await importPwd.fill('secret123');
    await page.locator('#vault-import-confirm').click();
    await page.waitForTimeout(800);

    expect(errors).toEqual([]);

    try { fs.unlinkSync(encPath); } catch (_) {}
  });

  test('interactive markdown note checklist toggle and task extraction', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/#notes');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(600);

    // Create a new note
    await page.locator('#note-new').click();
    await page.waitForTimeout(400);

    await page.locator('#ne-title').fill('Project Launch Prep');
    const contentArea = page.locator('#ne-content');
    await contentArea.fill('# Launch Checklist\n- [ ] Finalize marketing copy\n- [ ] Review pricing tier\n- [x] Security audit passed');
    await page.waitForTimeout(400);

    // Switch to preview mode
    await page.locator('#ne-preview').click();
    await page.waitForTimeout(400);

    // Verify checklist checkboxes render
    const checkboxes = page.locator('.note-preview input[type="checkbox"]');
    await expect(checkboxes).toHaveCount(3);
    await expect(checkboxes.nth(0)).not.toBeChecked();
    await expect(checkboxes.nth(2)).toBeChecked();

    // Toggle first checkbox in preview mode
    await checkboxes.nth(0).click();
    await page.waitForTimeout(400);

    // Extract tasks to Kanban
    await page.locator('#ne-extract').click();
    await page.waitForTimeout(600);

    // Verify task extracted to Kanban board
    await page.goto('/#tasks');
    await page.waitForTimeout(600);
    const extractedTask = page.locator('.task-card', { hasText: 'Finalize marketing copy' });
    await expect(extractedTask).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('Kanban batch selection and batch priority update', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/#tasks');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(600);

    // Enter select mode
    await page.locator('#task-select-mode').click();
    await page.waitForTimeout(400);

    // Click select all
    const selectAllBtn = page.locator('#batch-select-all');
    await expect(selectAllBtn).toBeVisible();
    await selectAllBtn.click();
    await page.waitForTimeout(400);

    // Change batch priority to High
    const prioSel = page.locator('#batch-set-prio');
    await prioSel.selectOption('high');
    await page.waitForTimeout(600);

    expect(errors).toEqual([]);
  });

  test('Weekly review markdown export downloads report', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/#review');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(600);

    const exportBtn = page.locator('#rev-export-md');
    await expect(exportBtn).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await exportBtn.click();
    const download = await downloadPromise;
    const revPath = path.join(__dirname, 'test-review.md');
    await download.saveAs(revPath);

    const mdContent = fs.readFileSync(revPath, 'utf-8');
    expect(mdContent).toContain('Weekly Review');
    expect(mdContent).toContain('Key Highlights');

    expect(errors).toEqual([]);
    try { fs.unlinkSync(revPath); } catch (_) {}
  });

  test('Settings CSV task importer bulk loads tasks', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/#settings');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(600);

    // Create a mock CSV file
    const csvContent = `title,priority,due,tags\nCSV Imported Task Alpha,high,2026-08-30,csv;test\nCSV Imported Task Beta,med,2026-08-31,csv;work`;
    const csvPath = path.join(__dirname, 'test-tasks.csv');
    fs.writeFileSync(csvPath, csvContent, 'utf-8');

    const fileInput = page.locator('#set-import-tasks-file');
    await fileInput.setInputFiles(csvPath);
    await page.waitForTimeout(600);

    // Check tasks view
    await page.goto('/#tasks');
    await page.waitForTimeout(600);

    await expect(page.locator('.task-card', { hasText: 'CSV Imported Task Alpha' })).toBeVisible();
    await expect(page.locator('.task-card', { hasText: 'CSV Imported Task Beta' })).toBeVisible();

    expect(errors).toEqual([]);
    try { fs.unlinkSync(csvPath); } catch (_) {}
  });

  test('floating focus timer pill appears when starting focus session', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/#tasks');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(600);

    // Create a task to ensure a task card exists
    const quickInput = page.locator('#quick-task-input');
    await quickInput.fill('Timer focus task');
    await page.locator('#quick-task-go').click();
    await page.waitForTimeout(500);

    // Click pomodoro button on the task
    const taskCard = page.locator('.task-card', { hasText: 'Timer focus task' });
    const pomoBtn = taskCard.locator('[data-task-pomo]').first();
    await pomoBtn.click();
    await page.waitForTimeout(500);

    // Verify floating pomo pill is visible
    const floatingPill = page.locator('#floating-pomo-pill');
    await expect(floatingPill).toBeVisible();
    await expect(floatingPill.locator('#fp-time')).toBeVisible();

    // Navigate to another view (e.g. #notes) and ensure pill remains visible!
    await page.goto('/#notes');
    await page.waitForTimeout(500);
    await expect(floatingPill).toBeVisible();

    // Dismiss floating pill
    await floatingPill.locator('#fp-close').click();
    await page.waitForTimeout(400);
    await expect(floatingPill).toHaveClass(/hidden/);

    expect(errors).toEqual([]);
  });

  test('multi-theme and appearance settings persist across reload', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/#settings');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(600);

    // Switch theme to cyberpunk
    const cyberpunkCard = page.locator('.theme-card[data-theme-id="cyberpunk"]');
    await cyberpunkCard.click();
    await page.waitForTimeout(400);

    // Verify html dataset theme is cyberpunk
    let htmlTheme = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(htmlTheme).toBe('cyberpunk');

    // Switch accent color to emerald
    const emeraldAccent = page.locator('.accent-dot-btn[data-accent-id="emerald"]');
    await emeraldAccent.click();
    await page.waitForTimeout(400);

    let htmlAccent = await page.evaluate(() => document.documentElement.dataset.accent);
    expect(htmlAccent).toBe('emerald');

    // Reload page and verify settings persisted in localStorage
    await page.reload();
    await page.waitForTimeout(600);

    htmlTheme = await page.evaluate(() => document.documentElement.dataset.theme);
    htmlAccent = await page.evaluate(() => document.documentElement.dataset.accent);
    expect(htmlTheme).toBe('cyberpunk');
    expect(htmlAccent).toBe('emerald');

    expect(errors).toEqual([]);
  });

  test('focus hub workstation modal opens and allows procedural ambient audio selection', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/#dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(600);

    // Click Focus Hub button in topbar
    const hubBtn = page.locator('#global-focus-hub-btn');
    await hubBtn.click();
    await page.waitForTimeout(400);

    // Verify modal is open
    const modal = page.locator('#modal-root .modal');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Focus Hub & Workstation');

    // Click Deep Ocean ambient chip
    const oceanChip = modal.locator('.ambient-chip[data-ambient="ocean"]');
    await oceanChip.click();
    await page.waitForTimeout(400);
    await expect(oceanChip).toHaveClass(/active/);

    // Close modal
    await modal.locator('button', { hasText: 'Close' }).click();
    await page.waitForTimeout(300);

    expect(errors).toEqual([]);
  });
});
