// @ts-check
const { test, expect } = require('@playwright/test');
const { spawn } = require('child_process');
const path = require('path');

function waitPort(port, timeoutMs) {
  const net = require('net');
  const t0 = Date.now();
  return new Promise((res, rej) => {
    (function tryOnce() {
      const s = net.connect(port, '127.0.0.1');
      s.on('connect', () => { s.destroy(); res(true); });
      s.on('error', () => { s.destroy(); if (Date.now() - t0 > timeoutMs) return rej(new Error('port never opened')); setTimeout(tryOnce, 300); });
    })();
  });
}
function killTree(pid) {
  return new Promise(res => spawn('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' }).on('exit', res));
}

const IS_WIN = process.platform === 'win32';
const PORT = 8094;
function startServer(cwd) {
  // Windows: .cmd shims need a shell; POSIX: npx execs directly, run detached so the
  // whole process group can be killed with -pid.
  return spawn(IS_WIN ? 'npx.cmd' : 'npx', ['serve', '.', '-l', String(PORT), '--no-clipboard'], { cwd, stdio: 'ignore', shell: IS_WIN, detached: !IS_WIN });
}
async function stopServer(srv) {
  if (IS_WIN) {
    await new Promise(res => spawn('taskkill', ['/PID', String(srv.pid), '/T', '/F'], { stdio: 'ignore' }).on('exit', res));
    return;
  }
  try { process.kill(-srv.pid, 'SIGKILL'); }
  catch (_) { try { srv.kill('SIGKILL'); } catch (_) {} }
  await new Promise(res => { if (srv.exitCode !== null) res(); else srv.once('exit', res); });
}

// Serves dist/, not the repo root: dist/ is the artifact vercel.json ships, and sw.js's
// SHELL is generated from that artifact's real contents. Pointing this at the source
// tree would precache paths that only exist before the build.
test('offline shell: reload AND fresh navigation boot the app with the server dead', async ({ page }) => {
  test.setTimeout(120000);
  const srv = startServer(path.join(__dirname, '..', 'dist'));
  try {
    await waitPort(PORT, 20000);
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load', timeout: 30000 });
    // Wait for SW to control — poll instead of fixed sleep (CI slower)
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 30000 }).catch(async () => {
      // Fallback: wait for ready then re-check
      await page.evaluate(() => navigator.serviceWorker.ready.catch(()=>{}));
      await page.waitForTimeout(1500);
    });
    // Extra grace for cache population
    await page.waitForTimeout(800);
    expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    await expect(page.locator('.app')).toBeVisible({ timeout: 10000 });

    await stopServer(srv);
    // Ensure server is truly down before offline reload
    await page.waitForTimeout(800);

    // Reload while genuinely offline — use commit to avoid hanging on network idle
    await page.reload({ waitUntil: 'commit', timeout: 15000 });
    await page.waitForSelector('.app', { timeout: 15000 });
    expect(await page.evaluate(() => !!document.querySelector('.app'))).toBe(true);

    // Fresh navigation (new tab) while offline
    const page2 = await page.context().newPage();
    await page2.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'commit', timeout: 15000 });
    await page2.waitForSelector('.app', { timeout: 15000 });
    expect(await page2.evaluate(() => !!document.querySelector('.app'))).toBe(true);
    await page2.close();

    // Vault crypto (worker path) still works with the server dead — proves
    // src/lib/vault-worker.js is precached in the offline shell.
    await page.waitForTimeout(500);
    const roundTrip = await page.evaluate(async () => {
      const env = await window.LumenLib.crypto.encryptVaultBackup('{"offline":true}', 'pw');
      return window.LumenLib.crypto.decryptVaultBackup(JSON.parse(env), 'pw');
    });
    expect(roundTrip).toBe('{"offline":true}');
  } finally {
    // Robust stop — don't hang if already dead
    await Promise.race([
      stopServer(srv),
      new Promise(res => setTimeout(res, 3000))
    ]);
  }
});
