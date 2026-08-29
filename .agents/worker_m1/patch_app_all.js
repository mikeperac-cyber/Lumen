const fs = require('fs');

let code = fs.readFileSync('app.js', 'utf8').replace(/\r\n/g, '\n');

// 1. Add missing imports at top of app.js
const targetImports = `import { setupTasksController } from './src/tasks/controller.js';`;
const replacementImports = `import { setupTasksController } from './src/tasks/controller.js';
import { isArchivedTask, linkGraphForTask } from './src/tasks/view.js';`;

if (!code.includes("import { isArchivedTask, linkGraphForTask } from './src/tasks/view.js';")) {
  code = code.replace(targetImports, replacementImports);
}

// 2. Add globals near state
const targetState = `const sessionSecrets = { geminiApiKey: '', autoBackupPassword: '' };
let _debugVisible = false;
function updateDebugOverlay() {}`;

const replacementState = `const sessionSecrets = { geminiApiKey: '', autoBackupPassword: '' };
let _debugVisible = false;
let _bootStart = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
let _firstPaintDone = false;
let _lastHashRendered = '';
let _autoBackupPwdWarned = false;
let taskFilter = { q: '', priority: '', category: '', status: '', due: '', list: '', tag: '', student: '', hideCompleted: false };
let taskShowArchived = false;
let taskSelectMode = false;
let taskSelected = new Set();
let lastSelectedId = null;
let taskViewMode = 'kanban';
let taskFilterActive = false;
let taskDragging = false;

function updateDebugOverlay() {}
function toggleDebugOverlay() { _debugVisible = !_debugVisible; updateDebugOverlay(); }
function restoreFocus(sel) { const el = typeof $ === 'function' ? $(sel) : null; if (el) el.focus(); }
function modalFocusables(root) {
  return root ? Array.from(root.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter(el => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden')) : [];
}
function linkGraphForHabit(h) {
  if (!h || !h.goalId) return '';
  const g = (state.goals || []).find(x => x.id === h.goalId);
  if (!g) return '';
  return \`<span class="link-chip" title="Linked goal">→ \${esc(g.title)}</span>\`;
}
function getFirstCommittedTask() {
  const commit = state.settings && state.settings.reviewCommit;
  const ids = (commit && commit.taskIds) || [];
  for (const id of ids) {
    const t = (state.tasks || []).find(x => x.id === id && x.status !== 'done');
    if (t) return t;
  }
  const today = todayISO();
  return (state.tasks || []).find(t => t.status !== 'done' && (t.status === 'today' || t.due === today)) || null;
}
function openScheduleIntervalsModal() {}

function getLocalSecretKey() {
  let key = localStorage.getItem('lumen.localSecretKey');
  if (!key) {
    key = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    localStorage.setItem('lumen.localSecretKey', key);
  }
  return key;
}

let _autoVaultDbPromise = null;
function autoVaultDb() {
  if (_autoVaultDbPromise) return _autoVaultDbPromise;
  _autoVaultDbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open('lumen_auto_vault', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('slots')) {
        db.createObjectStore('slots', { keyPath: 'slot' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _autoVaultDbPromise;
}

async function autoVaultList() {
  try {
    const db = await autoVaultDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('slots', 'readonly');
      const store = tx.objectStore('slots');
      const req = store.getAll();
      req.onsuccess = () => {
        const rows = req.result || [];
        resolve(rows.map(r => r.data || r));
      };
      req.onerror = () => reject(req.error);
    });
  } catch (_) {
    return [];
  }
}

async function autoVaultBackup(plainText, password) {
  if (!password) return;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveVaultKey(password, salt);
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plainText)
  );
  const envelope = JSON.stringify({
    lumenEncrypted: true,
    version: 2,
    salt: buf2b64(salt),
    iv: buf2b64(iv),
    data: buf2b64(ciphertext),
    exportedAt: Date.now()
  });

  const db = await autoVaultDb();
  let idx = 0;
  try { idx = (parseInt(localStorage.getItem('lumen.autoVaultIdx') || '0', 10) + 1) % 5; } catch (_) {}
  try { localStorage.setItem('lumen.autoVaultIdx', String(idx)); } catch (_) {}

  return new Promise((resolve, reject) => {
    const tx = db.transaction('slots', 'readwrite');
    const store = tx.objectStore('slots');
    const req = store.put({ slot: idx, data: envelope, updatedAt: Date.now() });
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}`;

if (code.includes(targetState)) {
  code = code.replace(targetState, replacementState);
  console.log('State and helper globals updated');
}

// 3. Fix tickPomo
const targetTick = `function tickPomo() {`;
if (!code.includes(targetTick)) {
  const targetPomo = `function updatePomoUI() {`;
  const replacementPomo = `function tickPomo() {
  pomo.remain--;
  if (pomo.remain <= 0) {
    clearInterval(pomo.timer); pomo.running = false;
    if (state.settings.pomodoroDate === todayISO()) state.settings.pomodoroCount++;
    else { state.settings.pomodoroDate = todayISO(); state.settings.pomodoroCount = 1; }
    recordPomoSession('_global', pomo.dur, true);
    save();
    playChime('pomo-done');
    toast('🍅 Session complete — take a break!', 'success');
    offerFocusHabitProtect();
  }
  updatePomoUI();
}

function updatePomoUI() {`;
  code = code.replace(targetPomo, replacementPomo);
  console.log('tickPomo function added');
}

fs.writeFileSync('app.js', code, 'utf8');
console.log('app.js completely patched');
