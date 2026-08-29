// @ts-check
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const DIST = path.join(ROOT, 'dist');
const PORT = 8095;
const IS_WIN = process.platform === 'win32';

function waitPort(port, timeoutMs) {
  const net = require('net');
  const t0 = Date.now();
  return new Promise((res, rej) => {
    (function tryOnce() {
      const s = net.connect(port, '127.0.0.1');
      s.on('connect', () => { s.destroy(); res(true); });
      s.on('error', () => {
        s.destroy();
        if (Date.now() - t0 > timeoutMs) return rej(new Error('port never opened'));
        setTimeout(tryOnce, 300);
      });
    })();
  });
}

function startServer(cwd) {
  return spawn(
    IS_WIN ? 'npx.cmd' : 'npx',
    ['serve', '.', '-l', String(PORT), '--no-clipboard'],
    { cwd, stdio: 'ignore', shell: IS_WIN, detached: !IS_WIN }
  );
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

test.describe('Tier 5 Adversarial PWA Offline & Manifest Suite', () => {

  test('1. Manifest deep integrity: format, properties, valid PNG magic bytes', async () => {
    const manifestPath = path.join(DIST, 'manifest.webmanifest');
    expect(fs.existsSync(manifestPath), 'manifest.webmanifest exists in dist').toBe(true);

    const raw = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(raw);

    expect(manifest.name).toBe('Lumen — Your Personal Command Center');
    expect(manifest.short_name).toBe('Lumen');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
    expect(manifest.scope).toBe('/');
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThanOrEqual(3);

    for (const icon of manifest.icons) {
      const iconPath = path.join(DIST, icon.src.replace(/^\//, ''));
      expect(fs.existsSync(iconPath), `Icon exists at ${iconPath}`).toBe(true);
      const stat = fs.statSync(iconPath);
      expect(stat.size).toBeGreaterThan(100);

      // Verify PNG magic header: 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
      const buf = fs.readFileSync(iconPath);
      const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47;
      expect(isPng, `Icon ${icon.src} has valid PNG signature`).toBe(true);
    }
  });

  test('2. Service worker precache exact bijection with dist/ contents', async () => {
    const swPath = path.join(DIST, 'sw.js');
    expect(fs.existsSync(swPath), 'sw.js exists in dist').toBe(true);

    const swContent = fs.readFileSync(swPath, 'utf8');
    const m = swContent.match(/const SHELL = \[([\s\S]*?)\];/);
    expect(m, 'SHELL array declared in sw.js').toBeTruthy();

    const shellEntries = [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]);
    expect(shellEntries.length).toBeGreaterThan(10);
    expect(shellEntries).toContain('./');
    expect(shellEntries).not.toContain('./sw.js');

    // Ensure every single file listed in SHELL actually exists
    for (const entry of shellEntries) {
      if (entry === './') continue;
      const resolved = path.join(DIST, entry.replace(/^\.\//, ''));
      expect(fs.existsSync(resolved), `Precache entry ${entry} exists in dist`).toBe(true);
    }

    // Ensure every critical file in dist is in SHELL
    const distFiles = fs.readdirSync(DIST).filter(f => !f.startsWith('.') && f !== 'sw.js');
    for (const file of distFiles) {
      if (fs.statSync(path.join(DIST, file)).isDirectory()) continue;
      expect(shellEntries).toContain(`./${file}`);
    }
  });

  test('3. Simulated total network severance: offline route transitions and state mutations', async ({ page, context }) => {
    test.setTimeout(90000);
    const srv = startServer(DIST);
    try {
      await waitPort(PORT, 20000);
      await page.goto(`http://127.0.0.1:${PORT}/#dashboard`, { waitUntil: 'load', timeout: 30000 });

      // Wait for SW to install, activate, and control
      await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 30000 }).catch(async () => {
        await page.evaluate(() => navigator.serviceWorker.ready.catch(()=>{}));
        await page.waitForTimeout(1500);
      });
      await page.waitForTimeout(1000);
      expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

      // Verify all assets are in CacheStorage
      const cachedCount = await page.evaluate(async () => {
        const keys = await caches.keys();
        if (keys.length === 0) return 0;
        const cache = await caches.open(keys[0]);
        const reqs = await cache.keys();
        return reqs.length;
      });
      expect(cachedCount).toBeGreaterThan(15);

      // Stop server completely — simulate total disconnect
      await stopServer(srv);
      await page.waitForTimeout(1000);

      // Verify in-page navigation between routes works offline
      const routesToTest = ['#tasks', '#vault', '#finance', '#habits', '#goals', '#students', '#notes', '#dashboard'];
      for (const route of routesToTest) {
        await page.evaluate((r) => { location.hash = r; }, route);
        await page.waitForTimeout(300);
        expect(await page.evaluate(() => !!document.querySelector('.app'))).toBe(true);
      }

      // Test localStorage state manipulation while offline
      const storagePass = await page.evaluate(() => {
        const key = 'lumen.state.v1';
        let raw = localStorage.getItem(key);
        let s = raw ? JSON.parse(raw) : {};
        s.tasks = s.tasks || [];
        s.tasks.push({
          id: 'offline-task-1',
          title: 'Offline Created Task',
          status: 'todo',
          created: new Date().toISOString(),
          updatedAt: Date.now()
        });
        localStorage.setItem(key, JSON.stringify(s));
        const retrieved = JSON.parse(localStorage.getItem(key) || '{}');
        return retrieved.tasks && retrieved.tasks.some(t => t.id === 'offline-task-1');
      });
      expect(storagePass).toBe(true);

      // Perform reload with server still dead
      await page.reload({ waitUntil: 'commit', timeout: 15000 });
      await page.waitForSelector('.app', { timeout: 15000 });
      await page.waitForTimeout(500);
      expect(await page.evaluate(() => !!document.querySelector('.app'))).toBe(true);

      // Fresh navigation (new tab) while offline
      const page2 = await context.newPage();
      await page2.goto(`http://127.0.0.1:${PORT}/#vault`, { waitUntil: 'commit', timeout: 15000 });
      await page2.waitForSelector('.app', { timeout: 15000 });
      await page2.waitForTimeout(500);
      expect(await page2.evaluate(() => !!document.querySelector('.app'))).toBe(true);
      await page2.close();

      // Test Web Worker / Crypto offline
      const workerCryptoTest = await page.evaluate(async () => {
        const payload = JSON.stringify({ offlineData: 'verified-safe-under-attack' });
        const encrypted = await window.LumenLib.crypto.encryptVaultBackup(payload, 'adversarial-pw');
        const decrypted = await window.LumenLib.crypto.decryptVaultBackup(JSON.parse(encrypted), 'adversarial-pw');
        return decrypted === payload;
      });
      expect(workerCryptoTest).toBe(true);

    } finally {
      await Promise.race([
        stopServer(srv),
        new Promise(res => setTimeout(res, 3000))
      ]);
    }
  });

});
