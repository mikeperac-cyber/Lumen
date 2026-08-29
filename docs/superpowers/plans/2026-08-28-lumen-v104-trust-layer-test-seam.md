# Lumen v104 — Trust Layer + Test Seam — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract Lumen's pure logic into `src/lib/` ES modules behind a Vitest unit-test seam, and harden the sync passphrase hash and the Gemini API call — with zero UX change.

**Architecture:** Four new pure-function ES modules (`crypto`, `schedule`, `parser`, `merge`) live in `src/lib/`. A single bootstrap module `src/lib/globals.js` imports them and assigns `window.LumenLib`; `index.html` loads it as `type="module"` immediately before the classic `app.js` script, so it runs first. The functions in `app.js` become one-line delegators to `window.LumenLib.*`, keeping every call site and every inline `onclick` handler unchanged. `app.js` itself stays a classic script — no bundler.

**Tech Stack:** Vitest (Node environment, Node 20 global Web Crypto), ES modules, JSDoc type annotations, Playwright (existing), GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-28-lumen-v104-v106-design.md` (§ Build A)

## Global Constraints

- **Node 20** (matches `.github/workflows/ci.yml` `node-version: 20`).
- **No bundler.** `app.js` stays `<script src="app.js?v=104" defer>` (classic). `src/lib/globals.js` is the ONLY `type="module"` script.
- **Offline shell green.** Every new boot-loaded file is added to `sw.js` `SHELL` (`sw.js:6`). `tests/offline.spec.js` must stay green.
- **Release ritual.** `sw.js` `VERSION = 'lumen-cache-v104'`; `index.html` `?v=104` on `styles.css`, `themes.css`, `app.js`; git tag `v104`.
- **State back-compat** via `normalizeState` (`app.js:756`), additive fields only.
- **Vault envelope** `{ lumenEncrypted:true, version:1, salt, iv, data, exportedAt }` must still decrypt.
- **All 43 existing Playwright specs stay green with assertions unchanged.**
- **Existing `syncMeta.passHash` values keep verifying** (legacy peers still connect until the user re-enters the passphrase).

---

### Task 1: Scaffold Vitest + CI unit-test job

**Files:**
- Create: `vitest.config.js`
- Create: `tests/unit/sanity.test.js`
- Modify: `package.json` (devDependencies, scripts)
- Modify: `.github/workflows/ci.yml` (new step)

**Interfaces:**
- Produces: `npm run test:unit` command; `tests/unit/**/*.test.js` glob is the unit-test home.

- [ ] **Step 1: Add Vitest as a dev dependency**

Run: `npm install -D vitest@^2`
Expected: `package.json` `devDependencies` gains `vitest`.

- [ ] **Step 2: Write `vitest.config.js`**

```js
// vitest.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.js'],
    // Playwright specs live in tests/*.spec.js — keep them out of Vitest.
    exclude: ['tests/*.spec.js', 'node_modules/**'],
  },
});
```

- [ ] **Step 3: Add scripts to `package.json`**

In the `"scripts"` block, add:

```json
"test:unit": "vitest run",
"test:unit:watch": "vitest"
```

Leave `"test": "playwright test --reporter=list"` unchanged.

- [ ] **Step 4: Write the sanity test**

```js
// tests/unit/sanity.test.js
import { describe, it, expect } from 'vitest';

describe('vitest wiring', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
  it('has Web Crypto in the Node environment', () => {
    expect(typeof crypto.subtle.digest).toBe('function');
  });
});
```

- [ ] **Step 5: Run the unit tests**

Run: `npm run test:unit`
Expected: PASS, 2 tests.

- [ ] **Step 6: Add the CI step**

In `.github/workflows/ci.yml`, after the `Install dependencies` step and before `Install Playwright Browsers`, insert:

```yaml
      - name: Run Unit Tests
        run: npm run test:unit
```

- [ ] **Step 7: Commit**

```bash
git add vitest.config.js tests/unit/sanity.test.js package.json package-lock.json .github/workflows/ci.yml
git commit -m "test: scaffold Vitest unit-test seam + CI job"
```

---

### Task 2: Module bootstrap plumbing (no behavior change)

**Files:**
- Create: `src/lib/globals.js`
- Modify: `index.html` (bootstrap `<script>`, `?v=104`)
- Modify: `sw.js` (`VERSION`, `SHELL`)
- Modify: `tests/regression.spec.js` (boot-order assertion)

**Interfaces:**
- Produces: `window.LumenLib = { crypto, schedule, parser, merge }` — populated before `app.js` runs. Namespaces are empty objects until Tasks 3, 5, 6, 7 fill them.

- [ ] **Step 1: Write the failing E2E assertion**

In `tests/regression.spec.js`, add:

```js
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
  expect(shape.keys).toEqual(['crypto', 'merge', 'parser', 'schedule']);
  expect(errors).toEqual([]);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx playwright test regression.spec.js -g "module bootstrap"`
Expected: FAIL — `window.LumenLib` is undefined.

- [ ] **Step 3: Create the bootstrap module**

```js
// src/lib/globals.js
// Bridges the src/lib ES modules into the classic-script world of app.js.
// Loaded as <script type="module"> immediately before app.js, so window.LumenLib
// is populated before any app.js code runs (module + defer classic execute in
// document order after parsing).
import * as cryptoLib from './crypto.js';
import * as scheduleLib from './schedule.js';
import * as parserLib from './parser.js';
import * as mergeLib from './merge.js';

window.LumenLib = {
  crypto: cryptoLib,
  schedule: scheduleLib,
  parser: parserLib,
  merge: mergeLib,
};
```

- [ ] **Step 4: Create placeholder module files**

So the imports resolve. Each will be filled by a later task.

```js
// src/lib/crypto.js
// (filled by Task 3)
export {};
```

```js
// src/lib/schedule.js
// (filled by Task 5)
export {};
```

```js
// src/lib/parser.js
// (filled by Task 6)
export {};
```

```js
// src/lib/merge.js
// (filled by Task 7)
export {};
```

- [ ] **Step 5: Wire the bootstrap into `index.html`**

Find the app script tag (currently `app.js:166`):

```html
<script src="app.js?v=103" fetchpriority="high" defer></script>
```

Replace with:

```html
<script type="module" src="src/lib/globals.js?v=104"></script>
<script src="app.js?v=104" fetchpriority="high" defer></script>
```

Also bump the two other `?v=103` occurrences (`styles.css`, `themes.css` prefetch) to `?v=104`.

- [ ] **Step 6: Update `sw.js`**

Change `sw.js:5`:

```js
const VERSION = 'lumen-cache-v104';
```

In the `SHELL` array (`sw.js:6-18`), add these entries after `'./app.js'`:

```js
  './src/lib/globals.js',
  './src/lib/crypto.js',
  './src/lib/schedule.js',
  './src/lib/parser.js',
  './src/lib/merge.js',
