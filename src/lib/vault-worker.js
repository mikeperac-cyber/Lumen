// src/lib/vault-worker.js
// Classic Web Worker: PBKDF2 + AES-GCM off the main thread so the UI never
// freezes during vault export/restore/auto-backup. crypto.js falls back to an
// inline path when Worker is unavailable or this script fails to load.
self.onmessage = async (e) => {
  const { op, plainText, envelope, password, id } = e.data;
  const enc = new TextEncoder();
  const b642 = (b64) => { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
  const buf2 = (buf) => { const u = new Uint8Array(buf); let s = ''; for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); };
  try {
    const km = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']);
    if (op === 'encrypt') {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, km, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
      const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plainText));
      self.postMessage({ id, ok: true, result: JSON.stringify({ lumenEncrypted: true, version: 1, salt: buf2(salt), iv: buf2(iv), data: buf2(ct), exportedAt: Date.now() }, null, 2) });
    } else {
      const salt = b642(envelope.salt);
      const iv = b642(envelope.iv);
      const ct = b642(envelope.data).buffer;
      const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, km, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
      const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
      self.postMessage({ id, ok: true, result: new TextDecoder().decode(pt) });
    }
  } catch (err) {
    self.postMessage({ id, ok: false, error: String((err && err.message) || err) });
  }
};
