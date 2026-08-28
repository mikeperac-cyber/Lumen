import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buf2b64, b642buf, randomSaltB64,
  encryptVaultBackup, decryptVaultBackup, hashPassLegacy, hashPass,
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
  it('encrypts then decrypts back to the original', async () => {
    const envelope = await encryptVaultBackup('{"hello":"world"}', 'hunter2');
    const obj = JSON.parse(envelope);
    assert.equal(obj.lumenEncrypted, true);
    assert.equal(obj.version, 1);
    const plain = await decryptVaultBackup(obj, 'hunter2');
    assert.equal(plain, '{"hello":"world"}');
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