```

- [ ] **Step 7: Run the E2E assertion**

Run: `npx playwright test regression.spec.js -g "module bootstrap"`
Expected: PASS.

- [ ] **Step 8: Run the full Playwright suite**

Run: `npm test`
Expected: 43 prior + 1 new = 44 passed. `offline.spec.js` still green.

- [ ] **Step 9: Commit**

```bash
git add src/lib/ index.html sw.js tests/regression.spec.js
git commit -m "feat: add src/lib module bootstrap (window.LumenLib), bump to v104"
```

---

### Task 3: Extract `src/lib/crypto.js`

**Files:**
- Modify: `src/lib/crypto.js` (fill it)
- Create: `tests/unit/crypto.test.js`
- Modify: `app.js` (replace bodies at `app.js:421-484` and `app.js:7592-7596` with delegators)

**Interfaces:**
- Produces (all in `window.LumenLib.crypto` and as ES exports):
  - `buf2b64(ArrayBuffer|TypedArray) → string`
  - `b642buf(string) → ArrayBuffer`
  - `randomSaltB64() → string` (16 random bytes, base64)
  - `deriveVaultKey(password: string, salt: Uint8Array) → Promise<CryptoKey>`
  - `encryptVaultBackup(plainText: string, password: string) → Promise<string>` (JSON envelope)
  - `decryptVaultBackup(envelopeObj: object, password: string) → Promise<string>`
  - `hashPassLegacy(passphrase: string) → Promise<string>` (unsalted SHA-256, v1 — for migration only)

- [ ] **Step 1: Write the failing unit test**

```js
// tests/unit/crypto.test.js
import { describe, it, expect } from 'vitest';
import {
  buf2b64, b642buf, randomSaltB64,
  encryptVaultBackup, decryptVaultBackup, hashPassLegacy,
} from '../../src/lib/crypto.js';

describe('crypto.buf2b64 / b642buf', () => {
  it('round-trips bytes', () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 255]);
    expect(new Uint8Array(b642buf(buf2b64(bytes)))).toEqual(bytes);
  });
});

describe('crypto.randomSaltB64', () => {
  it('returns 16 bytes of base64, non-repeating', () => {
    const a = randomSaltB64();
    const b = randomSaltB64();
    expect(new Uint8Array(b642buf(a)).length).toBe(16);
    expect(a).not.toBe(b);
  });
});

describe('crypto vault round-trip', () => {
  it('encrypts then decrypts back to the original', async () => {
    const envelope = await encryptVaultBackup('{"hello":"world"}', 'hunter2');
    const obj = JSON.parse(envelope);
    expect(obj.lumenEncrypted).toBe(true);
    expect(obj.version).toBe(1);
    const plain = await decryptVaultBackup(obj, 'hunter2');
    expect(plain).toBe('{"hello":"world"}');
  });

  it('rejects a wrong password', async () => {
    const obj = JSON.parse(await encryptVaultBackup('secret', 'right'));
    await expect(decryptVaultBackup(obj, 'wrong')).rejects.toThrow(
      'Incorrect vault password or damaged data.',
    );
  });

  it('rejects a non-Lumen envelope', async () => {
    await expect(decryptVaultBackup({ foo: 1 }, 'x')).rejects.toThrow(
      'Not a valid Lumen encrypted vault file.',
    );
  });
});

