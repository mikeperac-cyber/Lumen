import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import {
  buf2b64, b642buf, randomSaltB64,
  encryptVaultBackup, decryptVaultBackup, hashPassLegacy, hashPass,
  sealSecret, openSecret
} from '../../src/lib/crypto.js';

describe('crypto.buf2b64 / b642buf', () => {
  it('round-trips bytes', () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 255]);
    assert.deepEqual(new Uint8Array(b642buf(buf2b64(bytes))), bytes);
  });
});

describe('crypto.randomSaltB64', () => {
  it('returns 16 bytes of base64, non-repeating', () => {
    const a = randomSaltB64();
    const b = randomSaltB64();
    assert.equal(new Uint8Array(b642buf(a)).length, 16);
    assert.notEqual(a, b);
  });
});

describe('crypto vault round-trip', () => {
  it('encrypts then decrypts back to the original (v2, 310k)', async () => {
    const envelope = await encryptVaultBackup('{"hello":"world"}', 'hunter2');
    const obj = JSON.parse(envelope);
    assert.equal(obj.lumenEncrypted, true);
    assert.equal(obj.version, 2);
    const plain = await decryptVaultBackup(obj, 'hunter2');
    assert.equal(plain, '{"hello":"world"}');
  });

  it('decrypts a legacy v1 envelope (100k) for backward compat', async () => {
    // craft a v1 envelope via the low-level API with V1 iterations, then ensure decrypt still works with version-aware decrypt
    const { buf2b64, b642buf, VAULT_ITERATIONS_V1, deriveVaultKey } = await import('../../src/lib/crypto.js');
    const pwd = 'legacy-pw';
    const salt = new Uint8Array([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]);
    const iv = new Uint8Array([1,2,3,4,5,6,7,8,9,10,11,12]);
    const key = await deriveVaultKey(pwd, salt, VAULT_ITERATIONS_V1);
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode('legacy-data'));
    const v1obj = { lumenEncrypted: true, version: 1, salt: buf2b64(salt), iv: buf2b64(iv), data: buf2b64(ct), exportedAt: Date.now() };
    const plain = await decryptVaultBackup(v1obj, pwd);
    assert.equal(plain, 'legacy-data');
  });

  it('rejects a wrong password', async () => {
    const obj = JSON.parse(await encryptVaultBackup('secret', 'right'));
    await assert.rejects(() => decryptVaultBackup(obj, 'wrong'), {
      message: 'Incorrect vault password or damaged data.',
    });
  });

  it('rejects a non-Lumen envelope', async () => {
    await assert.rejects(() => decryptVaultBackup({ foo: 1 }, 'x'), {
      message: 'Not a valid Lumen encrypted vault file.',
    });
  });
});

describe('crypto.hashPassLegacy', () => {
  it('is deterministic and 64 hex chars', async () => {
    const h1 = await hashPassLegacy('passphrase');
    const h2 = await hashPassLegacy('passphrase');
    assert.equal(h1, h2);
    assert.match(h1, /^[0-9a-f]{64}$/);
  });
});

describe('crypto worker fallback', () => {
  it('encrypts inline when a workerFactory throws (Worker present)', async () => {
    const OrigWorker = globalThis.Worker;
    globalThis.Worker = class { constructor() { throw new Error('no worker'); } };
    try {
      const badFactory = () => { throw new Error('no worker here'); };
      const envelope = await encryptVaultBackup('payload', 'pw', { workerFactory: badFactory });
      const plain = await decryptVaultBackup(JSON.parse(envelope), 'pw', { workerFactory: badFactory });
      assert.equal(plain, 'payload');
    } finally {
      if (OrigWorker === undefined) delete globalThis.Worker; else globalThis.Worker = OrigWorker;
    }
  });

  it('encrypts inline when Worker is unavailable', async () => {
    const envelope = await encryptVaultBackup('x', 'y');
    assert.equal(await decryptVaultBackup(JSON.parse(envelope), 'y'), 'x');
  });
});

describe('crypto.hashPass (v2, salted)', () => {
  const saltA = 'AAAAAAAAAAAAAAAAAAAAAA==';
  const saltB = 'BBBBBBBBBBBBBBBBBBBBBB==';

  it('is deterministic for the same passphrase + salt', async () => {
    assert.equal(await hashPass('pw', saltA), await hashPass('pw', saltA));
  });
  it('differs when the salt differs', async () => {
    assert.notEqual(await hashPass('pw', saltA), await hashPass('pw', saltB));
  });
  it('differs from the legacy hash and is 64 hex chars', async () => {
    const h = await hashPass('pw', saltA);
    assert.notEqual(h, await hashPassLegacy('pw'));
    assert.match(h, /^[0-9a-f]{64}$/);
  });
});

describe('crypto.sealSecret / openSecret', () => {
  it('seals and opens a secret with a password', async () => {
    const sealed = await sealSecret('my-secret-key', 'local-pw');
    assert.ok(sealed.includes('lumenEncrypted'));
    const plain = await openSecret(sealed, 'local-pw');
    assert.equal(plain, 'my-secret-key');
  });
  
  it('returns empty string if openSecret fails', async () => {
    const sealed = await sealSecret('my-secret-key', 'local-pw');
    const plain = await openSecret(sealed, 'wrong-pw');
    assert.equal(plain, '');
  });
});
