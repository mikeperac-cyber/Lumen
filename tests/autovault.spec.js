// @ts-check
// Auto-vault round-trip (task 7): enable autoBackup, mutate, assert IDB has encrypted blob, clear LS, restore.
const { test, expect } = require('@playwright/test');

test('auto-vault encrypts to IDB and restores after localStorage clear', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(600);

  // enable autoBackup with dedicated password (task 13: no geminiApiKey fallback)
  await page.evaluate(async () => {
    state.settings.autoBackup = true;
    window.__LUMEN_TEST.sessionSecrets.autoBackupPassword = 'test-vault-pw-123';
    // add a marker task to verify round-trip
    state.tasks.unshift({ id: 'autovault-marker', title: 'AUTO_VAULT_MARKER', status: 'backlog', priority: 'med', due: '', startTime: '', goalId: '', projectId: '', recurrence: '', tags: [], subtasks: [], createdAt: Date.now(), updatedAt: Date.now(), archived: false, watchers: [], members: [], comments: [], attachments: [], coverColor: '', coverImage: '', startDate: '', vaultIds: [] });
    // force flush to trigger autoVaultBackup
    const json = JSON.stringify(state);
    await autoVaultBackup(json, window.__LUMEN_TEST.sessionSecrets.autoBackupPassword);
  });

  await page.waitForTimeout(800);

  const hasBlob = await page.evaluate(async () => {
    const slots = await autoVaultList();
    return Array.isArray(slots) && slots.length > 0 && slots.some(s => {
      try { const o = JSON.parse(s); return o.lumenEncrypted && o.version === 2; } catch (_) { return false; }
    });
  });
  expect(hasBlob, 'autoVaultList should contain a v2 encrypted blob').toBe(true);

  const lsRaw = await page.evaluate(() => localStorage.getItem('lumen.state.v1') || '');
  expect(lsRaw).not.toContain('test-vault-pw-123');

  // clear localStorage (simulate loss) but keep IDB (autoVault DB)
  await page.evaluate(() => {
    try { localStorage.removeItem('lumen.state.v1'); } catch (_) {}
    // wipe in-memory tasks to simulate fresh load
    state.tasks = state.tasks.filter(t => t.id !== 'autovault-marker');
  });

  // restore via autoVaultList + decryptVaultBackup (task 7)
  const restored = await page.evaluate(async () => {
    const pwd = window.__LUMEN_TEST.sessionSecrets.autoBackupPassword || '';
    const slots = await autoVaultList();
    if (!slots.length) return null;
    const latest = slots[slots.length - 1];
    const parsed = JSON.parse(latest);
    const dec = await decryptVaultBackup(parsed, pwd);
    const data = JSON.parse(dec);
    return data.tasks && data.tasks.some(t => t.title === 'AUTO_VAULT_MARKER');
  });
  expect(restored, 'restored state should contain AUTO_VAULT_MARKER').toBe(true);

  // cleanup
  await page.evaluate(async () => {
    state.settings.autoBackup = false;
    window.__LUMEN_TEST.sessionSecrets.autoBackupPassword = '';
    state.tasks = state.tasks.filter(t => t.id !== 'autovault-marker');
    try {
      const db = await autoVaultDb();
      await new Promise((res, rej) => {
        const tx = db.transaction('slots', 'readwrite');
        const store = tx.objectStore('slots');
        const rq = store.clear();
        rq.onsuccess = () => res();
        rq.onerror = () => rej(rq.error);
      });
    } catch (_) {}
    try { localStorage.removeItem('lumen.autoVaultIdx'); } catch(_) {}
  });
});
