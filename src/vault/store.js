// src/vault/store.js — Vite seam for Personal Vault (future: app.js shim delegates here)
// Pure IDB + type helpers; state is passed in to keep module side-effect free.
export const VAULT_DB = 'lumen-vault';
export const VAULT_STORE = 'blobs';
export const VAULT_MAX_FILE = 10 * 1024 * 1024;
export const VAULT_SOFT_CAP = 100 * 1024 * 1024;

let _vaultDb = null;
export function vaultDb() {
  return new Promise((res, rej) => {
    if (_vaultDb) return res(_vaultDb);
    let rq; try { rq = indexedDB.open(VAULT_DB, 1); } catch (e) { return rej(e); }
    rq.onupgradeneeded = e => { const db = e.target.result; if (!db.objectStoreNames.contains(VAULT_STORE)) db.createObjectStore(VAULT_STORE); };
    rq.onblocked = () => {};
    rq.onsuccess = e => {
      _vaultDb = e.target.result;
      _vaultDb.onversionchange = () => { try{ _vaultDb.close(); }catch(_){} _vaultDb = null; };
      _vaultDb.onclose = () => { _vaultDb = null; };
      res(_vaultDb);
    };
    rq.onerror = () => rej(rq.error);
  });
}
export function vaultBlobPut(key, blob) { return vaultDb().then(db => new Promise((res, rej) => { const tx = db.transaction(VAULT_STORE, 'readwrite'); tx.objectStore(VAULT_STORE).put(blob, key); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); })); }
export function vaultBlobGet(key) { return vaultDb().then(db => new Promise((res, rej) => { const tx = db.transaction(VAULT_STORE, 'readonly'); const rq = tx.objectStore(VAULT_STORE).get(key); rq.onsuccess = () => res(rq.result || null); rq.onerror = () => rej(rq.error); })); }
export function vaultBlobDelete(key) { return vaultDb().then(db => new Promise((res, rej) => { const tx = db.transaction(VAULT_STORE, 'readwrite'); tx.objectStore(VAULT_STORE).delete(key); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); })); }

export function vaultQuotaUsed(state) {
  return (state.vaultItems || []).reduce((s, v) => s + (v.size || 0), 0);
}

export function vaultGuessType(fileName, mime) {
  const ext = (fileName || '').split('.').pop().toLowerCase();
  const m = (mime || '').toLowerCase().trim();
  if (m.startsWith('image/')) return 'image';
  if (m.startsWith('video/')) return 'video';
  if (m === 'application/pdf') return 'pdf';
  if (m === 'text/plain') return 'doc';
  const docMimes = new Set(['application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.oasis.opendocument.text','application/rtf','text/markdown']);
  const sheetMimes = new Set(['application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.oasis.opendocument.spreadsheet','text/csv']);
  if (sheetMimes.has(m)) return 'sheet';
  if (docMimes.has(m)) return 'doc';
  if (['pdf'].includes(ext)) return 'pdf';
  if (['doc','docx','odt','rtf','txt','md'].includes(ext)) return 'doc';
  if (['xls','xlsx','csv','ods'].includes(ext)) return 'sheet';
  if (['png','jpg','jpeg','gif','webp','svg','bmp','ico'].includes(ext)) return 'image';
  if (['mp4','mov','avi','webm','mkv'].includes(ext)) return 'video';
  return 'link';
}

export function vaultTypeIcon(type) {
  const map = { link:'🔗', doc:'📄', sheet:'📊', pdf:'📕', image:'🖼️', video:'🎬', other:'📦' };
  return map[type] || map.other;
}