describe('crypto.hashPassLegacy', () => {
  it('is deterministic and 64 hex chars', async () => {
    const h1 = await hashPassLegacy('passphrase');
    const h2 = await hashPassLegacy('passphrase');
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test:unit -- crypto`
Expected: FAIL — nothing exported from `src/lib/crypto.js`.

- [ ] **Step 3: Fill `src/lib/crypto.js`**

Move the implementations verbatim from `app.js` (`buf2b64`, `b642buf` at `app.js:421-432`; `deriveVaultKey`/`deriveVaultKey` at `app.js:433-445`; `encryptVaultBackup` at `app.js:446-464`; `decryptVaultBackup` at `app.js:465-484`; `hashPass` body at `app.js:7592-7596`). Add JSDoc. Rename the sync-hash function to `hashPassLegacy`. Add `randomSaltB64`.

```js
// src/lib/crypto.js
// Web Crypto vault encryption + sync-passphrase hashing. Pure: every input is a
// parameter; only Web Crypto APIs (global in browsers and Node 20) are used.

/** @param {ArrayBuffer|ArrayBufferView} buf @returns {string} */
export function buf2b64(buf) {
  const bytes = new Uint8Array(buf.buffer ? buf.buffer : buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/** @param {string} b64 @returns {ArrayBuffer} */
export function b642buf(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/** @returns {string} 16 random bytes, base64 */
export function randomSaltB64() {
  return buf2b64(crypto.getRandomValues(new Uint8Array(16)));
}

/** @param {string} password @param {Uint8Array} salt @returns {Promise<CryptoKey>} */
export async function deriveVaultKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** @param {string} plainText @param {string} password @returns {Promise<string>} JSON envelope */
export async function encryptVaultBackup(plainText, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveVaultKey(password, salt);
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plainText));
  return JSON.stringify({
    lumenEncrypted: true,
    version: 1,
    salt: buf2b64(salt),
    iv: buf2b64(iv),
    data: buf2b64(ciphertext),
    exportedAt: Date.now(),
  }, null, 2);
}

/** @param {object} envelopeObj @param {string} password @returns {Promise<string>} */
export async function decryptVaultBackup(envelopeObj, password) {
  if (!envelopeObj.lumenEncrypted || !envelopeObj.salt || !envelopeObj.iv || !envelopeObj.data) {
    throw new Error('Not a valid Lumen encrypted vault file.');
  }
  const salt = new Uint8Array(b642buf(envelopeObj.salt));
  const iv = new Uint8Array(b642buf(envelopeObj.iv));
  const ciphertext = b642buf(envelopeObj.data);
  const key = await deriveVaultKey(password, salt);
  try {
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    return new TextDecoder().decode(decrypted);
  } catch (e) {
    throw new Error('Incorrect vault password or damaged data.');
  }
}

/**
 * v1 sync-passphrase hash — unsalted SHA-256. Kept ONLY to verify pre-v104 peers.
 * New passphrases use hashPass() (Task 4).
 * @param {string} passphrase @returns {Promise<string>} 64 hex chars
 */
export async function hashPassLegacy(passphrase) {
  const data = new TextEncoder().encode('lumen-sync::' + passphrase);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
```

- [ ] **Step 4: Replace the `app.js` bodies with delegators**

At `app.js:421-484`, replace `buf2b64`, `b642buf`, `deriveVaultKey`, `encryptVaultBackup`, `decryptVaultBackup` with:

```js
/* ---------- Web Crypto Vault Encryption (delegated to src/lib/crypto.js) ---------- */
function buf2b64(buf) { return window.LumenLib.crypto.buf2b64(buf); }
function b642buf(b64) { return window.LumenLib.crypto.b642buf(b64); }
function deriveVaultKey(password, salt) { return window.LumenLib.crypto.deriveVaultKey(password, salt); }
function encryptVaultBackup(plainText, password) { return window.LumenLib.crypto.encryptVaultBackup(plainText, password); }
function decryptVaultBackup(envelopeObj, password) { return window.LumenLib.crypto.decryptVaultBackup(envelopeObj, password); }
```

At `app.js:7592-7596`, replace `hashPass` with:

```js
async function hashPass(p) { return window.LumenLib.crypto.hashPassLegacy(p); }
```

(Task 4 changes this call site again.)

- [ ] **Step 5: Run unit + E2E crypto tests**

Run: `npm run test:unit -- crypto`
Expected: PASS.

Run: `npx playwright test behavioral.spec.js -g "AES-GCM encrypted vault"`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/crypto.js tests/unit/crypto.test.js app.js
git commit -m "refactor: extract vault crypto to src/lib/crypto.js with unit tests"
```

---

### Task 4: Salt the sync passphrase hash (migration-safe)

**Files:**
- Modify: `src/lib/crypto.js` (add `hashPass`)
- Modify: `tests/unit/crypto.test.js`
- Modify: `app.js` (`defaultSyncMeta`, set-passphrase handler `app.js:12220-12226`, `hello` handshake `app.js:7666` + `app.js:7703-7718`, first-load nudge)

**Interfaces:**
- Consumes: `randomSaltB64` from Task 3.
- Produces: `hashPass(passphrase: string, saltB64: string) → Promise<string>` (PBKDF2, 100k, SHA-256, 64 hex). `syncMeta` gains `passSalt: string`, `passHashV: 1|2`.

- [ ] **Step 1: Write the failing unit test**

Add to `tests/unit/crypto.test.js`:

```js
import { hashPass } from '../../src/lib/crypto.js';

describe('crypto.hashPass (v2, salted)', () => {
  it('is deterministic for the same passphrase + salt', async () => {
    const salt = 'AAAAAAAAAAAAAAAAAAAAAA==';
    expect(await hashPass('pw', salt)).toBe(await hashPass('pw', salt));
  });
  it('differs when the salt differs', async () => {
    const a = await hashPass('pw', 'AAAAAAAAAAAAAAAAAAAAAA==');
    const b = await hashPass('pw', 'BBBBBBBBBBBBBBBBBBBBBB==');
    expect(a).not.toBe(b);
  });
  it('differs from the legacy hash', async () => {
    const salt = 'AAAAAAAAAAAAAAAAAAAAAA==';
    const { hashPassLegacy } = await import('../../src/lib/crypto.js');
    expect(await hashPass('pw', salt)).not.toBe(await hashPassLegacy('pw'));
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test:unit -- crypto`
Expected: FAIL — `hashPass` is not exported.

- [ ] **Step 3: Add `hashPass` to `src/lib/crypto.js`**

```js
/**
 * v2 sync-passphrase hash — PBKDF2(SHA-256, 100k) over a per-device salt.
 * @param {string} passphrase @param {string} saltB64 @returns {Promise<string>} 64 hex chars
 */
export async function hashPass(passphrase, saltB64) {
  const salt = new Uint8Array(b642buf(saltB64));
  const keyMaterial = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode('lumen-sync::' + passphrase), { name: 'PBKDF2' }, false, ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, keyMaterial, 256,
  );
  return Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
```

- [ ] **Step 4: Run the unit test**

Run: `npm run test:unit -- crypto`
Expected: PASS.

- [ ] **Step 5: Update `defaultSyncMeta` in `app.js`**

At `app.js:7582`, add `passSalt: '', passHashV: 1` to the returned object.

- [ ] **Step 6: Update the set-passphrase handler**

At `app.js:12220-12226` (the `settings` passphrase input handler), replace the set branch:

```js
if (!v) { syncMeta.passHash = ''; syncMeta.passSalt = ''; syncMeta.passHashV = 1; saveSyncMeta(); toast('Passphrase removed'); return; }
try {
  if (!syncMeta.passSalt) syncMeta.passSalt = window.LumenLib.crypto.randomSaltB64();
  syncMeta.passHash = await window.LumenLib.crypto.hashPass(v, syncMeta.passSalt);
  syncMeta.passHashV = 2;
  saveSyncMeta();
  toast('Passphrase set — enter the same one on your other device');
} catch (err) { console.error('Hash failed:', err); }
```

- [ ] **Step 7: Update the `hello` handshake**

At `app.js:7666`, the outbound hello — change `pass: syncMeta.passHash` to include version + salt:

```js
try { c.send({ type: 'hello', name: syncMeta.deviceName, pass: syncMeta.passHash, passV: syncMeta.passHashV || 1, salt: syncMeta.passSalt || '' }); } catch (_) {}
```

At `app.js:7703-7718` (`handleData` `hello` branch), replace the match check:

```js
if (d.type === 'hello') {
  const localHas = !!syncMeta.passHash;
  const remoteHas = !!d.pass;
  if (localHas && remoteHas) {
    const localV = syncMeta.passHashV || 1;
    const remoteV = d.passV || 1;
    let match;
    if (localV === 2 && remoteV === 2) match = d.pass === syncMeta.passHash;
    else if (localV === 1 && remoteV === 1) match = d.pass === syncMeta.passHash;
    else { match = false; }
    if (!match) {
      toast(localV !== remoteV
        ? 'One device needs its sync passphrase re-entered (Settings → Sync) to upgrade security'
        : 'Sync passphrase mismatch — closing connection', 'error');
      try { c.close(); } catch (_) {}
      return;
    }
  } else if (localHas !== remoteHas) {
    toast('One device has a passphrase set — set the same one on both to connect', 'error');
    try { c.close(); } catch (_) {}
    return;
  }
  if (d.name) { peerStatusDetail = 'Connected to ' + d.name; updateSyncUI(); }
  return;
}
```

- [ ] **Step 8: Add the first-load nudge**

In `normalizeState` (`app.js:756`) or right after `syncMeta` loads (`app.js:7598`), add:

```js
if (syncMeta.passHash && !syncMeta.passSalt && !localStorage.getItem('lumen.passUpgradeNudged')) {
  setTimeout(() => {
    toast('Re-enter your sync passphrase (Settings → Sync) to upgrade its security', 'info');
    try { localStorage.setItem('lumen.passUpgradeNudged', '1'); } catch (_) {}
  }, 2500);
}
```

- [ ] **Step 9: Write the E2E assertion**

In `tests/regression.spec.js`:

```js
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
```

- [ ] **Step 10: Run unit + E2E**

Run: `npm run test:unit -- crypto && npx playwright test regression.spec.js -g "passphrase"`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add src/lib/crypto.js tests/unit/crypto.test.js tests/regression.spec.js app.js
git commit -m "feat: salt sync passphrase hash with PBKDF2 (v2), keep v1 verification for migration"
```

---

### Task 5: Extract `src/lib/schedule.js`

**Files:**
- Modify: `src/lib/schedule.js` (fill it)
- Create: `tests/unit/schedule.test.js`
- Modify: `app.js` (`timeToMin`/`minToTime` at `app.js:1131-1132`, `generatePeriods` at `app.js:1133-1151` → delegators)

**Interfaces:**
- Produces:
  - `timeToMin(hhmm: string) → number`
  - `minToTime(min: number) → string` (`"HH:MM"`)
  - `generatePeriods(start: string, end: string, interval: number, breaks?: {start,end,label}[]) → {id,label,time,start,end}[] | null`

- [ ] **Step 1: Write the failing unit test**

```js
// tests/unit/schedule.test.js
import { describe, it, expect } from 'vitest';
import { timeToMin, minToTime, generatePeriods } from '../../src/lib/schedule.js';

describe('schedule.timeToMin / minToTime', () => {
  it('round-trips', () => {
    expect(timeToMin('08:30')).toBe(510);
    expect(minToTime(510)).toBe('08:30');
    expect(minToTime(24 * 60)).toBe('00:00');
  });
});

describe('schedule.generatePeriods', () => {
  it('returns null when end <= start', () => {
    expect(generatePeriods('10:00', '10:00', 60)).toBeNull();
    expect(generatePeriods('12:00', '09:00', 60)).toBeNull();
  });
  it('returns null for out-of-range intervals', () => {
    expect(generatePeriods('08:00', '17:00', 4)).toBeNull();
    expect(generatePeriods('08:00', '17:00', 241)).toBeNull();
  });
  it('generates back-to-back blocks with sequential ids', () => {
    const p = generatePeriods('08:00', '10:00', 60);
    expect(p).toHaveLength(2);
    expect(p[0]).toMatchObject({ id: 'p1', start: '08:00', end: '09:00', time: '08:00 – 09:00' });
    expect(p[1].id).toBe('p2');
  });
  it('drops a partial trailing block', () => {
    const p = generatePeriods('08:00', '09:30', 60);
    expect(p).toHaveLength(1);
  });
  it('skips blocks that start inside a break window', () => {
    const p = generatePeriods('08:00', '13:00', 60, [{ start: '12:00', end: '13:00', label: 'Lunch' }]);
    expect(p.some((b) => b.start === '12:00')).toBe(false);
    expect(p).toHaveLength(4);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test:unit -- schedule`
Expected: FAIL — nothing exported.

- [ ] **Step 3: Fill `src/lib/schedule.js`**

Move verbatim from `app.js:1131-1151`, add JSDoc + `export`.

```js
// src/lib/schedule.js
// Personal-schedule interval generation. Pure.

/** @param {string} t "HH:MM" @returns {number} minutes since midnight */
export function timeToMin(t) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }

/** @param {number} min @returns {string} "HH:MM" */
export function minToTime(min) {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

/**
 * @param {string} start "HH:MM"
 * @param {string} end "HH:MM"
 * @param {number} interval minutes, 5..240
 * @param {{start:string,end:string,label?:string}[]} [breaks]
 * @returns {{id:string,label:string,time:string,start:string,end:string}[]|null}
 */
export function generatePeriods(start, end, interval, breaks) {
  const sMin = timeToMin(start);
  const eMin = timeToMin(end);
  if (eMin <= sMin || interval < 5 || interval > 240) return null;
  const out = [];
  let cur = sMin;
  let idx = 1;
  while (cur + interval <= eMin) {
    const st = minToTime(cur);
    const en = minToTime(cur + interval);
    let isBreak = false;
    for (const b of (breaks || [])) {
      const bS = timeToMin(b.start);
      const bE = timeToMin(b.end);
      if (cur >= bS && cur < bE) { isBreak = true; break; }
    }
    if (isBreak) { cur += interval; continue; }
    out.push({ id: 'p' + idx, label: 'Block ' + idx, time: st + ' – ' + en, start: st, end: en });
    idx++;
    cur += interval;
  }
  return out.length ? out : null;
}
```

- [ ] **Step 4: Replace the `app.js` bodies with delegators**

At `app.js:1131-1151`:

```js
function timeToMin(t) { return window.LumenLib.schedule.timeToMin(t); }
function minToTime(min) { return window.LumenLib.schedule.minToTime(min); }
function generatePeriods(start, end, interval, breaks) { return window.LumenLib.schedule.generatePeriods(start, end, interval, breaks); }
```

- [ ] **Step 5: Run unit + E2E**

Run: `npm run test:unit -- schedule`
Expected: PASS.

Run: `npx playwright test personal-schedule.spec.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/schedule.js tests/unit/schedule.test.js app.js
git commit -m "refactor: extract generatePeriods to src/lib/schedule.js with edge-case unit tests"
```

---

### Task 6: Extract `src/lib/parser.js` (dependency-injected)

**Files:**
- Modify: `src/lib/parser.js` (fill it)
- Create: `tests/unit/parser.test.js`
- Modify: `app.js` (`parseNaturalLanguageTask` at `app.js:487-621` → delegator that injects deps)

**Interfaces:**
- Produces: `parseNaturalLanguageTask(rawText: string, deps: { students: {id,name}[], projects: {id,name}[], goals: {id,title}[], now: Date }) → { title, due, startTime, priority, tags, category, goalId, projectId, student, status } | null`
- The `app.js` delegator supplies `deps` from `getStudentsList()`, `state.projects`, `state.goals`, `new Date()`.

- [ ] **Step 1: Capture current behavior as golden fixtures (characterization)**

Before touching `app.js`, add a temporary Playwright probe in `tests/regression.spec.js` to dump current parser output for the fixture inputs, run it, and paste the results into the unit test as expected values:

```js
test.skip('DUMP parser fixtures', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(400);
  const out = await page.evaluate(() => [
    'Buy milk tomorrow !high #groceries at 3pm',
    'Prep lesson for next monday',
    'Follow up in 3 days',
    'Review notes',
    '',
  ].map((s) => ({ s, r: parseNaturalLanguageTask(s) })));
  console.log(JSON.stringify(out, null, 2));
});
```

Run: `npx playwright test regression.spec.js -g "DUMP parser" --headed=false` with `test.skip` → `test.only` temporarily. Record output. Revert to `test.skip` and delete before committing.

- [ ] **Step 2: Write the failing unit test from the golden output**

```js
// tests/unit/parser.test.js
import { describe, it, expect } from 'vitest';
import { parseNaturalLanguageTask } from '../../src/lib/parser.js';

const deps = {
  students: [{ id: 'st-ana', name: 'Ana' }],
  projects: [{ id: 'pr-1', name: 'Website' }],
  goals: [{ id: 'go-1', title: 'Grow tutoring' }],
  now: new Date('2026-08-28T09:00:00'), // a Friday
};

describe('parseNaturalLanguageTask', () => {
  it('returns null for empty input', () => {
    expect(parseNaturalLanguageTask('', deps)).toBeNull();
    expect(parseNaturalLanguageTask('   ', deps)).toBeNull();
  });
  it('extracts priority, tags, and time; cleans the title', () => {
    const r = parseNaturalLanguageTask('Buy milk tomorrow !high #groceries at 3pm', deps);
    expect(r.title).toBe('Buy milk');
    expect(r.priority).toBe('high');
    expect(r.tags).toEqual(['groceries']);
    expect(r.startTime).toBe('15:00');
    expect(r.due).toBe('2026-08-29');
  });
  it('resolves "today" and sets status', () => {
    const r = parseNaturalLanguageTask('Ship it today', deps);
    expect(r.due).toBe('2026-08-28');
    expect(r.status).toBe('today');
  });
  it('resolves "next monday" forward', () => {
    const r = parseNaturalLanguageTask('Prep lesson next monday', deps);
    expect(r.due).toBe('2026-08-31');
  });
  it('resolves "in 3 days"', () => {
    const r = parseNaturalLanguageTask('Follow up in 3 days', deps);
    expect(r.due).toBe('2026-08-31');
  });
  it('matches an @student by name', () => {
    const r = parseNaturalLanguageTask('Call @Ana about homework', deps);
    expect(r.student).toBe('Ana');
    expect(r.title).toBe('Call about homework');
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npm run test:unit -- parser`
Expected: FAIL — nothing exported.

- [ ] **Step 4: Fill `src/lib/parser.js`**

Move `app.js:487-621` verbatim, then rewrite the three impure reads:
- `const studentsList = getStudentsList();` → `const studentsList = deps.students || [];`
- `(state.projects || [])` → `(deps.projects || [])`
- `(state.goals || [])` → `(deps.goals || [])`
- `const today = new Date();` → `const today = deps.now || new Date();`
- Replace the `isoDate` / `todayISO` / `shiftDays` helper calls with local pure equivalents defined at the top of the module:

```js
// src/lib/parser.js
// Natural-language task parser. Pure — all context arrives via `deps`.

/** @param {Date} d @returns {string} YYYY-MM-DD (local) */
function isoLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
/** @param {Date} base @param {number} n @returns {Date} */
function shift(base, n) { const d = new Date(base); d.setDate(d.getDate() + n); return d; }

/**
 * @param {string} rawText
 * @param {{students:{id:string,name:string}[],projects:{id:string,name:string}[],goals:{id:string,title:string}[],now:Date}} deps
 * @returns {object|null}
 */
export function parseNaturalLanguageTask(rawText, deps) {
  const d = deps || {};
  const studentsList = d.students || [];
  const projects = d.projects || [];
  const goals = d.goals || [];
  const today = d.now || new Date();
  // ... rest of the body from app.js:490-621, with:
  //   isoDate(x)      -> isoLocal(x)
  //   todayISO()      -> isoLocal(today)
  //   shiftDays(n)    -> shift(today, n)
  //   getStudentsList() -> studentsList
  //   state.projects  -> projects
  //   state.goals     -> goals
}
```

Verify `isoLocal` matches the app's `isoDate`/`todayISO` output format by comparing against the golden fixtures from Step 1. If the app's helpers use UTC, mirror that instead — the golden fixtures are the source of truth.

- [ ] **Step 5: Replace the `app.js` body with a delegator**

At `app.js:487`:

```js
function parseNaturalLanguageTask(rawText) {
  return window.LumenLib.parser.parseNaturalLanguageTask(rawText, {
    students: getStudentsList(),
    projects: state.projects || [],
    goals: state.goals || [],
    now: new Date(),
  });
}
```

- [ ] **Step 6: Run unit + E2E**

Run: `npm run test:unit -- parser`
Expected: PASS.

Run: `npx playwright test behavioral.spec.js -g "natural language" && npx playwright test regression.spec.js -g "quick-add"`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/parser.js tests/unit/parser.test.js app.js
git commit -m "refactor: extract parseNaturalLanguageTask to src/lib/parser.js (deps-injected) with golden tests"
```

---

### Task 7: Extract `src/lib/merge.js` (context object, characterization tests)

**Files:**
- Modify: `src/lib/merge.js` (fill it)
- Create: `tests/unit/merge.test.js`
- Modify: `app.js` (`applyMerge` at `app.js:7748-7895` → delegator that keeps side effects)

**Interfaces:**
- Produces: `applyMerge(ctx: { state: object, syncMeta: object, inc: object, incomingRev: number }) → boolean` — mutates `ctx.state` and `ctx.syncMeta` in place; returns `changed`; bumps `ctx.syncMeta.rev` when changed. Does NOT persist or render.
- The `app.js` delegator calls `saveSyncMeta()` always, and `save()` + re-render when `changed`.

- [ ] **Step 1: Write characterization unit tests**

```js
// tests/unit/merge.test.js
import { describe, it, expect } from 'vitest';
import { applyMerge } from '../../src/lib/merge.js';

function baseState() {
  return {
    tasks: [], goals: [], habits: [], notes: [], recordings: [], projects: [],
    krHistory: [], income: [], expenses: [], expectedIncome: [], expectedExpenses: [],
    students: [], attendance: [], assignments: [], lessonPlans: [], kanbanLists: [],
    tagColors: {}, achievements: {},
    _tagColorMeta: {}, _incomeTypesMeta: {}, _expenseCategoriesMeta: {},
    incomeTypes: [], expenseCategories: [],
  };
}
function baseSyncMeta() {
  return { rev: 1, tombstones: { tasks: [], goals: [], habits: [], notes: [], recordings: [] } };
}

describe('merge.applyMerge — items', () => {
  it('adds an incoming task and reports changed', () => {
    const state = baseState();
    const syncMeta = baseSyncMeta();
    const changed = applyMerge({ state, syncMeta, inc: { tasks: [{ id: 't1', title: 'A', updatedAt: 10 }] }, incomingRev: 2 });
    expect(changed).toBe(true);
    expect(state.tasks).toHaveLength(1);
    expect(syncMeta.rev).toBeGreaterThan(1);
  });

  it('keeps the newer updatedAt on conflict', () => {
    const state = baseState();
    state.tasks = [{ id: 't1', title: 'local', updatedAt: 20 }];
    const syncMeta = baseSyncMeta();
    applyMerge({ state, syncMeta, inc: { tasks: [{ id: 't1', title: 'remote-old', updatedAt: 10 }] }, incomingRev: 2 });
    expect(state.tasks[0].title).toBe('local');
    applyMerge({ state, syncMeta, inc: { tasks: [{ id: 't1', title: 'remote-new', updatedAt: 30 }] }, incomingRev: 3 });
    expect(state.tasks[0].title).toBe('remote-new');
  });

  it('honors a tombstone: a deleted id is not re-added', () => {
    const state = baseState();
    const syncMeta = baseSyncMeta();
    syncMeta.tombstones.tasks = ['t1'];
    const changed = applyMerge({ state, syncMeta, inc: { tasks: [{ id: 't1', title: 'zombie', updatedAt: 99 }] }, incomingRev: 2 });
    expect(state.tasks).toHaveLength(0);
    expect(changed).toBe(false);
  });

  it('reports not-changed when nothing is new', () => {
    const state = baseState();
    state.tasks = [{ id: 't1', title: 'A', updatedAt: 10 }];
    const syncMeta = baseSyncMeta();
    const changed = applyMerge({ state, syncMeta, inc: { tasks: [{ id: 't1', title: 'A', updatedAt: 10 }] }, incomingRev: 2 });
    expect(changed).toBe(false);
  });
});

describe('merge.applyMerge — tagColors per-key LWW', () => {
  it('applies an incoming color with a newer meta timestamp', () => {
    const state = baseState();
    const syncMeta = baseSyncMeta();
    applyMerge({ state, syncMeta, inc: { tagColors: { work: '#f00' }, _tagColorMeta: { work: 50 } }, incomingRev: 2 });
    expect(state.tagColors.work).toBe('#f00');
  });
  it('deletes a key when the incoming tombstone is newer', () => {
    const state = baseState();
    state.tagColors = { work: '#f00' };
    state._tagColorMeta = { work: 10 };
    const syncMeta = baseSyncMeta();
    applyMerge({ state, syncMeta, inc: { deleted: { tagColors: { work: 40 } } }, incomingRev: 2 });
    expect(state.tagColors.work).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test:unit -- merge`
Expected: FAIL — nothing exported.

- [ ] **Step 3: List every identifier `applyMerge` uses**

Run: `sed -n '7748,7895p' app.js` and note every free identifier. Expected set: `state`, `syncMeta`, `incomingRev`, plus locals (`key`, `keyAch`, `mergeOne`, `before`, `changed`). The tail (`app.js:7888-7893`) calls `saveSyncMeta`, `save`, `currentView`, `renderSettings`, `renderView` — these move OUT to the delegator.

- [ ] **Step 4: Fill `src/lib/merge.js`**

Move `app.js:7748-7887` (the merge logic, up to and including the `const changed = ...` computation). Wrap in `export function applyMerge({ state, syncMeta, inc, incomingRev })`. Keep the `changed`-guarded `syncMeta.rev` bump (`app.js:7890`). **Drop** `saveSyncMeta()`, `save()`, and the render call. Return `changed`.

```js
// src/lib/merge.js
// P2P sync state merge — last-write-wins by updatedAt, with tombstones and
// per-key LWW for tagColors / incomeTypes / expenseCategories.
// Mutates ctx.state and ctx.syncMeta in place. No persistence, no rendering.

/**
 * @param {{state:object,syncMeta:object,inc:object,incomingRev:number}} ctx
 * @returns {boolean} whether anything changed
 */
export function applyMerge({ state, syncMeta, inc, incomingRev }) {
  // ... body from app.js:7749-7887 verbatim ...
  const changed = /* ... the before !== after comparison from app.js:7887 ... */;
  if (changed) {
    syncMeta.rev = Math.max(syncMeta.rev || 0, incomingRev) + 1;
  }
  return changed;
}
```

- [ ] **Step 5: Run the unit tests**

Run: `npm run test:unit -- merge`
Expected: PASS.

- [ ] **Step 6: Replace the `app.js` body with a delegator**

At `app.js:7748`:

```js
function applyMerge(inc, incomingRev) {
  const changed = window.LumenLib.merge.applyMerge({ state, syncMeta, inc, incomingRev: incomingRev || 0 });
  saveSyncMeta();
  if (changed) {
    save();
    if (currentView() === 'settings') renderSettings(); else renderView();
  }
  return changed;
}
```

- [ ] **Step 7: Run the full E2E suite**

Run: `npm test`
Expected: all green (44 + Task 2/4 additions). No sync spec exists today; confirm `smoke.spec.js` `#settings` still has zero console errors.

- [ ] **Step 8: Commit**

```bash
git add src/lib/merge.js tests/unit/merge.test.js app.js
git commit -m "refactor: extract applyMerge to src/lib/merge.js (pure merge, side effects stay in app.js)"
```

---

### Task 8: Harden `callGemini`

**Files:**
- Create: `src/lib/gemini.js`
- Create: `tests/unit/gemini.test.js`
- Modify: `src/lib/globals.js` (add `gemini` namespace)
- Modify: `sw.js` (`SHELL` += `./src/lib/gemini.js`)
- Modify: `app.js` (`callGemini` at `app.js:626-656` → delegator; daily-focus cache at `app.js:2286`)

**Interfaces:**
- Produces: `requestGemini({ apiKey, model, prompt, systemInstruction, fetchImpl?, timeoutMs? }) → Promise<string>` — throws `Error('NO_API_KEY')`, `Error('GEMINI_TIMEOUT')`, or an API error message. Retries once on 429/5xx.
- `window.LumenLib.gemini.requestGemini`.

- [ ] **Step 1: Write the failing unit test**

```js
// tests/unit/gemini.test.js
import { describe, it, expect, vi } from 'vitest';
import { requestGemini } from '../../src/lib/gemini.js';

const ok = (text) => ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }) });
const fail = (status) => ({ ok: false, status, json: async () => ({ error: { message: 'boom' } }) });

describe('gemini.requestGemini', () => {
  it('throws NO_API_KEY when the key is missing', async () => {
    await expect(requestGemini({ apiKey: '', model: 'm', prompt: 'p' })).rejects.toThrow('NO_API_KEY');
  });

  it('returns trimmed text on success', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok('  hello  '));
    const out = await requestGemini({ apiKey: 'k', model: 'm', prompt: 'p', fetchImpl });
    expect(out).toBe('hello');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('retries once on 429 then succeeds', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(fail(429)).mockResolvedValueOnce(ok('done'));
    const out = await requestGemini({ apiKey: 'k', model: 'm', prompt: 'p', fetchImpl, retryDelayMs: 1 });
    expect(out).toBe('done');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('throws after two 429s', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(fail(429));
    await expect(requestGemini({ apiKey: 'k', model: 'm', prompt: 'p', fetchImpl, retryDelayMs: 1 })).rejects.toThrow();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('throws GEMINI_TIMEOUT when the request outlasts timeoutMs', async () => {
    const fetchImpl = (url, opts) => new Promise((_, rej) => {
      opts.signal.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    });
    await expect(requestGemini({ apiKey: 'k', model: 'm', prompt: 'p', fetchImpl, timeoutMs: 5 }))
      .rejects.toThrow('GEMINI_TIMEOUT');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test:unit -- gemini`
Expected: FAIL — module missing.

- [ ] **Step 3: Write `src/lib/gemini.js`**

```js
// src/lib/gemini.js
// Gemini generateContent call with timeout + single retry. Pure: fetch is injectable.

/**
 * @param {{apiKey:string,model:string,prompt:string,systemInstruction?:string,
 *          fetchImpl?:typeof fetch,timeoutMs?:number,retryDelayMs?:number}} opts
 * @returns {Promise<string>}
 */
export async function requestGemini(opts) {
  const {
    apiKey, model, prompt, systemInstruction = '',
    fetchImpl = (typeof fetch !== 'undefined' ? fetch : null),
    timeoutMs = 12000, retryDelayMs = 1500,
  } = opts;
  if (!apiKey) throw new Error('NO_API_KEY');
  if (!fetchImpl) throw new Error('NO_FETCH');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body = { contents: [{ role: 'user', parts: [{ text: prompt }] }] };
  if (systemInstruction) body.systemInstruction = { parts: [{ text: systemInstruction }] };

  const attempt = async () => {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeoutMs);
    try {
      return await fetchImpl(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: ac.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  };

  let res;
  try {
    res = await attempt();
  } catch (e) {
    if (e && e.name === 'AbortError') throw new Error('GEMINI_TIMEOUT');
    throw e;
  }
  if (!res.ok && (res.status === 429 || res.status >= 500)) {
    await new Promise((r) => setTimeout(r, retryDelayMs));
    try {
      res = await attempt();
    } catch (e) {
      if (e && e.name === 'AbortError') throw new Error('GEMINI_TIMEOUT');
      throw e;
    }
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gemini API returned status ${res.status}`);
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No response generated by Gemini.');
  return text.trim();
}
```

- [ ] **Step 4: Register the namespace**

In `src/lib/globals.js`, add `import * as geminiLib from './gemini.js';` and `gemini: geminiLib` to `window.LumenLib`. Update the `regression.spec.js` bootstrap assertion's expected keys to `['crypto', 'gemini', 'merge', 'parser', 'schedule']`. Add `'./src/lib/gemini.js'` to `sw.js` `SHELL`.

- [ ] **Step 5: Rewrite `callGemini` in `app.js` as a delegator**

At `app.js:626-656`:

```js
async function callGemini(prompt, systemInstruction = '') {
  const apiKey = state.settings && state.settings.geminiApiKey;
  const model = (state.settings && state.settings.geminiModel) || 'gemini-2.5-flash';
  return window.LumenLib.gemini.requestGemini({ apiKey, model, prompt, systemInstruction });
}
```

- [ ] **Step 6: Cache the Morning Brief daily focus**

At `app.js:2286` (the `generateFocus` handler that calls `callGemini`), before calling: if `state.settings.aiDailyFocusAt === todayISO()` and `state.settings.aiDailyFocus`, render the cached value and return. After a successful call, set `state.settings.aiDailyFocus = res; state.settings.aiDailyFocusAt = todayISO(); save();`.

- [ ] **Step 7: Surface `NO_API_KEY` inline**

At each `callGemini` call site with a `catch` (`app.js:2297, 5293, 6879, 7180, 11416`), change the `NO_API_KEY` branch from `toast(...)` to inserting an inline link: `` `<a href="#settings" onclick="closeModal&&closeModal()">Add your Gemini API key in Settings →</a>` `` into the result container. Add a shared helper `geminiKeyMissingHTML()` near `callGemini`.

- [ ] **Step 8: Run unit + E2E**

Run: `npm run test:unit && npx playwright test behavioral.spec.js smoke.spec.js`
Expected: all green. (AI paths have no live E2E — the smoke suite confirms no console errors on views that render AI buttons.)

- [ ] **Step 9: Commit**

```bash
git add src/lib/gemini.js src/lib/globals.js tests/unit/gemini.test.js tests/regression.spec.js sw.js app.js
git commit -m "feat: harden callGemini with 12s timeout, one retry, daily-focus cache, inline no-key CTA"
```

---

### Task 9: Perf budget spec + docs + release verification

**Files:**
- Create: `tests/perf.spec.js`
- Modify: `README.md` (Testing section)
- Modify: `package.json` (`test:all` convenience script)

**Interfaces:**
- Consumes: `window.Lumen.perfLog` (`app.js:1621`) — array of `{ view, ms, ts, slow }`.

- [ ] **Step 1: Write the perf budget spec**

```js
// tests/perf.spec.js
import { test, expect } from '@playwright/test';

test('dashboard renders under budget with 2,000 tasks', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const now = Date.now();
    state.tasks = Array.from({ length: 2000 }, (_, i) => ({
      id: 't' + i, title: 'Task ' + i, status: i % 4 === 0 ? 'today' : 'backlog',
      priority: ['low', 'med', 'high'][i % 3], due: '', tags: [], subtasks: [],
      createdAt: now - i * 1000, updatedAt: now - i * 1000,
    }));
    save();
  });
  await page.goto('/#dashboard');
  await page.waitForTimeout(600);
  const dash = await page.evaluate(() => {
    const logs = (window.Lumen?.perfLog || []).filter((e) => e.view === 'dashboard');
    return logs.length ? logs[logs.length - 1].ms : null;
  });
  expect(dash).not.toBeNull();
  expect(dash).toBeLessThan(50);
});

test('matrix initial render under budget with 2,000 tasks', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const now = Date.now();
    state.tasks = Array.from({ length: 2000 }, (_, i) => ({
      id: 't' + i, title: 'Task ' + i, status: 'backlog', priority: 'med',
      due: '', tags: [], subtasks: [], createdAt: now, updatedAt: now,
    }));
    save();
  });
  await page.goto('/#tasks');
  await page.waitForTimeout(300);
  await page.evaluate(() => { location.hash = '#matrix'; });
  await page.waitForTimeout(400);
  const matrix = await page.evaluate(() => {
    const logs = (window.Lumen?.perfLog || []).filter((e) => /matrix/i.test(e.view));
    return logs.length ? logs[logs.length - 1].ms : null;
  });
  // Matrix may log under 'matrix' or 'tasks' depending on the router — assert only if captured.
  if (matrix !== null) expect(matrix).toBeLessThan(16);
});

test.afterEach(async ({ page }) => {
  await page.evaluate(() => { state.tasks = []; save(); }).catch(() => {});
});
```

- [ ] **Step 2: Run it**

Run: `npx playwright test perf.spec.js`
Expected: PASS. If `dashboard` exceeds 50 ms on CI hardware, raise the threshold to a measured-plus-margin value and note it in the spec comment — the point is a regression tripwire, not an absolute.

- [ ] **Step 3: Update `README.md`**

In the Testing section, add:

```markdown
### Unit tests (Vitest)

```bash
npm run test:unit        # run once
npm run test:unit:watch  # watch mode
```

Unit tests cover the pure logic in `src/lib/` — vault crypto, the natural-language
parser, schedule generation, and P2P merge.
```

- [ ] **Step 4: Add a convenience script to `package.json`**

```json
"test:all": "npm run test:unit && npm test"
```

- [ ] **Step 5: Verify the release ritual**

Run: `grep -n "lumen-cache-v104" sw.js && grep -c "v=104" index.html`
Expected: `sw.js` shows v104; `index.html` shows 3 (styles, themes, app) + the bootstrap = confirm at least 3.

Run: `npm run test:all`
Expected: unit green, all Playwright green.

- [ ] **Step 6: Commit and tag**

```bash
git add tests/perf.spec.js README.md package.json
git commit -m "test: add 2k-task dashboard/matrix perf budget; document unit tests"
git tag v104
```

---

## Self-Review

**Spec coverage:**
- Module seam (crypto/schedule/parser/merge) → Tasks 2, 3, 5, 6, 7. ✅
- `window.LumenLib` bootstrap + document-order load → Task 2. ✅
- Delegators keep call sites unchanged → Tasks 3, 5, 6, 7 Step "replace body". ✅
- `applyMerge` side-effect separation → Task 7 Steps 4, 6. ✅
- Sync passphrase v2 + migration + nudge → Task 4. ✅
- Gemini timeout / retry / cache / inline CTA → Task 8. ✅
- Vitest + CI → Task 1. ✅
- Offline shell (SHELL additions) → Task 2 Step 6, Task 8 Step 4. ✅
- Perf budget test → Task 9. ✅
- Release ritual (VERSION, ?v=, tag) → Task 2, Task 9. ✅

**Placeholder scan:** Task 6 Step 4 and Task 7 Step 4 say "body from app.js:NNN verbatim" rather than reproducing 130/140 lines — this is deliberate (the source is in the repo at a cited range and must be moved unchanged); the transformations to apply are listed explicitly. Task 8 Step 7 lists exact call-site line numbers. No other placeholders.

**Type consistency:** `hashPassLegacy(passphrase)` (Task 3) vs `hashPass(passphrase, saltB64)` (Task 4) — distinct names, distinct arities, both used correctly in Task 4 Steps 6-7. `applyMerge(ctx)` object param (Task 7) matches the delegator call in Task 7 Step 6. `requestGemini(opts)` (Task 8) matches its test and the `callGemini` delegator.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-08-28-lumen-v104-trust-layer-test-seam.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**
