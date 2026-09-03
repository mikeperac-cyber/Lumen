// src/state/persist.js — persistence seam + typed error for v103 task 17

export class PersistError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'PersistError';
    this.cause = cause;
  }
}

let _persistBannerShown = false;
let _persistToastShown = false;

/**
 * Show a one-time banner when IndexedDB is unavailable.
 * In classic build this injects a banner into the DOM; in node it no-ops.
 */
export function notifyIdbUnavailable(err) {
  if (_persistBannerShown) return;
  _persistBannerShown = true;
  if (typeof document === 'undefined') {
    console.warn('[Lumen] IndexedDB unavailable — localStorage-only mode', err);
    return;
  }
  try {
    const banner = document.createElement('div');
    banner.setAttribute('role', 'alert');
    banner.className = 'persist-banner';
    banner.style.cssText = 'background:#ffb020;color:#111;padding:8px 12px;text-align:center;font-size:12px;position:sticky;top:0;z-index:9999';
    banner.textContent = 'IndexedDB unavailable — running in localStorage-only mode (5MB limit). Back up via Settings → Export.';
    document.body.prepend(banner);
    setTimeout(() => banner.remove(), 12000);
  } catch (_) {
    console.warn('[Lumen] PersistError banner failed', err);
  }
}

export function notifyPersistFailure(err) {
  if (_persistToastShown) return;
  _persistToastShown = true;
  if (typeof window !== 'undefined' && typeof window.toast === 'function') {
    try { window.toast('⚠️ Save failed — storage full? Export a backup.', 'error'); } catch (_) { /* ignore toast error */ }
  }
  console.warn('[Lumen] persist failure', err);
  // allow one more toast after 8s
  setTimeout(() => { _persistToastShown = false; }, 8000);
}

export function resetPersistNotices() {
  _persistBannerShown = false;
  _persistToastShown = false;
}

const SECRETS_DB = 'lumen-secrets';
const SECRETS_STORE = 'secrets';
let _secretsDb = null;

function getSecretsDb() {
  return new Promise((res, rej) => {
    if (_secretsDb) return res(_secretsDb);
    let rq;
    try { rq = indexedDB.open(SECRETS_DB, 1); } catch (e) { return rej(e); }
    rq.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(SECRETS_STORE)) db.createObjectStore(SECRETS_STORE);
    };
    rq.onsuccess = e => { _secretsDb = e.target.result; res(_secretsDb); };
    rq.onerror = () => rej(rq.error);
  });
}

export function secretsDbGet(key) {
  return getSecretsDb().then(db => new Promise((res, rej) => {
    const tx = db.transaction(SECRETS_STORE, 'readonly');
    const rq = tx.objectStore(SECRETS_STORE).get(key);
    rq.onsuccess = () => res(rq.result || null);
    rq.onerror = () => rej(rq.error);
  }));
}

export function secretsDbPut(key, val) {
  return getSecretsDb().then(db => new Promise((res, rej) => {
    const tx = db.transaction(SECRETS_STORE, 'readwrite');
    tx.objectStore(SECRETS_STORE).put(val, key);
    tx.oncomplete = res;
    tx.onerror = () => rej(tx.error);
  }));
}

export function secretsDbDelete(key) {
  return getSecretsDb().then(db => new Promise((res, rej) => {
    const tx = db.transaction(SECRETS_STORE, 'readwrite');
    tx.objectStore(SECRETS_STORE).delete(key);
    tx.oncomplete = res;
    tx.onerror = () => rej(tx.error);
  }));
}
