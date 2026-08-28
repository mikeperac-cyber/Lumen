// src/lib/crypto.js
// Web Crypto vault encryption + sync-passphrase hashing. Pure: every input is a
// parameter; only Web Crypto APIs (global in browsers and modern Node) are used.

/**
 * @param {ArrayBuffer|ArrayBufferView} buf
 * @returns {string} base64
 */
export function buf2b64(buf) {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/**
 * @param {string} b64
 * @returns {ArrayBuffer}
 */
export function b642buf(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/**
 * @returns {string} 16 random bytes, base64
 */
export function randomSaltB64() {
  return buf2b64(crypto.getRandomValues(new Uint8Array(16)));
}

/**
 * @param {string} password
 * @param {Uint8Array} salt
 * @returns {Promise<CryptoKey>}
 */
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

/** Inline (main-thread) encrypt — the fallback path. */
async function encryptInline(plainText, password) {
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

/** Inline (main-thread) decrypt — the fallback path. */
async function decryptInline(envelopeObj, password) {
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

function runVaultWorker(factory, message) {
  return new Promise((resolve, reject) => {
    let worker;
    try { worker = factory(); } catch (e) { reject(e); return; }
    if (!worker) { reject(new Error('WORKER_UNAVAILABLE')); return; }
    const id = String(message.op) + '-' + (typeof performance !== 'undefined' ? performance.now() : 0);
    const timer = setTimeout(() => { try { worker.terminate(); } catch (_) {} reject(new Error('WORKER_TIMEOUT')); }, 8000);
    worker.onmessage = (e) => {
      if (e.data.id !== id) return;
      clearTimeout(timer);
      try { worker.terminate(); } catch (_) {}
      if (e.data.ok) resolve(e.data.result);
      else reject(new Error(e.data.error));
    };
    worker.onerror = (e) => { clearTimeout(timer); try { worker.terminate(); } catch (_) {} reject((e && e.error) || new Error('WORKER_ERROR')); };
    worker.postMessage({ ...message, id });
  });
}

const defaultWorkerFactory = () =>
  (typeof Worker !== 'undefined' ? new Worker(new URL('./vault-worker.js', import.meta.url)) : null);

/**
 * @param {string} plainText
 * @param {string} password
 * @param {{workerFactory?: () => (Worker|null)}} [opts]
 * @returns {Promise<string>} JSON envelope
 */
export async function encryptVaultBackup(plainText, password, opts = {}) {
  const factory = opts.workerFactory || defaultWorkerFactory;
  if (typeof Worker !== 'undefined') {
    try { return await runVaultWorker(factory, { op: 'encrypt', plainText, password }); } catch (_) { /* fall through */ }
  }
  return encryptInline(plainText, password);
}

/**
 * @param {object} envelopeObj
 * @param {string} password
 * @param {{workerFactory?: () => (Worker|null)}} [opts]
 * @returns {Promise<string>}
 */
export async function decryptVaultBackup(envelopeObj, password, opts = {}) {
  if (!envelopeObj.lumenEncrypted || !envelopeObj.salt || !envelopeObj.iv || !envelopeObj.data) {
    throw new Error('Not a valid Lumen encrypted vault file.');
  }
  const factory = opts.workerFactory || defaultWorkerFactory;
  if (typeof Worker !== 'undefined') {
    // Worker is a pure optimization — any failure (infra or a genuine bad
    // password) falls through to the inline path, which raises the real error.
    try { return await runVaultWorker(factory, { op: 'decrypt', envelope: envelopeObj, password }); } catch (_) { /* fall through */ }
  }
  return decryptInline(envelopeObj, password);
}

/**
 * v1 sync-passphrase hash — unsalted SHA-256. Kept ONLY to verify pre-v104 peers.
 * New passphrases use hashPass() (v104 Task 4).
 * @param {string} passphrase
 * @returns {Promise<string>} 64 hex chars
 */
export async function hashPassLegacy(passphrase) {
  const data = new TextEncoder().encode('lumen-sync::' + passphrase);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * v2 sync-passphrase hash — PBKDF2(SHA-256, 100k) over a per-device salt.
 * @param {string} passphrase
 * @param {string} saltB64
 * @returns {Promise<string>} 64 hex chars
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
