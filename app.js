import { setupTasksController, renderTasks, renderMatrix, openTaskModal, applyTagFilter, matrixShowMore, getSearchTasksHay, getKanbanLists, addKanbanList, renameKanbanList, deleteKanbanList, ensureKanbanLists } from './src/tasks/controller.js';
import * as VaultStore from './src/vault/view.js';
import { isArchivedTask, linkGraphForTask } from './src/tasks/view.js';
import { vaultDb, vaultBlobPut, vaultBlobGet, vaultBlobDelete, vaultQuotaUsed as storeVaultQuotaUsed, vaultGuessType, vaultTypeIcon, VAULT_DB, VAULT_STORE, VAULT_MAX_FILE, VAULT_SOFT_CAP, getSearchVaultHay, getVaultHay } from './src/vault/store.js';
/* ============ Lumen — app logic ============ */
'use strict';

/* ---------- Icons ---------- */
const ICONS = {
  dashboard: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>',
  trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
  'check-square': '<path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  'file-text': '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  mic: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/>',
  settings: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>',
  pencil: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
  play: '<polygon points="6 3 20 12 6 21 6 3"/>',
  pause: '<rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/>',
  stop: '<rect x="5" y="5" width="14" height="14" rx="2"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  pin: '<path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  'arrow-right': '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  'chevron-left': '<path d="m15 18-6-6 6-6"/>',
  'chevron-right': '<path d="m9 18 6-6-6-6"/>',
  'calendar-plus': '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="12" y1="15" x2="12" y2="21"/><line x1="9" y1="18" x2="15" y2="18"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  tag: '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
  sparkles: '<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>',
  'folder': '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
  'activity': '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  'zap': '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
  'bar-chart': '<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>',
  'dollar-sign': '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  'graduation-cap': '<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12.5v4.5a6 3 0 0 0 12 0v-4.5"/>',
  'users': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'
};
function ic(name, size = 18) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;
}

/* ---------- Helpers ---------- */
const $ = (sel, root = (typeof document !== 'undefined' ? document : null)) => root ? root.querySelector(sel) : null;
const $$ = (sel, root = (typeof document !== 'undefined' ? document : null)) => root ? Array.from(root.querySelectorAll(sel)) : [];

function bindFilterInput(selector, debounceMs, callback) {
  const el = document.querySelector(selector);
  if (!el) return;
  let timer;
  el.addEventListener('input', e => {
    clearTimeout(timer);
    const cursor = el.selectionStart;
    const val = e.target.value;
    timer = setTimeout(() => {
      callback(val.toLowerCase());
      const newEl = document.querySelector(selector);
      if (newEl) {
        newEl.focus();
        try { newEl.setSelectionRange(cursor, cursor); } catch (_) {}
      }
    }, debounceMs);
  });
}

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9));
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function isoDate(d = new Date()) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
const todayISO = () => isoDate();
const APP_ICON = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Ctext y=\'.9em\' font-size=\'90\'%3E%E2%9C%A6%3C/text%3E%3C/svg%3E';
function shiftDays(n, from = new Date()) {
  const d = new Date(from); d.setDate(d.getDate() + n); return d;
}
function timeAgo(ts) {
  const diff = Math.max(0, Date.now() - ts);
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  const d = Math.floor(h / 24);
  return d + 'd ago';
}
function fmtShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
function fmtFull(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
function fmtWhen(ts) {
  return new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
function fmtDur(sec) {
  const m = Math.floor(sec / 60), s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}
function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
function debounce(fn, ms) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
const isMobile = () => (typeof window !== 'undefined' ? window.innerWidth <= 768 : false);
function _whenIdle(fn) {
  if (typeof requestIdleCallback === 'function') requestIdleCallback(fn);
  else setTimeout(fn, 1);
}

/* ---------- Web Audio Synthesizer (Zero external assets) ---------- */
let _audioCtx = null;
function getAudioContext() {
  if (!_audioCtx && (window.AudioContext || window.webkitAudioContext)) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    try { _audioCtx = new AudioCtx(); } catch (_) {}
  }
  if (_audioCtx && _audioCtx.state === 'suspended') {
    _audioCtx.resume().catch(() => {});
  }
  return _audioCtx;
}
function playChime(type = 'task-done') {
  if (state.settings && state.settings.soundEnabled === false) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    if (type === 'task-done') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.12);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'pomo-done') {
      const notes = [659.25, 830.61, 987.77, 1318.51];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + i * 0.08;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.18, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.8);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.85);
      });
    } else if (type === 'habit-check') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(640, now + 0.06);
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.16);
    } else if (type === 'achievement') {
      const fanNotes = [523.25, 659.25, 783.99, 1046.50];
      fanNotes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + i * 0.09;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.18, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.65);
      });
    }
  } catch (e) { /* ignore blocked audio context */ }
}

/* ---------- Procedural Ambient Sound Generator (Web Audio) ---------- */
let ambientAudioCtx = null;
let ambientSource = null;
let ambientGain = null;
let ambientType = 'off'; // 'rain', 'ocean', 'white', 'alpha432', 'binaural'
let ambientVolume = 0.5;

function stopAmbient() {
  if (ambientSource) {
    try { ambientSource.stop(); ambientSource.disconnect(); } catch (_) {}
    ambientSource = null;
  }
  ambientType = 'off';
  $$('.ambient-chip').forEach(c => c.classList.remove('active'));
}

function setAmbientVolume(vol) {
  ambientVolume = clamp(parseFloat(vol) || 0.5, 0, 1);
  if (ambientGain && ambientAudioCtx) {
    ambientGain.gain.setValueAtTime(ambientVolume * 0.35, ambientAudioCtx.currentTime);
  }
}

function startAmbient(type) {
  stopAmbient();
  if (!type || type === 'off') return;
  ambientType = type;
  $$('.ambient-chip').forEach(c => c.classList.toggle('active', c.dataset.ambient === type));
  if (!ambientAudioCtx) {
    ambientAudioCtx = getAudioContext();
  }
  if (!ambientAudioCtx) return;
  if (ambientAudioCtx.state === 'suspended') {
    try { ambientAudioCtx.resume(); } catch (_) {}
  }
  ambientGain = ambientAudioCtx.createGain();
  ambientGain.gain.setValueAtTime(ambientVolume * 0.35, ambientAudioCtx.currentTime);
  ambientGain.connect(ambientAudioCtx.destination);

  if (type === 'alpha432') {
    const osc = ambientAudioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(432, ambientAudioCtx.currentTime);
    osc.connect(ambientGain);
    osc.start();
    ambientSource = osc;
  } else if (type === 'binaural') {
    const merger = ambientAudioCtx.createChannelMerger(2);
    const oscL = ambientAudioCtx.createOscillator();
    const oscR = ambientAudioCtx.createOscillator();
    oscL.type = 'sine';
    oscR.type = 'sine';
    oscL.frequency.setValueAtTime(200, ambientAudioCtx.currentTime);
    oscR.frequency.setValueAtTime(240, ambientAudioCtx.currentTime);
    oscL.connect(merger, 0, 0);
    oscR.connect(merger, 0, 1);
    merger.connect(ambientGain);
    oscL.start();
    oscR.start();
    ambientSource = {
      stop: () => { oscL.stop(); oscR.stop(); oscL.disconnect(); oscR.disconnect(); },
      disconnect: () => merger.disconnect()
    };
  } else {
    const bufferSize = ambientAudioCtx.sampleRate * 2;
    const buffer = ambientAudioCtx.createBuffer(1, bufferSize, ambientAudioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      if (type === 'ocean' || type === 'brown') {
        lastOut = (lastOut + (0.02 * white)) / 1.02;
        data[i] = lastOut * 3.5;
      } else if (type === 'rain') {
        lastOut = (lastOut * 0.95) + (white * 0.05);
        data[i] = lastOut * 3.0;
      } else {
        data[i] = white * 0.2;
      }
    }
    const noiseSource = ambientAudioCtx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;

    if (type === 'rain') {
      const filter = ambientAudioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, ambientAudioCtx.currentTime);
      noiseSource.connect(filter);
      filter.connect(ambientGain);
    } else if (type === 'ocean' || type === 'brown') {
      const filter = ambientAudioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, ambientAudioCtx.currentTime);
      noiseSource.connect(filter);
      filter.connect(ambientGain);
    } else {
      noiseSource.connect(ambientGain);
    }
    try {
      noiseSource.start();
      ambientSource = noiseSource;
    } catch (_) {}
  }
  $$('.ambient-chip').forEach(c => c.classList.toggle('active', c.dataset.ambient === type));
}

function openFocusHubModal() {
  const activeTask = taskPomo.taskId ? state.tasks.find(x => x.id === taskPomo.taskId) : null;
  const todayTasks = state.tasks.filter(t => t.status !== 'done');
  openModal(`
    <div class="modal" style="max-width:560px">
      <div class="modal-head">
        <h3>🎧 Focus Hub &amp; Workstation</h3>
        <button class="btn-icon" data-close-modal>${ic('x', 16)}</button>
      </div>
      <div class="modal-body" style="display:flex;flex-direction:column;gap:14px">
        <!-- Ambient Sound Generator -->
        <div class="card" style="background:var(--surface2);padding:12px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <span style="font-weight:700;font-size:13px">🌊 Procedural Ambient Audio</span>
            <span class="muted" style="font-size:11px" id="hub-ambient-status">${ambientType !== 'off' ? 'Playing 🔊' : 'Muted 🔇'}</span>
          </div>
          <div class="ambient-track-list">
            <button class="ambient-chip ${ambientType === 'rain' ? 'active' : ''}" data-ambient="rain">🌧️ Rain</button>
            <button class="ambient-chip ${ambientType === 'ocean' ? 'active' : ''}" data-ambient="ocean">🌊 Deep Ocean</button>
            <button class="ambient-chip ${ambientType === 'white' ? 'active' : ''}" data-ambient="white">💨 White Noise</button>
            <button class="ambient-chip ${ambientType === 'alpha432' ? 'active' : ''}" data-ambient="alpha432">🧘 432Hz Alpha</button>
            <button class="ambient-chip ${ambientType === 'binaural' ? 'active' : ''}" data-ambient="binaural">🧠 40Hz Binaural</button>
            <button class="ambient-chip ${ambientType === 'off' ? 'active' : ''}" data-ambient="off">⏸️ Off</button>
          </div>
          <div style="display:flex;align-items:center;gap:10px;margin-top:10px">
            <span style="font-size:12px;color:var(--muted)">Volume</span>
            <input type="range" id="hub-ambient-vol" min="0" max="1" step="0.05" value="${ambientVolume}" style="flex:1;accent-color:var(--accent)">
          </div>
        </div>

        <!-- Task in Focus -->
        <div class="field">
          <label class="field-label">Active Focus Task</label>
          <select id="hub-task-select">
            <option value="">-- No specific task (Free focus) --</option>
            ${todayTasks.map(t => `<option value="${t.id}" ${t.id === (activeTask?.id || '') ? 'selected' : ''}>${esc(t.title)} (${t.priority})</option>`).join('')}
          </select>
        </div>

        <!-- Quick Focus Scratchpad -->
        <div class="field">
          <label class="field-label">Session Scratchpad</label>
          <textarea id="hub-scratchpad" class="input" style="height:80px;resize:vertical;font-size:12.5px" placeholder="Jot quick notes or thoughts during focus…"></textarea>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" data-close-modal>Close</button>
        <button class="btn btn-accent" id="hub-start-pomo">🍅 Start Focus Timer</button>
      </div>
    </div>`);

  $$('.ambient-chip').forEach(b => b.addEventListener('click', () => {
    const t = b.dataset.ambient;
    if (t === ambientType && t !== 'off') stopAmbient();
    else startAmbient(t);
    $$('.ambient-chip').forEach(c => c.classList.toggle('active', c.dataset.ambient === ambientType));
    const status = $('#hub-ambient-status');
    if (status) status.textContent = ambientType !== 'off' ? 'Playing 🔊' : 'Muted 🔇';
  }));

  $('#hub-ambient-vol')?.addEventListener('input', e => setAmbientVolume(e.target.value));

  $('#hub-start-pomo')?.addEventListener('click', () => {
    const selTaskId = $('#hub-task-select')?.value;
    const scratch = $('#hub-scratchpad')?.value.trim();
    if (scratch) {
      state.notes.unshift({
        id: uid(),
        title: `Focus Session: ${new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`,
        content: scratch,
        tags: ['focus-session'],
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      save();
    }
    if (selTaskId) {
      startTaskPomo(selTaskId, 25);
    } else {
      pomo.remain = pomo.dur;
      pomo.running = true;
      clearInterval(pomo.timer);
      pomo.timer = setInterval(tickPomo, 1000);
      updatePomoUI();
    }
    closeModal();
    updateFloatingPomoPill();
    toast('🍅 Focus session started! Audio running.');
  });
}

/* ---------- Web Crypto Vault Encryption ---------- */
function buf2b64(buf) {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
function b642buf(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
async function deriveVaultKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}
async function encryptVaultBackup(plainText, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveVaultKey(password, salt);
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plainText)
  );
  return JSON.stringify({
    lumenEncrypted: true,
    version: 1,
    salt: buf2b64(salt),
    iv: buf2b64(iv),
    data: buf2b64(ciphertext),
    exportedAt: Date.now()
  }, null, 2);
}
async function decryptVaultBackup(envelopeObj, password) {
  if (!envelopeObj.lumenEncrypted || !envelopeObj.salt || !envelopeObj.iv || !envelopeObj.data) {
    throw new Error('Not a valid Lumen encrypted vault file.');
  }
  const salt = new Uint8Array(b642buf(envelopeObj.salt));
  const iv = new Uint8Array(b642buf(envelopeObj.iv));
  const ciphertext = b642buf(envelopeObj.data);
  const key = await deriveVaultKey(password, salt);
  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    const dec = new TextDecoder();
    return dec.decode(decrypted);
  } catch (e) {
    throw new Error('Incorrect vault password or damaged data.');
  }
}

/* ---------- Natural Language Task Parser ---------- */
function parseNaturalLanguageTask(rawText) {
  let text = String(rawText || '').trim();
  if (!text) return null;

  let due = '';
  let startTime = '';
  let priority = 'med';
  const tags = [];
  let category = '';
  let goalId = '';
  let projectId = '';
  let status = 'backlog';

  // Extract Priority: !urgent, !high, !p1, !med, !p2, !low, !p3
  text = text.replace(/!(urgent|high|p1|med|medium|p2|low|p3)\b/gi, (_, p) => {
    const pl = p.toLowerCase();
    if (pl === 'urgent' || pl === 'high' || pl === 'p1') priority = 'high';
    else if (pl === 'med' || pl === 'medium' || pl === 'p2') priority = 'med';
    else if (pl === 'low' || pl === 'p3') priority = 'low';
    return '';
  });

  // Extract Tags: #tagname
  text = text.replace(/#([\w-]+)/g, (_, tag) => {
    tags.push(tag.toLowerCase());
    return '';
  });

  // Extract Student: @StudentName or matching existing student name
  let student = '';
  const studentsList = getStudentsList();
  text = text.replace(/@([\w-]+)/g, (match, name) => {
    const q = name.toLowerCase();
    const matchedStudent = studentsList.find(s => s.name && s.name.toLowerCase().replace(/\s+/g, '') === q);
    if (matchedStudent) {
      student = matchedStudent.name;
      return '';
    }
    const prj = (state.projects || []).find(p => p.name && p.name.toLowerCase().includes(q));
    if (prj) { projectId = prj.id; return ''; }
    const gl = (state.goals || []).find(g => g.title && g.title.toLowerCase().includes(q));
    if (gl) { goalId = gl.id; return ''; }
    return match;
  });

  if (!student && studentsList.length) {
    for (const s of studentsList) {
      if (s.name && s.name.length >= 3) {
        const re = new RegExp(`\\b(?:with|for|student:)?\\s*${s.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (re.test(text)) {
          student = s.name;
          break;
        }
      }
    }
  }

  // Extract Time: at 3pm, at 3:30pm, at 14:00, at 9am
  text = text.replace(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/gi, (_, h, m, ampm) => {
    let hr = parseInt(h, 10);
    const mn = m ? m.padStart(2, '0') : '00';
    if (ampm) {
      const ap = ampm.toLowerCase();
      if (ap === 'pm' && hr < 12) hr += 12;
      if (ap === 'am' && hr === 12) hr = 0;
    }
    startTime = `${String(hr).padStart(2, '0')}:${mn}`;
    return '';
  });

  // Extract Dates: today, tomorrow, tonight, in X days, in X weeks, next monday/etc.
  const today = new Date();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const shortDays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

  text = text.replace(/\bin\s+(\d+)\s*(days?|weeks?|d|w)\b/gi, (_, num, unit) => {
    const n = parseInt(num, 10);
    const d = new Date();
    if (unit.startsWith('w')) d.setDate(d.getDate() + n * 7);
    else d.setDate(d.getDate() + n);
    due = isoDate(d);
    return '';
  });

  if (!due) {
    text = text.replace(/\b(today|tonight)\b/gi, () => {
      due = todayISO();
      status = 'today';
      return '';
    });
  }
  if (!due) {
    text = text.replace(/\btomorrow\b/gi, () => {
      due = isoDate(shiftDays(1));
      return '';
    });
  }

  if (!due) {
    text = text.replace(/\b(?:next|on|this)?\s*(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|wed|thu|fri|sat)\b/gi, (match, dayName) => {
      const dn = dayName.toLowerCase();
      let targetDow = dayNames.indexOf(dn);
      if (targetDow === -1) targetDow = shortDays.indexOf(dn);
      if (targetDow !== -1) {
        const curDow = today.getDay();
        let diff = targetDow - curDow;
        if (diff <= 0) diff += 7;
        due = isoDate(shiftDays(diff));
        return '';
      }
      return match;
    });
  }

  if (!due) {
    text = text.replace(/\b(\d{4}-\d{2}-\d{2})\b/g, (_, dt) => {
      due = dt;
      return '';
    });
  }

  const title = text.replace(/\s+/g, ' ').trim();
  if (!title) return null;

  return {
    title,
    due,
    startTime,
    priority,
    tags,
    category: category || (student ? 'work' : 'personal'),
    goalId,
    projectId,
    student: student || undefined,
    status: due === todayISO() ? 'today' : status
  };
}

/* ---------- Gemini AI Assistant (BYO-Key Direct Client) ---------- */
async function callGemini(prompt, systemInstruction = '') {
  const apiKey = state.settings && state.settings.geminiApiKey;
  if (!apiKey) {
    throw new Error('NO_API_KEY');
  }
  const model = (state.settings && state.settings.geminiModel) || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }]
  };
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gemini API returned status ${res.status}`);
  }

  const data = await res.json();
  const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!candidate) throw new Error('No response generated by Gemini.');
  return candidate.trim();
}

/* ---------- State & persistence ---------- */
const KEY = 'lumen.state.v1';
let state = { tasks: [], goals: [], habits: [], notes: [], recordings: [], krHistory: [], tagColors: {}, projects: [], activityLog: [], settings: {}, incomeTypes: ['ESL','IELTS','Tutoring','Exam Prep'], expenseCategories: ['Rent','Utilities','Food','Transport','Supplies','Software','Marketing','Education','Healthcare','Other'], students: [], income: [], expenses: [], expectedIncome: [], expectedExpenses: [], attendance: [], assignments: [], lessonPlans: [], vaultItems: [], vaultCollections: [] };
const sessionSecrets = { geminiApiKey: '', autoBackupPassword: '' };
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
  return `<span class="link-chip" title="Linked goal">→ ${esc(g.title)}</span>`;
}
function getFirstCommittedTask() {
  const commit = state.settings && state.settings.reviewCommit;
  const ids = (commit && commit.taskIds) || [];
  const tasks = state.tasks || [];
  if (ids.length) {
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      for (let j = 0; j < tasks.length; j++) {
        const t = tasks[j];
        if (t.id === id && t.status !== 'done') return t;
      }
    }
  }
  const today = todayISO();
  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];
    if (t.status !== 'done' && (t.status === 'today' || t.due === today)) return t;
  }
  return null;
}
function openScheduleIntervalsModal() {
  const currentPeriods = getPeriods();
  let interval = '60';
  let start = currentPeriods[0]?.start || '08:00';
  let end = currentPeriods[currentPeriods.length - 1]?.end || '20:00';
  
  function calcPreview(st, en, inv) {
    const [sH, sM] = st.split(':').map(Number);
    const [eH, eM] = en.split(':').map(Number);
    const totalMins = ((eH || 20) * 60 + (eM || 0)) - ((sH || 8) * 60 + (sM || 0));
    const invMins = parseInt(inv, 10) || 60;
    const count = Math.max(1, Math.floor(totalMins / invMins));
    return `${count} intervals`;
  }

  function updatePreview() {
    const st = $('#ps-start')?.value || start;
    const en = $('#ps-end')?.value || end;
    const inv = $('#ps-interval')?.value || interval;
    const prevEl = $('#ps-preview');
    if (prevEl) prevEl.textContent = calcPreview(st, en, inv);
  }

  let customRowsHTML = currentPeriods.map((p, i) => `
    <div class="field-row" style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
      <input class="input" style="width:90px" value="${esc(p.label)}" placeholder="Label">
      <input class="input" style="width:75px" value="${esc(p.start)}" placeholder="08:00">
      <input class="input" style="width:75px" value="${esc(p.end)}" placeholder="09:00">
    </div>
  `).join('');

  openModal(`
    <div class="modal" id="ps-modal" style="max-width:520px">
      <div class="modal-head">
        <h3>Personal Schedule Intervals</h3>
        <button class="btn-icon" data-close-modal>${ic('x', 16)}</button>
      </div>
      <div class="modal-body">
        <div style="display:flex;gap:10px">
          <div class="field" style="flex:1">
            <label class="field-label" for="ps-start">Start time</label>
            <input class="input" id="ps-start" type="time" value="${start}">
          </div>
          <div class="field" style="flex:1">
            <label class="field-label" for="ps-end">End time</label>
            <input class="input" id="ps-end" type="time" value="${end}">
          </div>
          <div class="field" style="flex:1">
            <label class="field-label" for="ps-interval">Interval (mins)</label>
            <select class="input" id="ps-interval">
              <option value="30">30 min</option>
              <option value="60" selected>60 min</option>
              <option value="90">90 min</option>
            </select>
          </div>
        </div>
        <div class="field" style="margin-top:10px">
          <div class="field-label">Preview</div>
          <div id="ps-preview" style="font-weight:600;font-size:13.5px">${calcPreview(start, end, interval)}</div>
        </div>
        <details style="margin-top:14px">
          <summary style="cursor:pointer;font-weight:600;font-size:13px;color:var(--accent)">Advanced</summary>
          <div id="ps-advanced-list" style="margin-top:10px">
            ${customRowsHTML}
          </div>
          <button class="btn btn-sm btn-ghost" id="ps-add-period" style="margin-top:6px">+ Add interval</button>
        </details>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost btn-danger" id="ps-reset">Reset to defaults</button>
        <div style="flex:1"></div>
        <button class="btn btn-ghost" data-close-modal>Cancel</button>
        <button class="btn btn-accent" id="ps-save">Save intervals</button>
      </div>
    </div>
  `);

  $('#ps-start')?.addEventListener('change', updatePreview);
  $('#ps-end')?.addEventListener('change', updatePreview);
  $('#ps-interval')?.addEventListener('change', updatePreview);

  $('#ps-add-period')?.addEventListener('click', () => {
    const list = $('#ps-advanced-list');
    if (list) {
      const count = list.querySelectorAll('.field-row').length + 1;
      const newRow = document.createElement('div');
      newRow.className = 'field-row';
      newRow.style.cssText = 'display:flex;gap:6px;align-items:center;margin-bottom:6px';
      newRow.innerHTML = `
        <input class="input" style="width:90px" value="Period ${count}" placeholder="Label">
        <input class="input" style="width:75px" value="08:00" placeholder="08:00">
        <input class="input" style="width:75px" value="09:00" placeholder="09:00">
      `;
      list.appendChild(newRow);
    }
  });

  $('#ps-reset')?.addEventListener('click', () => {
    if (!state.settings) state.settings = {};
    state.settings.periods = null;
    state.settings.personalSchedule = null;
    state.settings.scheduleConfig = null;
    delete state.schedulePeriods;
    PERIODS = DEFAULT_PERIODS;
    closeModal();
    save(); flushSave();
    renderSchedule();
    toast('Reset to default intervals');
  });

  $('#ps-save')?.addEventListener('click', () => {
    const st = $('#ps-start')?.value || start;
    const en = $('#ps-end')?.value || end;
    const invMins = parseInt($('#ps-interval')?.value || '60', 10);
    const [sH, sM] = st.split(':').map(Number);
    const [eH, eM] = en.split(':').map(Number);
    const startMins = (sH || 8) * 60 + (sM || 0);
    const endMins = (eH || 20) * 60 + (eM || 0);
    
    const newPeriods = [];
    let cur = startMins;
    let idx = 1;
    while (cur + invMins <= endMins) {
      const pStartH = String(Math.floor(cur / 60)).padStart(2, '0');
      const pStartM = String(cur % 60).padStart(2, '0');
      const pEndMins = cur + invMins;
      const pEndH = String(Math.floor(pEndMins / 60)).padStart(2, '0');
      const pEndM = String(pEndMins % 60).padStart(2, '0');
      
      const startTime = `${pStartH}:${pStartM}`;
      const endTime = `${pEndH}:${pEndM}`;
      newPeriods.push({
        id: `p${idx}`,
        label: `Period ${idx}`,
        time: `🕐 ${startTime} – ${endTime}`,
        start: startTime,
        end: endTime
      });
      cur += invMins;
      idx++;
    }
    if (!state.settings) state.settings = {};
    state.settings.periods = newPeriods;
    closeModal();
    save(); flushSave();
    renderSchedule();
    toast('Schedule intervals updated');
  });
}

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
}
function getTagColor(name) {
  return (state.tagColors || {})[name.toLowerCase()] || null;
}
function tagSpan(name) {
  const c = getTagColor(name);
  const style = c ? ` style="background:${c}22;color:${c};border-color:${c}44"` : '';
  return `<span class="tag"${style}>${esc(name)}</span>`;
}
function setTagColor(name, color) {
  if (!state.tagColors) state.tagColors = {};
  if (color) state.tagColors[name.toLowerCase()] = color;
  else delete state.tagColors[name.toLowerCase()];
  save();
}

/* ---- IndexedDB state persistence (replaces localStorage for quota safety) ---- */
let _stateDb = null;
const STATE_DB = 'lumen-state';
const STATE_STORE = 'kv';
function stateDb() {
  return new Promise((res, rej) => {
    if (_stateDb) return res(_stateDb);
    let rq;
    try { rq = indexedDB.open(STATE_DB, 1); } catch (e) { return rej(e); }
    rq.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STATE_STORE)) db.createObjectStore(STATE_STORE);
    };
    rq.onsuccess = e => { _stateDb = e.target.result; res(_stateDb); };
    rq.onerror = () => rej(rq.error);
  });
}
function stateDbGet() {
  return stateDb().then(db => new Promise((res, rej) => {
    const tx = db.transaction(STATE_STORE, 'readonly');
    const rq = tx.objectStore(STATE_STORE).get(KEY);
    rq.onsuccess = () => res(rq.result || null);
    rq.onerror = () => rej(rq.error);
  }));
}
function stateDbPut(val) {
  return stateDb().then(db => new Promise((res, rej) => {
    const tx = db.transaction(STATE_STORE, 'readwrite');
    tx.objectStore(STATE_STORE).put(val, KEY);
    tx.oncomplete = res;
    tx.onerror = () => rej(tx.error);
  }));
}

function normalizeState(parsed) {
  state = Object.assign(state, parsed);
  state.settings = Object.assign({
    theme: 'dark',
    pomodoroMin: 25,
    pomodoroDate: '',
    pomodoroCount: 0,
    notifyOverdue: false,
    soundEnabled: true,
    geminiApiKey: '',
    geminiModel: 'gemini-2.5-flash'
  }, parsed.settings || {});
  if (!Array.isArray(state.krHistory)) state.krHistory = [];
  if (!state.tagColors) state.tagColors = {};
  if (!Array.isArray(state.vaultItems)) state.vaultItems = [];
  if (!Array.isArray(state.vaultCollections)) state.vaultCollections = [];
  if (!Array.isArray(state.projects)) state.projects = [];
  state.projects.forEach(p => { if (!p.id) p.id = uid(); });
  if (!Array.isArray(state.activityLog)) state.activityLog = [];
  if (!Array.isArray(state.templates)) state.templates = [];
  // Finance & Student defaults
  if (!Array.isArray(state.incomeTypes)) state.incomeTypes = ['ESL','IELTS','Tutoring','Exam Prep'];
  if (!Array.isArray(state.expenseCategories)) state.expenseCategories = ['Rent','Utilities','Food','Transport','Supplies','Software','Marketing','Education','Healthcare','Other'];
  if (!Array.isArray(state.income)) state.income = [];
  if (!Array.isArray(state.expenses)) state.expenses = [];
  if (!Array.isArray(state.expectedIncome)) state.expectedIncome = [];
  if (!Array.isArray(state.expectedExpenses)) state.expectedExpenses = [];
  if (!Array.isArray(state.students)) state.students = [];
  const DEMO_STUDENT_NAMES = new Set(['Alex Johnson', 'Emma Watson', 'Maria Garcia']);
  state.students = state.students.filter(s => {
    const name = typeof s === 'string' ? s : s?.name;
    return name && !DEMO_STUDENT_NAMES.has(name);
  });
  if (Array.isArray(state.students) && state.students.length) {
    (state.income || []).forEach(inc => {
      if (!inc.studentId && inc.student) {
        const match = state.students.find(s => s.id === inc.student || s.name === inc.student);
        if (match) inc.studentId = match.id;
      }
    });
  }
  if (!Array.isArray(state.attendance)) state.attendance = [];
  if (!Array.isArray(state.assignments)) state.assignments = [];
  if (!Array.isArray(state.lessonPlans)) state.lessonPlans = [];
  getStudentsList();
  // Ensure all habits have required defaults
  if (Array.isArray(state.habits)) {
    state.habits.forEach(h => {
      if (!h.dates) h.dates = {};
      if (!h.freezes) h.freezes = {};
      if (!h.freqType) h.freqType = 'daily';
      if (!h.weeklyTarget) h.weeklyTarget = 7;
    });
  }
  // Ensure all goals have required defaults
  if (Array.isArray(state.goals)) state.goals.forEach(g => { if (!Array.isArray(g.keyResults)) g.keyResults = []; });
  // Ensure tasks have subtasks array
  if (Array.isArray(state.tasks)) state.tasks.forEach(t => { if (!Array.isArray(t.subtasks)) t.subtasks = []; });
}

function getStudentsList() {
  if (!Array.isArray(state.students)) state.students = [];
  // Migrate any legacy strings to student objects
  state.students = state.students.map((s, idx) => {
    if (typeof s === 'string') {
      return {
        id: 'std-' + (idx + 1) + '-' + s.toLowerCase().replace(/[^a-z0-9]/g, ''),
        name: s,
        level: 'English / ESL Student',
        rate: 35,
        currency: 'USD',
        status: 'active',
        email: '',
        phone: '',
        goals: '',
        notes: '',
        tags: ['General ESL'],
        createdAt: Date.now() - (idx + 1) * 7 * 86400000
      };
    }
    if (!s.id) s.id = uid();
    if (!s.currency) s.currency = 'USD';
    if (!s.status) s.status = 'active';
    if (!Array.isArray(s.tags)) s.tags = [];
    return s;
  });
  return state.students;
}
function load() {
  // Synchronous fast-path: try localStorage so the UI paints immediately.
  // An async IDB read follows and migrates / upgrades if needed.
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) normalizeState(JSON.parse(raw));
  } catch (e) { console.warn('Failed to load state from localStorage', e); }
  // Async upgrade: read from IndexedDB, migrate if newer or if localStorage was empty.
  stateDbGet().then(idbState => {
    const lsRaw = (() => { try { return localStorage.getItem(KEY); } catch (_) { return null; } })();
    if (idbState) {
      // IDB has data — use it as the source of truth (it may be newer)
      const idbParsed = typeof idbState === 'string' ? JSON.parse(idbState) : idbState;
      normalizeState(idbParsed);
      // Also update localStorage as a fallback
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) {}
    } else if (lsRaw) {
      // IDB empty but localStorage has data — migrate to IDB
      stateDbPut(JSON.stringify(state)).catch(() => {});
    }
  }).catch(() => { /* IDB unavailable — localStorage-only mode */ });
}
const scheduleIdle = typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function'
  ? (fn, timeout = 2000) => window.requestIdleCallback(fn, { timeout })
  : (fn) => setTimeout(fn, 150);

const cancelIdle = typeof window !== 'undefined' && typeof window.cancelIdleCallback === 'function'
  ? (id) => window.cancelIdleCallback(id)
  : (id) => clearTimeout(id);

let idleSaveHandle = null;
let saveDirty = false;
let lastSavedJson = '';

function save(options = {}) {
  // Non-blocking idle persistence: routine mutations defer write to browser idle periods (requestIdleCallback)
  // while preserving immediate synchronous saves for critical user actions.
  reviewWeekCache.clear(); // review per-week data derives from state — drop it on any mutation
  saveDirty = true;
  if (options && options.immediate) {
    flushSave();
    return;
  }
  if (idleSaveHandle) cancelIdle(idleSaveHandle);
  idleSaveHandle = scheduleIdle(() => {
    idleSaveHandle = null;
    flushSave();
  }, options && options.idle ? 3000 : 1500);
}

function saveIdle() {
  save({ idle: true });
}

function flushSave() {
  if (idleSaveHandle) {
    cancelIdle(idleSaveHandle);
    idleSaveHandle = null;
  }
  saveDirty = false;
  const json = JSON.stringify(state);
  // Skip write if state hasn't changed (avoids IDB churn)
  if (json === lastSavedJson) return;
  lastSavedJson = json;
  // Dual-write: IDB (async, quota-safe) + localStorage (sync fallback for pagehide)
  try { localStorage.setItem(KEY, json); } catch (e) { console.warn('localStorage quota exceeded — IDB is primary', e); }
  stateDbPut(json).catch(() => {});
  maybeAutoSync();
  checkOverdueNotifications();
}
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushSave);
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushSave(); });
  }
}

/* ============ Undo / Redo ============ */
const UNDO_MAX = 40;
let undoStack = []; // array of JSON-stringified state snapshots
let redoStack = [];
function captureUndo(label) {
  // Save current state snapshot before a mutation.
  // label is informational (used for the toast) but not stored.
  undoStack.push(JSON.stringify(state));
  if (undoStack.length > UNDO_MAX) undoStack.shift();
  redoStack = []; // any new action clears the redo stack
}
function performUndo() {
  if (!undoStack.length) { toast('Nothing to undo'); return; }
  redoStack.push(JSON.stringify(state));
  const prev = undoStack.pop();
  state = JSON.parse(prev);
  save(); renderView();
  toast('↩️ Undo', 'success');
}
function performRedo() {
  if (!redoStack.length) { toast('Nothing to redo'); return; }
  undoStack.push(JSON.stringify(state));
  const next = redoStack.pop();
  state = JSON.parse(next);
  save(); renderView();
  toast('↪️ Redo', 'success');
}

/* IndexedDB for audio blobs */
let _db = null;
function idb() {
  return new Promise((res, rej) => {
    if (_db) return res(_db);
    const rq = indexedDB.open('lumen-audio', 1);
    rq.onupgradeneeded = e => { e.target.result.createObjectStore('blobs'); };
    rq.onsuccess = e => { _db = e.target.result; res(_db); };
    rq.onerror = e => rej(e.target.error);
  });
}
function blobPut(key, blob) {
  return idb().then(db => new Promise((res, rej) => {
    const tx = db.transaction('blobs', 'readwrite');
    tx.objectStore('blobs').put(blob, key);
    tx.oncomplete = res; tx.onerror = () => rej(tx.error);
  }));
}
function blobGet(key) {
  return idb().then(db => new Promise((res, rej) => {
    const tx = db.transaction('blobs', 'readonly');
    const rq = tx.objectStore('blobs').get(key);
    rq.onsuccess = () => res(rq.result || null);
    rq.onerror = () => rej(rq.error);
  }));
}
function blobDelete(key) {
  return idb().then(db => new Promise((res, rej) => {
    const tx = db.transaction('blobs', 'readwrite');
    tx.objectStore('blobs').delete(key);
    tx.oncomplete = res; tx.onerror = () => rej(tx.error);
  }));
}
function blobClear() {
  return idb().then(db => new Promise((res, rej) => {
    const tx = db.transaction('blobs', 'readwrite');
    tx.objectStore('blobs').clear();
    tx.oncomplete = res; tx.onerror = () => rej(tx.error);
  }));
}

/* ---------- Constants ---------- */
const STATUSES = [
  { id: 'backlog', title: 'Backlog', color: '#8b93a7' },
  { id: 'today', title: 'Today', color: '#ffb020' },
  { id: 'progress', title: 'In Progress', color: '#4f8cff' },
  { id: 'done', title: 'Done', color: '#34d399' }
];
const PRIOS = {
  high: { label: 'High', cls: 'priority-high' },
  med: { label: 'Medium', cls: 'priority-med' },
  low: { label: 'Low', cls: 'priority-low' }
};
const CATEGORIES = [
  { id: 'teaching', label: '📚 Teaching', color: '#4f8cff' },
  { id: 'grading', label: '📝 Grading', color: '#f472b6' },
  { id: 'planning', label: '📋 Planning', color: '#34d399' },
  { id: 'admin', label: '🏛️ Admin', color: '#ffb020' },
  { id: 'meetings', label: '🤝 Meetings', color: '#22d3ee' },
  { id: 'professional', label: '🎓 Professional Dev', color: '#a3e635' },
  { id: 'personal', label: '🏠 Personal', color: '#ff5d6c' },
  { id: 'errands', label: '🏃 Errands', color: '#8b93a7' }
];
const RECURRENCE = [
  { id: '', label: 'None' },
  { id: 'daily', label: 'Daily' },
  { id: 'weekdays', label: 'Weekdays' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'biweekly', label: 'Every 2 weeks' },
  { id: 'monthly', label: 'Monthly' }
];
const DAYS = [
  { id: 'mon', label: 'Mon' }, { id: 'tue', label: 'Tue' }, { id: 'wed', label: 'Wed' },
  { id: 'thu', label: 'Thu' }, { id: 'fri', label: 'Fri' }, { id: 'sat', label: 'Sat' }, { id: 'sun', label: 'Sun' }
];
const DEFAULT_PERIODS = [
  { id: 'p1', label: 'Period 1', time: '08:00 – 08:45', start: '08:00', end: '08:45' },
  { id: 'p2', label: 'Period 2', time: '09:00 – 09:45', start: '09:00', end: '09:45' },
  { id: 'p3', label: 'Period 3', time: '10:00 – 10:45', start: '10:00', end: '10:45' },
  { id: 'p4', label: 'Period 4', time: '11:00 – 11:45', start: '11:00', end: '11:45' },
  { id: 'lunch', label: 'Lunch', time: '12:00 – 13:00', start: '12:00', end: '13:00' },
  { id: 'p5', label: 'Period 5', time: '13:00 – 13:45', start: '13:00', end: '13:45' },
  { id: 'p6', label: 'Period 6', time: '14:00 – 14:45', start: '14:00', end: '14:45' },
  { id: 'p7', label: 'Period 7', time: '15:00 – 15:45', start: '15:00', end: '15:45' },
  { id: 'p8', label: 'Period 8', time: '16:00 – 16:45', start: '16:00', end: '16:45' },
  { id: 'plan', label: 'Planning', time: '17:00 – 17:45', start: '17:00', end: '17:45' },
  { id: 'mtg', label: 'Meetings', time: '18:00 – 18:45', start: '18:00', end: '18:45' },
  { id: 'after', label: 'After School', time: '19:00 – 20:00', start: '19:00', end: '20:00' }
];
let PERIODS = DEFAULT_PERIODS;
function getPeriods() {
  if (state.settings && Array.isArray(state.settings.periods) && state.settings.periods.length > 0) {
    return state.settings.periods;
  }
  return DEFAULT_PERIODS;
}
const COLORS = ['#7c6cf6', '#4f8cff', '#34d399', '#ffb020', '#ff5d6c', '#f472b6', '#22d3ee', '#a3e635'];
const EMOJIS = ['💧', '🏋️', '📚', '🧘', '🥗', '✍️', '🌅', '💪', '🎸', '🌱', '🧠', '🚶'];
const TITLES = {
  brief: ['Morning Brief', 'Your day, assembled before you start'],
  dashboard: ['Dashboard', 'Your day at a glance'],
  review: ['Weekly review', 'What got done this week'],
  tasks: ['Tasks', 'Kanban board — drag cards to move them'],
  projects: ['Projects', 'Track everything you build'],
  tags: ['All tasks by tag', 'Every task, grouped by its tags'],
  goals: ['Goals', 'Objectives & key results'],
  habits: ['Habits', 'Build streaks, one day at a time'],
  achievements: ['Achievements', 'Badges earned from real progress'],
  notes: ['Notes', 'Capture and organize your thoughts'],
  voice: ['Voice', 'Record, transcribe, and save ideas'],
  activity: ['Activity', 'Track every change in your workspace'],
  schedule: ['Personal Schedule', 'Your weekly teaching timetable'],
  settings: ['Settings', 'Theme, data & shortcuts'],
  perf: ['Performance', 'Render times & slow view alerts'],
  analytics: ['Habit Analytics', 'Day-of-week patterns & cross-habit insights'],
  finance: ['Finance', 'Income, expenses & cash flow'],
  students: ['Students', 'Teaching roster, lesson dossiers & student progress'],
  vault: ['Personal Vault', 'Secure links, documents & files']
};
const NAV = {
  brief: ['sparkles', 'Brief'], dashboard: ['dashboard', 'Dashboard'], students: ['graduation-cap', 'Students'], review: ['calendar', 'Weekly review'], tasks: ['check-square', 'Tasks'], projects: ['folder', 'Projects'], schedule: ['calendar-plus', 'Schedule'], tags: ['tag', 'Tags'], goals: ['target', 'Goals'],
  habits: ['flame', 'Habits'], achievements: ['trophy', 'Achievements'], notes: ['file-text', 'Notes'], voice: ['mic', 'Voice'], activity: ['activity', 'Activity'], perf: ['zap', 'Performance'],  analytics: ['bar-chart', 'Analytics'], finance: ['dollar-sign', 'Finance'], vault: ['folder', 'Vault'], settings: ['settings', 'Settings']
};
const MAIN_VIEWS = new Set(['brief', 'dashboard', 'students', 'tasks', 'projects', 'schedule', 'habits', 'notes', 'voice', 'finance', 'vault', 'more']);

/* ---------- Seed data ---------- */
function d(offset) { return isoDate(shiftDays(offset)); }
/* ---------- Toasts ---------- */
function toast(msg, type = '') {
  const root = $('#toast-root');
  // Limit to 5 toasts max to prevent UI overflow
  while (root.children.length >= 5) root.firstChild.remove();
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  el.style.animation = 'toastIn .25s ease-out';
  root.appendChild(el);
  setTimeout(() => { el.style.animation = 'toastOut .3s ease-in forwards'; setTimeout(() => el.remove(), 320); }, 2600);
}

/* ---------- Activity log ---------- */
const ACTIVITY_ICONS = {
  'task.create': '➕', 'task.edit': '✏️', 'task.delete': '🗑️', 'task.move': '↔️',
  'task.complete': '✅', 'task.uncomplete': '↩️', 'task.batch': '📋',
  'project.create': '🚀', 'project.edit': '🔧', 'project.delete': '🗑️', 'project.status': '🔄',
  'goal.create': '🎯', 'goal.edit': '✏️', 'goal.delete': '🗑️',
  'habit.check': '🔥', 'habit.uncheck': '⬜', 'habit.create': '🌱', 'habit.delete': '🗑️',
  'note.create': '📝', 'note.edit': '✏️', 'note.delete': '🗑️',
  'pomo.complete': '🍅', 'pomo.pause': '⏸️',
  'settings.change': '⚙️', 'data.import': '📥', 'data.export': '📤', 'data.clear': '💣'
};
function logActivity(type, detail, entity) {
  if (!state.activityLog) state.activityLog = [];
  state.activityLog.unshift({
    id: uid(),
    type,
    detail: detail || '',
    entity: entity || '',
    at: Date.now()
  });
  // Keep last 500 entries
  if (state.activityLog.length > 500) state.activityLog.length = 500;
}

/* ---------- File tracking (projects) ---------- */
const FILE_TYPE_ICONS = {
  'js': '📜', 'ts': '📘', 'py': '🐍', 'rs': '🦀', 'go': '🔵', 'java': '☕',
  'cpp': '⚙️', 'c': '⚙️', 'cs': '🟣', 'rb': '💎', 'php': '🐘', 'swift': '🍎',
  'kt': '🟣', 'html': '🌐', 'css': '🎨', 'scss': '🎨', 'less': '🎨',
  'json': '📋', 'yaml': '📋', 'yml': '📋', 'xml': '📋', 'toml': '📋',
  'md': '📝', 'txt': '📄', 'pdf': '📕', 'doc': '📘', 'docx': '📘',
  'png': '🖼️', 'jpg': '🖼️', 'jpeg': '🖼️', 'gif': '🖼️', 'svg': '🖼️', 'ico': '🖼️',
  'mp3': '🎵', 'mp4': '🎬', 'wav': '🎵', 'zip': '📦', 'tar': '📦', 'gz': '📦',
  'sh': '🔧', 'bat': '🔧', 'ps1': '🔧', 'env': '🔒', 'gitignore': '🔒'
};
function fileIcon(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  return FILE_TYPE_ICONS[ext] || '📄';
}
function fileSizeStr(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
// Scan a directory using File System Access API
async function scanDirectory(dirHandle) {
  const files = [];
  async function walk(handle, path) {
    for await (const entry of handle.values()) {
      const fullPath = path ? path + '/' + entry.name : entry.name;
      if (entry.kind === 'file') {
        const file = await entry.getFile();
        files.push({ name: entry.name, path: fullPath, size: file.size, lastModified: file.lastModified });
      } else if (entry.kind === 'directory') {
        await walk(entry, fullPath);
      }
    }
  }
  await walk(dirHandle, '');
  return files;
}
// Compare two file snapshots and return changes
function diffFileSnapshots(prev, curr) {
  const prevMap = new Map(prev.map(f => [f.path, f]));
  const currMap = new Map(curr.map(f => [f.path, f]));
  const added = [], modified = [], removed = [];
  for (const [path, file] of currMap) {
    const old = prevMap.get(path);
    if (!old) added.push(file);
    else if (old.size !== file.size || old.lastModified !== file.lastModified) modified.push({ ...file, oldSize: old.size, oldLastModified: old.lastModified });
  }
  for (const [path, file] of prevMap) {
    if (!currMap.has(path)) removed.push(file);
  }
  return { added, modified, removed, total: curr.length };
}
// Link a folder to a project (uses File System Access API)
async function linkFolderToProject(proj) {
  try {
    const dirHandle = await window.showDirectoryPicker({ mode: 'read' });
    const files = await scanDirectory(dirHandle);
    // Store a snapshot and the folder name
    const folderName = dirHandle.name;
    const prevSnapshot = (proj.fileTracker && proj.fileTracker.lastSnapshot) || [];
    const changes = diffFileSnapshots(prevSnapshot, files);
    if (!proj.fileTracker) proj.fileTracker = { folderName: '', lastSnapshot: [], changeLog: [], dirHandle: null };
    proj.fileTracker.folderName = folderName;
    proj.fileTracker.lastSnapshot = files;
    proj.fileTracker.dirHandle = dirHandle; // transient — won't survive serialize
    // Log changes (skip first scan if no previous snapshot)
    if (prevSnapshot.length > 0 && (changes.added.length || changes.modified.length || changes.removed.length)) {
      proj.fileTracker.changeLog.unshift({
        at: Date.now(),
        added: changes.added.map(f => f.name),
        modified: changes.modified.map(f => f.name),
        removed: changes.removed.map(f => f.name),
        total: changes.total
      });
      if (proj.fileTracker.changeLog.length > 100) proj.fileTracker.changeLog.length = 100;
      logActivity('project.edit', `📁 ${folderName}: ${changes.added.length} added, ${changes.modified.length} modified, ${changes.removed.length} removed`, 'project');
    }
    proj.fileTracker.scannedAt = Date.now();
    save();
    toast(`📁 Linked ${folderName} (${files.length} files)`);
    return true;
  } catch (e) {
    if (e.name !== 'AbortError') toast('Failed to link folder: ' + e.message, 'error');
    return false;
  }
}
// Re-scan a linked folder
async function rescanProjectFolder(proj) {
  if (!proj.fileTracker || !proj.fileTracker.folderName) { toast('No folder linked to this project'); return; }
  try {
    // Try to re-use the stored handle, otherwise prompt
    let dirHandle = proj.fileTracker.dirHandle;
    if (!dirHandle) {
      dirHandle = await window.showDirectoryPicker({ mode: 'read' });
    }
    const files = await scanDirectory(dirHandle);
    const prevSnapshot = proj.fileTracker.lastSnapshot || [];
    const changes = diffFileSnapshots(prevSnapshot, files);
    proj.fileTracker.lastSnapshot = files;
    proj.fileTracker.dirHandle = dirHandle;
    if (changes.added.length || changes.modified.length || changes.removed.length) {
      proj.fileTracker.changeLog.unshift({
        at: Date.now(),
        added: changes.added.map(f => f.name),
        modified: changes.modified.map(f => f.name),
        removed: changes.removed.map(f => f.name),
        total: changes.total
      });
      if (proj.fileTracker.changeLog.length > 100) proj.fileTracker.changeLog.length = 100;
      logActivity('project.edit', `📁 ${proj.fileTracker.folderName}: ${changes.added.length} added, ${changes.modified.length} modified, ${changes.removed.length} removed`, 'project');
      toast(`📁 Changes detected: ${changes.added.length} added, ${changes.modified.length} modified, ${changes.removed.length} removed`);
    } else {
      toast('📁 No changes detected');
    }
    proj.fileTracker.scannedAt = Date.now();
    save();
    return changes;
  } catch (e) {
    if (e.name !== 'AbortError') toast('Failed to rescan: ' + e.message, 'error');
    return null;
  }
}
// HTML for file tracker section in project cards
function fileTrackerHTML(proj) {
  const ft = proj.fileTracker;
  if (!ft || !ft.folderName) return '';
  const fileCount = (ft.lastSnapshot || []).length;
  const changeCount = (ft.changeLog || []).length;
  const lastChange = ft.changeLog && ft.changeLog.length ? ft.changeLog[0] : null;
  const lastScan = ft.scannedAt ? timeAgo(ft.scannedAt) : '';
  let changeDetail = '';
  if (lastChange) {
    const parts = [];
    if (lastChange.added.length) parts.push(`<span class="ft-added">+${lastChange.added.length} new</span>`);
    if (lastChange.modified.length) parts.push(`<span class="ft-modified">~${lastChange.modified.length} changed</span>`);
    if (lastChange.removed.length) parts.push(`<span class="ft-removed">-${lastChange.removed.length} deleted</span>`);
    changeDetail = parts.join(' ');
  }
  return `<div class="proj-file-tracker">
    <div class="ft-header">
      <span class="ft-folder">📁 ${esc(ft.folderName)}</span>
      <span class="ft-count">${fileCount} files</span>
    </div>
    <div class="ft-meta">
      ${lastScan ? `<span class="ft-scan">🕐 Scanned ${lastScan}</span>` : ''}
      ${changeCount ? `<span class="ft-changes">${changeCount} scan${changeCount !== 1 ? 's' : ''}</span>` : ''}
    </div>
    ${changeDetail ? `<div class="ft-detail">${changeDetail}</div>` : ''}
    <div class="ft-actions">
      <button class="btn btn-xs btn-ghost ft-rescan" data-proj-rescan="${proj.id}">${ic('refresh-cw', 12)} Rescan</button>
    </div>
  </div>`;
}
// HTML for file change log in project detail modal
function fileChangeLogHTML(proj) {
  const ft = proj.fileTracker;
  if (!ft || !ft.folderName) return '<div class="muted" style="font-size:12px">No folder linked. Click "Link folder" to start tracking files.</div>';
  const files = ft.lastSnapshot || [];
  const log = ft.changeLog || [];
  // File tree
  const fileTreeHTML = files.slice(0, 50).map(f => `<div class="ft-file-row">
    <span class="ft-file-icon">${fileIcon(f.name)}</span>
    <span class="ft-file-name">${esc(f.path)}</span>
    <span class="ft-file-size">${fileSizeStr(f.size)}</span>
  </div>`).join('') + (files.length > 50 ? `<div class="muted" style="font-size:11px;padding:4px 0">… and ${files.length - 50} more files</div>` : '');
  // Change log
  const logHTML = log.slice(0, 20).map(entry => {
    const time = new Date(entry.at);
    const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = time.toLocaleDateString([], { month: 'short', day: 'numeric' });
    const parts = [];
    if (entry.added && entry.added.length) parts.push(`<span class="ft-added">+${entry.added.length} added</span>`);
    if (entry.modified && entry.modified.length) parts.push(`<span class="ft-modified">~${entry.modified.length} modified</span>`);
    if (entry.removed && entry.removed.length) parts.push(`<span class="ft-removed">-${entry.removed.length} removed</span>`);
    const detailParts = [];
    if (entry.added) detailParts.push(...entry.added.map(n => `<span class="ft-file-chip ft-added">${esc(n)}</span>`));
    if (entry.modified) detailParts.push(...entry.modified.map(n => `<span class="ft-file-chip ft-modified">${esc(n)}</span>`));
    if (entry.removed) detailParts.push(...entry.removed.map(n => `<span class="ft-file-chip ft-removed">${esc(n)}</span>`));
    return `<div class="ft-log-entry">
      <div class="ft-log-head">${dateStr} ${timeStr} — ${parts.join(' ')} (${entry.total} files)</div>
      <div class="ft-log-detail">${detailParts.join('')}</div>
    </div>`;
  }).join('') || '<div class="muted" style="font-size:12px">No changes recorded yet. Rescan to detect changes.</div>';
  return `<div class="ft-detail-section">
    <div class="ft-detail-title">📁 Files in ${esc(ft.folderName)} <span class="ft-count">${files.length}</span></div>
    <div class="ft-file-tree">${fileTreeHTML}</div>
    <div class="ft-detail-title">📋 Change log <span class="ft-count">${log.length}</span></div>
    <div class="ft-change-log">${logHTML}</div>
  </div>`;
}

/* ---------- Modal ---------- */
let _modalReturnFocus = null;
let _modalKeyHandler = null;

function openModal(html) {
  if (!$('#modal-root').innerHTML) _modalReturnFocus = document.activeElement;
  if (_modalKeyHandler) {
    document.removeEventListener('keydown', _modalKeyHandler);
    _modalKeyHandler = null;
  }

  $('#modal-root').innerHTML = `<div class="modal-backdrop" id="backdrop">${html}</div>`;
  const b = $('#backdrop');

  const vr = document.getElementById('view-root');
  if (vr) {
    vr.setAttribute('inert', '');
    vr.setAttribute('aria-hidden', 'true');
  }

  const dialog = $('#modal-root .modal') || $('#modal-root > .modal-backdrop > *') || b;
  if (dialog) {
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('tabindex', '-1');

    const heading = dialog.querySelector('.modal-head h3, .modal-head h2, h3, h2, h1');
    if (heading) {
      if (!heading.id) heading.id = 'modal-title-' + Math.random().toString(36).slice(2, 9);
      dialog.setAttribute('aria-labelledby', heading.id);
    }

    dialog.querySelectorAll('[data-close-modal], .modal-close, .cap-close').forEach(btn => {
      if (!btn.textContent.trim() && !btn.getAttribute('aria-label') && !btn.getAttribute('title')) {
        btn.setAttribute('aria-label', 'Close');
      }
    });

    let downOnBackdrop = false;
    b.addEventListener('mousedown', e => { downOnBackdrop = (e.target === b); });
    b.addEventListener('click', e => { if (e.target === b && downOnBackdrop) closeModal(); });

    dialog.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => closeModal());
    });

    _modalKeyHandler = e => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeModal();
        return;
      }
      if (e.key === 'Tab') {
        const f = modalFocusables(dialog);
        if (!f.length) {
          e.preventDefault();
          dialog.focus();
          return;
        }
        const firstEl = f[0];
        const lastEl = f[f.length - 1];
        const outside = !dialog.contains(document.activeElement);
        if (e.shiftKey) {
          if (outside || document.activeElement === firstEl) {
            e.preventDefault();
            lastEl.focus();
          }
        } else {
          if (outside || document.activeElement === lastEl) {
            e.preventDefault();
            firstEl.focus();
          }
        }
      }
    };
    document.addEventListener('keydown', _modalKeyHandler);

    const autoFocusEl = dialog.querySelector('[autofocus]');
    const firstInput = dialog.querySelector('input:not([type="hidden"]), textarea, select');
    const f = modalFocusables(dialog);
    const targetFocus = autoFocusEl || firstInput || (f.length ? f[0] : dialog);

    if (targetFocus) {
      targetFocus.focus();
      setTimeout(() => {
        if (document.activeElement !== targetFocus && dialog.contains(targetFocus)) {
          targetFocus.focus();
        }
      }, 30);
    }
  }
}

function closeModal() {
  if (_modalKeyHandler) {
    document.removeEventListener('keydown', _modalKeyHandler);
    _modalKeyHandler = null;
  }
  $('#modal-root').innerHTML = '';

  const vr = document.getElementById('view-root');
  if (vr && !$('#search-root').innerHTML) {
    vr.removeAttribute('inert');
    vr.removeAttribute('aria-hidden');
  }

  const back = _modalReturnFocus;
  _modalReturnFocus = null;
  if (back && back.isConnected && typeof back.focus === 'function') {
    back.focus();
  }
}

/* ---------- Router ---------- */
const viewRoot = () => $('#view-root');
function currentView() {
  const h = location.hash.slice(1);
  return NAV[h] ? h : 'brief';
}
let _lastAchEval = 0;

/* ---- Performance monitor ---- */
const PERF_MAX = 200; // keep last N render entries
const PERF_SLOW_MS = 100; // renders above this get flagged
const perfLog = []; // { view, ms, ts, slow }
function perfRecord(view, ms) {
  const entry = { view, ms: Math.round(ms * 10) / 10, ts: Date.now(), slow: ms > PERF_SLOW_MS };
  perfLog.push(entry);
  if (perfLog.length > PERF_MAX) perfLog.shift();
}
function perfStats() {
  const byView = {};
  perfLog.forEach(e => {
    if (!byView[e.view]) byView[e.view] = [];
    byView[e.view].push(e.ms);
  });
  const stats = {};
  Object.keys(byView).forEach(v => {
    const arr = byView[v].sort((a, b) => a - b);
    const len = arr.length;
    stats[v] = {
      count: len,
      min: arr[0],
      max: arr[len - 1],
      avg: Math.round(arr.reduce((s, x) => s + x, 0) / len * 10) / 10,
      p50: arr[Math.floor(len * 0.5)],
      p95: arr[Math.floor(len * 0.95)],
      slow: perfLog.filter(e => e.view === v && e.slow).length
    };
  });
  return stats;
}

let _renderSeq = 0;
async function renderView() {
  const seq = ++_renderSeq;
  if ($('#modal-root').innerHTML) closeModal();
  if ($('#search-root').innerHTML) closeSearch();
  const vr = document.getElementById('view-root');
  if (vr) {
    vr.removeAttribute('inert');
    vr.removeAttribute('aria-hidden');
  }
  const view = currentView();
  if (Date.now() - _lastAchEval > 5000) { _lastAchEval = Date.now(); evaluateAchievements(); }
  const [title, sub] = TITLES[view] || ['Dashboard', 'Welcome back'];
  $('#view-title').textContent = title;
  $('#view-sub').textContent = sub;
  $$('.nav-item[data-view]').forEach(b => {
    const bv = b.dataset.view;
    const isActive = bv === view || (bv === 'more' && !MAIN_VIEWS.has(view));
    b.classList.toggle('active', isActive);
    if (isActive) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
  $$('.more-item[data-view]').forEach(b => {
    b.classList.toggle('active', b.dataset.view === view);
  });
  hideQuickMenu();
  $('#more-menu')?.classList.add('hidden');
  updateNavBadges();
  const root = viewRoot();
  const _t0 = performance.now();

  // Route-level dynamic import code splitting
  let renderer = null;
  if (view === 'tasks') {
    try {
      const mod = await import('./src/tasks/controller.js');
      renderer = mod.renderTasks;
    } catch (_) {
      renderer = typeof renderTasks !== 'undefined' ? renderTasks : null;
    }
  } else if (view === 'vault') {
    try {
      await import('./src/vault/view.js');
      renderer = typeof renderVault !== 'undefined' ? renderVault : null;
    } catch (_) {
      renderer = typeof renderVault !== 'undefined' ? renderVault : null;
    }
  }

  if (seq !== _renderSeq) return; // Discard stale in-flight render

  const RENDERERS = { brief: renderBrief, dashboard: renderDashboard, students: renderStudents, review: renderReview, tasks: renderTasks, projects: renderProjects, tags: renderTags, schedule: renderSchedule, goals: renderGoals, habits: renderHabits, achievements: renderAchievements, notes: renderNotes, voice: renderVoice, activity: renderActivity, settings: renderSettings, analytics: renderAnalytics, finance: renderFinance, perf: renderPerf, vault: renderVault };
  const fn = renderer || RENDERERS[view] || renderDashboard;
  fn();
  _lastHashRendered = location.hash;
  perfRecord(view, performance.now() - _t0);
  root.scrollTop = 0;
}

/* ---------- Quick add ---------- */
function hideQuickMenu() { $('#quick-menu').classList.add('hidden'); }
function bindTopbar() {
  $('#quick-add-btn').addEventListener('click', e => {
    e.stopPropagation();
    $('#quick-menu').classList.toggle('hidden');
  });
  ['pointerdown', 'mousedown'].forEach(evt => {
    document.addEventListener(evt, e => {
      const btn = e.target.closest('button, [role="button"], a[href], input, select, textarea');
      if (btn && document.activeElement !== btn && !btn.closest('#modal-root')) {
        try { btn.focus(); } catch (_) {}
      }
    }, true);
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('.quick-add')) hideQuickMenu();
    const pinBtn = e.target.closest('[data-dw-pin]');
    if (pinBtn) {
      e.stopPropagation();
      e.preventDefault();
      const w = pinBtn.dataset.dwPin;
      if (!state.settings) state.settings = {};
      if (w === 'vault') {
        state.settings.pinVault = state.settings.pinVault === false;
      } else if (w === 'deadlines') {
        state.settings.pinDeadlines = state.settings.pinDeadlines === false;
      } else {
        let foldList = JSON.parse(localStorage.getItem('lumen.dash.fold') || '[]');
        const idx = foldList.indexOf(w);
        if (idx >= 0) foldList.splice(idx, 1);
        else foldList.push(w);
        localStorage.setItem('lumen.dash.fold', JSON.stringify(foldList));
      }
      save({ immediate: true });
      if (location.hash === '' || location.hash === '#' || location.hash === '#dashboard') {
        renderDashboard();
      }
    }
  });
  $$('#quick-menu .quick-item').forEach(b => b.addEventListener('click', () => {
    const a = b.dataset.action;
    hideQuickMenu();
    if (a === 'task') openTaskModal();
    else if (a === 'student') openStudentEditModal();
    else if (a === 'project') { location.hash = '#projects'; openProjectModal(null); }
    else if (a === 'goal') openGoalModal();
    else if (a === 'habit') openHabitModal();
    else if (a === 'note') { newNote(); location.hash = '#notes'; }
    else if (a === 'tag') location.hash = '#tags';
    else if (a === 'schedule') location.hash = '#schedule';
    else if (a === 'finance') { location.hash = '#finance'; openFinanceModal(); }
    else if (a === 'voice') toggleCapture();
    else if (a === 'go-brief') location.hash = '#brief';
    else if (a === 'go-students') location.hash = '#students';
    else if (a === 'go-dashboard') location.hash = '#dashboard';
    else if (a === 'go-schedule') location.hash = '#schedule';
    else if (a === 'go-projects') location.hash = '#projects';
    else if (a === 'go-goals') location.hash = '#goals';
    else if (a === 'go-habits') location.hash = '#habits';
    else if (a === 'go-notes') location.hash = '#notes';
    else if (a === 'go-voice') location.hash = '#voice';
    else if (a === 'go-tags') location.hash = '#tags';
    else if (a === 'go-finance') location.hash = '#finance';
    else if (a === 'go-analytics') location.hash = '#analytics';
    else if (a === 'go-achievements') location.hash = '#achievements';
    else if (a === 'go-activity') location.hash = '#activity';
    else if (a === 'go-review') location.hash = '#review';
    else if (a === 'go-settings') location.hash = '#settings';
    else if (a === 'undo') performUndo();
    else if (a === 'redo') performRedo();
    else if (a === 'ics') exportICS();
    else if (a === 'backup') $('#set-export')?.click();
    else if (a === 'focus') toggleFocusMode();
  }));
  $('#global-search-btn').addEventListener('click', openSearch);
  $('#global-mic-btn').addEventListener('click', toggleCapture);
  $('#global-focus-hub-btn')?.addEventListener('click', openFocusHubModal);
  /* capture pill controls */
  $('#cap-btn').addEventListener('click', () => { if (rec.active) stopRec(); else startRec(); });
  $('#cap-note').addEventListener('click', () => lastCapturedId && recToNote(lastCapturedId));
  $('#cap-task').addEventListener('click', () => lastCapturedId && recToTask(lastCapturedId));
  $('#cap-discard').addEventListener('click', async () => {
    if (!lastCapturedId) return;
    const r = state.recordings.find(x => x.id === lastCapturedId);
    if (r) {
      state.recordings = state.recordings.filter(x => x.id !== r.id);
      await blobDelete(r.id).catch(() => {});
      tombstone('recordings', r.id);
      localAudioIds.delete(r.id);
      save();
      if (currentView() === 'voice') renderVoice();
    }
    lastCapturedId = null;
    hideCapturePill();
    toast('Recording discarded');
  });
  $('#cap-close').addEventListener('click', hideCapturePill);
}

/* ---------- Theme & UI Engine ---------- */
const THEME_PALETTES = [
  { id: 'dracula', name: 'Dracula Matrix', bg: '#1e1f29', surface: '#282a36', accent: '#bd93f9', dark: true },
  { id: 'nord', name: 'Nord Frost', bg: '#242933', surface: '#3b4252', accent: '#88c0d0', dark: true },
  { id: 'cerulean', name: 'Atlantic Cerulean', bg: '#0d131a', surface: '#182230', accent: '#518DBF', dark: true },
  { id: 'sepia', name: 'Warm Sepia', bg: '#fbf0d9', surface: '#fff8eb', accent: '#b8621b', dark: false },
  { id: 'coral-dawn', name: 'Coral Dawn', bg: '#fcf7f4', surface: '#ffffff', accent: '#B33101', dark: false }
];

const ACCENT_COLORS = [
  { id: 'terracotta', label: 'Terracotta', hex: '#B33101' },
  { id: 'coral', label: 'Coral Flame', hex: '#FF6363' },
  { id: 'cerulean', label: 'Cerulean', hex: '#518DBF' },
  { id: 'violet', label: 'Violet', hex: '#7c6cf6' },
  { id: 'blue', label: 'Blue', hex: '#3b82f6' },
  { id: 'emerald', label: 'Emerald', hex: '#10b981' },
  { id: 'amber', label: 'Amber', hex: '#f59e0b' },
  { id: 'rose', label: 'Rose', hex: '#f43f5e' },
  { id: 'cyan', label: 'Cyan', hex: '#06b6d4' },
  { id: 'purple', label: 'Purple', hex: '#a855f7' },
  { id: 'orange', label: 'Orange', hex: '#f97316' }
];

function ensureThemesCSS() { if (typeof applyTheme === 'function') applyTheme(); }

function applyTheme() {
  if (!state.settings) state.settings = {};
  let t = state.settings.theme || 'dracula';
  const valid = new Set(['dracula', 'nord', 'cerulean', 'sepia', 'coral-dawn']);
  if (!valid.has(t)) {
    t = (t === 'light' || t === 'sepia') ? 'sepia' : (t === 'coral-dawn' ? 'coral-dawn' : 'dracula');
    state.settings.theme = t;
  }
  document.documentElement.dataset.theme = t;
  document.documentElement.dataset.accent = state.settings.accent || 'violet';
  document.documentElement.dataset.density = state.settings.density || 'comfortable';
  document.documentElement.dataset.glass = state.settings.glass !== false ? 'on' : 'off';
  document.documentElement.dataset.font = state.settings.font || 'sans';

  const btn = $('#theme-toggle');
  const isLight = t === 'sepia' || t === 'coral-dawn';
  if (btn) btn.innerHTML = isLight ? `${ic('moon', 17)} <span>Dark mode</span>` : `${ic('sun', 17)} <span>Light mode</span>`;
}

/* ============ Morning Brief ============ */
function goalsAtRisk() {
  const today = todayISO();
  const out = [];
  state.goals.forEach(g => {
    const pct = goalProgress(g);
    let why = '', cls = '';
    if (isGoalOverdue(g)) { why = 'Overdue ' + fmtShort(g.due); cls = 'risk-overdue'; }
    else {
      const badKr = (g.keyResults || []).find(kr => kr.due && kr.due < today && kr.current < kr.target);
      if (badKr) { why = 'Key result overdue ' + fmtShort(badKr.due); cls = 'risk-overdue'; }
      else if (g.due && g.createdAt) {
        const dueMs = new Date(g.due + 'T00:00:00').getTime();
        if (dueMs > g.createdAt) {
          const elapsed = clamp((Date.now() - g.createdAt) / (dueMs - g.createdAt), 0, 1);
          const diff = pct - Math.round(elapsed * 100);
          if (diff <= -12) { why = `${-diff}% behind plan`; cls = 'risk-behind'; }
        }
      }
    }
    if (why) out.push({ g, why, cls });
  });
  return out;
}
function stripMarkdown(s) {
  return String(s || '').replace(/[#>*_`\[\]()!-]/g, ' ').replace(/\s+/g, ' ').trim();
}
/* Guided first-run tour on the empty Brief */
let tourWasSeen = false;
let tourLastMissing = null;
const TOUR_STEPS = [
  { type: 'task', icon: '➕', title: 'Capture a task', desc: 'Tasks live on the kanban board — completing one can advance your goals.', cta: 'Add a task' },
  { type: 'goal', icon: '🎯', title: 'Set a goal', desc: 'One thing to work toward, with measurable key results and a target date.', cta: 'Create a goal' },
  { type: 'habit', icon: '🌱', title: 'Start a habit', desc: 'Pick something small and daily — streaks and the heatmap keep you honest.', cta: 'Add a habit' },
  { type: 'note', icon: '📝', title: 'Write a note', desc: 'Markdown, tags and pinning. Your pinned note shows up here each morning.', cta: 'Write a note' }
];
/* ---- Shared windowed virtualization for uniform-height lists (notes, dash-task rows, search) ---- */
function createListVirt(opts) {
  const s = { top: 0, timer: 0, h: 0, key: '', items: [], render: null };
  const THRESHOLD = opts.threshold || 0; // lists longer than this become windowed
  function setItems(items, render, key) {
    if (key !== s.key) { s.key = key; s.top = 0; s.h = 0; }
    s.items = items; s.render = render;
  }
  function render() {
    const el = $(opts.containerSel);
    if (!el) return;
    const items = s.items;
    const foot = opts.rangeSel ? $(opts.rangeSel) : null;
    if (!items.length) {
      el.innerHTML = opts.emptyHTML || '';
      if (foot) foot.textContent = '';
      return;
    }
    if (items.length <= THRESHOLD) {
      el.innerHTML = items.map(s.render).join('');
      if (foot) foot.textContent = '';
      if (opts.bindItems) opts.bindItems(el); // short lists still need their click handlers
      return;
    }
    const clientH = (s.top > 0 && el.clientHeight) ? el.clientHeight : (opts.clientH || 400);
    let first, last, topPad, bottomPad;
    if (opts.rowH) {
      // variable per-row heights (search: group headers + items)
      let y = 0; first = 0;
      for (let i = 0; i < items.length; i++) {
        if (y + opts.rowH(items[i]) > s.top - (opts.overscanTop || 40)) { first = i; break; }
        y += opts.rowH(items[i]);
      }
      topPad = y;
      let y2 = 0; last = items.length - 1;
      for (let i = first; i < items.length; i++) {
        y2 += opts.rowH(items[i]);
        if (y + y2 > s.top + clientH + (opts.overscanBottom || 80)) { last = i; break; }
      }
      let total = 0;
      for (let i = 0; i < items.length; i++) total += opts.rowH(items[i]);
      bottomPad = Math.max(0, total - (y + y2));
      if (opts.measureH) opts.measureH(el);
    } else {
      // uniform heights — O(1) windowing with measured recalibration
      const h = s.h || opts.estimate || 46;
      first = Math.max(0, Math.floor(s.top / h) - 3);
      const count = Math.min(items.length - first, Math.ceil(clientH / h) + 8);
      last = first + count;
      topPad = first * h;
      bottomPad = (items.length - last) * h;
      if (opts.itemSel && s.h && s.top > 0) {
        const it = el.querySelector(opts.itemSel);
        if (it) {
          const rh = it.offsetHeight;
          if (rh > 0 && rh !== s.h) {
            s.top = Math.round(s.top * (rh / s.h)); // keep the same first visible row when h recalibrates
            s.h = rh;
          }
        }
      }
    }
    el.innerHTML = (topPad ? `<div style="height:${topPad}px;flex-shrink:0"></div>` : '') +
      items.slice(first, last + (opts.rowH ? 1 : 0)).map(s.render).join('') +
      (bottomPad ? `<div style="height:${bottomPad}px;flex-shrink:0"></div>` : '');
    if (foot) foot.textContent = `${first + 1}–${last + (opts.rowH ? 1 : 0)} of ${items.length}`;
    if (opts.bindItems) opts.bindItems(el);
  }
  function bind() {
    const el = $(opts.containerSel);
    if (!el) return;
    el.scrollTop = s.top;
    el.addEventListener('scroll', () => {
      s.top = el.scrollTop;
      if (s.timer) return;
      s.timer = setTimeout(() => { s.timer = 0; if (el.isConnected) render(); }, 24);
    });
  }
  function html(items, render, key, emptyHTML) {
    setItems(items, render, key);
    if (!items.length) return emptyHTML;
    if (items.length <= THRESHOLD) return items.map(render).join('');
    return `<div class="dash-win-wrap">
      <div class="dash-win" id="dash-win-list"></div>
      <div class="dash-win-range" id="dash-win-range"></div>
    </div>`;
  }
  return { setItems, render, bind, sync: () => { render(); bind(); }, html, key: () => s.key };
}
/* ---- Dash-task rows instance (Brief today, Dashboard today, Review completed) ---- */
const dashListVirt = createListVirt({
  containerSel: '#dash-win-list', rangeSel: '#dash-win-range',
  itemSel: '.dash-task', estimate: 40, threshold: 24,
  bindItems: win => {
    $$('[data-complete]', win).forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      const t = state.tasks.find(x => x.id === b.dataset.complete);
      if (!t) return;
      captureUndo('Complete task');
      const { wasDone, kr } = toggleTaskDone(t);
      save();
      const key = dashListVirt.key();
      if (key === 'review') renderReview();
      else if (key === 'dash') renderDashboard();
      else renderBrief();
      if (kr) goalProgressToast(t, wasDone, kr);
    }));
    $$('.dash-task[data-id]', win).forEach(el => el.addEventListener('click', e => {
      if (e.target.closest('[data-complete]')) return;
      const t = state.tasks.find(x => x.id === el.dataset.id);
      if (t) openTaskModal(t);
    }));
  }
});

function getBriefCandidates() {
  const commit = state.settings && state.settings.reviewCommit;
  const protectedTaskIds = new Set((commit && commit.taskIds) || []);
  const today = todayISO();
  const tasks = (state.tasks || []).filter(t => t.status !== 'done');
  return tasks.slice().sort((a, b) => {
    const aProt = protectedTaskIds.has(a.id);
    const bProt = protectedTaskIds.has(b.id);
    if (aProt && !bProt) return -1;
    if (!aProt && bProt) return 1;
    const aDue = a.status === 'today' || a.due === today;
    const bDue = b.status === 'today' || b.due === today;
    if (aDue && !bDue) return -1;
    if (!aDue && bDue) return 1;
    return (b.updatedAt || 0) - (a.updatedAt || 0);
  });
}

function renderBrief() {
  const today = todayISO();
  const hour = new Date().getHours();
  const greet = hour < 5 ? 'Burning the midnight oil' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const dateLine = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  const todayTasks = state.tasks.filter(t => t.status !== 'done' && (t.status === 'today' || t.due === today));
  const taskRows = dashListVirt.html(todayTasks, dashTaskHTML, 'brief', '<div class="empty-state"><div class="es-icon">🎉</div>Nothing due today. Enjoy the headroom.</div>');

  const habitsTop = [...state.habits].sort((a, b) => habitStreak(b) - habitStreak(a)).slice(0, 4);
  const habitRows = habitsTop.map(h => {
    const on = !!h.dates[today];
    const streak = habitStreak(h);
    const linkedGoal = state.goals.find(g => (g.keyResults||[]).some(kr => kr.title.toLowerCase().includes(h.name.toLowerCase()) || h.name.toLowerCase().includes(kr.title.toLowerCase())));
    const goalChip = linkedGoal ? `<span class="link-chip" title="Linked goal">→ ${esc(linkedGoal.title)}</span>` : '';
    return `<div class="brief-habit ${on ? 'on' : ''}" data-habit="${h.id}">
      <span class="hc-emoji">${h.emoji}</span>
      <span class="hc-name">${esc(h.name)}</span>
      ${goalChip}
      ${on
        ? '<span class="brief-hint">✓ checked today</span>'
        : `<span class="brief-hint protect">Protect today · 🔥 ${streak}</span>`}
      <span class="check-circle">${ic('check', 12)}</span>
    </div>`;
  }).join('') || '<div class="empty-state"><div class="es-icon">🌱</div>No habits yet.</div>';

  // Daily Commitment Ritual HTML
  const isCommittedToday = (localStorage.getItem('lumen.brief.commitDate') || (state.settings && state.settings.briefCommitDate)) === today;
  const overdueTasks = (state.tasks || []).filter(t => t.status !== 'done' && t.due && t.due < today);
  const candidates = getBriefCandidates().filter(t => !overdueTasks.find(o => o.id === t.id)).slice(0, 6);
  const habitsToCommit = (state.habits || []).slice(0, 4);

  let briefCommitCardHTML = '';
  if (isCommittedToday) {
    const activeCount = todayTasks.length;
    briefCommitCardHTML = `
      <div class="card brief-commit collapsed brief-commit-collapsed">
        <div class="brief-commit-head" style="display:flex;justify-content:space-between;align-items:center;">
          <span>🎯 Daily Commitment Ritual — Committed</span>
          <a href="#schedule" class="link-btn" id="brief-goto-schedule">Go to timebox schedule →</a>
        </div>
        <div class="muted brief-commit-summary" style="font-size:13px;margin-top:6px;">
          Committed for today — ${activeCount} task${activeCount === 1 ? '' : 's'} active.
        </div>
      </div>
    `;
  } else {
    const overdueHTML = overdueTasks.map(t => `
      <div class="brief-commit-row overdue">
        <input type="checkbox" data-task-id="${t.id}" checked>
        <span class="t-title">${esc(t.title)}</span>
        <span class="due-chip">overdue</span>
      </div>
    `).join('');
    
    const candidateHTML = candidates.map(t => `
      <div class="brief-commit-row">
        <input type="checkbox" data-task-id="${t.id}" checked>
        <span class="t-title">${esc(t.title)}</span>
      </div>
    `).join('');

    const habitCommitHTML = habitsToCommit.map(h => `
      <div class="brief-commit-habit">
        <span>${h.emoji}</span>
        <span class="t-title">${esc(h.name)}</span>
      </div>
    `).join('');

    briefCommitCardHTML = `
      <div class="card brief-commit">
        <div class="brief-commit-head">🎯 Daily Commitment Ritual</div>
        <div class="muted" style="font-size:12.5px;margin-bottom:10px;">Review candidates and commit your plan for today.</div>
        <div class="brief-commit-grid">
          <div class="brief-commit-col">
            <div class="brief-commit-head">Overdue (${overdueTasks.length})</div>
            <div class="brief-commit-list">${overdueHTML || '<div class="muted" style="font-size:12px">None</div>'}</div>
          </div>
          <div class="brief-commit-col">
            <div class="brief-commit-head">Candidates (${candidates.length})</div>
            <div class="brief-commit-list">${candidateHTML || '<div class="muted" style="font-size:12px">None</div>'}</div>
          </div>
          <div class="brief-commit-col">
            <div class="brief-commit-head">Habits</div>
            <div class="brief-commit-list">${habitCommitHTML || '<div class="muted" style="font-size:12px">None</div>'}</div>
          </div>
        </div>
        <div class="brief-commit-foot">
          <button class="btn btn-accent" id="brief-commit-btn">Commit for today 🚀</button>
        </div>
      </div>
    `;
  }

  const atRisk = goalsAtRisk();
  const riskRows = atRisk.length
    ? atRisk.map(({ g, why, cls }) => `<div class="brief-risk ${cls}" data-goal="${g.id}" title="Open goals">
      <span class="risk-dot" style="background:${g.color}"></span>
      <span class="t-title">${esc(g.title)}</span>
      <span class="due-chip">${why}</span>
      <span class="goal-pct" style="color:${g.color}">${goalProgress(g)}%</span>
    </div>`).join('')
    : '<div class="empty-state"><div class="es-icon">🎯</div>No goals at risk right now.</div>';

  const pinned = state.notes.find(n => n.pinned) || [...state.notes].sort((a, b) => b.updatedAt - a.updatedAt)[0];
  const noteHTML = pinned
    ? `<div class="brief-note" data-open-note="${pinned.id}">
        <div class="brief-note-title">${pinned.audioId ? '🎙️ ' : '📝 '}${esc(pinned.title)}</div>
        <div class="muted brief-note-excerpt">${esc(stripMarkdown(pinned.content).slice(0, 160))}${pinned.content && pinned.content.length > 160 ? '…' : ''}</div>
        <div class="brief-note-foot">${pinned.pinned ? '📌 Pinned · ' : ''}${fmtWhen(pinned.updatedAt)}</div>
      </div>`
    : '<div class="empty-state"><div class="es-icon">📝</div>No notes yet — capture one.</div>';

  const summaryBits = [];
  if (todayTasks.length) summaryBits.push(`<b>${todayTasks.length}</b> task${todayTasks.length === 1 ? '' : 's'} today`);
  const toProtect = habitsTop.filter(h => !h.dates[today] && habitStreak(h) > 0).length;
  if (toProtect) summaryBits.push(`<b>${toProtect}</b> habit${toProtect === 1 ? '' : 's'} to protect`);
  if (atRisk.length) summaryBits.push(`<b class="brief-sum-risk">${atRisk.length}</b> goal${atRisk.length === 1 ? '' : 's'} at risk`);
  const summaryLine = summaryBits.length
    ? summaryBits.join(' · ')
    : 'Everything looks clear — a day to bank momentum. ✨';
  const missing = [];
  if (!state.tasks.length) missing.push('task');
  if (!state.goals.length) missing.push('goal');
  if (!state.habits.length) missing.push('habit');
  if (!state.notes.length) missing.push('note');
  const stepsDone = TOUR_STEPS.length - missing.length;
  const tourSkipped = !!state.settings.tourSkipped;
  let tourCard = '';
  if (!tourSkipped) {
    if (missing.length) {
      tourWasSeen = true;
      if (tourLastMissing !== null && tourLastMissing > missing.length) {
        toast(stepsDone === TOUR_STEPS.length - 1 ? `🎉 Step ${stepsDone} of 4 done — one more to go!` : `🎉 Step ${stepsDone} of 4 done — next: ${TOUR_STEPS[stepsDone].title}`);
      }
      tourLastMissing = missing.length;
      const cur = TOUR_STEPS[TOUR_STEPS.length - missing.length];
      const check = TOUR_STEPS.map((s, i) => {
        const done = i < stepsDone;
        return `<div class="brief-tour-check ${done ? 'done' : ''} ${s.type === cur.type ? 'cur' : ''}">${done ? '✓' : '○'}<span>${s.icon} ${s.title}</span></div>`;
      }).join('');
      tourCard = `<div class="card brief-tour">
        <div class="brief-tour-head">
          <div>
            <h3 class="card-title" style="margin-bottom:5px">🚀 Set up your space</h3>
            <div class="muted" style="font-size:12.5px">Four quick steps to a working command center.</div>
          </div>
          <span class="brief-tour-progress">Step ${stepsDone + 1} of 4</span>
        </div>
        <div class="brief-tour-step">
          <div class="brief-tour-step-icon">${cur.icon}</div>
          <div class="brief-tour-step-body">
            <div class="brief-tour-step-title">${cur.title}</div>
            <div class="muted brief-tour-step-desc">${cur.desc}</div>
          </div>
          <button class="btn btn-accent brief-tour-cta" data-tour-go="${cur.type}">${cur.cta}</button>
        </div>
        <div class="brief-tour-steps">${check}</div>
        <button class="link-btn brief-tour-skip" data-tour-skip>Skip tour</button>
      </div>`;
    } else if (tourWasSeen && !state.settings.tourDone) {
      state.settings.tourDone = true; save(); tourWasSeen = false;
      confetti(4);
      toast('🎉 You\'re all set — your Lumen space is ready!');
      tourCard = `<div class="card brief-tour done">
        <div class="brief-tour-celebrate">🎉</div>
        <h3 class="card-title" style="margin-bottom:6px">You're all set!</h3>
        <div class="muted" style="font-size:13px">Your command center is ready. Here are a few places to explore:</div>
        <div class="brief-tour-links">
          <a class="link-btn" href="#tasks">Open the board →</a>
          <a class="link-btn" href="#goals">Review goals →</a>
          <a class="link-btn" href="#habits">Plan habits →</a>
          <a class="link-btn" href="#review">Weekly review →</a>
        </div>
      </div>`;
    }
  }

  viewRoot().innerHTML = `
    <div class="card brief-banner">
      <div class="brief-banner-glow"></div>
      <div class="brief-banner-main">
        <div class="brief-greet">${greet} 👋</div>
        <div class="brief-date">${dateLine}</div>
        <div class="brief-summary">${summaryLine}</div>
      </div>
      <div class="brief-stamp">${ic('sparkles', 40)}</div>
    </div>
    <div class="brief-ai-card" id="brief-ai-section">
      <div class="brief-ai-head">
        <span class="brief-ai-title">✨ AI Daily Focus</span>
        <button class="btn btn-sm btn-ai" id="brief-ai-generate">✨ Generate Focus</button>
      </div>
      <div class="brief-ai-text" id="brief-ai-content">
        ${state.settings.aiDailyFocus ? esc(state.settings.aiDailyFocus) : 'Tap "Generate Focus" for an AI strategic morning digest of today’s priorities, risks, and habits.'}
      </div>
    </div>
    ${briefCommitCardHTML}
    ${tourCard}
    ${tourSkipped && stepsDone === 0 ? `<div class="card brief-start">
      <h3 class="card-title"><span>🚀 Start here</span></h3>
      <div class="brief-start-grid">
        <button class="brief-start-btn" data-start="task">➕ First task</button>
        <button class="brief-start-btn" data-start="goal">🎯 First goal</button>
        <button class="brief-start-btn" data-start="habit">🌱 First habit</button>
        <button class="brief-start-btn" data-start="note">📝 First note</button>
      </div>
    </div>` : ''}
    <div class="dash-grid">
      <div class="dash-stack">
        <div class="card">
          <h3 class="card-title"><span>☀️ Today's tasks</span><a class="link-btn" href="#tasks">Open board →</a></h3>
          ${taskRows}
        </div>
        <div class="card">
          <h3 class="card-title"><span>🔥 Habits to protect</span><a class="link-btn" href="#habits">All habits →</a></h3>
          <div class="brief-habits">${habitRows}</div>
        </div>
      </div>
      <div class="dash-stack">
        <div class="card">
          <h3 class="card-title"><span>⚠️ Goals at risk</span><a class="link-btn" href="#goals">All goals →</a></h3>
          ${riskRows}
        </div>
        <div class="card">
          <h3 class="card-title"><span>📌 Pinned note</span><a class="link-btn" href="#notes">All notes →</a></h3>
          ${noteHTML}
        </div>
      </div>
    </div>`;

  // Commitment Ritual listener
  const commitBtn = $('#brief-commit-btn');
  if (commitBtn) {
    commitBtn.addEventListener('click', () => {
      const now = Date.now();
      const checkedIds = [...$$('.brief-commit-grid input[data-task-id]:checked')].map(cb => cb.dataset.taskId);
      const toCommit = checkedIds.length ? checkedIds : candidates.map(t => t.id);

      state.tasks.forEach(t => {
        if (toCommit.includes(t.id)) {
          t.status = 'today';
          t.updatedAt = now;
        }
      });
      try { localStorage.setItem('lumen.brief.commitDate', today); } catch(_) {}
      if (!state.settings) state.settings = {};
      state.settings.briefCommitDate = today;
      save(); flushSave();

      renderBrief();
      toast('Committed for today 🚀');
    });
  }

  // AI Daily Focus generator
  const aiBriefBtn = $('#brief-ai-generate');
  if (aiBriefBtn) {
    aiBriefBtn.addEventListener('click', async () => {
      if (!state.settings.geminiApiKey) {
        toast('Set your Gemini API key in Settings → AI Assistant 🤖', 'error');
        return;
      }
      aiBriefBtn.disabled = true;
      aiBriefBtn.textContent = '✨ Synthesizing…';
      const contentEl = $('#brief-ai-content');
      if (contentEl) contentEl.classList.add('ai-shimmer');
      try {
        const taskTitles = todayTasks.map(t => t.title).slice(0, 5).join(', ') || 'No tasks due today';
        const habitNames = habitsTop.map(h => h.name).slice(0, 4).join(', ') || 'No habits set';
        const riskTitles = atRisk.map(r => r.g.title).slice(0, 3).join(', ') || 'No goals at risk';
        const prompt = `You are an elite productivity strategist. Give the user a motivating, ultra-concise 2-sentence morning briefing and game plan for today. Context: Tasks due: [${taskTitles}]. Habits to protect: [${habitNames}]. Goals needing attention: [${riskTitles}]. Return ONLY the 2 sentences.`;
        const res = await callGemini(prompt, 'You are an executive coach. Output exactly two motivating, strategic sentences.');
        state.settings.aiDailyFocus = res;
        save();
        if (contentEl) {
          contentEl.textContent = res;
          contentEl.classList.remove('ai-shimmer');
        }
        toast('✨ Daily focus updated!', 'success');
      } catch (err) {
        if (contentEl) contentEl.classList.remove('ai-shimmer');
        toast(`AI Error: ${err.message}`, 'error');
      } finally {
        aiBriefBtn.disabled = false;
        aiBriefBtn.textContent = '✨ Refresh Focus';
      }
    });
  }

  // tour actions — modals open in place so the Brief advances on save
  $$('[data-tour-go]').forEach(b => b.addEventListener('click', () => {
    const kind = b.dataset.tourGo;
    if (kind === 'task') openTaskModal();
    else if (kind === 'goal') openGoalModal();
    else if (kind === 'habit') openHabitModal();
    else if (kind === 'note') { location.hash = '#notes'; newNote(); }
  }));
  $$('[data-tour-skip]').forEach(b => b.addEventListener('click', () => {
    state.settings.tourSkipped = true; save(); renderBrief();
    toast('Tour skipped — start anywhere from the views');
  }));
  // plain quick actions (shown after skipping with an empty space)
  $$('[data-start]').forEach(b => b.addEventListener('click', () => {
    const kind = b.dataset.start;
    if (kind === 'task') { location.hash = '#tasks'; openTaskModal(); }
    else if (kind === 'goal') { location.hash = '#goals'; openGoalModal(); }
    else if (kind === 'habit') { location.hash = '#habits'; openHabitModal(); }
    else if (kind === 'note') { location.hash = '#notes'; newNote(); }
  }));
  // quick complete a task
  $$('[data-complete]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    const t = state.tasks.find(x => x.id === b.dataset.complete);
    if (!t) return;
    captureUndo('Complete task');
    const { wasDone, kr } = toggleTaskDone(t);
    save(); renderBrief();
    if (kr) goalProgressToast(t, wasDone, kr);
  }));
  // edit a task
  $$('.dash-task[data-id]').forEach(el => el.addEventListener('click', e => {
    if (e.target.closest('[data-complete]')) return;
    const t = state.tasks.find(x => x.id === el.dataset.id);
    if (t) openTaskModal(t);
  }));
  // habit check-in
  $$('.brief-habit[data-habit]').forEach(row => row.addEventListener('click', () => {
    const h = state.habits.find(x => x.id === row.dataset.habit);
    if (!h) return;
    toggleHabitDate(h, today);
    renderBrief();
  }));
  // goals at risk → goals
  $$('.brief-risk[data-goal]').forEach(el => el.addEventListener('click', () => { location.hash = '#goals'; }));
  dashListVirt.sync();
  // pinned note → open it
  $$('[data-open-note]').forEach(el => el.addEventListener('click', () => {
    selectedNoteId = el.dataset.openNote;
    location.hash = '#notes';
  }));
}

/* ============ Projects (standalone view) ============ */
let projViewMode = 'grid';

function renderProjects() {
  const projects = state.projects || [];
  const built = projects.filter(p => p.status === 'built');
  const building = projects.filter(p => p.status === 'building');
  const planned = projects.filter(p => p.status === 'planned');

  const langMap = {};
  projects.forEach(p => { if (p.lang) langMap[p.lang] = (langMap[p.lang] || 0) + 1; });
  const topLangs = Object.entries(langMap).sort((a, b) => b[1] - a[1]);

  function linkedTasks(p) {
    return (state.tasks || []).filter(t => t.projectId === p.id);
  }
  function projectProgress(p) {
    const tasks = linkedTasks(p);
    if (!tasks.length) return null;
    const done = tasks.filter(t => t.status === 'done').length;
    return Math.round((done / tasks.length) * 100);
  }

  const statsHTML = `<div class="proj-stats">
    <div class="proj-stat"><div class="proj-stat-val">${projects.length}</div><div class="proj-stat-lbl">Total</div></div>
    <div class="proj-stat proj-stat-built"><div class="proj-stat-val">${built.length}</div><div class="proj-stat-lbl">✅ Built</div></div>
    <div class="proj-stat proj-stat-building"><div class="proj-stat-val">${building.length}</div><div class="proj-stat-lbl">🔨 Building</div></div>
    <div class="proj-stat proj-stat-planned"><div class="proj-stat-val">${planned.length}</div><div class="proj-stat-lbl">💡 Planned</div></div>
    ${topLangs.length ? `<div class="proj-stat proj-stat-lang"><div class="proj-stat-val">${topLangs.map(([l, n]) => `<span class="proj-lang-dot" style="background:${langColor(l)}" title="${l}: ${n}"></span>`).join('')}</div><div class="proj-stat-lbl">Languages</div></div>` : ''}
  </div>`;

  const filterHTML = `<div class="proj-filter">
    <input class="input proj-search" id="proj-search" placeholder="🔍 Search projects…" style="font-size:13px;padding:7px 12px;">
    <select class="input" id="proj-lang-filter" style="font-size:13px;padding:7px 10px;width:auto;">
      <option value="">All languages</option>
      ${Object.keys(langMap).sort().map(l => `<option value="${l}">${l} (${langMap[l]})</option>`).join('')}
    </select>
    <select class="input" id="proj-status-filter" style="font-size:13px;padding:7px 10px;width:auto;">
      <option value="">All statuses</option>
      <option value="building">🔨 Building</option>
      <option value="built">✅ Built</option>
      <option value="planned">💡 Planned</option>
    </select>
  </div>`;

  const roadmapHTML = `<div class="proj-roadmap-wrap">
    <div class="proj-roadmap-grid">
      <div class="proj-roadmap-header">
        <span style="width:160px;flex-shrink:0;font-size:11px;font-weight:700;color:var(--muted)">PROJECT</span>
        <span class="proj-roadmap-col-head">PROGRESS / BURN-DOWN</span>
        <span style="width:90px;flex-shrink:0;font-size:11px;font-weight:700;color:var(--muted);text-align:right">STATUS</span>
      </div>
      ${projects.map(p => {
        const progress = projectProgress(p) ?? 0;
        const color = p.status === 'built' ? '#34d399' : p.status === 'building' ? 'var(--accent)' : '#f59e0b';
        const tasks = linkedTasks(p);
        const milestoneCount = (p.milestones || []).length;
        const milestonesDone = (p.milestones || []).filter(m => m.done).length;
        return `<div class="proj-roadmap-row" data-proj-id="${p.id}">
          <div class="proj-roadmap-title" title="${esc(p.name)}">
            ${p.status === 'built' ? '✅' : p.status === 'building' ? '🔨' : '💡'} <b>${esc(p.name)}</b>
          </div>
          <div class="proj-roadmap-bar-wrap">
            <div class="proj-roadmap-bar" style="width:${Math.max(8, progress)}%;background:${color}">
              ${progress}% ${tasks.length ? `(${tasks.filter(t=>t.status==='done').length}/${tasks.length} tasks)` : ''}
            </div>
            ${milestoneCount ? `<span style="position:absolute;right:8px;font-size:11px;color:var(--muted)">🏁 ${milestonesDone}/${milestoneCount} milestones</span>` : ''}
          </div>
          <span class="badge ${p.status === 'built' ? 'proj-st-built' : p.status === 'building' ? 'proj-st-building' : 'proj-st-planned'}" style="width:80px;text-align:center">${p.status}</span>
        </div>`;
      }).join('')}
    </div>
  </div>`;

  function projectCard(p) {
    const langBadge = p.lang ? `<span class="proj-lang" style="background:${langColor(p.lang)}22;color:${langColor(p.lang)};border:1px solid ${langColor(p.lang)}44">${esc(p.lang)}</span>` : '';
    const tasks = linkedTasks(p);
    const progress = projectProgress(p);
    const taskInfo = tasks.length ? `<span class="proj-task-count">📋 ${tasks.length} task${tasks.length!==1?'s':''}</span>` : '';
    const progressHTML = progress !== null ? `<div class="proj-progress"><div class="proj-progress-bar" style="width:${progress}%"></div><span class="proj-progress-pct">${progress}%</span></div>` : '';
    const milestoneCount = (p.milestones || []).length;
    const milestonesDone = (p.milestones || []).filter(m => m.done).length;
    const milestoneInfo = milestoneCount ? `<span class="proj-milestone-count">🏁 ${milestonesDone}/${milestoneCount}</span>` : '';
    const age = p.createdAt ? timeAgo(p.createdAt) : '';
    const statusMap = { built: { icon: '✅', cls: 'proj-st-built', label: 'Built' }, building: { icon: '🔨', cls: 'proj-st-building', label: 'Building' }, planned: { icon: '💡', cls: 'proj-st-planned', label: 'Planned' } };
    const st = statusMap[p.status] || statusMap.building;
    return `<div class="proj-card" data-proj-id="${p.id}">
      <div class="proj-card-head">
        <span class="proj-status-badge ${st.cls}" data-proj-cycle="${p.id}" title="Click to change status">${st.icon}</span>
        <span class="proj-card-name">${esc(p.name)}</span>
        ${langBadge}
        <div class="proj-card-actions">
          <button class="btn btn-xs btn-ghost" data-proj-edit="${p.id}" title="Edit">✏️</button>
          <button class="btn btn-xs btn-ghost btn-danger" data-proj-del="${p.id}" title="Delete">🗑️</button>
        </div>
      </div>
      ${p.desc ? `<div class="proj-card-desc">${esc(p.desc)}</div>` : ''}
      <div class="proj-card-meta">
        ${taskInfo}
        ${milestoneInfo}
        ${p.link ? `<a class="proj-link" href="${esc(p.link)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">↗ Link</a>` : ''}
        ${age ? `<span class="proj-age">🕐 ${age}</span>` : ''}
      </div>
      ${progressHTML}
      ${fileTrackerHTML(p)}
      ${p.notes ? `<div class="proj-card-notes">📝 ${esc(p.notes)}</div>` : ''}
    </div>`;
  }

  function sectionHTML(title, icon, list, emptyMsg, stKey) {
    return `<div class="proj-section" data-proj-section="${stKey}">
      <div class="proj-section-title">${icon} ${title} <span class="proj-count">${list.length}</span></div>
      <div class="proj-section-body proj-cards-grid">${list.length ? list.map(p => projectCard(p)).join('') : `<div class="proj-empty">${emptyMsg}</div>`}</div>
    </div>`;
  }

  const cardsViewHTML = `
    ${sectionHTML('Building', '🔨', building, 'Nothing in progress — click + to add', 'building')}
    ${sectionHTML('Built', '✅', built, 'No finished projects yet', 'built')}
    ${sectionHTML('Want to Build', '💡', planned, 'No ideas yet — start dreaming!', 'planned')}
    ${!projects.length ? `<div class="empty-state"><div class="es-icon">🚀</div>No projects yet. Click Add project to get started!<br><br><button class="btn btn-accent" id="proj-add-btn-empty">${ic('plus', 14)} Add project</button></div>` : ''}
  `;

  viewRoot().innerHTML = `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px">
        <h3 class="card-title" style="margin:0"><span>🚀 My Projects</span></h3>
        <div style="display:flex;gap:6px;align-items:center">
          <div class="theme-btns" style="display:inline-flex">
            <button class="btn btn-sm ${projViewMode === 'grid' ? 'active' : ''}" id="proj-view-grid">📇 Cards</button>
            <button class="btn btn-sm ${projViewMode === 'roadmap' ? 'active' : ''}" id="proj-view-roadmap">📅 Roadmap</button>
          </div>
          <button class="btn btn-sm btn-ghost" id="proj-export-btn" title="Export as CSV">📥 CSV</button>
          <button class="btn btn-sm btn-accent" id="proj-add-btn">${ic('plus', 14)} Add project</button>
        </div>
      </div>
      ${projects.length ? statsHTML : ''}
      ${projects.length > 2 && projViewMode === 'grid' ? filterHTML : ''}
      ${projViewMode === 'roadmap' ? roadmapHTML : cardsViewHTML}
    </div>`;

  // Bind View Mode
  $('#proj-view-grid')?.addEventListener('click', () => { projViewMode = 'grid'; renderProjects(); });
  $('#proj-view-roadmap')?.addEventListener('click', () => { projViewMode = 'roadmap'; renderProjects(); });

  // Bind events
  $$('#proj-add-btn, #proj-add-btn-empty').forEach(b => b.addEventListener('click', () => openProjectModal(null)));
  $$('[data-proj-edit]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    const proj = (state.projects || []).find(x => x.id === b.dataset.projEdit);
    if (proj) openProjectModal(proj, proj.id);
  }));
  $$('[data-proj-del]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    if (!confirm('Delete this project?')) return;
    const pi = state.projects.findIndex(x => x.id === b.dataset.projDel);
    if (pi >= 0) state.projects.splice(pi, 1);
    save(); renderProjects(); toast('Project deleted');
  }));
  $$('.proj-card[data-proj-id]').forEach(row => row.addEventListener('click', e => {
    if (e.target.closest('button, a, input')) return;
    const proj = (state.projects || []).find(x => x.id === row.dataset.projId);
    if (proj) openProjectModal(proj, proj.id);
  }));
  $$('[data-proj-cycle]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    const proj = (state.projects || []).find(x => x.id === b.dataset.projCycle);
    if (!proj) return;
    const cycle = ['building', 'built', 'planned'];
    proj.status = cycle[(cycle.indexOf(proj.status) + 1) % cycle.length];
    proj.updatedAt = Date.now();
    save(); renderProjects();
  }));
  // File tracker rescan buttons
  $$('.ft-rescan').forEach(b => b.addEventListener('click', async (e) => {
    e.stopPropagation();
    const proj = (state.projects || []).find(x => x.id === b.dataset.projRescan);
    if (proj) { try { await rescanProjectFolder(proj); renderProjects(); } catch(err) { console.error('Rescan failed:', err); } }
  }));
  // Export
  const exportBtn = $('#proj-export-btn');
  if (exportBtn) exportBtn.addEventListener('click', () => {
    if (!projects.length) { toast('No projects to export'); return; }
    const header = 'Name,Description,Language,Link,Status,Notes,Milestones,Created,Updated';
    const rows = projects.map(p => {
      const msDone = (p.milestones || []).filter(m => m.done).length;
      const msTotal = (p.milestones || []).length;
      return [csvEsc(p.name), csvEsc(p.desc||''), csvEsc(p.lang||''), csvEsc(p.link||''), p.status, csvEsc(p.notes||''), msDone+'/'+msTotal, p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-CA') : '', p.updatedAt ? new Date(p.updatedAt).toLocaleDateString('en-CA') : ''].join(',');
    }).join('\n');
    const blob = new Blob([header+'\n'+rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'projects-'+todayISO()+'.csv'; a.click();
    URL.revokeObjectURL(url); toast('📥 Exported '+projects.length+' projects');
  });
  // Search/filter
  function filterProjects() {
    const q = ($('#proj-search') || {}).value?.toLowerCase() || '';
    const lang = ($('#proj-lang-filter') || {}).value || '';
    const status = ($('#proj-status-filter') || {}).value || '';
    $$('.proj-card[data-proj-id]').forEach(row => {
      const proj = (state.projects || []).find(x => x.id === row.dataset.projId);
      if (!proj) return;
      const matchQ = !q || proj.name.toLowerCase().includes(q) || (proj.desc||'').toLowerCase().includes(q);
      const matchLang = !lang || proj.lang === lang;
      const matchStatus = !status || proj.status === status;
      row.style.display = (matchQ && matchLang && matchStatus) ? '' : 'none';
    });
    $$('.proj-section').forEach(sec => {
      const visible = sec.querySelectorAll('.proj-card[data-proj-id]:not([style*="display: none"])').length;
      const countEl = sec.querySelector('.proj-count');
      if (countEl) countEl.textContent = visible;
    });
  }
  const ps = $('#proj-search'); if (ps) ps.addEventListener('input', filterProjects);
  const pl = $('#proj-lang-filter'); if (pl) pl.addEventListener('change', filterProjects);
  const pf = $('#proj-status-filter'); if (pf) pf.addEventListener('change', filterProjects);
  updateNavBadges();
}

/* ============ Projects (dashboard) ============ */
function projectsDashboardHTML() {
  const projects = state.projects || [];
  if (!projects.length) {
    return `<div class="proj-section" data-proj-section="building"><div class="proj-section-title">🔨 Building <span class="proj-count">0</span></div><div class="proj-section-body"><div class="proj-empty">Nothing in progress — click + to add</div></div></div>
      <div class="proj-section" data-proj-section="built"><div class="proj-section-title">✅ Built <span class="proj-count">0</span></div><div class="proj-section-body"><div class="proj-empty">No finished projects yet</div></div></div>
      <div class="proj-section" data-proj-section="planned"><div class="proj-section-title">💡 Want to Build <span class="proj-count">0</span></div><div class="proj-section-body"><div class="proj-empty">No ideas yet — start dreaming!</div></div></div>`;
  }
  const built = projects.filter(p => p.status === 'built');
  const building = projects.filter(p => p.status === 'building');
  const planned = projects.filter(p => p.status === 'planned');

  // Language breakdown
  const langMap = {};
  projects.forEach(p => { if (p.lang) langMap[p.lang] = (langMap[p.lang] || 0) + 1; });
  const topLangs = Object.entries(langMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Stats bar
  const statsHTML = `<div class="proj-stats">
    <div class="proj-stat"><div class="proj-stat-val">${projects.length}</div><div class="proj-stat-lbl">Total</div></div>
    <div class="proj-stat proj-stat-built"><div class="proj-stat-val">${built.length}</div><div class="proj-stat-lbl">✅ Built</div></div>
    <div class="proj-stat proj-stat-building"><div class="proj-stat-val">${building.length}</div><div class="proj-stat-lbl">🔨 Building</div></div>
    <div class="proj-stat proj-stat-planned"><div class="proj-stat-val">${planned.length}</div><div class="proj-stat-lbl">💡 Planned</div></div>
    ${topLangs.length ? `<div class="proj-stat proj-stat-lang"><div class="proj-stat-val">${topLangs.map(([l, n]) => `<span class="proj-lang-dot" style="background:${langColor(l)}" title="${l}: ${n}"></span>`).join('')}</div><div class="proj-stat-lbl">Languages</div></div>` : ''}
  </div>`;

  // Filter bar
  const filterHTML = `<div class="proj-filter">
    <input class="input proj-search" id="proj-search" placeholder="🔍 Search projects…" style="font-size:12px;padding:5px 10px;">
    <select class="input" id="proj-lang-filter" style="font-size:12px;padding:5px 8px;width:auto;">
      <option value="">All languages</option>
      ${Object.keys(langMap).sort().map(l => `<option value="${l}">${l} (${langMap[l]})</option>`).join('')}
    </select>
  </div>`;

  // Pre-aggregate linked tasks in single O(N) pass
  const allTasks = state.tasks || [];
  const projTaskCounts = new Map();
  for (let i = 0; i < allTasks.length; i++) {
    const t = allTasks[i];
    if (t.projectId) {
      let c = projTaskCounts.get(t.projectId);
      if (!c) { c = { total: 0, done: 0 }; projTaskCounts.set(t.projectId, c); }
      c.total++;
      if (t.status === 'done') c.done++;
    }
  }

  function projectRow(p) {
    const langBadge = p.lang ? `<span class="proj-lang" style="background:${langColor(p.lang)}22;color:${langColor(p.lang)};border:1px solid ${langColor(p.lang)}44">${esc(p.lang)}</span>` : '';
    const stats = projTaskCounts.get(p.id);
    const taskCount = stats ? stats.total : 0;
    const taskDone = stats ? stats.done : 0;
    const progress = taskCount ? Math.round((taskDone / taskCount) * 100) : null;
    const taskInfo = taskCount ? `<span class="proj-task-count" title="${taskDone} done of ${taskCount}">📋 ${taskCount} task${taskCount!==1?'s':''}</span>` : '';
    const progressHTML = progress !== null ? `<div class="proj-progress"><div class="proj-progress-bar" style="width:${progress}%"></div><span class="proj-progress-pct">${progress}%</span></div>` : '';
    const milestoneCount = (p.milestones || []).length;
    const milestonesDone = (p.milestones || []).filter(m => m.done).length;
    const milestoneInfo = milestoneCount ? `<span class="proj-milestone-count">🏁 ${milestonesDone}/${milestoneCount}</span>` : '';
    const age = p.createdAt ? timeAgo(p.createdAt) : '';
    const statusMap = { built: { icon: '✅', cls: 'proj-st-built' }, building: { icon: '🔨', cls: 'proj-st-building' }, planned: { icon: '💡', cls: 'proj-st-planned' } };
    const st = statusMap[p.status] || statusMap.building;
    return `<div class="proj-row" data-proj-id="${p.id}" draggable="true">
      <div class="proj-row-top">
        <span class="proj-drag-handle" title="Drag to reorder">⠿</span>
        <span class="proj-status-badge ${st.cls}" data-proj-cycle="${p.id}" title="Click to change status">${st.icon}</span>
        <span class="proj-name">${esc(p.name)}</span>
        ${langBadge}
        ${taskInfo}
        ${milestoneInfo}
        ${p.link ? `<a class="proj-link" href="${esc(p.link)}" target="_blank" rel="noopener" title="Open project" onclick="event.stopPropagation()">↗</a>` : ''}
        <div class="proj-actions">
          <button class="btn btn-xs btn-ghost" data-proj-edit="${p.id}" title="Edit">✏️</button>
          <button class="btn btn-xs btn-ghost btn-danger" data-proj-del="${p.id}" title="Delete">🗑️</button>
        </div>
      </div>
      ${p.desc ? `<div class="proj-desc">${esc(p.desc)}</div>` : ''}
      ${progressHTML}
      ${p.notes ? `<div class="proj-notes-preview">📝 ${esc(p.notes).slice(0, 80)}${p.notes.length > 80 ? '…' : ''}</div>` : ''}
      <div class="proj-meta">
        ${age ? `<span class="proj-age">🕐 ${age}</span>` : ''}
      </div>
    </div>`;
  }

  function sectionHTML(title, icon, list, emptyMsg, stKey) {
    return `<div class="proj-section" data-proj-section="${stKey}">
      <div class="proj-section-title">${icon} ${title} <span class="proj-count">${list.length}</span></div>
      <div class="proj-section-body">${list.length ? list.map(p => projectRow(p)).join('') : `<div class="proj-empty">${emptyMsg}</div>`}</div>
    </div>`;
  }

  return `${statsHTML}
    ${projects.length > 3 ? filterHTML : ''}
    ${sectionHTML('Building', '🔨', building, 'Nothing in progress — click + to add', 'building')}
    ${sectionHTML('Built', '✅', built, 'No finished projects yet', 'built')}
    ${sectionHTML('Want to Build', '💡', planned, 'No ideas yet — start dreaming!', 'planned')}`;
}

function teachingDashboardHTML() {
  const students = getStudentsList();
  const activeHw = (state.assignments || []).filter(a => a.status === 'assigned' || a.status === 'submitted');
  const plannedLessons = (state.lessonPlans || []).filter(p => p.status === 'planned');
  const studentRows = students.map(s => {
    const sInc = (state.income || []).filter(i => i.studentId ? i.studentId === s.id : i.student === s.name);
    const totalPaid = sInc.reduce((sum, i) => sum + (i.amount || 0), 0);
    const linkedGoal = (state.goals || []).find(g => g.studentId === s.id || (g.linkedStudentIds && g.linkedStudentIds.includes(s.id)) || (g.keyResults||[]).some(kr => kr.title.toLowerCase().includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(kr.title.toLowerCase())));
    const goalTitle = linkedGoal ? linkedGoal.title : '';
    const formattedPaid = totalPaid ? `${s.currency === 'USD' ? '$' : '₺'}${totalPaid.toLocaleString()}` : '';
    return `<div class="dash-student-row" data-student="${s.id}">
      <span class="t-title">${esc(s.name)}</span>
      ${goalTitle ? `<span class="link-chip">🎯 ${esc(goalTitle)}</span>` : ''}
      ${formattedPaid ? `<span class="muted">${formattedPaid}</span>` : ''}
    </div>`;
  }).join('');
  return `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(70px,1fr));gap:8px;margin-bottom:12px">
      <div style="background:var(--surface2);padding:8px 6px;border-radius:8px;text-align:center">
        <div style="font-size:17px;font-weight:700;color:var(--accent)">${students.length}</div>
        <div class="muted" style="font-size:10.5px">Students</div>
      </div>
      <div style="background:var(--surface2);padding:8px 6px;border-radius:8px;text-align:center">
        <div style="font-size:17px;font-weight:700;color:#34d399">${(state.attendance || []).length}</div>
        <div class="muted" style="font-size:10.5px">Sessions</div>
      </div>
      <div style="background:var(--surface2);padding:8px 6px;border-radius:8px;text-align:center">
        <div style="font-size:17px;font-weight:700;color:#518DBF">${activeHw.length}</div>
        <div class="muted" style="font-size:10.5px">Active HW</div>
      </div>
      <div style="background:var(--surface2);padding:8px 6px;border-radius:8px;text-align:center">
        <div style="font-size:17px;font-weight:700;color:#f59e0b">${plannedLessons.length}</div>
        <div class="muted" style="font-size:10.5px">Plans</div>
      </div>
    </div>
    ${studentRows ? `<div class="dash-student-list" style="margin-bottom:12px;display:flex;flex-direction:column;gap:6px">${studentRows}</div>` : ''}
    <div style="display:flex;gap:6px">
      <button class="btn btn-sm btn-accent" style="flex:1" id="dash-mark-att">📅 Attendance</button>
      <button class="btn btn-sm btn-ghost" style="flex:1" id="dash-assign-hw">📋 Assign HW</button>
    </div>`;
}

function langColor(lang) {
  const map = {
    'JavaScript': '#f0db4f', 'TypeScript': '#3178c6', 'Python': '#3776ab', 'Rust': '#dea584',
    'Go': '#00add8', 'Java': '#b07219', 'C++': '#f34b7d', 'C#': '#178600',
    'Ruby': '#cc342d', 'PHP': '#4f5d95', 'Swift': '#f05138', 'Kotlin': '#a97bff',
    'HTML': '#e34c26', 'CSS': '#563d7c', 'React': '#61dafb', 'Vue': '#42b883',
    'Svelte': '#ff3e00', 'Next.js': '#000', 'Node.js': '#3c873a', 'Flutter': '#02569b',
    'SQL': '#e38c00', 'Shell': '#89e051'
  };
  return map[lang] || '#888';
}

function openProjectModal(project, projId) {
  const isNew = project == null;
  const p = project || { id: uid(), name: '', desc: '', lang: '', link: '', status: 'building', milestones: [], notes: '', linkedTasks: [] };
  if (!p.id) p.id = uid();
  if (!p.milestones) p.milestones = [];
  if (!p.linkedTasks) p.linkedTasks = [];
  const statuses = [
    { val: 'built', label: '✅ Built', icon: '✅' },
    { val: 'building', label: '🔨 Building', icon: '🔨' },
    { val: 'planned', label: '💡 Want to Build', icon: '💡' }
  ];
  const langOptions = ['', 'JavaScript', 'TypeScript', 'Python', 'Rust', 'Go', 'Java', 'C++', 'C#', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'HTML', 'CSS', 'React', 'Vue', 'Svelte', 'Next.js', 'Node.js', 'Flutter', 'SQL', 'Shell'];

  // Milestones HTML
  const milestonesHTML = (p.milestones || []).map((m, i) => `<div class="proj-milestone-row">
    <label class="proj-milestone-check"><input type="checkbox" class="proj-ms-check" data-ms="${i}" ${m.done ? 'checked' : ''}> ${m.done ? '✅' : '⬜'}</label>
    <input class="input proj-ms-input" data-ms-name="${i}" value="${esc(m.name)}" placeholder="Milestone name">
    <button class="btn btn-xs btn-ghost btn-danger" data-ms-del="${i}" title="Remove">✕</button>
  </div>`).join('') || '<div class="muted" style="font-size:12px">No milestones yet.</div>';

  // Linked tasks
  const allTasks = (state.tasks || []).filter(t => t.status !== 'done');
  const linkedIds = new Set(p.linkedTasks || []);
  const taskCheckHTML = allTasks.slice(0, 20).map(t => `<label class="proj-task-link"><input type="checkbox" class="proj-tl-check" value="${t.id}" ${linkedIds.has(t.id) ? 'checked' : ''}> ${esc(t.title)}</label>`).join('') || '<div class="muted" style="font-size:12px">No active tasks to link.</div>';

  openModal(`
    <div class="modal" id="project-modal" style="max-width:540px">
      <div class="modal-head">
        <h3>${isNew ? 'New project' : 'Edit project'}</h3>
        <button class="btn-icon" data-close-modal>${ic('x', 16)}</button>
      </div>
      <div class="modal-body">
        <div class="field"><label class="field-label">Project name *</label><input class="input" id="proj-name" value="${esc(p.name)}" placeholder="e.g. Lumen"></div>
        <div class="field"><label class="field-label">Description</label><textarea class="input" id="proj-desc" rows="2" placeholder="What does it do?">${esc(p.desc || '')}</textarea></div>
        <div style="display:flex;gap:10px">
          <div class="field" style="flex:1"><label class="field-label">Language / Tech</label><select class="input" id="proj-lang">${langOptions.map(l => `<option value="${l}" ${l === p.lang ? 'selected' : ''}>${l || '— Select —'}</option>`).join('')}</select></div>
          <div class="field" style="flex:1"><label class="field-label">Link</label><input class="input" id="proj-link" value="${esc(p.link || '')}" placeholder="https://github.com/..."></div>
        </div>
        <div class="field"><label class="field-label">Status</label><div class="radio-group" id="proj-status">${statuses.map(s => `<label class="radio-chip ${s.val === p.status ? 'on' : ''}"><input type="radio" name="proj-st" value="${s.val}" ${s.val === p.status ? 'checked' : ''} hidden>${s.icon} ${s.label.replace(/^[^ ]+ /, '')}</label>`).join('')}</div></div>
        <div class="field"><label class="field-label">📝 Notes</label><textarea class="input" id="proj-notes" rows="2" placeholder="Quick notes about this project…">${esc(p.notes || '')}</textarea></div>
        <div class="field"><label class="field-label">🏁 Milestones</label><div id="proj-milestones">${milestonesHTML}</div><button class="btn btn-ghost btn-sm" id="proj-add-ms" style="margin-top:6px">${ic('plus', 13)} Add milestone</button></div>
        <div class="field"><label class="field-label">📋 Link tasks</label><div class="proj-task-list">${taskCheckHTML}</div></div>
        <div class="field"><label class="field-label">📁 Folder tracking</label><div class="proj-folder-section">
          ${p.fileTracker && p.fileTracker.folderName ? `<div class="ft-linked"><span class="ft-folder">📁 ${esc(p.fileTracker.folderName)}</span><span class="ft-count">${(p.fileTracker.lastSnapshot || []).length} files</span><button class="btn btn-xs btn-ghost" id="proj-rescan" title="Re-scan for changes">🔄 Rescan</button><button class="btn btn-xs btn-ghost btn-danger" id="proj-unlink" title="Remove folder link">✕</button></div>` : ''}
          <button class="btn btn-sm btn-ghost" id="proj-link-folder">${ic('folder', 14)} ${p.fileTracker && p.fileTracker.folderName ? 'Change folder' : 'Link folder'}</button>
          ${p.fileTracker && p.fileTracker.folderName ? `<div class="ft-modal-log">${fileChangeLogHTML(p)}</div>` : '<div class="muted" style="font-size:12px;margin-top:6px">Link a folder to track file changes over time</div>'}
        </div></div>
      </div>
      <div class="modal-foot">
        ${!isNew ? '<button class="btn btn-danger" id="proj-delete">Delete</button>' : ''}
        <div style="flex:1"></div>
        <button class="btn btn-ghost" data-close-modal>Cancel</button>
        <button class="btn btn-accent" id="proj-save">${isNew ? 'Add project' : 'Save'}</button>
      </div>
    </div>`);

  // radio chips
  $$('#proj-status .radio-chip').forEach(chip => chip.addEventListener('click', () => {
    $$('#proj-status .radio-chip').forEach(c => c.classList.remove('on'));
    chip.classList.add('on');
    chip.querySelector('input').checked = true;
  }));
  // Add milestone
  $('#proj-add-ms').addEventListener('click', () => {
    p.milestones.push({ name: '', done: false });
    openProjectModal(p, projId);
  });
  // Milestone checkbox
  $$('.proj-ms-check').forEach(cb => cb.addEventListener('change', () => {
    const i = parseInt(cb.dataset.ms, 10);
    p.milestones[i].done = cb.checked;
    openProjectModal(p, projId);
  }));
  // Milestone delete
  $$('[data-ms-del]').forEach(b => b.addEventListener('click', () => {
    p.milestones.splice(parseInt(b.dataset.msDel, 10), 1);
    openProjectModal(p, projId);
  }));
  // Milestone name input
  $$('.proj-ms-input').forEach(inp => inp.addEventListener('input', () => {
    p.milestones[parseInt(inp.dataset.msName, 10)].name = inp.value;
  }));
  // save
  $('#proj-save').addEventListener('click', () => {
    const name = $('#proj-name').value.trim();
    if (!name) { toast('Project name is required', 'error'); return; }
    // Collect linked tasks
    const linked = [];
    $$('.proj-tl-check:checked').forEach(cb => linked.push(cb.value));
    const stVal = ($('#project-modal input[name="proj-st"]:checked') || {}).value || 'building';
    const data = {
      name,
      desc: $('#proj-desc').value.trim(),
      lang: $('#proj-lang').value,
      link: $('#proj-link').value.trim(),
      status: stVal,
      notes: $('#proj-notes').value.trim(),
      milestones: p.milestones,
      linkedTasks: linked,
      updatedAt: Date.now()
    };
    if (!state.projects) state.projects = [];
    if (isNew) {
      data.id = p.id;
      data.createdAt = Date.now();
      state.projects.push(data);
      toast('🚀 Project added!');
    } else {
      const pi = state.projects.findIndex(x => x.id === p.id);
      if (pi >= 0) Object.assign(state.projects[pi], data);
      toast('✅ Project updated');
    }
    save(); closeModal();
    if (currentView() === 'projects') renderProjects(); else renderDashboard();
  });
  // delete
  const delBtn = $('#proj-delete');
  if (delBtn) delBtn.addEventListener('click', () => {
    if (!confirm('Delete this project?')) return;
    const pi = state.projects.findIndex(x => x.id === p.id);
    if (pi >= 0) state.projects.splice(pi, 1);
    save(); closeModal();
    if (currentView() === 'projects') renderProjects(); else renderDashboard();
    toast('Project deleted');
  });
  // Folder link
  const folderBtn = $('#proj-link-folder');
  if (folderBtn) folderBtn.addEventListener('click', async () => {
    try { await linkFolderToProject(p); openProjectModal(p, projId); } catch(e) { console.error('Link folder failed:', e); }
  });
  // Folder rescan
  const rescanBtn = $('#proj-rescan');
  if (rescanBtn) rescanBtn.addEventListener('click', async () => {
    try { await rescanProjectFolder(p); openProjectModal(p, projId); } catch(e) { console.error('Rescan failed:', e); }
  });
  // Folder unlink
  const unlinkBtn = $('#proj-unlink');
  if (unlinkBtn) unlinkBtn.addEventListener('click', () => {
    if (!confirm('Remove folder link? Change history will be kept.')) return;
    p.fileTracker = null;
    openProjectModal(p, projId);
  });
}

/* ============ Dashboard ============ */
function renderDashboard() {
  const today = todayISO();
  const allTasks = state.tasks || [];
  const tasksLen = allTasks.length;
  let doneToday = 0;
  let doneCount = 0;
  let progressCount = 0;
  let todayCount = 0;
  let overdueCount = 0;
  const todayTasks = [];

  for (let i = 0; i < tasksLen; i++) {
    const t = allTasks[i];
    const isDone = t.status === 'done';
    if (t.completedAt === today) doneToday++;
    if (isDone) {
      doneCount++;
    } else {
      if (t.status === 'progress') progressCount++;
      if (t.status === 'today') todayCount++;
      if (t.status === 'today' || t.due === today) todayTasks.push(t);
      if (t.due && t.due < today) overdueCount++;
    }
  }

  const streaks = (state.habits || []).map(h => habitStreak(h));
  const bestStreak = streaks.length ? Math.max(...streaks) : 0;
  const goalsWithKR = (state.goals || []).filter(g => g.keyResults && g.keyResults.length);
  const avgProgress = goalsWithKR.length
    ? Math.round(goalsWithKR.reduce((s, g) => s + goalProgress(g), 0) / goalsWithKR.length)
    : 0;

  const hour = new Date().getHours();
  const greet = hour < 5 ? 'Burning the midnight oil' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const dateLine = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  const taskRows = dashListVirt.html(todayTasks, dashTaskHTML, 'dash', '<div class="empty-state"><div class="es-icon">🎉</div>Nothing due today. Enjoy the headroom.</div>');

  const habitChips = (state.habits || []).map(h => {
    const on = !!(h.dates && h.dates[today]);
    return `<div class="habit-chip ${on ? 'on' : ''}" data-habit="${h.id}">
      <span class="hc-emoji">${h.emoji}</span>
      <span class="hc-name">${esc(h.name)}</span>
      <span class="hc-streak">🔥 ${habitStreak(h)} day streak</span>
    </div>`;
  }).join('') || '<div class="empty-state"><div class="es-icon">🌱</div>No habits yet.</div>';

  const recentNotes = [...(state.notes || [])].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5).map(n =>
    `<div class="dash-task" data-open-note="${n.id}">
      <span>${n.audioId ? '🎙️' : '📝'}</span>
      <span class="t-title">${esc(n.title)}</span>
      <span class="due-chip">${n.tags && n.tags.length ? esc(n.tags[0]) : ''}</span>
    </div>`
  ).join('') || '<div class="empty-state"><div class="es-icon">📝</div>No notes yet.</div>';

  const axes = [
    { label: 'Tasks', val: Math.min(100, Math.round((doneCount / Math.max(1, tasksLen)) * 100) || 20) },
    { label: 'Focus', val: Math.min(100, Math.round(((state.pomoHistory || []).reduce((s, p) => s + (p.duration || 0), 0) / 7200) * 100) || 30) },
    { label: 'Habits', val: Math.min(100, Math.round(((state.habits || []).filter(h => h.dates && h.dates[today]).length / Math.max(1, (state.habits || []).length)) * 100) || 25) },
    { label: 'Goals', val: Math.max(15, avgProgress) },
    { label: 'Finance', val: (state.income || []).length ? 80 : 35 },
    { label: 'Projects', val: Math.min(100, Math.round(((state.projects || []).filter(p => p.status === 'built').length / Math.max(1, (state.projects || []).length)) * 100) || 40) },
    { label: 'Notes', val: Math.min(100, Math.max(20, (state.notes || []).length * 15)) },
    { label: 'Consistency', val: Math.min(100, Math.max(25, bestStreak * 20)) }
  ];
  const lifeBalanceScore = Math.round(axes.reduce((s, a) => s + a.val, 0) / axes.length);
  const cx = 130, cy = 130, R = 80;
  const numAxes = axes.length;
  const angleStep = (2 * Math.PI) / numAxes;

  // Grid Polygons
  const gridLevels = [0.25, 0.5, 0.75, 1.0];
  const gridPolys = gridLevels.map(lvl => {
    const pts = axes.map((_, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const x = cx + R * lvl * Math.cos(angle);
      const y = cy + R * lvl * Math.sin(angle);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    return `<polygon points="${pts}" class="radar-grid-poly"/>`;
  }).join('');

  // Axis Lines & Labels
  const axisLines = axes.map((a, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const x = cx + R * Math.cos(angle);
    const y = cy + R * Math.sin(angle);
    const lx = cx + (R + 15) * Math.cos(angle);
    const ly = cy + (R + 15) * Math.sin(angle);
    return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="radar-axis"/>
            <text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" class="radar-label" text-anchor="middle" dominant-baseline="central">${a.label}</text>`;
  }).join('');

  // Data Polygon
  const dataPts = axes.map((a, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const r = (a.val / 100) * R;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const dataDots = axes.map((a, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const r = (a.val / 100) * R;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" class="radar-dot" title="${a.label}: ${a.val}%"/>`;
  }).join('');

  let foldList;
  try { foldList = JSON.parse(localStorage.getItem('lumen.dash.fold') || '[]'); } catch (_) { foldList = []; }

  const lifeRadarHTML = `
    <div class="radar-wrap">
      <svg viewBox="0 0 260 260" class="radar-svg">
        ${gridPolys}
        ${axisLines}
        <polygon points="${dataPts}" class="radar-data-poly"/>
        ${dataDots}
      </svg>
    </div>`;

  const root = viewRoot();
  root.innerHTML = `
    ${deadlinesCardHTML()}
    <div class="stats">
      <div class="stat-card">
        <div class="stat-icon" style="background:rgba(52,211,153,.14)">✅</div>
        <div><div class="stat-value">${doneToday}</div><div class="stat-label">tasks done today</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:rgba(255,176,32,.14)">🔥</div>
        <div><div class="stat-value">${bestStreak} day${bestStreak === 1 ? '' : 's'}</div><div class="stat-label">best active streak</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:rgba(96,93,255,.14)">🎯</div>
        <div><div class="stat-value">${avgProgress}%</div><div class="stat-label">avg goal progress</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:rgba(79,140,255,.14)">📝</div>
        <div><div class="stat-value">${(state.notes || []).length}</div><div class="stat-label">notes captured</div></div>
      </div>
    </div>
    <div class="card" data-dw="task-stats" style="margin-bottom:14px">
      <h3 class="card-title dw-head"><span>📊 Task stats</span><button class="pin-toggle btn-icon" data-dw-pin="task-stats" aria-pressed="true" title="Pin widget">📌</button></h3>
      <div class="task-stats-grid">
        <div class="ts-item"><div class="ts-val">${tasksLen}</div><div class="ts-lbl">Total tasks</div></div>
        <div class="ts-item"><div class="ts-val ts-done">${doneCount}</div><div class="ts-lbl">Completed</div></div>
        <div class="ts-item"><div class="ts-val ts-prog">${progressCount}</div><div class="ts-lbl">In progress</div></div>
        <div class="ts-item"><div class="ts-val ts-today">${todayCount}</div><div class="ts-lbl">Due today</div></div>
        <div class="ts-item"><div class="ts-val ts-overdue">${overdueCount}</div><div class="ts-lbl">Overdue</div></div>
        <div class="ts-item"><div class="ts-val">${tasksLen ? Math.round((doneCount / tasksLen) * 100) : 0}%</div><div class="ts-lbl">Completion rate</div></div>
      </div>
    </div>
    <div class="dash-grid">
      <div class="dash-stack">
        ${dwCard('today', '<span>☀️ Today</span><a class="link-btn" href="#tasks">Open board →</a>', taskRows, '', foldList)}
        ${dwCard('habits', '<span>🔥 Habit check-in</span><a class="link-btn" href="#habits">All habits →</a>', habitChips, '', foldList)}
        ${dwCard('radar', '<span>🎡 Wheel of Life &amp; Balance</span><span class="badge" style="background:rgba(96,93,255,0.15);color:var(--accent);font-weight:700">Score: ' + lifeBalanceScore + '/100</span>', lifeRadarHTML, '', foldList)}
        ${dwCard('timetrack', '<span>⏱️ Time Tracking</span>', timeTrackDashboardHTML(), '', foldList)}
      </div>
      <div class="dash-stack">
        ${dwCard('pomodoro', '<span>⏱️ Pomodoro</span>', pomodoroHTML(), '', foldList)}
        ${dwCard('teaching', '<span>🎓 Teaching &amp; Students</span><a class="link-btn" href="#students">All students →</a>', teachingDashboardHTML(), '', foldList)}
        ${dwCard('notes', '<span>📝 Recent notes</span><a class="link-btn" href="#notes">All notes →</a>', recentNotes, '', foldList)}
        ${dwCard('projects', '<span>🚀 Projects</span><div style="display:flex;gap:6px;align-items:center"><button class="btn btn-sm btn-ghost" id="proj-export-btn" title="Export as CSV">📥</button><button class="btn btn-sm" id="proj-add-btn">' + ic('plus', 14) + ' Add project</button></div>', projectsDashboardHTML(), '', foldList)}
        ${vaultWidgetHTML(state.vaultItems || state.vault || [], state.settings ? state.settings.pinVault !== false : true)}
      </div>
    </div>`;

  // deadline rows → jump to goals
  $$('.dl-row', root).forEach(el => el.addEventListener('click', () => { location.hash = '#goals'; }));
  // one-tap bump: push a slipping deadline out by a week
  $$('.dl-bump', root).forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    bumpDeadline(b.dataset.goalId, b.dataset.krId);
  }));
  // snooze: silence an overdue alert until a chosen date
  $$('.dl-snooze', root).forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    const row = b.closest('.dl-row');
    const next = row.nextElementSibling;
    if (next && next.classList.contains('dl-snooze-panel')) { next.remove(); return; }
    const goalId = b.dataset.goalId, krId = b.dataset.krId;
    const p = document.createElement('div');
    p.className = 'dl-snooze-panel';
    p.innerHTML = snoozePanelHTML();
    row.insertAdjacentElement('afterend', p);
    p.querySelectorAll('[data-until]').forEach(x => x.addEventListener('click', () => snoozeItem(goalId, krId, x.dataset.until)));
    p.querySelector('.dl-snooze-date').addEventListener('change', ev => { if (ev.target.value) snoozeItem(goalId, krId, ev.target.value); });
    p.querySelector('.dl-snooze-clear').addEventListener('click', () => snoozeItem(goalId, krId, null));
  }));
  $$('.dl-unsnooze', root).forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    snoozeItem(b.dataset.goalId, b.dataset.krId, null);
  }));
  // habit check-in
  if ((state.habits || []).length) {
    $$('.habit-chip[data-habit]', root).forEach(chip => chip.addEventListener('click', () => {
      const h = state.habits.find(x => x.id === chip.dataset.habit);
      if (!h) return;
      toggleHabitDate(h, todayISO());
      renderDashboard();
    }));
  }
  // teaching dashboard buttons
  $('#dash-mark-att', root)?.addEventListener('click', () => { location.hash = '#students'; openAttendanceModal(null); });
  $('#dash-assign-hw', root)?.addEventListener('click', () => { location.hash = '#students'; openAssignmentModal(null); });
  // open note
  if ((state.notes || []).length) {
    $$('[data-open-note]', root).forEach(el => el.addEventListener('click', () => {
      selectedNoteId = el.dataset.openNote;
      location.hash = '#notes';
    }));
  }
  // pomodoro buttons
  bindPomodoro();
  // project buttons
  const projAddBtn = $('#proj-add-btn', root);
  if (projAddBtn) projAddBtn.addEventListener('click', () => openProjectModal(null));
  const exportBtn = $('#proj-export-btn', root);
  if (exportBtn) exportBtn.addEventListener('click', () => {
    const projects = state.projects || [];
    if (!projects.length) { toast('No projects to export'); return; }
    const header = 'Name,Description,Language,Link,Status,Notes,Milestones Completed,Created,Updated';
    const rows = projects.map(p => {
      const msDone = (p.milestones || []).filter(m => m.done).length;
      const msTotal = (p.milestones || []).length;
      const created = p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-CA') : '';
      const updated = p.updatedAt ? new Date(p.updatedAt).toLocaleDateString('en-CA') : '';
      return [csvEsc(p.name), csvEsc(p.desc || ''), csvEsc(p.lang || ''), csvEsc(p.link || ''), p.status, csvEsc(p.notes || ''), msDone + '/' + msTotal, created, updated].join(',');
    }).join('\n');
    const blob = new Blob([header + '\n' + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'projects-' + todayISO() + '.csv'; a.click();
    URL.revokeObjectURL(url);
    toast('📥 Exported ' + projects.length + ' projects');
  });

  if ((state.projects || []).length) {
    // Edit by id
    $$('[data-proj-edit]', root).forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      const id = b.dataset.projEdit;
      const proj = (state.projects || []).find(x => x.id === id);
      if (proj) openProjectModal(proj, id);
    }));
    // Delete by id
    $$('[data-proj-del]', root).forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      const id = b.dataset.projDel;
      if (!confirm('Delete this project?')) return;
      const pi = state.projects.findIndex(x => x.id === id);
      if (pi >= 0) state.projects.splice(pi, 1);
      save(); renderDashboard(); toast('Project deleted');
    }));
    // Click row to edit
    $$('.proj-row[data-proj-id]', root).forEach(row => row.addEventListener('click', e => {
      if (e.target.closest('button, a, input, .proj-drag-handle')) return;
      const proj = (state.projects || []).find(x => x.id === row.dataset.projId);
      if (proj) openProjectModal(proj, proj.id);
    }));
    // Quick status cycle (click badge)
    $$('[data-proj-cycle]', root).forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      const id = b.dataset.projCycle;
      const proj = (state.projects || []).find(x => x.id === id);
      if (!proj) return;
      const cycle = ['building', 'built', 'planned'];
      const next = cycle[(cycle.indexOf(proj.status) + 1) % cycle.length];
      proj.status = next;
      proj.updatedAt = Date.now();
      save(); renderDashboard();
      toast('Status → ' + (next === 'built' ? '✅ Built' : next === 'building' ? '🔨 Building' : '💡 Planned'));
    }));
    // Search/filter
    const projSearch = $('#proj-search', root);
    const projLangFilter = $('#proj-lang-filter', root);
    function filterProjects() {
      const q = (projSearch ? projSearch.value : '').toLowerCase();
      const lang = projLangFilter ? projLangFilter.value : '';
      $$('.proj-row[data-proj-id]', root).forEach(row => {
        const id = row.dataset.projId;
        const proj = (state.projects || []).find(x => x.id === id);
        if (!proj) return;
        const matchQ = !q || proj.name.toLowerCase().includes(q) || (proj.desc || '').toLowerCase().includes(q);
        const matchLang = !lang || proj.lang === lang;
        row.style.display = (matchQ && matchLang) ? '' : 'none';
      });
      // Update section counts
      $$('.proj-section', root).forEach(sec => {
        const visible = sec.querySelectorAll('.proj-row[data-proj-id]:not([style*="display: none"])').length;
        const countEl = sec.querySelector('.proj-count');
        if (countEl) countEl.textContent = visible;
      });
    }
    if (projSearch) projSearch.addEventListener('input', filterProjects);
    if (projLangFilter) projLangFilter.addEventListener('change', filterProjects);
    // Drag-and-drop reorder
    let projDragId = null;
    $$('.proj-row[data-proj-id]', root).forEach(row => {
      row.addEventListener('dragstart', e => {
        projDragId = row.dataset.projId;
        row.classList.add('proj-dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      row.addEventListener('dragend', () => {
        projDragId = null;
        row.classList.remove('proj-dragging');
        $$('.proj-drop-target', root).forEach(el => el.classList.remove('proj-drop-target'));
      });
      row.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        row.classList.add('proj-drop-target');
      });
      row.addEventListener('dragleave', () => row.classList.remove('proj-drop-target'));
      row.addEventListener('drop', e => {
        e.preventDefault();
        row.classList.remove('proj-drop-target');
        if (!projDragId || projDragId === row.dataset.projId) return;
        const projects = state.projects || [];
        const fromIdx = projects.findIndex(x => x.id === projDragId);
        const toIdx = projects.findIndex(x => x.id === row.dataset.projId);
        if (fromIdx < 0 || toIdx < 0) return;
        const [moved] = projects.splice(fromIdx, 1);
        projects.splice(toIdx, 0, moved);
        save(); renderDashboard();
      });
    });
  }
// [data-dw-pin] click handled via global delegation
  dashListVirt.sync();
  const g = `${greet}. ${dateLine}.`;
  $('#view-sub').textContent = g;
}

/* ============ Weekly review ============ */
let reviewOffset = 0;
function weekRange(offset) {
  const today = new Date();
  const monday = shiftDays(-((today.getDay() + 6) % 7));
  monday.setDate(monday.getDate() - offset * 7);
  const sunday = shiftDays(6, monday);
  const fmt = d => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const year = sunday.getFullYear();
  return { start: monday, end: sunday, startISO: isoDate(monday), endISO: isoDate(sunday), label: `${fmt(monday)} – ${fmt(sunday)}, ${year}` };
}
/* Progress snapshots → deadline trend */
function recordGoalSnapshot(goal) {
  if (!goal || !goal.id) return;
  if (!state.krHistory) state.krHistory = [];
  const day = todayISO();
  state.krHistory = state.krHistory.filter(h => !(h.goalId === goal.id && h.day === day));
  state.krHistory.push({ goalId: goal.id, day, pct: goalProgress(goal) });
  const cutoff = isoDate(shiftDays(-200));
  state.krHistory = state.krHistory.filter(h => h.day >= cutoff);
  save();
}
/* goalPctAt scanned the whole krHistory for every (goal, day) lookup — O(goals × history)
   per render. Build one per-goal index per render and binary-free walk it instead. */
function krIndex() {
  const idx = new Map();
  (state.krHistory || []).forEach(h => {
    if (!idx.has(h.goalId)) idx.set(h.goalId, []);
    idx.get(h.goalId).push(h);
  });
  idx.forEach(arr => arr.sort((a, b) => a.day.localeCompare(b.day)));
  return idx;
}
function goalPctAtIdx(idx, goalId, day) {
  const arr = idx.get(goalId);
  if (!arr) return null;
  let pct = null;
  for (let i = 0; i < arr.length && arr[i].day <= day; i++) pct = arr[i].pct;
  return pct;
}
/* Rows only — the deadline-health card chrome lives in the review skeleton; renderReview
   swaps just this body when the viewed week changes. */
function deadlineHealthRowsHTML(w, krIdx) {
  const today = todayISO();
  const rows = state.goals.map(g => {
    const asOf = w.endISO < today ? w.endISO : today;
    const asOfMs = new Date(asOf + 'T00:00:00').getTime();
    const actual = goalPctAtIdx(krIdx, g.id, asOf);
    const now = actual === null ? goalProgress(g) : actual;
    let sched = null, schedDiff = null, targetTxt = 'no target date';
    if (g.due) {
      targetTxt = 'target ' + fmtShort(g.due);
      const dueMs = new Date(g.due + 'T00:00:00').getTime();
      if (g.createdAt && dueMs > g.createdAt) {
        const elapsed = clamp((asOfMs - g.createdAt) / (dueMs - g.createdAt), 0, 1);
        const expected = Math.round(elapsed * 100);
        schedDiff = now - expected;
        sched = schedDiff >= 8 ? 'ahead' : schedDiff <= -8 ? 'behind' : 'track';
      }
    }
    const pctStart = goalPctAtIdx(krIdx, g.id, w.startISO);
    const pctEnd = goalPctAtIdx(krIdx, g.id, w.endISO);
    let moveTxt;
    if (pctStart !== null && pctEnd !== null) {
      const d = pctEnd - pctStart;
      moveTxt = d > 0 ? `▲ +${d}% this week` : d < 0 ? `▼ ${d}% this week` : '◆ no change this week';
    } else if (pctEnd !== null) moveTxt = `▲ +${pctEnd}% this week`;
    else moveTxt = 'no edits recorded this week';
    const schedTxt = sched && schedDiff !== null ? ` · ${schedDiff > 0 ? '+' : ''}${schedDiff}% vs plan` : '';
    const label = sched === 'ahead' ? 'Ahead' : sched === 'behind' ? 'Behind' : 'On track';
    const badge = sched ? `<span class="dh-badge dh-${sched}">${label}</span>` : '';
    return `<div class="review-goal dh-row" data-goal="${g.id}" title="Open goals">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="width:10px;height:10px;border-radius:50%;background:${g.color};flex-shrink:0"></span>
        <span style="font-weight:600;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(g.title)}</span>
        ${badge}
        <span class="goal-pct" style="color:${g.color}">${now}%</span>
      </div>
      <div class="muted" style="font-size:12px;margin-top:6px">${moveTxt} · ${targetTxt}${schedTxt}</div>
    </div>`;
  }).join('') || '<div class="empty-state"><div class="es-icon">🎯</div>No goals yet.</div>';
  return rows;
}
function habitStreakAt(h, endISO) {
  return cachedStreak(h, 'at|' + endISO, () => {
    let streak = 0;
    let d = new Date(endISO + 'T00:00:00');
    if (d > new Date()) d = new Date();
    const dates = h.dates || {};
    if (!dates[isoDate(d)]) d.setDate(d.getDate() - 1);
    while (dates[isoDate(d)]) { streak++; d.setDate(d.getDate() - 1); }
    return streak;
  });
}
function reviewTaskHTML(t) {
  const goal = state.goals.find(g => g.id === t.goalId);
  return `<div class="dash-task">
    <span class="check-circle done">${ic('check', 12)}</span>
    <span class="t-title">${esc(t.title)}</span>
    ${goal ? `<span class="goal-chip" style="background:${goal.color}">${esc(goal.title)}</span>` : ''}
    <span class="due-chip">${fmtFull(t.completedAt)}</span>
  </div>`;
}
/* ---- Incremental weekly review ----
   The review's card chrome (titles, links, stat icons, toolbar) is mounted once per view
   entry; week navigation then only recomputes the week-dependent sections and swaps their
   innerHTML when the content actually changed (setSec diff). Per-week data is cached by
   offset — invalidated on any save — so revisiting a week costs nothing, and sections
   whose content is identical (e.g. the week-invariant avg-goal card) never touch the DOM.
   The completed-tasks list is virtualized: its long-path markup is a fixed wrapper, so it
   is keyed by a content signature instead of a string diff. */
const REVIEW_EMPTY_COMPLETED = '<div class="empty-state"><div class="es-icon">📭</div>Nothing completed this week.</div>';
const reviewWeekCache = new Map();
let revCompletedSig = '';
function setSec(sel, html) {
  const el = $(sel);
  if (!el || el.innerHTML === html) return false;
  el.innerHTML = html;
  return true;
}
function reviewCtx(off) {
  const today = todayISO();
  let ctx = reviewWeekCache.get(off);
  if (ctx && ctx.today === today) {
    // cache hit: keep the virtualizer's items aligned with this week without recomputing anything
    dashListVirt.html(ctx.weekTasksSorted, reviewTaskHTML, 'review', REVIEW_EMPTY_COMPLETED);
    return ctx;
  }
  const w = weekRange(off);
  const prevW = weekRange(off + 1); // hoisted — was recomputed per task inside the filter predicate (≈200ms at 10k tasks)
  const weekTasks = state.tasks.filter(t => t.completedAt && t.completedAt >= w.startISO && t.completedAt <= w.endISO);
  const prevCount = state.tasks.filter(t => t.completedAt && t.completedAt >= prevW.startISO && t.completedAt <= prevW.endISO).length;
  const delta = weekTasks.length - prevCount;
  // the seven day cells are identical for every habit — compute keys/titles once
  const wkKeys = [], wkTitles = [];
  for (let i = 0; i < 7; i++) { wkKeys.push(isoDate(shiftDays(i, w.start))); wkTitles.push(fmtFull(wkKeys[i])); }
  let habitDone = 0, habitPossible = 0;
  const habitRows = state.habits.map(h => {
    const cells = [];
    let done = 0, possible = 0;
    for (let i = 0; i < 7; i++) {
      const key = wkKeys[i];
      const future = key > today;
      const on = !future && !!h.dates[key];
      if (!future) possible++;
      if (on) done++;
      cells.push(`<span class="day readonly ${on ? 'on' : ''} ${key === today ? 'today' : ''} ${future ? 'future' : ''}" title="${wkTitles[i]}">${on ? '✓' : ''}</span>`);
    }
    habitDone += done; habitPossible += possible;
    return `<div class="review-habit">
      <div class="rh-head">
        <span class="hc-emoji">${h.emoji}</span>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600">${esc(h.name)}</div>
          <div class="muted" style="font-size:12px;margin-top:1px">${done}/${possible} days checked · 🔥 streak ${habitStreakAt(h, w.endISO)} at week end</div>
        </div>
        <div class="goal-pct" style="color:${h.color}">${possible ? Math.round(done / possible * 100) : 0}%</div>
      </div>
      <div class="week">${cells.join('')}</div>
    </div>`;
  }).join('') || '<div class="empty-state"><div class="es-icon">🌱</div>No habits yet.</div>';
  const habitPct = habitPossible ? Math.round(habitDone / habitPossible * 100) : 0;
  const goalsKR = state.goals.filter(g => g.keyResults && g.keyResults.length);
  const avgGoal = goalsKR.length ? Math.round(goalsKR.reduce((s, g) => s + goalProgress(g), 0) / goalsKR.length) : 0;
  // numeric timestamp range instead of isoDate(new Date(...)) per note (~10ms at 1k notes)
  const wkStartMs = new Date(w.startISO + 'T00:00:00').getTime();
  const wkEndMs = new Date(w.endISO + 'T23:59:59').getTime();
  const notesCreated = state.notes.filter(n => n.createdAt >= wkStartMs && n.createdAt <= wkEndMs).length;
  const weekTasksSorted = [...weekTasks].sort((a, b) => a.completedAt.localeCompare(b.completedAt));
  const completedHTML = dashListVirt.html(weekTasksSorted, reviewTaskHTML, 'review', REVIEW_EMPTY_COMPLETED);
  const completedSig = w.startISO + '|' + weekTasksSorted.map(t => t.id + '@' + t.completedAt).join(',');
  // tasks that were due inside this week and were still open — work a board filter could have hidden
  const hiddenOverdue = state.tasks.filter(t => t.due && t.due >= w.startISO && t.due <= w.endISO && t.status !== 'done').length;
  const krIdx = krIndex();
  const goalRows = state.goals.map(g => {
    const pct = goalProgress(g);
    const linked = weekTasks.filter(t => t.goalId === g.id).length;
    return `<div class="review-goal">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="width:10px;height:10px;border-radius:50%;background:${g.color};flex-shrink:0"></span>
        <span style="font-weight:600;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(g.title)}</span>
        <span class="goal-pct" style="color:${g.color}">${pct}%</span>
      </div>
      <div class="bar" style="margin-top:9px"><div class="bar-fill" style="width:${pct}%;background:${g.color}"></div></div>
      <div class="muted" style="font-size:12px;margin-top:7px">${linked ? `✅ ${linked} task${linked === 1 ? '' : 's'} completed this week` : 'No linked tasks completed this week'}</div>
    </div>`;
  }).join('') || '<div class="empty-state"><div class="es-icon">🎯</div>No goals yet.</div>';
  const achDefs = {};
  ACHIEVEMENTS.forEach(a => achDefs[a.key] = a);
  const weekUnlocks = Object.keys(state.achievements || {})
    .map(k => ({ key: k, a: state.achievements[k], def: achDefs[k] }))
    .filter(x => x.a && x.a.unlockedAt && x.def)
    .filter(x => { const d = isoDate(new Date(x.a.unlockedAt)); return d >= w.startISO && d <= w.endISO; })
    .sort((x, y) => x.a.unlockedAt - y.a.unlockedAt);
  const wkStreak = weeklyUnlockStreaks();
  const streakAtEnd = off === 0 ? wkStreak.current : weeklyStreakAt(weekIndex(w.end));
  const achRows = weekUnlocks.map(u => `
    <div class="dash-task">
      <span>${u.def.icon}</span>
      <span class="t-title">${esc(u.def.title)}</span>
      <span class="due-chip">${fmtFull(isoDate(new Date(u.a.unlockedAt)))}</span>
    </div>`).join('');
  const achHTML = (achRows || '<div class="empty-state"><div class="es-icon">🎁</div>Nothing unlocked this week — check-ins, completions and memos earn badges.</div>') +
    (streakAtEnd >= 1 || off === 0 ? `<div class="muted" style="font-size:12px;margin-top:8px">🔁 Weekly unlock streak: <b>${streakAtEnd}</b> week${streakAtEnd === 1 ? '' : 's'}${off === 0 && streakAtEnd >= 2 ? ' and counting' : ''}</div>` : '');
  const deltaTxt = delta === 0 ? 'same as last week' : delta > 0 ? `+${delta} vs last week` : `${delta} vs last week`;
  const slippedTasks = state.tasks.filter(t => t.status !== 'done' && ((t.due && t.due < w.startISO) || t.status === 'today'));
  const slippedHabits = state.habits.filter(h => {
    let checks = 0;
    for (let i = 0; i < 7; i++) {
      const d = isoDate(shiftDays(i, w.start));
      if (h.dates && h.dates[d]) checks++;
    }
    return checks < 4;
  });
  const slipped = { tasks: slippedTasks, habits: slippedHabits, keyResults: [] };
  const protectCandidates = [
    ...slippedTasks.map(t => ({ kind: 'task', id: t.id, title: t.title, reason: 'Overdue / carryover task' })),
    ...slippedHabits.map(h => ({ kind: 'habit', id: h.id, title: (h.emoji || '') + ' ' + h.name, reason: 'Slipped habit' })),
    ...state.goals.map(g => ({ kind: 'goal', id: g.id, title: g.title, reason: 'Active goal' }))
  ];

  ctx = {
    today, label: w.label,
    statTasks: String(weekTasks.length), statTasksLabel: 'tasks completed · ' + deltaTxt,
    statHabits: habitPct + '%', statHabitsLabel: 'habits checked · ' + habitDone + '/' + habitPossible + ' days',
    statGoals: avgGoal + '%', statGoalsLabel: 'avg goal progress',
    statNotes: String(notesCreated), statNotesLabel: 'notes created',
    statOverdue: String(hiddenOverdue), hiddenOverdue,
    dhRows: deadlineHealthRowsHTML(w, krIdx),
    completedHTML, completedSig, goalRows, achHTML, habitRows, weekTasksSorted,
    slipped, protectCandidates
  };
  if (reviewWeekCache.size > 24) reviewWeekCache.clear();
  reviewWeekCache.set(off, ctx);
  return ctx;
}
let _ritualStep = 0;
let _ritualSelections = { taskIds: [], habitIds: [], goalIds: [] };

function reviewRitualCardHTML(ctx) {
  const rc = state.settings && state.settings.reviewCommit;
  const isDone = !!rc;
  
  if (isDone && _ritualStep === 0) {
    return '<div class="card ritual-card" id="ritual-container" style="margin-bottom:16px;background:var(--surface2)"><div style="display:flex;align-items:center;justify-content:space-between"><div><h3 style="margin:0;font-size:15px">✨ Weekly Review Completed</h3><div class="muted" style="font-size:12.5px;margin-top:2px" id="ritual-status">Status: done · Protected ' + ((rc.taskIds||[]).length + (rc.habitIds||[]).length + (rc.goalIds||[]).length) + ' focus priorities for next week.</div></div><button class="btn btn-sm btn-ghost" id="ritual-restart">Redo ritual</button></div></div>';
  }

  if (_ritualStep === 0) {
    return '<div class="card ritual-card" id="ritual-container" style="margin-bottom:16px;background:var(--surface2)"><div style="display:flex;align-items:center;justify-content:space-between"><div><h3 style="margin:0;font-size:15px">🔄 3-Step Weekly Review Ritual</h3><div class="muted" style="font-size:12.5px;margin-top:2px" id="ritual-status">Ready — Review shipped work, reflect on slipped habits/tasks, and lock in next week\'s focus.</div></div><button class="btn btn-sm btn-accent" id="ritual-start">Start Review →</button></div></div>';
  }

  if (_ritualStep === 1) {
    return '<div class="card ritual-card" id="ritual-container" style="margin-bottom:16px;background:var(--surface2)"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px"><h3 style="margin:0;font-size:15px">1️⃣ Shipped This Week</h3><button class="btn btn-sm btn-accent" id="ritual-next">Next: Slipped →</button></div><div class="muted" style="font-size:13px">Awesome work! You completed <b>' + ctx.statTasks + '</b> and maintained <b>' + ctx.statHabits + '</b> consistency.</div></div>';
  }

  if (_ritualStep === 2) {
    const slippedCount = (ctx.slipped.tasks.length + ctx.slipped.habits.length);
    return '<div class="card ritual-card" id="ritual-container" style="margin-bottom:16px;background:var(--surface2)"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px"><h3 style="margin:0;font-size:15px">2️⃣ Slipped & Overdue</h3><button class="btn btn-sm btn-accent" id="ritual-next">Next: Protect Next Week →</button></div><div class="muted" style="font-size:13px">' + (slippedCount ? slippedCount + ' items slipped or need attention before next week.' : 'No slipped items! You are completely caught up.') + '</div></div>';
  }

  // Step 3: Protect Next Week
  const candidates = ctx.protectCandidates || [];
  const picksHTML = candidates.map(c => {
    const key = c.kind === 'habit' ? 'habitIds' : c.kind === 'goal' ? 'goalIds' : 'taskIds';
    const isSelected = _ritualSelections[key].includes(c.id);
    return '<div class="protect-pick ' + (isSelected ? 'selected' : '') + '" data-kind="' + c.kind + '" data-id="' + c.id + '" style="padding:8px 12px;border:1px solid ' + (isSelected ? 'var(--accent)' : 'var(--border)') + ';border-radius:8px;cursor:pointer;margin-bottom:6px;display:flex;align-items:center;justify-content:space-between;background:' + (isSelected ? 'rgba(96,93,255,0.1)' : 'var(--surface)') + '"><div><span style="font-weight:600">' + esc(c.title) + '</span><span class="muted" style="font-size:11px;margin-left:8px">(' + c.reason + ')</span></div><span>' + (isSelected ? '🛡️ Protected' : '+ Protect') + '</span></div>';
  }).join('') || '<div class="muted">No candidates to protect.</div>';

  return '<div class="card ritual-card" id="ritual-container" style="margin-bottom:16px;background:var(--surface2)"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px"><h3 style="margin:0;font-size:15px">3️⃣ Protect Next Week</h3><button class="btn btn-sm btn-accent" id="ritual-finish">Lock In Commitments ✓</button></div><div class="muted" style="font-size:12.5px;margin-bottom:10px">Pick items to carry forward as top priorities in your Morning Brief:</div><div class="protect-candidates-list">' + picksHTML + '</div></div>';
}

function reviewSkeletonHTML() {
  const stat = (icon, bg, idV, idL) => `<div class="stat-card"><div class="stat-icon" style="background:${bg}">${icon}</div><div><div class="stat-value" id="${idV}"></div><div class="stat-label" id="${idL}"></div></div></div>`;
  return `
    <div class="toolbar review-toolbar" id="rev-toolbar">
      <button class="btn btn-sm" id="rev-prev" title="Previous week">${ic('chevron-left', 15)}</button>
      <span class="review-label" id="rev-label"></span>
      <button class="btn btn-sm" id="rev-next" title="Next week">${ic('chevron-right', 15)}</button>
      <button class="btn btn-sm btn-ghost" id="rev-today">This week</button>
      <div style="flex:1"></div>
      <button class="btn btn-sm btn-ghost" id="rev-export-md">${ic('download', 14)} Export Markdown</button>
    </div>
    <div id="ritual-slot"></div>
    <div class="stats">
      ${stat('✅', 'rgba(52,211,153,.14)', 'rev-v-tasks', 'rev-l-tasks')}
      ${stat('🔥', 'rgba(96,93,255,.14)', 'rev-v-habits', 'rev-l-habits')}
      ${stat('🎯', 'rgba(255,176,32,.14)', 'rev-v-goals', 'rev-l-goals')}
      ${stat('📝', 'rgba(79,140,255,.14)', 'rev-v-notes', 'rev-l-notes')}
      <div class="stat-card" id="rev-hidden-overdue" title="Open the board — overdue cards show ⚠" style="cursor:pointer">
        <div class="stat-icon" style="background:rgba(255,176,32,.14)">⚠️</div>
        <div><div class="stat-value" id="rev-v-overdue"></div><div class="stat-label" id="rev-l-overdue"></div></div>
      </div>
    </div>
    <div class="card dh-card">
      <h3 class="card-title"><span>📅 Deadline health</span><a class="link-btn" href="#goals">All goals →</a></h3>
      <div class="review-goals-grid" id="rev-dh"></div>
    </div>
    <div class="dash-grid">
      <div class="dash-stack">
        <div class="card">
          <h3 class="card-title"><span>✅ Completed this week</span><a class="link-btn" href="#tasks">Open board →</a></h3>
          <div id="rev-completed"></div>
        </div>
        <div class="card">
          <h3 class="card-title"><span>🎯 Goal progress</span><a class="link-btn" href="#goals">All goals →</a></h3>
          <div class="review-goals-grid" id="rev-goals"></div>
        </div>
      </div>
      <div class="dash-stack">
        <div class="card">
          <h3 class="card-title"><span>🏆 Achievements unlocked</span><a class="link-btn" href="#achievements">All achievements →</a></h3>
          <div id="rev-ach"></div>
        </div>
        <div class="card">
          <h3 class="card-title"><span>🔥 Habit week</span><a class="link-btn" href="#habits">All habits →</a></h3>
          <div id="rev-habit"></div>
        </div>
      </div>
    </div>`;
}
function renderReview() {
  const ctx = reviewCtx(reviewOffset);
  const root = viewRoot();
  if (!root.querySelector('#rev-toolbar')) {
    revCompletedSig = '';
    root.innerHTML = reviewSkeletonHTML();
    $('#rev-prev').addEventListener('click', () => { reviewOffset++; renderReview(); });
    $('#rev-next').addEventListener('click', () => { if (reviewOffset > 0) { reviewOffset--; renderReview(); } });
    $('#rev-today').addEventListener('click', () => { reviewOffset = 0; renderReview(); });
    $('#rev-hidden-overdue').addEventListener('click', () => { location.hash = '#tasks'; });
    // delegated — survives section swaps without re-binding
    $('#rev-dh').addEventListener('click', e => { if (e.target.closest('.dh-row')) location.hash = '#goals'; });
    $('#rev-export-md').addEventListener('click', () => {
      const curCtx = reviewCtx(reviewOffset);
      const completedTasks = state.tasks.filter(t => t.completedAt && t.completedAt >= curCtx.start && t.completedAt <= curCtx.end);
      let md = `# Weekly Review — ${curCtx.label}\n\n`;
      md += `*Generated by Lumen on ${todayISO()}*\n\n`;
      md += `## 📊 Key Highlights\n`;
      md += `- **Tasks Completed**: ${curCtx.statTasks} (${curCtx.statTasksLabel})\n`;
      md += `- **Habit Consistency**: ${curCtx.statHabits} (${curCtx.statHabitsLabel})\n`;
      md += `- **Average Goal Progress**: ${curCtx.statGoals}%\n`;
      md += `- **Notes Captured**: ${curCtx.statNotes}\n\n`;
      
      md += `## ✅ Completed Tasks (${completedTasks.length})\n`;
      if (completedTasks.length) {
        completedTasks.forEach(t => {
          md += `- [x] **${t.title}** ${t.priority !== 'med' ? `(!${t.priority})` : ''} ${(t.tags||[]).map(x=>'#'+x).join(' ')} *(completed ${t.completedAt})*\n`;
        });
      } else {
        md += `*No tasks completed in this window.*\n`;
      }
      md += `\n## 🌱 Habit Performance\n`;
      state.habits.forEach(h => {
        let checks = 0;
        for (let i = 0; i < 7; i++) {
          const d = isoDate(shiftDays(i, new Date(curCtx.start + 'T00:00:00')));
          if (h.dates && h.dates[d]) checks++;
        }
        md += `- ${h.emoji} **${h.name}**: ${checks}/7 days (${Math.round((checks/7)*100)}%)\n`;
      });
      
      md += `\n## 🎯 Goals Overview\n`;
      state.goals.forEach(g => {
        md += `- **${g.title}**: ${goalProgress(g)}% complete\n`;
      });

      const weeklyAtt = (state.attendance || []).filter(a => a.date >= curCtx.start && a.date <= curCtx.end);
      const weeklyHwGraded = (state.assignments || []).filter(a => (a.status === 'reviewed' || a.status === 'completed') && a.updatedAt >= new Date(curCtx.start).getTime() && a.updatedAt <= new Date(curCtx.end + 'T23:59:59').getTime());
      const weeklyInc = (state.income || []).filter(e => e.date >= curCtx.start && e.date <= curCtx.end);
      const weeklyUsd = weeklyInc.filter(e => (e.currency || 'USD') === 'USD').reduce((s, e) => s + (e.amount || 0), 0);
      const weeklyTry = weeklyInc.filter(e => e.currency === 'TRY').reduce((s, e) => s + (e.amount || 0), 0);

      md += `\n## 🎓 Teaching & Student Progress\n`;
      md += `- **Sessions Taught**: ${weeklyAtt.length} sessions\n`;
      md += `- **Tutoring Revenue**: $${weeklyUsd.toLocaleString()} / ₺${weeklyTry.toLocaleString()}\n`;
      md += `- **Homework Graded**: ${weeklyHwGraded.length} assignments\n`;
      if (state.settings && state.settings.reviewCommit) {
        const rc = state.settings.reviewCommit;
        const pTasks = (state.tasks || []).filter(t => (rc.taskIds || []).includes(t.id));
        const pHabits = (state.habits || []).filter(h => (rc.habitIds || []).includes(h.id));
        const pGoals = (state.goals || []).filter(g => (rc.goalIds || []).includes(g.id));
        if (pTasks.length || pHabits.length || pGoals.length) {
          md += '\n## 🛡️ Protecting Next Week\n';
          pHabits.forEach(h => { md += '- ' + (h.emoji || '🌱') + ' **' + h.name + '**\n'; });
          pTasks.forEach(t => { md += '- [ ] **' + t.title + '**\n'; });
          pGoals.forEach(g => { md += '- 🎯 **' + g.title + '**\n'; });
        }
      }
      
      const blob = new Blob([md], { type: 'text/markdown' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `lumen-weekly-review-${curCtx.start}.md`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      toast('📄 Weekly review markdown downloaded!', 'success');
    });
  }
  const rSlot = root.querySelector('#ritual-slot');
  if (rSlot) rSlot.innerHTML = reviewRitualCardHTML(ctx);

  // Bind ritual handlers
  root.querySelector('#ritual-start')?.addEventListener('click', () => { _ritualStep = 1; renderReview(); });
  root.querySelectorAll('#ritual-next').forEach(btn => btn.addEventListener('click', () => { _ritualStep++; renderReview(); }));
  root.querySelector('#ritual-restart')?.addEventListener('click', () => { _ritualStep = 1; renderReview(); });
  root.querySelectorAll('.protect-pick').forEach(el => {
    el.addEventListener('click', () => {
      const kind = el.dataset.kind;
      const id = el.dataset.id;
      const key = kind === 'habit' ? 'habitIds' : kind === 'goal' ? 'goalIds' : 'taskIds';
      const arr = _ritualSelections[key];
      const idx = arr.indexOf(id);
      if (idx >= 0) arr.splice(idx, 1);
      else arr.push(id);
      renderReview();
    });
  });
  root.querySelector('#ritual-finish')?.addEventListener('click', () => {
    if (!state.settings) state.settings = {};
    const w = weekRange(reviewOffset);
    state.settings.reviewCommit = {
      weekStart: w.startISO,
      taskIds: [..._ritualSelections.taskIds],
      habitIds: [..._ritualSelections.habitIds],
      goalIds: [..._ritualSelections.goalIds],
      at: Date.now()
    };
    _ritualStep = 0;
    save(); flushSave();
    renderReview();
    toast('Weekly review commitment saved!', 'success');
  });

  // toolbar in place
  const lbl = $('#rev-label');
  if (lbl.textContent !== ctx.label) lbl.textContent = ctx.label;
  $('#rev-next').disabled = reviewOffset === 0;
  $('#rev-today').disabled = reviewOffset === 0;
  // stat cards — diffed; week-invariant ones (avg goal progress) skip their write
  setSec('#rev-v-tasks', ctx.statTasks); setSec('#rev-l-tasks', ctx.statTasksLabel);
  setSec('#rev-v-habits', ctx.statHabits); setSec('#rev-l-habits', ctx.statHabitsLabel);
  setSec('#rev-v-goals', ctx.statGoals); setSec('#rev-l-goals', ctx.statGoalsLabel);
  setSec('#rev-v-notes', ctx.statNotes); setSec('#rev-l-notes', ctx.statNotesLabel);
  setSec('#rev-v-overdue', ctx.statOverdue); setSec('#rev-l-overdue', 'hidden overdue · due this week, still open');
  $('#rev-v-overdue').classList.toggle('warn', ctx.hiddenOverdue > 0);
  // week sections
  setSec('#rev-dh', ctx.dhRows);
  if (ctx.completedSig !== revCompletedSig) {
    setSec('#rev-completed', ctx.completedHTML);
    dashListVirt.sync();
    revCompletedSig = ctx.completedSig;
  }
  setSec('#rev-goals', ctx.goalRows);
  setSec('#rev-ach', ctx.achHTML);
  setSec('#rev-habit', ctx.habitRows);
}

/* Desktop notifications for newly-overdue deadlines */
function notifySupported() { return typeof Notification !== 'undefined' && 'Notification' in window; }
function notifyPermission() { return notifySupported() ? Notification.permission : 'unsupported'; }
function sendNotification(title, body) {
  try {
    const n = new Notification(title, { body, icon: APP_ICON });
    n.onclick = () => { window.focus(); location.hash = '#goals'; };
  } catch (e) { console.warn('Notification failed', e); }
}
function checkOverdueNotifications() {
  if (!notifySupported() || !state.settings.notifyOverdue || Notification.permission !== 'granted') return;
  if (!state.notifiedOverdue) state.notifiedOverdue = {};
  const current = new Set();
  const fresh = [];
  const today = todayISO();
  deadlineInfo().overdue.forEach(it => {
    const key = it.goalId + '|' + it.krId;
    current.add(key);
    if (!state.notifiedOverdue[key]) { state.notifiedOverdue[key] = today; fresh.push(it); }
  });
  if (fresh.length === 1) {
    sendNotification('⛔ Deadline overdue: ' + fresh[0].label, fresh[0].sub + ' — due ' + fmtFull(fresh[0].due));
  } else if (fresh.length > 1) {
    const names = fresh.slice(0, 3).map(it => it.label).join(', ');
    sendNotification('⛔ ' + fresh.length + ' deadlines overdue', names + (fresh.length > 3 ? ' and ' + (fresh.length - 3) + ' more' : ''));
  }
  // drop keys that are no longer overdue so a future overdue occurrence re-notifies
  let changed = false;
  Object.keys(state.notifiedOverdue).forEach(k => {
    if (!current.has(k)) { delete state.notifiedOverdue[k]; changed = true; }
  });
  if (changed || fresh.length) save();
}
async function setNotifyEnabled(on) {
  state.settings.notifyOverdue = !!on;
  if (on) {
    if (!notifySupported()) { toast('Desktop notifications aren’t supported in this browser', 'error'); state.settings.notifyOverdue = false; save(); renderSettings(); return; }
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') { toast('Notification permission denied — allow it in your browser settings', 'error'); state.settings.notifyOverdue = false; save(); renderSettings(); return; }
    toast('Desktop notifications on 🔔');
  } else {
    toast('Notifications off');
  }
  save();
  renderSettings();
}
function isGoalOverdue(g) {
  return !!(g.due && g.due < todayISO() && goalProgress(g) < 100 && !(g.snoozeUntil && g.snoozeUntil >= todayISO()));
}
function overdueCount() {
  return deadlineInfo().overdue.length;
}
function updateNavBadges() {
  const nav = $('#nav-goals');
  if (!nav) return;
  const count = overdueCount();
  let badge = nav.querySelector('.nav-badge');
  if (count > 0) {
    if (!badge) { badge = document.createElement('span'); badge.className = 'nav-badge'; nav.appendChild(badge); }
    badge.textContent = count;
  } else if (badge) {
    badge.remove();
  }
}
function bumpDeadline(goalId, krId) {
  const g = state.goals.find(x => x.id === goalId);
  if (!g) return;
  const item = krId ? (g.keyResults || []).find(k => k.id === krId) : g;
  if (!item || !item.due) return;
  const newDue = isoDate(shiftDays(7, new Date(item.due + 'T00:00:00')));
  item.due = newDue;
  g.updatedAt = Date.now();
  save();
  renderDashboard();
  toast('⏩ Deadline bumped to ' + fmtFull(newDue), 'success');
}
function deadlineInfo() {
  const today = todayISO();
  const soonISO = isoDate(shiftDays(7));
  const overdue = [], upcoming = [], snoozed = [];
  const goals = state.goals || [];
  if (!goals.length) return { overdue, upcoming, snoozed };
  const snoozedItem = (it, goalId, krId, label, sub) => {
    if (it.snoozeUntil && it.snoozeUntil >= today) {
      snoozed.push({ label, sub, due: it.due, goalId, krId, snoozeUntil: it.snoozeUntil });
      return true;
    }
    return false;
  };
  state.goals.forEach(g => {
    const pct = goalProgress(g);
    if (g.due && snoozedItem(g, g.id, '', g.title, 'Goal')) return;
    if (g.due) {
      if (g.due < today && pct < 100) overdue.push({ label: g.title, sub: 'Goal', due: g.due, goalId: g.id, krId: '' });
      else if (g.due >= today && g.due <= soonISO) upcoming.push({ label: g.title, sub: 'Goal', due: g.due, goalId: g.id, krId: '' });
    }
    (g.keyResults || []).forEach(kr => {
      if (!kr.due || kr.current >= kr.target) return;
      if (snoozedItem(kr, g.id, kr.id, kr.title, 'Key result · ' + g.title)) return;
      const item = { label: kr.title, sub: 'Key result · ' + g.title, due: kr.due, goalId: g.id, krId: kr.id };
      if (kr.due < today) overdue.push(item);
      else if (kr.due <= soonISO) upcoming.push(item);
    });
  });
  overdue.sort((a, b) => a.due.localeCompare(b.due));
  upcoming.sort((a, b) => a.due.localeCompare(b.due));
  snoozed.sort((a, b) => a.snoozeUntil.localeCompare(b.snoozeUntil));
  return { overdue, upcoming, snoozed };
}
const snoozeBtnHTML = it => `<button class="btn-icon dl-snooze" data-goal-id="${it.goalId}" data-kr-id="${it.krId || ''}" title="Snooze this alert">${ic('bell', 15)}</button>`;
const bumpBtnHTML = it => `<button class="btn-icon dl-bump" data-goal-id="${it.goalId}" data-kr-id="${it.krId || ''}" title="Bump deadline +7 days">${ic('calendar-plus', 15)}</button>`;
function dwCard(id, titleHTML, bodyHTML, extraClass = '', foldList = null) {
  if (!foldList) {
    try { foldList = JSON.parse(localStorage.getItem('lumen.dash.fold') || '[]'); } catch (_) { foldList = []; }
  }
  const isPinned = !foldList.includes(id);
  const foldClass = !isPinned ? 'dw-folded' : '';
  return `<div class="card ${extraClass} ${foldClass}" data-dw="${id}">
    <h3 class="card-title dw-head">
      ${titleHTML}
      <button class="pin-toggle btn-icon" data-dw-pin="${id}" aria-pressed="${isPinned ? 'true' : 'false'}" title="Pin widget">📌</button>
    </h3>
    <div class="dw-body">${bodyHTML}</div>
  </div>`;
}
function deadlinesCardHTML() {
  const { overdue, upcoming, snoozed } = deadlineInfo();
  const today = todayISO();
  const isPinned = state.settings ? state.settings.pinDeadlines !== false : true;
  const foldClass = !isPinned ? 'dw-folded' : '';
  const row = (it, canSnooze) => `<div class="dash-task dl-row" data-goal-id="${it.goalId}" data-kr-id="${it.krId || ''}" title="View goals">
    <span class="dl-icon">${it.due < today ? '⛔' : '⏳'}</span>
    <span class="t-title">${esc(it.label)}</span>
    <span class="tag">${esc(it.sub)}</span>
    <span class="due-chip ${it.due < today ? 'overdue' : 'soon'}">${it.due < today ? 'Overdue ' : ''}${fmtShort(it.due)}</span>
    ${canSnooze ? snoozeBtnHTML(it) : ''}
    ${bumpBtnHTML(it)}
  </div>`;
  const srow = it => `<div class="dash-task dl-row dl-snoozed" data-goal-id="${it.goalId}" data-kr-id="${it.krId || ''}" title="View goals">
    <span class="dl-icon">🔕</span>
    <span class="t-title">${esc(it.label)}</span>
    <span class="tag">${esc(it.sub)}</span>
    <span class="due-chip">Snoozed until ${fmtShort(it.snoozeUntil)}</span>
    <button class="btn-icon dl-unsnooze" data-goal-id="${it.goalId}" data-kr-id="${it.krId || ''}" title="Clear snooze">${ic('bell', 15)}</button>
    ${bumpBtnHTML(it)}
  </div>`;
  const total = overdue.length + upcoming.length + snoozed.length;
  if (!total) {
    return `<div class="card dl-card ${foldClass}" data-dw="deadlines">
      <h3 class="card-title dw-head"><span>⏰ Deadlines</span>
        <button class="pin-toggle btn-icon" data-dw-pin="deadlines" aria-pressed="${isPinned ? 'true' : 'false'}" title="Pin widget">📌</button>
      </h3>
      <div class="dw-body">
        <div class="empty-state" style="padding:14px 0 6px"><div class="es-icon">🎉</div>No overdue, upcoming, or snoozed deadlines.</div>
      </div>
    </div>`;
  }
  return `<div class="card dl-card ${foldClass}" data-dw="deadlines">
    <h3 class="card-title dw-head"><span>⏰ Deadlines</span>
      <span class="dl-counts">
        ${overdue.length ? `<span class="badge priority-high">${overdue.length} overdue</span>` : ''}
        ${upcoming.length ? `<span class="badge priority-med">${upcoming.length} soon</span>` : ''}
        ${snoozed.length ? `<span class="badge dl-snoozed-badge">${snoozed.length} snoozed</span>` : ''}
      </span>
      <button class="pin-toggle btn-icon" data-dw-pin="deadlines" aria-pressed="${isPinned ? 'true' : 'false'}" title="Pin widget">📌</button>
    </h3>
    <div class="dw-body">
      ${overdue.map(r => row(r, true)).join('')}
      ${upcoming.map(r => row(r, false)).join('')}
      ${snoozed.map(srow).join('')}
    </div>
  </div>`;
}
function snoozeItem(goalId, krId, until) {
  const g = state.goals.find(x => x.id === goalId);
  if (!g) return;
  const item = krId ? (g.keyResults || []).find(k => k.id === krId) : g;
  if (!item) return;
  const today = todayISO();
  if (until && until < today) { toast('Snooze date can\'t be in the past', 'error'); return; }
  if (until) item.snoozeUntil = until; else delete item.snoozeUntil;
  g.updatedAt = Date.now();
  save();
  renderDashboard();
  toast(until ? 'Snoozed until ' + fmtShort(until) + ' ⏰' : 'Snooze cleared', until ? 'success' : '');
}
const snoozePanelHTML = () => `<div class="dl-snooze-panel">
  <span class="muted" style="font-size:11px">Snooze alert until:</span>
  ${[1, 3, 7, 14].map(n => `<button class="btn btn-sm" data-until="${isoDate(shiftDays(n))}">+${n}d</button>`).join('')}
  <input type="date" class="dl-snooze-date" title="Pick a date">
  <button class="btn btn-sm btn-ghost dl-snooze-clear" disabled>Un-snooze</button>
</div>`;

function dashTaskHTML(t) {
  const goal = state.goals.find(g => g.id === t.goalId);
  const dueCls = t.due && t.due < todayISO() && t.status !== 'done' ? 'overdue' : '';
  return `<div class="dash-task" data-id="${t.id}">
    <button class="check-circle" data-complete="${t.id}">${ic('check', 12)}</button>
    <span class="t-title">${esc(t.title)}</span>
    ${goal ? `<span class="tag" style="color:${goal.color}">${esc(goal.title)}</span>` : ''}
    ${t.due ? `<span class="due-chip ${dueCls}">${fmtShort(t.due)}</span>` : ''}
  </div>`;
}

/* ---------- Task completion → goal progress ---------- */
function applyTaskGoalProgress(t, completing) {
  if (!t.goalId) return null;
  const g = state.goals.find(x => x.id === t.goalId);
  if (!g || !g.keyResults || !g.keyResults.length) return null;
  // The KR this task feeds: explicit krId, the KR it last advanced, else first incomplete.
  let kr = t.advancedKrId ? g.keyResults.find(k => k.id === t.advancedKrId) : null;
  if (!kr && t.krId) kr = g.keyResults.find(k => k.id === t.krId);
  if (!kr) kr = g.keyResults.find(k => k.current < k.target);
  if (!kr) return null; // goal fully complete
  const next = clamp(kr.current + (completing ? 1 : -1), 0, kr.target);
  if (next === kr.current) return null;
  kr.current = next;
  if (completing) t.advancedKrId = kr.id;
  g.updatedAt = Date.now();
  recordGoalSnapshot(g);
  return kr;
}
function toggleTaskDone(t) {
  const wasDone = t.status === 'done';
  if (wasDone) { t.status = 'today'; t.completedAt = null; }
  else {
    t.status = 'done'; t.completedAt = todayISO();
    playChime('task-done');
    // Handle recurring tasks: create next occurrence
    if (t.recurrence && t.status === 'done') {
      const nextDue = computeNextDue(t.due, t.recurrence);
      if (nextDue) {
        const next = Object.assign({}, t, {
          id: uid(),
          status: 'today',
          completedAt: null,
          due: nextDue,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          subtasks: (t.subtasks || []).map(s => ({ text: s.text, done: false, id: uid() }))
        });
        state.tasks.unshift(next);
      }
    }
  }
  t.updatedAt = Date.now();
  const kr = applyTaskGoalProgress(t, !wasDone);
  evaluateAchievements();
  return { wasDone, kr };
}
function computeNextDue(currentDue, recurrence) {
  if (!currentDue) return null;
  const d = new Date(currentDue + 'T00:00:00');
  switch (recurrence) {
    case 'daily': d.setDate(d.getDate() + 1); break;
    case 'weekdays': {
      d.setDate(d.getDate() + 1);
      while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
      break;
    }
    case 'weekly': d.setDate(d.getDate() + 7); break;
    case 'biweekly': d.setDate(d.getDate() + 14); break;
    case 'monthly': d.setMonth(d.getMonth() + 1); break;
    default: return null;
  }
  return isoDate(d);
}
function goalProgressToast(t, wasDone, kr) {
  if (!kr) return;
  const dir = wasDone ? '↩️ Reverted —' : '✅ Goal progress —';
  toast(`${dir} “${kr.title}” is now ${kr.current}/${kr.target}`);
}

/* ---------- Automatic time tracking ---------- */
// When a task status changes, if it was in 'progress', log elapsed time.
// If it enters 'progress', stamp progressStartedAt.
function trackProgressTime(task, oldStatus, newStatus) {
  if (oldStatus === 'progress' && newStatus !== 'progress') {
    // Leaving In Progress — log elapsed time
    if (task.progressStartedAt) {
      const elapsed = Math.round((Date.now() - task.progressStartedAt) / 1000);
      if (elapsed > 0) {
        if (!task.totalProgressTime) task.totalProgressTime = 0;
        task.totalProgressTime += elapsed;
        // Record individual session
        if (!task.progressSessions) task.progressSessions = [];
        task.progressSessions.push({
          startedAt: task.progressStartedAt,
          endedAt: Date.now(),
          duration: elapsed
        });
        // Keep last 100 sessions to avoid bloat
        if (task.progressSessions.length > 100) task.progressSessions = task.progressSessions.slice(-100);
      }
      task.progressStartedAt = null;
    }
  }
  if (newStatus === 'progress' && oldStatus !== 'progress') {
    // Entering In Progress — stamp start
    task.progressStartedAt = Date.now();
  }
}
function fmtProgressTime(seconds) {
  if (!seconds) return '';
  if (seconds < 60) return `${seconds}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function fmtProgressTimeLong(seconds) {
  if (!seconds) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/* ============ Time Breakdown Modal ============ */
function openTimeBreakdownModal(taskId) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;
  const sessions = (task.progressSessions || []).slice().reverse(); // newest first
  const total = task.totalProgressTime || 0;
  const catObj = CATEGORIES.find(c => c.id === task.category);
  const catBadge = catObj ? `<span class="tt-task-cat" style="background:${catObj.color}22;color:${catObj.color}">${esc(catObj.label)}</span>` : '';
  // Aggregate by day
  const dayMap = {};
  sessions.forEach(s => {
    const day = new Date(s.startedAt).toISOString().slice(0, 10);
    if (!dayMap[day]) dayMap[day] = 0;
    dayMap[day] += s.duration;
  });
  const days = Object.entries(dayMap).sort((a, b) => b[0].localeCompare(a[0]));
  const maxDay = days.length ? days[0][1] : 1;
  const dayBars = days.map(([day, secs]) => {
    const pct = Math.round((secs / maxDay) * 100);
    const label = fmtShort(day);
    return `<div class="tbd-day-row">
      <span class="tbd-day-label">${esc(label)}</span>
      <div class="tbd-day-bar"><div class="tbd-day-fill" style="width:${pct}%"></div></div>
      <span class="tbd-day-time">${fmtProgressTimeLong(secs)}</span>
    </div>`;
  }).join('');
  const sessionRows = sessions.map(s => {
    const start = new Date(s.startedAt);
    const end = new Date(s.endedAt);
    const startStr = start.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    const endStr = end.toLocaleString(undefined, { hour: 'numeric', minute: '2-digit' });
    const dateStr = start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    return `<div class="tbd-session">
      <div class="tbd-session-head">
        <span class="tbd-session-date">${esc(dateStr)}</span>
        <span class="tbd-session-dur">${fmtProgressTimeLong(s.duration)}</span>
      </div>
      <div class="tbd-session-time">${startStr} → ${endStr}</div>
    </div>`;
  }).join('');
  openModal(`
    <div class="modal">
      <div class="modal-head"><h3>⏱ Time breakdown</h3><button class="btn-icon" data-close-modal>${ic('x', 16)}</button></div>
      <div class="modal-body">
        <div class="tbd-task-header">
          <span class="tbd-task-title">${esc(task.title)}</span>
          ${catBadge}
          <span class="tbd-task-total">${fmtProgressTimeLong(total)} total</span>
        </div>
        ${sessions.length ? `
          <div class="tbd-section">
            <div class="tbd-section-title">By day</div>
            ${dayBars}
          </div>
          <div class="tbd-section">
            <div class="tbd-section-title">Sessions (${sessions.length})</div>
            <div class="tbd-sessions">${sessionRows}</div>
          </div>
        ` : `<div class="empty-state"><div class="es-icon">⏱</div>No sessions recorded yet. Move this task to "In Progress" to start tracking.</div>`}
      </div>
    </div>`);
}

/* ============ Time Tracking Dashboard ============ */
function timeTrackDashboardHTML() {
  const tasks = state.tasks || [];
  // Aggregate by category and collect tracked tasks in single pass
  const catTime = {};
  let totalTime = 0;
  const topTasks = [];
  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];
    const secs = t.totalProgressTime || 0;
    if (secs > 0) {
      totalTime += secs;
      const cat = t.category || 'uncategorized';
      catTime[cat] = (catTime[cat] || 0) + secs;
      topTasks.push(t);
    }
  }
  // Sort categories by time desc
  const catEntries = Object.entries(catTime).sort((a, b) => b[1] - a[1]);
  // Top 5 tasks by time
  if (topTasks.length > 1) {
    topTasks.sort((a, b) => (b.totalProgressTime || 0) - (a.totalProgressTime || 0));
  }
  const top5 = topTasks.slice(0, 5);
  // Weekly comparison: this week vs last week
  const now = new Date();
  const dayOfWeek = (now.getDay() + 6) % 7; // Mon=0
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - dayOfWeek); weekStart.setHours(0, 0, 0, 0);
  const lastWeekStart = new Date(weekStart); lastWeekStart.setDate(weekStart.getDate() - 7);
  const lastWeekEnd = new Date(weekStart); lastWeekEnd.setMilliseconds(-1);
  let thisWeek = 0, lastWeek = 0;
  // Use pomoHistory for weekly data
  const pomoHist = state.pomoHistory || [];
  for (let i = 0; i < pomoHist.length; i++) {
    const s = pomoHist[i];
    const ts = s.startedAt || s.endedAt || 0;
    const d = new Date(ts);
    if (d >= weekStart) thisWeek += s.duration || 0;
    else if (d >= lastWeekStart && d < weekStart) lastWeek += s.duration || 0;
  }
  // Build category bars
  const maxCatTime = catEntries.length ? catEntries[0][1] : 1;
  const catBars = catEntries.map(([cat, secs]) => {
    const catObj = CATEGORIES.find(c => c.id === cat);
    const label = catObj ? catObj.label : (cat === 'uncategorized' ? '📋 Uncategorized' : cat);
    const color = catObj ? catObj.color : '#8b93a7';
    const pct = Math.round((secs / maxCatTime) * 100);
    return `<div class="tt-cat-row">
      <span class="tt-cat-label">${esc(label)}</span>
      <div class="tt-cat-bar"><div class="tt-cat-fill" style="width:${pct}%;background:${color}"></div></div>
      <span class="tt-cat-time">${fmtProgressTimeLong(secs)}</span>
    </div>`;
  }).join('');
  // Build top tasks
  const topRows = top5.map(t => {
    const catObj = CATEGORIES.find(c => c.id === t.category);
    const catBadge = catObj ? `<span class="tt-task-cat" style="background:${catObj.color}22;color:${catObj.color}">${catObj.label.split(' ')[0]}</span>` : '';
    const pct = totalTime > 0 ? Math.round((t.totalProgressTime / totalTime) * 100) : 0;
    return `<div class="tt-task-row">
      <span class="tt-task-title">${esc(t.title)}</span>
      ${catBadge}
      <span class="tt-task-pct">${pct}%</span>
      <span class="tt-task-time">${fmtProgressTimeLong(t.totalProgressTime)}</span>
    </div>`;
  }).join('');
  // Weekly comparison
  const weeklyTrend = thisWeek > lastWeek ? '📈' : thisWeek < lastWeek ? '📉' : '➡️';
  const weeklyTxt = lastWeek > 0 ? `${Math.round(((thisWeek - lastWeek) / lastWeek) * 100)}% vs last week` : 'First week of data';
  if (!totalTime && catEntries.length === 0) {
    return `<div class="empty-state"><div class="es-icon">⏱</div>Move tasks to "In Progress" to start tracking time.</div>`;
  }
  return `<div class="tt-summary">
      <div class="tt-stat">
        <div class="tt-stat-value">${fmtProgressTimeLong(thisWeek)}</div>
        <div class="tt-stat-label">This week</div>
      </div>
      <div class="tt-stat">
        <div class="tt-stat-value">${fmtProgressTimeLong(lastWeek)}</div>
        <div class="tt-stat-label">Last week</div>
      </div>
      <div class="tt-stat">
        <div class="tt-stat-value">${weeklyTrend} ${weeklyTxt}</div>
        <div class="tt-stat-label">Trend</div>
      </div>
    </div>
    ${catBars ? `<div class="tt-section"><div class="tt-section-title">By category</div>${catBars}</div>` : ''}
    ${topRows ? `<div class="tt-section"><div class="tt-section-title">Top tasks</div>${topRows}</div>` : ''}`;
}

/* ---------- Focus / Pomodoro history ---------- */
function recordPomoSession(taskId, durationSec, completed) {
  if (!state.pomoHistory) state.pomoHistory = [];
  const t = state.tasks.find(x => x.id === taskId);
  state.pomoHistory.unshift({
    id: uid(),
    taskId,
    taskTitle: t ? t.title : 'Unknown',
    category: t ? t.category : '',
    duration: durationSec,
    completed,
    at: Date.now()
  });
  logActivity(completed ? 'pomo.complete' : 'pomo.pause', (t ? t.title : 'Unknown') + ' — ' + fmtDur(durationSec), 'pomo');
  // Keep last 200 entries
  if (state.pomoHistory.length > 200) state.pomoHistory.length = 200;
}

function downloadFocusHistoryCSV() {
  const hist = state.pomoHistory || [];
  if (!hist.length) { toast('No focus sessions to export'); return; }
  const header = 'Date,Time,Task,Category,Duration (min),Duration (s),Completed';
  const rows = hist.map(h => {
    const d = new Date(h.at);
    const date = d.toLocaleDateString('en-CA'); // YYYY-MM-DD
    const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const cat = CATEGORIES.find(c => c.id === h.category);
    const catLabel = cat ? cat.label.replace(/^[^\w]+\s*/, '') : h.category;
    return [date, time, csvEsc(h.taskTitle), csvEsc(catLabel), Math.round(h.duration / 60), h.duration, h.completed ? 'Yes' : 'No'].join(',');
  }).join('\n');
  const blob = new Blob([header + '\n' + rows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'focus-history-' + new Date().toISOString().slice(0, 10) + '.csv';
  a.click();
  URL.revokeObjectURL(url);
  toast('📥 Exported ' + hist.length + ' sessions');
}

function csvEsc(s) {
  if (!s) return '';
  s = String(s);
  if (s.includes(',') || s.includes('\"') || s.includes('\n')) return '\"' + s.replace(/\"/g, '\"\"') + '\"';
  return s;
}



function duplicateTaskById(id) {
  const orig = state.tasks.find(t => t.id === id);
  if (!orig) return;
  captureUndo('Duplicate task');
  const copy = JSON.parse(JSON.stringify(orig));
  copy.id = uid();
  copy.title = copy.title + ' (Copy)';
  copy.createdAt = Date.now();
  copy.updatedAt = Date.now();
  state.tasks.unshift(copy);
  save();
  renderView();
  toast('Task duplicated 📋');
}
function shareText(title, text) {
  if (navigator.share) {
    navigator.share({ title, text }).catch(() => {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(title + '\n' + text).then(() => toast('Copied to clipboard 📋')).catch(() => {});
  }
}

setupTasksController({
  get state() { return state; },
  $, $$, toast, captureUndo, logActivity, save, parseNaturalLanguageTask, uid, todayISO,
  goalProgressToast, trackProgressTime, applyTaskGoalProgress, 
  currentView, closeModal,
  bindFilterInput, esc, openModal, renderView,
  viewRoot, isMobile, updateOnlineStatus,
  getStudentsList, openStudentDossier, openTimeBreakdownModal, toggleTaskDone,
  bindTaskPomoButtons, tagSpan, ic, taskPomoHTML, vaultLinkPickerHTML,
  openVaultModal, getPeriods: () => (typeof PERIODS !== 'undefined' ? PERIODS : []),
  duplicateTaskById, shareText, blobDelete, blobGet, blobPut, vaultBlobGet,
  callGemini, tombstone, playChime, recordPomoSession, offerFocusHabitProtect,
  get taskFilter() { return taskFilter; },
  set taskFilter(v) { taskFilter = v; },
  get taskShowArchived() { return taskShowArchived; },
  set taskShowArchived(v) { taskShowArchived = v; }
});
/* ============ Goals ============ */
function goalProgress(g) {
  if (!g.keyResults || !g.keyResults.length) return 0;
  const sum = g.keyResults.reduce((s, kr) => s + (kr.target > 0 ? clamp(kr.current, 0, kr.target) / kr.target : 0), 0);
  return Math.round((sum / g.keyResults.length) * 100);
}
function goalCardHTML(g) {
  const pct = goalProgress(g);
  const today = todayISO();
  const goalOverdue = g.due && g.due < today && pct < 100;
  const krs = (g.keyResults || []).map(kr => {
    const p = kr.target > 0 ? clamp(kr.current, 0, kr.target) / kr.target * 100 : 0;
    const krOverdue = kr.due && kr.due < today && kr.current < kr.target;
    const dueTxt = kr.due ? ` · <span class="${krOverdue ? 'kr-overdue' : ''}">${krOverdue ? '⚠ ' : ''}${fmtShort(kr.due)}</span>` : '';
    return `<div class="kr-row">
      <div class="kr-label"><div class="kr-name">${esc(kr.title)}</div><div class="kr-nums">${kr.current} / ${kr.target}${dueTxt}</div></div>
      <div class="bar"><div class="bar-fill" style="width:${p}%;background:${g.color}"></div></div>
      <input class="kr-input" type="number" min="0" max="${kr.target}" value="${kr.current}" data-kr="${kr.id}" data-goal="${g.id}" title="Update progress">
    </div>`;
  }).join('');
  return `<div class="goal-card" data-goal="${g.id}">
    <div class="goal-head">
      <div class="goal-color" style="background:${g.color}"></div>
      <div class="goal-title-row">
        <div style="flex:1">
          <div class="goal-title">${esc(g.title)}</div>
          ${g.desc ? `<div class="goal-desc">${esc(g.desc)}</div>` : ''}
        </div>
        <div class="goal-pct" style="color:${g.color}">${pct}%</div>
      </div>
    </div>
    <div class="goal-body">
      <div class="goal-progress-row">
        <div class="bar"><div class="bar-fill" style="width:${pct}%"></div></div>
      </div>
      ${krs}
    </div>
    ${(g.tags && g.tags.length) ? `<div class="goal-tags">${g.tags.map(t => `<span class="tag kr-tag" data-goal-tag="${esc(t)}" title="Filter goals by #${esc(t)}">${esc(t)}</span>`).join('')}</div>` : ''}
    ${(g.linkedStudentIds && g.linkedStudentIds.length) ? `<div class="goal-tags">${g.linkedStudentIds.map(id => { const s = getStudentsList().find(x => x.id === id); return s ? `<span class="chip chip-student">🎓 ${esc(s.name)}</span>` : ''; }).join('')}</div>` : ''}
    <div class="goal-foot">
      <span class="goal-created">Started ${fmtShort(isoDate(new Date(g.createdAt)))}${g.due ? ` · ${goalOverdue ? '<span class="kr-overdue">⚠ overdue ' : 'due '}${fmtShort(g.due)}${goalOverdue ? '</span>' : ''}` : ''}</span>
      <div style="display:flex;gap:4px">
        <button class="btn-icon" data-edit-goal="${g.id}" title="Edit">${ic('pencil', 15)}</button>
        <button class="btn-icon" data-del-goal="${g.id}" title="Delete">${ic('trash', 15)}</button>
      </div>
    </div>
  </div>`;
}
/* ---- Shared row-windowed virtualization for card grids (Goals, Achievements) ---- */
function createGridVirt(opts) {
  const s = { top: 0, timer: 0, measureT: 0, cols: 0, h: new Map(), key: '' };
  function metrics() {
    const grid = $(opts.gridId);
    const w = grid ? grid.clientWidth : opts.width;
    const cols = Math.max(1, Math.floor((w + opts.gap) / (opts.minCard + opts.gap)));
    const items = opts.items();
    const n = items.length;
    const rows = Math.ceil(n / cols);
    const rowH = [];
    for (let r = 0; r < rows; r++) {
      let mx = 0;
      for (let i = r * cols; i < Math.min((r + 1) * cols, n); i++) mx = Math.max(mx, s.h.get(opts.itemKey(items[i])) || 0);
      rowH.push(mx || opts.estimate); // estimated until measured
    }
    const off = [0];
    for (let r = 0; r < rows; r++) off.push(off[r] + rowH[r]);
    return { cols, rows, rowH, off, total: off[rows] };
  }
  function render() {
    const grid = $(opts.gridId);
    if (!grid) return;
    const items = opts.items();
    if (!items.length) return;
    if (opts.key) { const k = opts.key(); if (k !== s.key) { s.key = k; s.h.clear(); } }
    const m = metrics();
    s.cols = m.cols;
    const ctx = opts.prepare ? opts.prepare() : null;
    const clientH = grid.clientHeight || 500;
    let r0 = 0;
    while (r0 < m.rows && m.off[r0 + 1] < s.top - 300) r0++;
    let r1 = r0;
    while (r1 < m.rows && m.off[r1 + 1] - m.off[r0] < clientH + 600) r1++;
    r1 = Math.min(m.rows, r1 + 1);
    const firstIdx = r0 * m.cols, lastIdx = Math.min(items.length, r1 * m.cols);
    grid.innerHTML =
      (r0 > 0 ? `<div style="grid-column:1/-1;height:${m.off[r0]}px"></div>` : '') +
      items.slice(firstIdx, lastIdx).map(it => opts.renderCard(it, ctx)).join('') +
      (r1 < m.rows ? `<div style="grid-column:1/-1;height:${m.total - m.off[r1]}px"></div>` : '');
    const txt = $(opts.rangeTxtId);
    if (txt) {
      const rt = opts.rangeText ? opts.rangeText(firstIdx, lastIdx, items.length) : null;
      if (rt) {
        txt.textContent = rt.text;
        txt.classList.toggle('flt', !!rt.filtered);
      } else {
        txt.textContent = `${firstIdx + 1}–${lastIdx} of ${items.length}`;
        txt.classList.remove('flt');
      }
    }
    if (opts.bindCards) opts.bindCards(grid);
    clearTimeout(s.measureT);
    s.measureT = setTimeout(() => {
      if (!grid.isConnected) return;
      let changed = false;
      $$(opts.cardSel, grid).forEach(card => {
        const key = opts.cardKeyOf(card);
        const hh = card.offsetHeight;
        if (key && hh > 0 && s.h.get(key) !== hh) { s.h.set(key, hh); changed = true; }
      });
      if (changed) { const st = grid.scrollTop; render(); grid.scrollTop = st; }
    }, 30);
  }
  function bind() {
    const gwin = $(opts.gridId);
    if (!gwin) return;
    gwin.scrollTop = s.top;
    gwin.addEventListener('scroll', () => {
      s.top = gwin.scrollTop;
      if (s.timer) return;
      s.timer = setTimeout(() => { s.timer = 0; if (gwin.isConnected) render(); }, 24);
    });
    const jt = $(opts.jumpTopId), jb = $(opts.jumpBottomId);
    if (jt) jt.addEventListener('click', () => { s.top = 0; gwin.scrollTo({ top: 0, behavior: 'smooth' }); });
    if (jb) jb.addEventListener('click', () => { const target = metrics().total; s.top = target; gwin.scrollTo({ top: target, behavior: 'smooth' }); });
  }
  return { render, bind, setTop: v => { s.top = v; } };
}
/* ---- Goals grid instance ---- */
let goalFilterTag = '';
let goalItems = [];
const GOAL_WIN_THRESHOLD = 40;
const goalVirt = createGridVirt({
  gridId: '#goals-grid', rangeTxtId: '#goals-range-txt',
  jumpTopId: '#goals-jump-top', jumpBottomId: '#goals-jump-bottom',
  items: () => goalItems, itemKey: g => g.id, cardKeyOf: c => c.dataset.goal, cardSel: '.goal-card',
  renderCard: g => goalCardHTML(g), bindCards: grid => bindGoalActions(grid),
  width: 660, minCard: 330, gap: 14, estimate: 175,
  key: () => goalFilterTag + '|' + goalItems.length + '|' + state.goals.reduce((s2, g) => s2 + (g.updatedAt || 0), 0),
  // when a tag filter narrows goals, the range footer becomes an m / N accent badge
  rangeText: (f, l, total) => goalFilterTag ? { text: `${goalItems.length} / ${state.goals.length}`, filtered: true } : null
});
function bindGoalActions(scope) {
  $$('[data-goal-tag]', scope).forEach(b => b.addEventListener('click', () => {
    goalFilterTag = b.dataset.goalTag;
    renderGoals();
  }));
  $$('[data-edit-goal]', scope).forEach(b => b.addEventListener('click', () => openGoalModal(state.goals.find(g => g.id === b.dataset.editGoal))));
  $$('[data-del-goal]', scope).forEach(b => b.addEventListener('click', () => {
    const g = state.goals.find(x => x.id === b.dataset.delGoal);
    if (g && confirm(`Delete goal “${g.title}”?`)) {
      state.goals = state.goals.filter(x => x.id !== g.id);
      tombstone('goals', g.id);
      if (state.krHistory) state.krHistory = state.krHistory.filter(h => h.goalId !== g.id);
      save(); renderGoals(); toast('Goal deleted');
    }
  }));
  $$('.kr-input', scope).forEach(inp => inp.addEventListener('change', () => {
    const g = state.goals.find(x => x.id === inp.dataset.goal);
    const kr = g && (g.keyResults || []).find(k => k.id === inp.dataset.kr);
    if (g && kr) {
      kr.current = clamp(parseFloat(inp.value) || 0, 0, kr.target);
      g.updatedAt = Date.now();
      save(); recordGoalSnapshot(g); renderGoals();
    }
  }));
}

function renderGoals() {
  const allTags = [...new Set(state.goals.flatMap(g => g.tags || []))].sort();
  goalItems = goalFilterTag ? state.goals.filter(g => (g.tags || []).includes(goalFilterTag)) : state.goals;
  const long = goalItems.length > GOAL_WIN_THRESHOLD;
  const empty = goalFilterTag
    ? `<div class="empty-state"><div class="es-icon">🏷️</div>No goals tagged “${esc(goalFilterTag)}”.</div>`
    : '<div class="empty-state"><div class="es-icon">🎯</div>No goals yet. Set your first one.<br><br><button class="btn btn-accent" id="goal-new-empty">+ New goal</button></div>';
  const cards = long ? '' : (goalItems.map(goalCardHTML).join('') || empty);

  const radialRingsHTML = state.goals.length ? `<div class="radial-rings-grid">${state.goals.slice(0, 4).map(g => {
    const prog = goalProgress(g);
    const r = 30;
    const circ = 2 * Math.PI * r;
    const offset = circ * (1 - prog / 100);
    const krCount = (g.keyResults || []).length;
    return `<div class="radial-ring-card">
      <div style="position:relative;width:76px;height:76px;flex-shrink:0">
        <svg viewBox="0 0 76 76" class="radial-ring-svg">
          <circle cx="38" cy="38" r="${r}" class="radial-ring-bg"/>
          <circle cx="38" cy="38" r="${r}" class="radial-ring-fill" stroke="${g.color || 'var(--accent)'}" stroke-dasharray="${circ}" stroke-dashoffset="${offset}"/>
        </svg>
        <div class="radial-ring-center">${prog}%</div>
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(g.title)}">${esc(g.title)}</div>
        <div class="muted" style="font-size:11px;margin-top:2px">${krCount} key result${krCount === 1 ? '' : 's'}${g.due ? ' · due ' + fmtShort(g.due) : ''}</div>
      </div>
    </div>`;
  }).join('')}</div>` : '';

  updateNavBadges();
  viewRoot().innerHTML = `
    ${radialRingsHTML}
    <div class="toolbar">
      <span class="muted">${goalFilterTag ? `<span class="si-badge si-count">${goalItems.length} / ${state.goals.length}</span> goal${goalItems.length === 1 ? '' : 's'}` : `${state.goals.length} goal${state.goals.length === 1 ? '' : 's'}`}</span>
      <select id="goal-tag" ${allTags.length ? '' : 'disabled'}>
        <option value="">All tags</option>
        ${allTags.map(t => `<option value="${esc(t)}" ${t === goalFilterTag ? 'selected' : ''}>${esc(t)}</option>`).join('')}
      </select>
      ${goalFilterTag ? `<span class="task-tag-chip" id="goal-tag-chip" title="Clear tag filter">#${esc(goalFilterTag)} ✕</span>` : ''}
      <div style="flex:1"></div>
      <button class="btn btn-accent" id="goal-new">${ic('plus', 15)} New goal</button>
    </div>
    ${long
      ? `<div class="goals-win-wrap"><div class="goals-grid win" id="goals-grid"></div><div class="dash-win-range goals-range" id="goals-range"><button class="jump-btn" id="goals-jump-top" title="Jump to top">⤒ Top</button><span id="goals-range-txt"></span><button class="jump-btn" id="goals-jump-bottom" title="Jump to bottom">⤓ Bottom</button></div></div>`
      : `<div class="goals-grid" id="goals-grid">${cards}</div>`}`;

  if (long) {
    goalVirt.render();
    goalVirt.bind();
  } else {
    bindGoalActions($('#goals-grid'));
  }
  const gtag = $('#goal-tag');
  if (gtag) gtag.addEventListener('change', e => { goalFilterTag = e.target.value; renderGoals(); });
  const gchip = $('#goal-tag-chip');
  if (gchip) gchip.addEventListener('click', () => { goalFilterTag = ''; renderGoals(); });
  $$('#goal-new, #goal-new-empty').forEach(b => b.addEventListener('click', () => openGoalModal()));
}

function openGoalModal(goal) {
  const g = goal || { title: '', desc: '', color: COLORS[0], keyResults: [{ id: uid(), title: '', target: 10, current: 0 }], linkedStudentIds: [] };
  const swatches = COLORS.map(c => `<button class="swatch ${c === g.color ? 'active' : ''}" data-color="${c}" style="background:${c}"></button>`).join('');
  const krRows = (g.keyResults || []).map(kr => krRowHTML(kr)).join('');
  const _goalStudents = getStudentsList();
  const _goalLinked = new Set(g.linkedStudentIds || []);
  const studentToggles = _goalStudents.length ? `
        <div class="field"><label class="field-label">Linked students</label>
          <div class="g-student-toggles">
            ${_goalStudents.map(s => `<button type="button" class="g-student-toggle${_goalLinked.has(s.id) ? ' active' : ''}" data-sid="${s.id}">🎓 ${esc(s.name)}</button>`).join('')}
          </div>
        </div>` : '';
  const vaultPickerGoal = `<div class="field"><label class="field-label" id="g-vault-resources-label">Vault resources</label><div class="vault-link-grid" id="g-vault-picker" role="group" aria-labelledby="g-vault-resources-label">${state.vaultItems.slice(0,40).map(v=>`<label class="vault-link-check"><input type="checkbox" value="${v.id}" ${(g.vaultIds||[]).includes(v.id)?'checked':''}> ${vaultTypeIcon(v.type)} ${esc(v.title.slice(0,32))}</label>`).join('') || '<span class="muted" style="font-size:12px">No vault items</span>'}</div></div>`;
  openModal(`
    <div class="modal">
      <div class="modal-head"><h3>${goal ? 'Edit goal' : 'New goal'}</h3><button class="btn-icon" data-close-modal>${ic('x', 16)}</button></div>
      <div class="modal-body">
        <div class="field"><label for="g-title" class="field-label">Goal title</label><input id="g-title" type="text" value="${esc(g.title)}" placeholder="e.g. Get healthier"></div>
        <div class="field"><label for="g-desc" class="field-label">Description</label><input id="g-desc" type="text" value="${esc(g.desc)}" placeholder="Why does this matter?"></div>
        <div class="field"><label for="g-tags" class="field-label">Tags (comma separated)</label><input id="g-tags" type="text" value="${esc((g.tags || []).join(', '))}" placeholder="work, health, launch"></div>
        <div class="field-row">
          <div class="field"><label for="g-due" class="field-label">Target date</label><input id="g-due" type="date" value="${g.due || ''}"></div>
          <div class="field"><label class="field-label" id="g-color-label">Color</label><div class="swatches" role="group" aria-labelledby="g-color-label">${swatches}</div></div>
        </div>
        <div class="field"><label class="field-label" id="kr-label">Key results</label>
          <div id="kr-rows" role="group" aria-labelledby="kr-label">${krRows}</div>
          <button class="btn btn-sm btn-ghost" id="kr-add">${ic('plus', 13)} Add key result</button>
        </div>
        ${studentToggles}
        ${vaultPickerGoal}
      </div>
      <div class="modal-foot">
        ${goal ? `<button class="btn btn-danger" id="g-delete">Delete</button>` : ''}
        <div style="flex:1"></div>
        <button class="btn btn-ghost" data-close-modal>Cancel</button>
        <button class="btn btn-accent" id="g-save">Save</button>
      </div>
    </div>`);
  $$('.swatch').forEach(s => s.addEventListener('click', () => {
    $$('.swatch').forEach(x => x.classList.remove('active'));
    s.classList.add('active');
  }));
  $$('.g-student-toggle').forEach(b => b.addEventListener('click', () => b.classList.toggle('active')));
  $('#kr-add').addEventListener('click', () => {
    $('#kr-rows').insertAdjacentHTML('beforeend', krRowHTML({ id: uid(), title: '', target: 10, current: 0 }));
    bindKrRemove();
  });
  bindKrRemove();
  $('#g-save').addEventListener('click', () => {
    const title = $('#g-title').value.trim();
    if (!title) { toast('Give the goal a title', 'error'); return; }
    const color = $('.swatch.active') ? $('.swatch.active').dataset.color : COLORS[0];
    const krs = $$('#kr-rows .kr-row').map(row => ({
      id: row.dataset.kr,
      title: $('input.kr-name-inp', row).value.trim(),
      target: parseFloat($('input.kr-target-inp', row).value) || 1,
      current: parseFloat($('input.kr-current-inp', row).value) || 0,
      due: $('input.kr-due-inp', row).value || ''
    })).filter(k => k.title);
    const tags = [...new Set($('#g-tags').value.split(',').map(s => s.trim().toLowerCase().replace(/^#/, '')).filter(Boolean))];
    const linkedStudentIds = $$('.g-student-toggle.active', $('#modal-root') || document).map(b => b.dataset.sid);
    const modalRoot = $('#modal-root');
    const vaultIds = [...(modalRoot ? modalRoot.querySelectorAll('#g-vault-picker input:checked') : document.querySelectorAll('#g-vault-picker input:checked'))].map(i=>i.value);
    const data = { title, desc: $('#g-desc').value.trim(), color, keyResults: krs, due: $('#g-due').value || '', tags, linkedStudentIds, vaultIds };
    let target;
    const prevVaultIdsGoal = goal ? (goal.vaultIds||[]) : [];
    const newVaultIdsGoal = data.vaultIds||[];
    if (goal) { Object.assign(goal, data); goal.updatedAt = Date.now(); target = goal; logActivity('goal.edit', title, 'goal'); }
    else { target = Object.assign({ id: uid(), createdAt: Date.now(), updatedAt: Date.now() }, data); state.goals.push(target); logActivity('goal.create', title, 'goal'); }
    // sync vault reverse for goal
    const goalIdForVault = target.id;
    const allGoalVaultIds = new Set([...prevVaultIdsGoal, ...newVaultIdsGoal]);
    allGoalVaultIds.forEach(vid=>{
      const v=state.vaultItems.find(x=>x.id===vid); if(!v) return;
      if(!Array.isArray(v.linkedGoalIds)) v.linkedGoalIds=[];
      const shouldHave=newVaultIdsGoal.includes(vid);
      const has=v.linkedGoalIds.includes(goalIdForVault);
      if(shouldHave && !has){ v.linkedGoalIds.push(goalIdForVault); v.updatedAt=Date.now(); if(!state._vaultItemsMeta) state._vaultItemsMeta={}; state._vaultItemsMeta[v.id]=Date.now(); }
      if(!shouldHave && has){ v.linkedGoalIds=v.linkedGoalIds.filter(id=>id!==goalIdForVault); v.updatedAt=Date.now(); if(!state._vaultItemsMeta) state._vaultItemsMeta={}; state._vaultItemsMeta[v.id]=Date.now(); }
    });
    save(); recordGoalSnapshot(target); closeModal(); renderView();
    toast(goal ? 'Goal updated' : 'Goal created 🎯');
  });
  const del = $('#g-delete');
  if (del) del.addEventListener('click', () => {
    logActivity('goal.delete', goal.title, 'goal');
    state.goals = state.goals.filter(x => x.id !== goal.id);
    save(); closeModal(); renderGoals(); toast('Goal deleted');
  });
}
function krRowHTML(kr) {
  return `<div class="kr-row kr-editor-row" data-kr="${kr.id}">
    <input class="kr-name-inp" type="text" value="${esc(kr.title)}" placeholder="Key result (e.g. Run 100 km)">
    <input class="kr-current-inp" type="number" min="0" value="${kr.current}" placeholder="now">
    <span class="muted" style="font-size:12px">/</span>
    <input class="kr-target-inp" type="number" min="1" value="${kr.target}" placeholder="target">
    <input class="kr-due-inp" type="date" value="${kr.due || ''}" title="Due date (optional)">
    <button class="btn-icon kr-remove" title="Remove">${ic('x', 14)}</button>
  </div>`;
}
function bindKrRemove() {
  $$('.kr-remove').forEach(b => {
    if (b.dataset.bound) return;
    b.dataset.bound = '1';
    b.addEventListener('click', () => b.closest('.kr-row').remove());
  });
}

/* ============ Habits ============ */
/* Streak walks step through check-in dates with per-day Date math — expensive when run
   for every habit on every render (dashboard, review, achievements, habits views). Cache
   per (habit, updatedAt): check-ins bump updatedAt via toggleHabitDate, so entries stay
   fresh; a size cap keeps the cache bounded. */
let streakCache = new Map();
function cachedStreak(h, suffix, fn) {
  const k = h.id + '|' + (h.updatedAt || 0) + '|' + suffix;
  const v = streakCache.get(k);
  if (v !== undefined) return v;
  const r = fn();
  if (streakCache.size > 4000) streakCache.clear();
  streakCache.set(k, r);
  return r;
}
function habitStreak(h) {
  return cachedStreak(h, todayISO(), () => window.LumenLib.habits.currentStreak(h.dates || {}, h.freezes || {}, todayISO()));
}
// Streak arithmetic is owned by src/habits/store.js; cachedStreak wraps it here
// because caching is a rendering concern, not a data concern.
function habitBest(h) {
  return cachedStreak(h, 'best', () => window.LumenLib.habits.bestStreak(h.dates || {}, h.freezes || {}, todayISO()));
}
function toggleHabitDate(h, date) {
  if (date > todayISO()) return;
  if (!h.dates) h.dates = {};
  if (h.dates[date]) {
    delete h.dates[date];
    logActivity('habit.uncheck', h.emoji + ' ' + h.name + ' (' + date + ')', 'habit');
  } else {
    h.dates[date] = true;
    if (h.freezes && h.freezes[date]) delete h.freezes[date];
    logActivity('habit.check', h.emoji + ' ' + h.name + ' (' + date + ')', 'habit');
    playChime('habit-check');
  }
  h.updatedAt = Date.now();
  save();
  evaluateAchievements();
}
function toggleHabitFreeze(h, date) {
  if (date > todayISO()) return;
  if (!h.freezes) h.freezes = {};
  if (h.freezes[date]) {
    delete h.freezes[date];
    logActivity('habit.unfreeze', h.emoji + ' ' + h.name + ' (' + date + ')', 'habit');
    toast(`Unfroze ${h.name} for ${date}`);
  } else {
    h.freezes[date] = true;
    if (h.dates && h.dates[date]) delete h.dates[date];
    logActivity('habit.freeze', h.emoji + ' ' + h.name + ' (' + date + ')', 'habit');
    toast(`🛡️ Streak frozen for ${h.name} on ${date}!`);
  }
  h.updatedAt = Date.now();
  save();
}
function weekDays() {
  const now = new Date();
  const dow = (now.getDay() + 6) % 7; // Mon = 0
  const out = [];
  for (let i = 0; i < 7; i++) out.push(isoDate(shiftDays(i - dow)));
  return out;
}
/* The 16-week heatmap window is identical for every habit on a given day, so the 112
   date cells are computed ONCE per render (buildHeatCells) and shared. Each habit's
   rendered block is also cached until its check-ins change (updatedAt bumps on check-in),
   so re-renders of the habits grid only rebuild the habits that actually changed. */
let heatTodayKey = '';
let heatCells = [];
let heatCache = new Map();
function buildHeatCells() {
  const today = new Date();
  // Anchor the 112-cell window to the CURRENT week (ending Sunday) so today is always
  // inside it. The old start-anchored window drifted up to 6 days short of today,
  // which made the "today" highlight disappear depending on the weekday.
  const dow = (today.getDay() + 6) % 7; // Mon = 0
  const start = shiftDays(-15 * 7 - dow);
  heatCells = [];
  for (let w = 0; w < 16; w++) {
    for (let d = 0; d < 7; d++) {
      const dt = shiftDays(w * 7 + d, start);
      heatCells.push({ key: isoDate(dt), future: dt > today });
    }
  }
}
function heatmapHTML(h) {
  const ck = h.id + '|' + (h.updatedAt || 0) + '|' + heatTodayKey;
  const hit = heatCache.get(ck);
  if (hit !== undefined) return hit;
  let run = 0;
  const before = new Date(heatCells[0].key + 'T00:00:00'); before.setDate(before.getDate() - 1);
  const hDates = h.dates || {};
  const hFreezes = h.freezes || {};
  if (hDates[isoDate(before)]) {
    const c = new Date(before);
    while (hDates[isoDate(c)]) { run++; c.setDate(c.getDate() - 1); }
  }
  let html = '';
  heatCells.forEach(c => {
    const on = !!(hDates[c.key]);
    const frozen = !!(hFreezes[c.key]);
    let cls = 'hm';
    if (on) { run++; cls += ' l' + clamp(Math.ceil(run / 3), 1, 3); }
    else if (frozen) { cls += ' frozen'; }
    else run = 0;
    if (c.key === heatTodayKey) cls += ' today';
    if (c.future) cls += ' future';
    html += `<span class="${cls}" title="${c.key}: ${on ? 'done' : frozen ? 'streak protected ❄' : c.future ? '—' : 'missed'}"></span>`;
  });
  if (heatCache.size > 4000) heatCache.clear();
  heatCache.set(ck, html);
  return html;
}
const WEEK_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(l => `<span class="day-label">${l}</span>`).join('');
function habitCardHTML(h) {
  const today = todayISO();
  const days = weekDays();
  const target = h.weeklyTarget || 7;
  const isWeekly = h.freqType === 'weekly' && target < 7;
  const doneThisWeek = days.filter(d => h.dates && h.dates[d]).length;
  const weeklyPill = isWeekly ? `<span class="hc-weekly-pill ${doneThisWeek >= target ? 'met' : ''}" title="Weekly target">${doneThisWeek >= target ? '✅ ' : '🎯 '}${doneThisWeek}/${target} this wk</span>` : '';
  const weekCells = days.map(day => {
    const on = !!(h.dates && h.dates[day]);
    const frozen = !!(h.freezes && h.freezes[day]);
    const isToday = day === today;
    const future = day > today;
    const cls = `day ${on ? 'on' : ''} ${frozen ? 'frozen' : ''} ${isToday ? 'today' : ''} ${future ? 'future' : ''}`;
    const icon = on ? '✓' : frozen ? '❄' : isToday ? '·' : '';
    return `<span class="${cls}" data-date="${day}" data-habit="${h.id}" title="${fmtFull(day)}${frozen ? ' (Streak Protected ❄)' : ''}">${icon}</span>`;
  }).join('');
  return `<div class="habit-card" data-habit="${h.id}">
    <div class="habit-head">
      <div class="habit-emoji" style="border-color:${h.color}33;background:${h.color}1a">${h.emoji}</div>
      <div style="flex:1;min-width:0">
        <div class="habit-name">${esc(h.name)} ${weeklyPill}</div>
        <div class="habit-stats"><span>🔥 <b>${habitStreak(h)}</b> day streak</span><span>🏆 best <b>${habitBest(h)}</b></span> ${linkGraphForHabit(h)}</div>
      </div>
      <button class="btn-icon" data-freeze-habit="${h.id}" title="Toggle streak freeze for today">❄️</button>
      <button class="btn-icon" data-del-habit="${h.id}" title="Delete habit">${ic('trash', 15)}</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:4px">${WEEK_LABELS}</div>
    <div class="week">${weekCells}</div>
    <div class="heatmap">${heatmapHTML(h)}</div>
    <div class="heatmap-legend"><span>Less</span><span class="hm"></span><span class="hm l1"></span><span class="hm l2"></span><span class="hm l3"></span><span>More</span></div>
  </div>`;
}
/* ---- Persisted Habits view position ----
   Each habit card's heatmap is a horizontally scrollable 16-week strip, and cards unmount
   when they leave the windowed grid — so both the grid's vertical position and every
   heatmap's horizontal position would reset on revisit. Keep per-habit scrollLeft in a
   Map (restored on every card mount, including re-windowed ones) and persist {grid top,
   per-habit heatmap scrolls} to localStorage so returning — even after a reload — lands
   where you were scrolling. */
const HABIT_VIEW_KEY = 'lumen.habits.view';
let habitHeatScroll = new Map(); // habitId -> heatmap scrollLeft
let habitGridTop = 0;
let habitViewLoaded = false;
let habitViewSaveT = 0;
function loadHabitView() {
  if (habitViewLoaded) return;
  habitViewLoaded = true;
  try {
    const raw = JSON.parse(localStorage.getItem(HABIT_VIEW_KEY) || 'null');
    if (raw && typeof raw.top === 'number') habitGridTop = raw.top;
    if (raw && raw.heat && typeof raw.heat === 'object') {
      Object.keys(raw.heat).forEach(id => { if (typeof raw.heat[id] === 'number') habitHeatScroll.set(id, raw.heat[id]); });
    }
  } catch (e) { /* ignore */ }
}
function persistHabitView() {
  const grid = $('#habits-grid');
  if (grid) habitGridTop = grid.scrollTop;
  const live = new Set(state.habits.map(h => h.id));
  const heat = {};
  habitHeatScroll.forEach((v, id) => { if (live.has(id) && v > 0) heat[id] = v; });
  try { localStorage.setItem(HABIT_VIEW_KEY, JSON.stringify({ top: habitGridTop || 0, heat })); } catch (e) { /* ignore */ }
}
function scheduleHabitViewSave() {
  clearTimeout(habitViewSaveT);
  habitViewSaveT = setTimeout(persistHabitView, 500);
}
if (typeof window !== 'undefined') { window.addEventListener('pagehide', () => { if (habitViewLoaded) persistHabitView(); }); }
function bindHabitCards(scope) {
  const grid = scope && scope.id === 'habits-grid' ? scope : null;
  if (grid && !grid.dataset.hmBound) {
    grid.dataset.hmBound = '1';
    grid.addEventListener('scroll', e => {
      const t = e.target;
      if (t === grid) { habitGridTop = grid.scrollTop; scheduleHabitViewSave(); return; }
      if (!t.classList || !t.classList.contains('heatmap')) return;
      const card = t.closest('.habit-card');
      if (card) { habitHeatScroll.set(card.dataset.habit, t.scrollLeft); scheduleHabitViewSave(); }
    }, true);
  }
  $$('.habit-card', scope).forEach(card => {
    const left = habitHeatScroll.get(card.dataset.habit);
    if (left) { const hm = card.querySelector('.heatmap'); if (hm) hm.scrollLeft = left; }
  });
  $$('.day[data-habit]', scope).forEach(day => day.addEventListener('click', () => {
    if (day.classList.contains('future')) return;
    const h = state.habits.find(x => x.id === day.dataset.habit);
    if (h) { toggleHabitDate(h, day.dataset.date); renderHabits(); }
  }));
  $$('[data-freeze-habit]', scope).forEach(b => b.addEventListener('click', () => {
    const h = state.habits.find(x => x.id === b.dataset.freezeHabit);
    if (h) {
      toggleHabitFreeze(h, todayISO());
      renderHabits();
    }
  }));
  $$('[data-del-habit]', scope).forEach(b => b.addEventListener('click', () => {
    const h = state.habits.find(x => x.id === b.dataset.delHabit);
    if (h && confirm(`Delete habit “${h.name}”?`)) {
      state.habits = state.habits.filter(x => x.id !== h.id);
      habitHeatScroll.delete(h.id);
      tombstone('habits', h.id);
      save(); renderHabits(); toast('Habit deleted');
    }
  }));
}
/* ---- Windowed habits grid: only visible heatmap cards are in the DOM, so the view stays
   instant at hundreds of habits (each card is ~140 elements, incl. a 112-cell heatmap). ---- */
const HABIT_WIN_THRESHOLD = 24;
let habitFilterQ = ''; // per-habit name filter — typing filters the grid without scrolling
let habitItems = [];
const habitVirt = createGridVirt({
  gridId: '#habits-grid', rangeTxtId: '#habits-range-txt',
  jumpTopId: '#habits-jump-top', jumpBottomId: '#habits-jump-bottom',
  items: () => habitItems, itemKey: h => h.id, cardKeyOf: c => c.dataset.habit, cardSel: '.habit-card',
  renderCard: h => habitCardHTML(h), bindCards: grid => bindHabitCards(grid),
  width: 700, minCard: 300, gap: 14, estimate: 270,
  key: () => habitFilterQ + '|' + habitItems.length + '|' + state.habits.reduce((s2, h) => s2 + (h.updatedAt || 0), 0)
});
function renderHabits() {
  const today = todayISO();
  heatTodayKey = today;
  buildHeatCells();
  habitItems = habitFilterQ
    ? state.habits.filter(h => h.name.toLowerCase().includes(habitFilterQ))
    : state.habits;
  const long = habitItems.length > HABIT_WIN_THRESHOLD;
  const cards = long ? '' : habitItems.map(habitCardHTML).join('');
  const stripHTML = (() => {
    if (!long) return '';
    const top = habitItems
      .map(h => ({ h, streak: habitStreak(h) }))
      .filter(x => x.streak > 0)
      .sort((a, b) => b.streak - a.streak || a.h.name.localeCompare(b.h.name))
      .slice(0, 8);
    if (!top.length) return '';
    top.forEach(x => { x.best = habitBest(x.h); });
    return `<div class="habit-strip">
      <span class="habit-strip-title">🔥 Top streaks</span>
      <div class="habit-strip-chips">${top.map(x => `<span class="habit-strip-chip" title="Best ${x.best}d">${x.h.emoji} ${esc(x.h.name)} <b>${x.streak}d</b></span>`).join('')}</div>
    </div>`;
  })();
  const empty = habitItems.length === 0
    ? (habitFilterQ
        ? `<div class="empty-state"><div class="es-icon">🔍</div>No habits match “${esc(habitFilterQ)}”.<br><br><button class="btn btn-ghost" id="habit-q-clear-empty">Clear filter</button></div>`
        : '<div class="empty-state"><div class="es-icon">🌱</div>No habits yet. Start building one.<br><br><button class="btn btn-accent" id="habit-new-empty">+ New habit</button></div>')
    : '';
  viewRoot().innerHTML = `
    <div class="toolbar">
      ${state.habits.length ? `<input type="text" class="search-input" id="habit-q" placeholder="Filter habits…" value="${esc(habitFilterQ)}">` : ''}
      <span class="muted">${habitFilterQ
        ? `<span class="si-badge si-count">${habitItems.length} / ${state.habits.length}</span> matching · tap a day to check in`
        : `${state.habits.length} habit${state.habits.length === 1 ? '' : 's'} · tap a day to check in · ❄️ to freeze`}</span>
      <div style="flex:1"></div>
      ${habitFilterQ ? '<button class="btn btn-ghost" id="habit-q-clear">Clear</button>' : ''}
      <button class="btn btn-accent" id="habit-new">${ic('plus', 15)} New habit</button>
    </div>
    ${empty || (long
      ? `${stripHTML}<div class="habits-win-wrap"><div class="habits-grid win" id="habits-grid"></div><div class="dash-win-range habits-range" id="habits-range"><button class="jump-btn" id="habits-jump-top" title="Jump to top">⤒ Top</button><span id="habits-range-txt"></span><button class="jump-btn" id="habits-jump-bottom" title="Jump to bottom">⤓ Bottom</button></div></div>`
      : `<div class="habits-grid" id="habits-grid">${cards}</div>`)}`;

  if (long) {
    loadHabitView();
    if (habitGridTop) habitVirt.setTop(habitGridTop);
    habitVirt.render();
    habitVirt.bind();
  } else if (habitItems.length) {
    loadHabitView();
    bindHabitCards($('#habits-grid'));
  }
  const q = $('#habit-q');
  if (q) {
    q.addEventListener('input', e => {
      habitFilterQ = e.target.value.trim().toLowerCase();
      renderHabits();
      restoreFocus('#habit-q');
    });
  }
  $$('#habit-q-clear, #habit-q-clear-empty').forEach(cq => cq.addEventListener('click', () => { habitFilterQ = ''; renderHabits(); }));
  $$('#habit-new, #habit-new-empty').forEach(b => b.addEventListener('click', () => openHabitModal()));
}

function openHabitModal() {
  const emojiPicks = EMOJIS.map(e => `<button class="emoji-pick" data-emoji="${e}">${e}</button>`).join('');
  const swatches = COLORS.map(c => `<button class="swatch ${c === COLORS[1] ? 'active' : ''}" data-color="${c}" style="background:${c}"></button>`).join('');
  openModal(`
    <div class="modal">
      <div class="modal-head"><h3>New habit</h3><button class="btn-icon" data-close-modal>${ic('x', 16)}</button></div>
      <div class="modal-body">
        <div class="field"><label for="h-name" class="field-label">Habit name</label><input id="h-name" type="text" placeholder="e.g. Drink water" autofocus></div>
        <div class="field-row">
          <div class="field">
            <label for="h-freq-type" class="field-label">Frequency target</label>
            <select id="h-freq-type">
              <option value="daily" selected>Daily (Every day)</option>
              <option value="weekly">Weekly Target (X days / week)</option>
            </select>
          </div>
          <div class="field" id="h-weekly-field" style="display:none">
            <label for="h-weekly-target" class="field-label">Days per week</label>
            <select id="h-weekly-target">
              <option value="1">1 day / week</option>
              <option value="2">2 days / week</option>
              <option value="3" selected>3 days / week</option>
              <option value="4">4 days / week</option>
              <option value="5">5 days / week</option>
              <option value="6">6 days / week</option>
            </select>
          </div>
        </div>
        <div class="field"><label class="field-label">Icon</label><div class="emoji-picks">${emojiPicks}</div></div>
        <div class="field"><label class="field-label" id="h-color-label">Color</label><div class="swatches" role="group" aria-labelledby="h-color-label">${swatches}</div></div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" data-close-modal>Cancel</button>
        <button class="btn btn-accent" id="h-save">Create habit</button>
      </div>
    </div>`);
  let emoji = EMOJIS[0], color = COLORS[1];
  const freqSelect = $('#h-freq-type');
  const weeklyField = $('#h-weekly-field');
  if (freqSelect && weeklyField) {
    freqSelect.addEventListener('change', () => {
      weeklyField.style.display = freqSelect.value === 'weekly' ? 'block' : 'none';
    });
  }
  $$('.emoji-pick').forEach(b => b.addEventListener('click', () => {
    $$('.emoji-pick').forEach(x => x.classList.remove('active'));
    b.classList.add('active'); emoji = b.dataset.emoji;
  }));
  $$('.swatch').forEach(s => s.addEventListener('click', () => {
    $$('.swatch').forEach(x => x.classList.remove('active'));
    s.classList.add('active'); color = s.dataset.color;
  }));
  $('#h-save').addEventListener('click', () => {
    const name = $('#h-name').value.trim();
    if (!name) { toast('Name your habit', 'error'); return; }
    const freqType = $('#h-freq-type').value;
    const weeklyTarget = freqType === 'weekly' ? parseInt($('#h-weekly-target').value, 10) : 7;
    state.habits.push({ id: uid(), name, emoji, color, freqType, weeklyTarget, dates: {}, freezes: {}, updatedAt: Date.now() });
    logActivity('habit.create', emoji + ' ' + name, 'habit');
    save(); closeModal(); renderView(); toast('Habit created 🌱');
  });
}

/* ============ Achievements ============ */
const ACHIEVEMENTS = [
  { key: 'habit-first', icon: '🌱', title: 'First check-in', desc: 'Check in on any habit once', metric: m => m.habitCheckins, target: 1 },
  { key: 'streak-7', icon: '🔥', title: 'On a roll', desc: 'Reach a 7-day habit streak', metric: m => m.bestStreak, target: 7 },
  { key: 'streak-30', icon: '⚡', title: 'Unstoppable', desc: 'Reach a 30-day habit streak', metric: m => m.bestStreak, target: 30 },
  { key: 'streak-100', icon: '💯', title: 'Century streak', desc: 'Reach a 100-day habit streak', metric: m => m.bestStreak, target: 100 },
  { key: 'perfect-day', icon: '🌟', title: 'Perfect day', desc: 'Check in every habit on the same day', metric: m => m.perfectDays, target: 1 },
  { key: 'perfect-week', icon: '🏅', title: 'Perfect week', desc: 'Check in every habit 7 days straight', metric: m => m.perfectWeeks, target: 1 },
  { key: 'task-10', icon: '🎯', title: 'First ten', desc: 'Complete 10 tasks', metric: m => m.tasksDone, target: 10 },
  { key: 'task-50', icon: '🚀', title: 'Half century', desc: 'Complete 50 tasks', metric: m => m.tasksDone, target: 50 },
  { key: 'task-100', icon: '👑', title: 'Century of tasks', desc: 'Complete 100 tasks', metric: m => m.tasksDone, target: 100 },
  { key: 'task-500', icon: '🗿', title: 'Relentless', desc: 'Complete 500 tasks', metric: m => m.tasksDone, target: 500 },
  { key: 'kr-first', icon: '🥇', title: 'First key result', desc: 'Complete your first key result', metric: m => m.krsDone, target: 1 },
  { key: 'kr-10', icon: '🏆', title: 'Ten key results', desc: 'Complete 10 key results', metric: m => m.krsDone, target: 10 },
  { key: 'goal-first', icon: '🎉', title: 'Goal achieved', desc: 'Complete your first goal', metric: m => m.goalsDone, target: 1 },
  { key: 'goal-3', icon: '🏔️', title: 'Goal machine', desc: 'Complete 3 goals', metric: m => m.goalsDone, target: 3 },
  { key: 'note-10', icon: '📝', title: 'Ten notes', desc: 'Capture 10 notes', metric: m => m.notes, target: 10 },
  { key: 'note-50', icon: '📚', title: 'Fifty notes', desc: 'Capture 50 notes', metric: m => m.notes, target: 50 },
  { key: 'voice-first', icon: '🎙️', title: 'First memo', desc: 'Record your first voice memo', metric: m => m.recordings, target: 1 },
  { key: 'voice-10', icon: '🗣️', title: 'Ten memos', desc: 'Record 10 voice memos', metric: m => m.recordings, target: 10 },
  { key: 'weekly-4', icon: '📅', title: 'Weekly rhythm', desc: 'Unlock at least one achievement every week for 4 straight weeks', metric: m => m.weeklyStreak, target: 4 },
  { key: 'weekly-8', icon: '🗓️', title: 'Two months strong', desc: 'Unlock an achievement every week for 8 straight weeks', metric: m => m.weeklyStreak, target: 8 },
  { key: 'weekly-16', icon: '🧭', title: 'Season of momentum', desc: 'Unlock an achievement every week for 16 straight weeks', metric: m => m.weeklyStreak, target: 16 }
];
function weekIndex(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); // back to Monday
  return Math.floor(d.getTime() / (7 * 86400000));
}
function weeklyStreakAt(weekIdx) {
  const weeks = weeklyUnlockStreaks().weeks;
  let n = 0;
  while (weeks.has(weekIdx)) { n++; weekIdx--; }
  return n;
}
function weeklyUnlockStreaks() {
  const weeks = new Set();
  Object.keys(state.achievements || {}).forEach(k => {
    const u = state.achievements[k] && state.achievements[k].unlockedAt;
    if (u) weeks.add(weekIndex(new Date(u)));
  });
  const sorted = [...weeks].sort((a, b) => a - b);
  let longest = 0, cur = 0, prev = -Infinity;
  sorted.forEach(w => { cur = w === prev + 1 ? cur + 1 : 1; if (cur > longest) longest = cur; prev = w; });
  const thisW = weekIndex(new Date());
  let current = 0, w = weeks.has(thisW) ? thisW : thisW - 1;
  while (weeks.has(w)) { current++; w--; }
  return { longest, current, weeks };
}
/* Metrics are expensive (400-day perfect-day/week scans, streaks) but only change
   when the underlying data does — memoize behind a cheap signature so the unlock
   sweep on every render stays near-free. */
let metricsCache = null, metricsSigKey = null;
function metricsSignature() {
  let hDates = 0, hUpd = 0, hLen = 0, gUpd = 0, aKey = 0, aUpd = 0;
  state.habits.forEach(h => { hLen++; hDates += Object.keys(h.dates || {}).length; hUpd += (h.updatedAt || 0); });
  state.goals.forEach(g => { gUpd += (g.updatedAt || 0); });
  Object.keys(state.achievements || {}).forEach(k => { aKey += k.length; aUpd += ((state.achievements[k] || {}).unlockedAt || 0); });
  return todayISO() + '|' + state.tasks.length + '|' + state.tasks.filter(t => t.status === 'done').length + '|' +
    state.goals.length + '|' + state.notes.length + '|' + state.recordings.length + '|' +
    hLen + '|' + hDates + '|' + hUpd + '|' + gUpd + '|' + aKey + '|' + aUpd;
}
function achievementMetrics() {
  const sig = metricsSignature();
  if (metricsSigKey === sig && metricsCache) return metricsCache;
  metricsSigKey = sig;
  const habits = state.habits;
  const tasksDone = state.tasks.filter(t => t.status === 'done').length;
  const krsDone = state.goals.reduce((s, g) => s + (g.keyResults || []).filter(kr => kr.current >= kr.target).length, 0);
  const goalsDone = state.goals.filter(g => goalProgress(g) >= 100).length;
  const notes = state.notes.length;
  const recordings = state.recordings.length;
  const bestStreak = habits.length ? Math.max(...habits.map(habitBest)) : 0;
  const habitCheckins = habits.reduce((s, h) => s + Object.keys(h.dates || {}).length, 0);
  const wk = weeklyUnlockStreaks();
  let perfectDays = 0, perfectWeeks = 0;
  if (habits.length) {
    const days = [];
    const d = new Date(); d.setDate(d.getDate() - 399);
    for (let i = 0; i < 400; i++) { days.push(isoDate(d)); d.setDate(d.getDate() + 1); }
    const dayOk = days.map(day => habits.every(h => (h.dates || {})[day]));
    perfectDays = dayOk.filter(Boolean).length;
    let run = 0;
    for (let i = 0; i < dayOk.length; i++) {
      run = dayOk[i] ? run + 1 : 0;
      if (run === 7) { perfectWeeks++; run = 0; }
    }
  }
  metricsCache = { tasksDone, krsDone, goalsDone, notes, recordings, bestStreak, habitCheckins, perfectDays, perfectWeeks, weeklyStreak: wk.longest, weeklyCurrent: wk.current };
  return metricsCache;
}
function evaluateAchievements() {
  if (!state.achievements) state.achievements = {};
  const m = achievementMetrics();
  let unlocked = false, newCount = 0;
  ACHIEVEMENTS.forEach(a => {
    if (state.achievements[a.key] || a.metric(m) < a.target) return;
    state.achievements[a.key] = { unlockedAt: Date.now() };
    unlocked = true; newCount++;
    toast(`🏆 Achievement unlocked — ${a.title} ${a.icon}`, 'success');
  });
  if (unlocked) { save(); confetti(newCount); }
  return m;
}
const CONFETTI_COLORS = ['#605DFF', '#4f8cff', '#7c6cf6', '#ffb020', '#34d399', '#ff5d8f', '#ff8a65'];
function confetti(badgeCount = 1) {
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const root = document.createElement('div');
  root.className = 'confetti-root';
  const n = Math.min(60 + badgeCount * 30, 200);
  let maxDur = 0;
  for (let i = 0; i < n; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    const dur = 1.6 + Math.random() * 1.6;
    const delay = Math.random() * 0.45;
    maxDur = Math.max(maxDur, dur + delay);
    p.style.left = (Math.random() * 100) + '%';
    p.style.setProperty('--dur', dur + 's');
    p.style.setProperty('--delay', delay + 's');
    p.style.setProperty('--drift', (Math.random() * 160 - 80) + 'px');
    p.style.setProperty('--spin', (Math.random() * 540 + 360) + 'deg');
    p.style.setProperty('--c', CONFETTI_COLORS[i % CONFETTI_COLORS.length]);
    const s = 7 + Math.random() * 6;
    p.style.setProperty('--size', s + 'px');
    p.style.borderRadius = Math.random() < 0.5 ? (s / 2) + 'px' : '2px';
    root.appendChild(p);
  }
  document.body.appendChild(root);
  setTimeout(() => root.remove(), (maxDur + 0.7) * 1000);
}
function achCardHTML(a, m) {
  const cur = Math.min(a.metric(m), a.target);
  const pct = Math.round(cur / a.target * 100);
  const got = state.achievements[a.key];
  return `<div class="ach-card ${got ? 'earned' : ''}" data-key="${a.key}" title="${esc(a.desc)}">
    <div class="ach-icon">${a.icon}</div>
    <div class="ach-body">
      <div class="ach-title">${esc(a.title)}</div>
      <div class="ach-desc">${esc(a.desc)}</div>
      <div class="bar"><div class="bar-fill ${got ? 'done' : ''}" style="width:${pct}%${got ? ';background:var(--grad)' : ''}"></div></div>
      <div class="ach-meta">${got ? `Unlocked ${new Date(got.unlockedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} 🎉` : `${cur} / ${a.target}`}</div>
    </div>
  </div>`;
}
/* ---- Achievements grid instance ---- */
const ACH_WIN_THRESHOLD = 12;
const achVirt = createGridVirt({
  gridId: '#ach-grid', rangeTxtId: '#ach-range-txt',
  jumpTopId: '#ach-jump-top', jumpBottomId: '#ach-jump-bottom',
  items: () => ACHIEVEMENTS, itemKey: a => a.key, cardKeyOf: c => c.dataset.key, cardSel: '.ach-card',
  prepare: () => evaluateAchievements(), renderCard: (a, m) => achCardHTML(a, m),
  width: 760, minCard: 240, gap: 12, estimate: 130
});
/* ---- All-tasks-by-tag grid instance ---- */
let tagFilterQ = '';
let tagItems = [];
let bulkMode = false;
let bulkSel = new Set();
function buildTagItems() {
  const map = new Map();
  state.tasks.forEach(t => {
    const tags = (t.tags && t.tags.length) ? t.tags : ['untagged'];
    tags.forEach(tag => {
      const k = tag.toLowerCase();
      if (!map.has(k)) map.set(k, { name: tag === 'untagged' ? 'Untagged' : tag, count: 0, done: 0 });
      const e = map.get(k);
      e.count++;
      if (t.status === 'done') e.done++;
    });
  });
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}
function tagCardHTML(tag) {
  const pct = tag.count ? Math.round(tag.done / tag.count * 100) : 0;
  const key = tag.name.toLowerCase();
  const sel = bulkMode && bulkSel.has(key);
  const color = getTagColor(tag.name);
  const colorStyle = color ? `background:${color};color:#fff` : '';
  const icon = bulkMode
    ? `<span class="tag-icon${sel ? ' sel' : ''}">${sel ? '✓' : ''}</span>`
    : `<span class="tag-icon" style="${colorStyle}">${color ? esc(tag.name[0].toUpperCase()) : '#'}</span>`;
  const colorDot = bulkMode ? '' : `<span class="tag-color-dot${color ? ' set' : ''}" data-tag-color="${esc(key)}" title="Set color" style="${color ? 'background:' + color : ''}"></span>`;
  return `<div class="tag-card${sel ? ' sel' : ''}${bulkMode ? ' bulk' : ''}" data-tag="${esc(key)}" title="${bulkMode ? 'Select / deselect this tag' : 'Show tasks tagged ' + esc(tag.name)}">
    <div class="tag-card-head">
      ${icon}
      <span class="tag-card-name">${esc(tag.name)}</span>
      ${colorDot}
      <span class="tag-card-count">${tag.count}</span>
    </div>
    <div class="bar"><div class="bar-fill" style="width:${pct}%;${color ? 'background:' + color : ''}"></div></div>
    <div class="tag-card-meta">${tag.done} of ${tag.count} done${pct === 100 ? ' 🎉' : ''}</div>
  </div>`;
}
function countMatchingTasks(keys) {
  let n = 0;
  for (const t of state.tasks) {
    const tags = t.tags || [];
    if (keys.some(k => k === 'untagged' ? tags.length === 0 : tags.includes(k))) n++;
  }
  return n;
}
function bulkBarHTML() {
  const keys = [...bulkSel];
  const matchN = keys.length ? countMatchingTasks(keys) : 0;
  const chips = keys.map(k => `<span class="bulk-chip">#${esc(k)}</span>`).join(' ');
  return `<div class="bulk-bar" id="tag-bulk-bar">
    <span class="muted" style="font-weight:600">⚡ Bulk tag</span>
    <div class="bulk-chips" id="tag-bulk-chips">${chips || '<span class="muted">no tags selected</span>'}</div>
    <span class="muted">matches <b id="tag-bulk-count">${matchN}</b> task${matchN === 1 ? '' : 's'}</span>
    <input type="text" id="tag-bulk-add" placeholder="add tags, comma separated" style="max-width:190px">
    <div style="flex:1"></div>
    <button class="btn btn-ghost btn-sm" id="tag-bulk-all" title="Select every visible tag">Select all</button>
    <button class="btn btn-ghost btn-sm" id="tag-bulk-none" ${keys.length ? '' : 'disabled'}>None</button>
    <button class="btn btn-accent btn-sm" id="tag-bulk-apply" ${keys.length ? '' : 'disabled'}>Apply</button>
    <button class="btn btn-ghost btn-sm" id="tag-bulk-cancel">✕ Done</button>
  </div>`;
}
function applyBulkTags() {
  const addInp = $('#tag-bulk-add');
  const typed = (addInp ? addInp.value : '').split(',').map(s => s.trim().toLowerCase().replace(/^#/, '')).filter(Boolean);
  const applied = [...new Set([...bulkSel, ...typed])].filter(k => k !== 'untagged');
  if (!applied.length) { toast('Type a tag name to add — “untagged” can’t be applied as a tag', 'error'); return; }
  const keys = [...bulkSel];
  let n = 0;
  const allApplied = new Set(applied);
  state.tasks.forEach(t => {
    const tags = (t.tags || []).map(s => s.toLowerCase());
    const match = keys.some(k => k === 'untagged' ? tags.length === 0 : tags.includes(k));
    if (!match) return;
    const merged = [...new Set([...tags, ...allApplied])];
    if (merged.length !== tags.length) { t.tags = merged; t.updatedAt = Date.now(); n++; }
  });
  if (!n) { toast('Matching tasks already carry those tags', 'error'); return; }
  save();
  toast(`Tagged ${n} task${n === 1 ? '' : 's'} ${[...allApplied].map(t => '#' + t).join(' ')}`);
  bulkSel = new Set();
  bulkMode = false;
  renderTags();
}
function bindTagCard(card) {
  // color dot: open color picker popover
  const dot = card.querySelector('[data-tag-color]');
  if (dot) {
    dot.addEventListener('click', e => {
      e.stopPropagation();
      const key = dot.dataset.tagColor;
      const tagName = key;
      openColorPicker(dot, key, color => {
        setTagColor(tagName, color);
        renderTags();
      });
    });
  }
  card.addEventListener('click', e => {
    if (e.target.closest('[data-tag-color]')) return;
    if (bulkMode) {
      const k = card.dataset.tag;
      if (bulkSel.has(k)) bulkSel.delete(k); else bulkSel.add(k);
      renderTags();
    } else {
      applyTagFilter(card.dataset.tag);
    }
  });
}
function openColorPicker(anchor, tagName, onPick) {
  // close any existing picker
  document.querySelectorAll('.tag-color-picker').forEach(p => p.remove());
  const cur = getTagColor(tagName);
  const picker = document.createElement('div');
  picker.className = 'tag-color-picker';
  picker.innerHTML = COLORS.map(c => `<button class="cp-swatch${c === cur ? ' active' : ''}" data-color="${c}" style="background:${c}" title="${c}"></button>`).join('')
    + (cur ? '<button class="cp-swatch cp-clear" data-color="" title="Remove color">✕</button>' : '');
  const rect = anchor.getBoundingClientRect();
  picker.style.position = 'fixed';
  picker.style.left = rect.left + 'px';
  picker.style.top = (rect.bottom + 4) + 'px';
  picker.style.zIndex = 9999;
  document.body.appendChild(picker);
  // adjust if overflowing right
  if (picker.getBoundingClientRect().right > window.innerWidth) {
    picker.style.left = (window.innerWidth - picker.offsetWidth - 8) + 'px';
  }
  picker.addEventListener('click', e => {
    const btn = e.target.closest('.cp-swatch');
    if (!btn) return;
    onPick(btn.dataset.color || null);
    picker.remove();
  });
  // close on outside click
  const close = ev => { if (!picker.contains(ev.target)) { picker.remove(); document.removeEventListener('mousedown', close); } };
  setTimeout(() => document.addEventListener('mousedown', close), 0);
}
function bindTagToolbar() {
  const q = $('#tag-q');
  if (q) q.addEventListener('input', e => { tagFilterQ = e.target.value.toLowerCase(); renderTags(); });
  const clear = $('#tag-clear-q');
  if (clear) clear.addEventListener('click', () => { tagFilterQ = ''; renderTags(); });
  const toggle = $('#tag-bulk-toggle');
  if (toggle) toggle.addEventListener('click', () => { bulkMode = !bulkMode; if (!bulkMode) bulkSel.clear(); renderTags(); });
  const all = $('#tag-bulk-all');
  if (all) all.addEventListener('click', () => { bulkSel = new Set(tagItems.map(t => t.name.toLowerCase())); renderTags(); });
  const none = $('#tag-bulk-none');
  if (none) none.addEventListener('click', () => { bulkSel.clear(); renderTags(); });
  const apply = $('#tag-bulk-apply');
  if (apply) apply.addEventListener('click', applyBulkTags);
  const add = $('#tag-bulk-add');
  if (add) add.addEventListener('keydown', e => { if (e.key === 'Enter') applyBulkTags(); });
  const cancel = $('#tag-bulk-cancel');
  if (cancel) cancel.addEventListener('click', () => { bulkMode = false; bulkSel.clear(); renderTags(); });
}
const TAGS_WIN_THRESHOLD = 24;
const tagsGridVirt = createGridVirt({
  gridId: '#tags-grid', rangeTxtId: '#tags-range-txt',
  jumpTopId: '#tags-jump-top', jumpBottomId: '#tags-jump-bottom',
  items: () => tagItems, itemKey: t => t.name.toLowerCase(), cardKeyOf: c => c.dataset.tag.toLowerCase(), cardSel: '.tag-card',
  renderCard: t => tagCardHTML(t),
  bindCards: grid => $$('.tag-card', grid).forEach(bindTagCard),
  width: 760, minCard: 240, gap: 12, estimate: 96,
  key: () => state.tasks.length + '|' + state.tasks.reduce((s, t) => s + (t.updatedAt || 0) + (t.status || '').length, 0) + '|' + tagFilterQ
});
function renderTags() {
  tagItems = buildTagItems().filter(t => !tagFilterQ || t.name.toLowerCase().includes(tagFilterQ));
  const long = tagItems.length > TAGS_WIN_THRESHOLD;
  const cards = long ? '' : tagItems.map(tagCardHTML).join('');
  viewRoot().innerHTML = `
    <div class="toolbar">
      <span class="muted">${tagItems.length} tag${tagItems.length === 1 ? '' : 's'} · ${state.tasks.length} task${state.tasks.length === 1 ? '' : 's'}</span>
      <input type="text" class="search-input" id="tag-q" placeholder="Filter tags…" value="${esc(tagFilterQ)}" style="max-width:220px">
      <div style="flex:1"></div>
      <button class="btn btn-ghost" id="tag-clear-q" ${tagFilterQ ? '' : 'disabled'}>Clear</button>
      <button class="btn ${bulkMode ? 'btn-accent' : 'btn-ghost'}" id="tag-bulk-toggle">${bulkMode ? '✓ Done selecting' : '⚡ Bulk tag'}</button>
      <a class="link-btn" href="#tasks">Open board →</a>
    </div>
    ${bulkMode ? bulkBarHTML() : ''}
    ${long
      ? `<div class="tags-win-wrap"><div class="tags-grid win" id="tags-grid"></div><div class="dash-win-range tags-range" id="tags-range"><button class="jump-btn" id="tags-jump-top" title="Jump to top">⤒ Top</button><span id="tags-range-txt"></span><button class="jump-btn" id="tags-jump-bottom" title="Jump to bottom">⤓ Bottom</button></div></div>`
      : `<div class="tags-grid" id="tags-grid">${cards || '<div class="empty-state"><div class="es-icon">🏷️</div>No tags yet — add tags to your tasks and they\'ll be grouped here.</div>'}</div>`}`;
  if (long) {
    tagsGridVirt.render(); tagsGridVirt.bind();
  } else {
    $$('.tag-card').forEach(bindTagCard);
  }
  bindTagToolbar();
}
function renderAchievements() {
  const m = evaluateAchievements();
  const earned = ACHIEVEMENTS.filter(a => state.achievements[a.key]);
  const long = ACHIEVEMENTS.length > ACH_WIN_THRESHOLD;
  const cards = long ? '' : ACHIEVEMENTS.map(a => achCardHTML(a, m)).join('');
  const topHabits = [...state.habits].sort((a, b) => habitBest(b) - habitBest(a)).slice(0, 3);
  viewRoot().innerHTML = `
    <div class="card ach-hero">
      <div class="brief-banner-glow"></div>
      <div style="position:relative;z-index:1;flex:1">
        <div class="ach-hero-title">🏆 ${earned.length} of ${ACHIEVEMENTS.length} achievements</div>
        <div class="muted" style="color:rgba(255,255,255,.85)">Every badge is earned from real progress — streaks, tasks, goals, notes and memos.</div>
      </div>
      <div class="ach-hero-actions" style="position:relative;z-index:1">
        <button class="btn btn-sm" id="ach-share-text" style="background:rgba(255,255,255,.16);color:#fff">⧉ Copy as text</button>
        <button class="btn btn-sm" id="ach-share-png" style="background:rgba(255,255,255,.16);color:#fff">🖼️ Download card</button>
      </div>
    </div>
    <div class="stats">
      <div class="stat-card"><div class="stat-icon" style="background:rgba(255,176,32,.14)">🔥</div><div><div class="stat-value">${m.bestStreak} day${m.bestStreak === 1 ? '' : 's'}</div><div class="stat-label">best habit streak</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:rgba(52,211,153,.14)">✅</div><div><div class="stat-value">${m.tasksDone}</div><div class="stat-label">tasks completed</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:rgba(96,93,255,.14)">🎯</div><div><div class="stat-value">${m.goalsDone}</div><div class="stat-label">goals completed</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:rgba(79,140,255,.14)">📝</div><div><div class="stat-value">${m.notes}</div><div class="stat-label">notes captured</div></div></div>
    </div>
    ${(() => { const wk = weeklyUnlockStreaks(); const thisW = weekIndex(new Date()); const cells = [];
      for (let i = 7; i >= 0; i--) {
        const idx = thisW - i;
        const on = wk.weeks.has(idx);
        cells.push(`<div class="ach-week ${on ? 'on' : ''} ${i === 0 ? 'cur' : ''}" title="${new Date(idx * 7 * 86400000 + 12 * 3600000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}${i === 0 ? ' · this week' : ''}${on ? ' · achievement unlocked ✓' : ''}">${on ? '✓' : ''}</div>`);
      }
      return `<div class="card"><h2 class="card-title"><span>🔁 Weekly consistency</span></h2>
        <div class="ach-weeks">${cells.join('')}</div>
        <div class="dash-task"><span>📅</span><span class="t-title">Unlock streak — current</span><span class="due-chip">${m.weeklyCurrent} week${m.weeklyCurrent === 1 ? '' : 's'}</span></div>
        <div class="dash-task"><span>🏆</span><span class="t-title">Unlock streak — best</span><span class="due-chip">${m.weeklyStreak} week${m.weeklyStreak === 1 ? '' : 's'}</span></div>
        <div class="muted" style="font-size:12px;margin-top:8px">Unlock at least one achievement every week to keep the streak alive — miss a week and it resets.</div></div>`;
    })()}
    ${topHabits.length ? `<div class="card"><h2 class="card-title"><span>✨ Current best streaks</span></h2>
      <div class="ach-streaks">${topHabits.map(h => `<div class="dash-task"><span>${h.emoji}</span><span class="t-title">${esc(h.name)}</span><span class="due-chip">best ${habitBest(h)}d · now ${habitStreak(h)}d</span></div>`).join('')}</div></div>` : ''}
    ${long
      ? `<div class="ach-win-wrap"><div class="ach-grid win" id="ach-grid"></div><div class="dash-win-range ach-range" id="ach-range"><button class="jump-btn" id="ach-jump-top" title="Jump to top">⤒ Top</button><span id="ach-range-txt"></span><button class="jump-btn" id="ach-jump-bottom" title="Jump to bottom">⤓ Bottom</button></div></div>`
      : `<div class="ach-grid" id="ach-grid">${cards}</div>`}`;
  if (long) {
    achVirt.render();
    achVirt.bind();
  }
  $('#ach-share-text').addEventListener('click', () => {
    navigator.clipboard.writeText(shareCardText())
      .then(() => toast('Achievement card copied ⧉'))
      .catch(() => toast('Copy failed', 'error'));
  });
  $('#ach-share-png').addEventListener('click', downloadShareCard);
}
function shareCardText() {
  const m = achievementMetrics();
  const earned = ACHIEVEMENTS.filter(a => state.achievements[a.key]);
  const top = [...state.habits].sort((a, b) => habitBest(b) - habitBest(a)).slice(0, 3);
  const lines = [
    '🏆 Lumen achievements',
    `🔥 Best habit streak: ${m.bestStreak} days`,
    `✅ Tasks completed: ${m.tasksDone}`,
    `🎯 Goals completed: ${m.goalsDone}`,
    `📝 Notes captured: ${m.notes}`,
    ...(top.length ? [`✨ ${top.map(h => `${h.emoji} ${h.name} (${habitBest(h)}d)`).join(' · ')}`] : []),
    `Unlocked ${earned.length}/${ACHIEVEMENTS.length}: ${earned.map(a => a.icon).join('')}`,
    '— Lumen'
  ];
  return lines.join('\n');
}
function downloadShareCard() {
  const m = achievementMetrics();
  const c = document.createElement('canvas');
  c.width = 600; c.height = 315;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 600, 315);
  g.addColorStop(0, '#605DFF'); g.addColorStop(1, '#4c4ae0');
  x.fillStyle = g; x.fillRect(0, 0, 600, 315);
  x.fillStyle = 'rgba(255,255,255,.07)';
  x.beginPath(); x.arc(545, 45, 95, 0, 7); x.fill();
  x.beginPath(); x.arc(35, 305, 75, 0, 7); x.fill();
  x.textAlign = 'left';
  x.fillStyle = '#fff'; x.font = '700 40px system-ui, sans-serif';
  x.fillText('Lumen', 42, 72);
  x.fillStyle = 'rgba(255,255,255,.85)'; x.font = '400 16px system-ui, sans-serif';
  x.fillText('Your Personal Command Center', 42, 100);
  const stats = [
    ['🔥', `${m.bestStreak}d`, 'best streak'], ['✅', `${m.tasksDone}`, 'tasks done'],
    ['🎯', `${m.goalsDone}`, 'goals done'], ['📝', `${m.notes}`, 'notes']
  ];
  const bw = 118, gap = 10;
  stats.forEach((s, i) => {
    const bx = 42 + i * (bw + gap), by = 132, bh = 100;
    x.fillStyle = 'rgba(255,255,255,.14)';
    x.beginPath(); x.roundRect ? x.roundRect(bx, by, bw, bh, 12) : x.rect(bx, by, bw, bh); x.fill();
    x.textAlign = 'center';
    x.fillStyle = '#fff'; x.font = '24px system-ui';
    x.fillText(s[0], bx + bw / 2, by + 36);
    x.font = '700 22px system-ui';
    x.fillText(s[1], bx + bw / 2, by + 62);
    x.fillStyle = 'rgba(255,255,255,.75)'; x.font = '400 12px system-ui';
    x.fillText(s[2], bx + bw / 2, by + 82);
  });
  x.textAlign = 'left';
  const earned = ACHIEVEMENTS.filter(a => state.achievements[a.key]);
  x.fillStyle = '#fff'; x.font = '28px system-ui';
  earned.slice(0, 10).forEach((a, i) => x.fillText(a.icon, 42 + i * 38, 272));
  x.fillStyle = 'rgba(255,255,255,.78)'; x.font = '400 13px system-ui';
  x.fillText(`${earned.length} of ${ACHIEVEMENTS.length} achievements unlocked`, 42, 298);
  const a = document.createElement('a');
  a.href = c.toDataURL('image/png');
  a.download = 'lumen-achievements.png';
  a.click();
  toast('Achievement card downloaded 🖼️');
}

/* ============ Notes ============ */
let selectedNoteId = null;
let notePreview = false;
/* Notes list instance. */
const notesListVirt = createListVirt({
  containerSel: '.note-items', rangeSel: '#note-range',
  itemSel: '.note-item', estimate: 80, threshold: 24,
  emptyHTML: '<div class="empty-state"><div class="es-icon">🔍</div>No notes match.</div>',
  bindItems: scope => bindNoteList(scope)
});
// Owned by src/notes/view.js.
function noteItemHTML(n) {
  return window.LumenLib.notes.noteItemHTML(n, { selectedId: selectedNoteId, tagSpan, ic });
}
function bindNoteList(scope) {
  scope = scope || document;
  $$('.note-item', scope).forEach(item => item.addEventListener('click', e => {
    if (e.target.closest('[data-pin]')) return;
    selectedNoteId = item.dataset.note;
    renderNotes();
  }));
  $$('[data-pin]', scope).forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    const n = state.notes.find(x => x.id === b.dataset.pin);
    if (n) { n.pinned = !n.pinned; n.updatedAt = Date.now(); save(); renderNotes(); }
  }));
}
function renderNotes() {
  const q = (noteFilterQ || '').toLowerCase();
  const notes = [...state.notes].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.updatedAt - a.updatedAt)
    .filter(n => !q || (n.title + ' ' + n.content + ' ' + (n.tags || []).join(' ')).toLowerCase().includes(q));
  notesListVirt.setItems(notes, noteItemHTML, (noteFilterQ || '') + '|' + notes.length);

  const note = state.notes.find(n => n.id === selectedNoteId);
  const editor = note ? noteEditorHTML(note) : `
    <div class="note-editor" style="align-items:center;justify-content:center;gap:10px">
      <div style="font-size:34px">📝</div>
      <div class="muted" style="text-align:center">Select a note or create a new one.<br>Everything autosaves.</div>
      <button class="btn btn-accent" id="note-new-empty">${ic('plus', 15)} New note</button>
    </div>`;

  viewRoot().innerHTML = `
    <div class="notes-wrap">
      <div class="note-list">
        <div class="note-list-head">
          <input type="text" class="search-input" id="note-q" placeholder="Search notes…" value="${esc(noteFilterQ || '')}">
          <button class="btn btn-accent btn-icon" id="note-new" title="New note">${ic('plus', 15)}</button>
        </div>
        <div class="note-items"></div>
        <div class="note-list-foot" id="note-range"></div>
      </div>
      ${editor}
    </div>`;

  notesListVirt.sync();

  bindFilterInput('#note-q', 120, v => { noteFilterQ = v; renderNotes(); });
  $$('#note-new, #note-new-empty').forEach(b => b.addEventListener('click', () => { newNote(); renderNotes(); }));
  if (note) bindNoteEditor(note);
}
let noteFilterQ = '';

// Owned by src/notes/view.js.
function noteEditorHTML(note) {
  return window.LumenLib.notes.noteEditorHTML(note, { preview: notePreview, students: getStudentsList(), renderMd, tagSpan, ic });
}
function bindNoteEditor(note) {
  const title = $('#ne-title');
  const content = $('#ne-content');
  const tags = $('#ne-tags');
  const studentSel = $('#ne-student');
  const saveNote = debounce(() => { note.updatedAt = Date.now(); save(); }, 350);
  if (title) title.addEventListener('input', () => { note.title = title.value; saveNote(); });
  if (studentSel) studentSel.addEventListener('change', () => { note.student = studentSel.value || undefined; saveNote(); });
  if (content) {
    content.style.height = 'auto';
    content.style.height = content.scrollHeight + 'px';
    content.addEventListener('input', () => {
      note.content = content.value;
      content.style.height = 'auto';
      content.style.height = content.scrollHeight + 'px';
      saveNote();
    });
  }
  if (tags) tags.addEventListener('change', () => {
    note.tags = tags.value.split(',').map(s => s.trim()).filter(Boolean);
    save(); renderNotes();
  });
  $('#ne-preview').addEventListener('click', () => { notePreview = !notePreview; renderNotes(); });
  $('#ne-pin').addEventListener('click', () => { note.pinned = !note.pinned; save(); renderNotes(); });
  $('#ne-del').addEventListener('click', () => {
    if (confirm(`Delete note “${note.title || 'Untitled'}”?`)) {
      logActivity('note.delete', note.title || 'Untitled', 'note');
      state.notes = state.notes.filter(n => n.id !== note.id);
      tombstone('notes', note.id);
      selectedNoteId = null; save(); renderNotes(); toast('Note deleted');
    }
  });
  const playBtn = $('#ne-audio-play');
  if (playBtn) playBtn.addEventListener('click', () => togglePlay(note.audioId, playBtn));

  // Interactive checklists in preview mode
  const previewEl = $('.note-preview');
  if (previewEl) {
    previewEl.querySelectorAll('input[type="checkbox"][data-line-idx]').forEach(chk => {
      chk.addEventListener('change', e => {
        const idx = parseInt(chk.dataset.lineIdx, 10);
        const lines = String(note.content || '').replace(/\r\n/g, '\n').split('\n');
        if (lines[idx] !== undefined) {
          const isChecked = e.target.checked;
          lines[idx] = lines[idx].replace(/^(\s*[-*]\s+\[)( |x|X)(\]\s+.*)/i, `$1${isChecked ? 'x' : ' '}$3`);
          note.content = lines.join('\n');
          note.updatedAt = Date.now();
          save();
          renderNotes();
          playChime(isChecked ? 'task-done' : 'habit-check');
        }
      });
    });
    previewEl.querySelectorAll('.backlink-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const [type, id] = (pill.dataset.backlink || '').split(':');
        if (type === 'goal') { location.hash = '#goals'; const g = state.goals.find(x => x.id === id); if (g) setTimeout(() => openGoalModal(g), 150); }
        else if (type === 'habit') { location.hash = '#habits'; }
        else if (type === 'task') { const t = state.tasks.find(x => x.id === id); if (t) openTaskModal(t); }
        else if (type === 'note') { selectedNoteId = id; renderNotes(); }
        else if (type === 'vault') { const v=state.vaultItems.find(x=>x.id===id); if(v) openVaultModal(v); }
      });
    });
  }

  // Extract checklist items to Kanban tasks
  const extractBtn = $('#ne-extract');
  if (extractBtn) {
    extractBtn.addEventListener('click', () => {
      const lines = String(note.content || '').replace(/\r\n/g, '\n').split('\n');
      const items = [];
      lines.forEach(line => {
        const m = line.trim().match(/^[-*]\s+\[( |x|X)\]\s+(.+)/);
        if (m) {
          items.push({ text: m[2].trim(), done: m[1].toLowerCase() === 'x' });
        }
      });
      if (!items.length) {
        toast('No checklist items found in this note. Add some with - [ ] task', 'error');
        return;
      }
      let added = 0;
      items.forEach(it => {
        state.tasks.unshift({
          id: uid(),
          title: it.text,
          desc: `Extracted from note: ${note.title || 'Untitled note'}`,
          status: it.done ? 'done' : 'today',
          priority: 'med',
          due: todayISO(),
          tags: [...new Set(['from-note', ...(note.tags || [])])],
          subtasks: [],
          createdAt: Date.now(),
          completedAt: it.done ? todayISO() : null,
          updatedAt: Date.now()
        });
        added++;
      });
      save();
      toast(`Extracted ${added} task${added === 1 ? '' : 's'} to Kanban board! ✅`, 'success');
    });
  }

  // Vault insert
  const vaultInsertBtn=$('#ne-vault-insert');
  if(vaultInsertBtn){
    vaultInsertBtn.addEventListener('click', ()=>{
      if(!state.vaultItems.length){ toast('No vault items — create one in Vault first','error'); location.hash='#vault'; return; }
      const pickerHTML=`<div class="modal" style="max-width:420px"><div class="modal-head"><h3>Insert vault link</h3><button class="btn-icon" data-close-modal>${ic('x',16)}</button></div><div class="modal-body"><div style="display:flex;flex-direction:column;gap:6px;max-height:300px;overflow-y:auto">${state.vaultItems.map(v=>`<button class="btn btn-ghost" data-vault-insert="${v.id}" style="text-align:left;justify-content:flex-start"> ${vaultTypeIcon(v.type)} ${esc(v.title)} <span class="muted" style="font-size:11px;margin-left:6px">${esc(v.type)}</span></button>`).join('')}</div></div></div>`;
      openModal(pickerHTML);
      $$('[data-vault-insert]').forEach(b=> b.addEventListener('click', ()=>{
        const v=state.vaultItems.find(x=>x.id===b.dataset.vaultInsert); if(!v) return;
        const link=`[[Vault:${v.title}]]`;
        const ta=$('#ne-content') || { value: note.content };
        // insert at cursor if editing, else append
        if(ta && typeof ta.selectionStart==='number'){
          const start=ta.selectionStart, end=ta.selectionEnd;
          const before=note.content.slice(0,start);
          const after=note.content.slice(end);
          note.content=before+(before && !before.endsWith('\n')? '\n':'')+link+(after && !after.startsWith('\n')? '\n':'')+after;
        } else {
          note.content=(note.content? note.content+'\n':'')+link;
        }
        // link note ↔ vault
        if(!Array.isArray(v.linkedNoteIds)) v.linkedNoteIds=[];
        if(!v.linkedNoteIds.includes(note.id)){ v.linkedNoteIds.push(note.id); v.updatedAt=Date.now(); if(!state._vaultItemsMeta) state._vaultItemsMeta={}; state._vaultItemsMeta[v.id]=Date.now(); }
        note.updatedAt=Date.now(); save(); closeModal(); renderNotes(); toast('Vault link inserted');
      }));
    });
  }
  // AI Polish & Summarize Note
  const aiPolishBtn = $('#ne-ai-polish');
  if (aiPolishBtn) {
    aiPolishBtn.addEventListener('click', async () => {
      if (!state.settings.geminiApiKey) {
        toast('Set your Gemini API key in Settings → AI Assistant 🤖', 'error');
        return;
      }
      if (!note.content || note.content.trim().length < 10) {
        toast('Write some note content before polishing', 'error');
        return;
      }
      aiPolishBtn.disabled = true;
      aiPolishBtn.textContent = '✨ Polishing…';
      try {
        const prompt = `Polish, clean up formatting, and provide a 2-bullet summary at the top of this markdown note. Preserve the core information and interactive checklists (- [ ]). Note content:\n"""\n${note.content}\n"""\nReturn ONLY the polished markdown content without explanations.`;
        const res = await callGemini(prompt, 'You are an executive editor. Output clean polished markdown only.');
        note.content = res.trim();
        note.updatedAt = Date.now();
        save();
        renderNotes();
        toast('✨ Note polished & structured!', 'success');
      } catch (err) {
        toast(`AI Error: ${err.message}`, 'error');
      } finally {
        aiPolishBtn.disabled = false;
        aiPolishBtn.textContent = '✨ Polish';
      }
    });
  }
}
function newNote() {
  const todayStr = todayISO();
  const todayAlready = state.notes.some(n => isoDate(new Date(n.createdAt)) === todayStr);
  const defaultContent = todayAlready ? '' : `# ${new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} — Plan / Notes / Wins\n\n## Plan\n- \n\n## Notes\n- \n\n## Wins\n- `;
  const n = { id: uid(), title: todayAlready ? '' : new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }), content: defaultContent, tags: [], pinned: false, createdAt: Date.now(), updatedAt: Date.now(), audioId: null };
  state.notes.unshift(n);
  selectedNoteId = n.id;
  notePreview = false;
  logActivity('note.create', 'New note', 'note');
  save();
}

/* ============ Personal Vault ============ */
let vaultFilter = { q: '', type: '', tag: '', collection: '' };
let vaultViewMode = 'grid'; // 'grid' | 'list'

function getVaultItems() {
  if (!Array.isArray(state.vaultItems)) state.vaultItems = [];
  return state.vaultItems;
}

function getVaultCollections() {
  if (!Array.isArray(state.vaultCollections)) state.vaultCollections = [];
  return state.vaultCollections;
}

function vaultQuotaUsed() {
  return getVaultItems().reduce((sum, v) => sum + (v.size || 0), 0);
}

function getVaultFiltered() {
  const items = getVaultItems();
  return items.filter(v => {
    if (vaultFilter.type && v.type !== vaultFilter.type) return false;
    if (vaultFilter.tag && !(v.tags || []).includes(vaultFilter.tag)) return false;
    if (vaultFilter.collection === '__none') {
      if (v.collectionId) return false;
    } else if (vaultFilter.collection && v.collectionId !== vaultFilter.collection) {
      return false;
    }
    if (vaultFilter.q) {
      const q = vaultFilter.q.toLowerCase();
      const hay = (
        (v.title || '') + ' ' +
        (v.description || '') + ' ' +
        (v.fileName || '') + ' ' +
        (v.url || '') + ' ' +
        (v.tags || []).join(' ')
      ).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }).sort((a, b) => vaultSort(a, b));
}

function setVaultViewMode(mode) {
  vaultViewMode = mode;
  save();
}

function addVaultCollection(title) {
  if (!title || !title.trim()) return;
  const cols = getVaultCollections();
  cols.push({ id: 'col-' + uid(), title: title.trim(), createdAt: Date.now() });
  save();
  renderVault();
}

function toastQuota(msg) {
  toast(msg, 'warning');
}

/* Item markup is owned by src/vault/view.js — pure builders that take what they need
   from state as an injected deps object, the same pattern as src/lib/parser.js.
   renderVault and openVaultModal stay here: they bind DOM events and reach into a
   dozen app closures, which is a different ownership boundary. */
const vaultViewDeps = () => ({ collections: state.vaultCollections, tasks: state.tasks, tagSpan });
function vaultHost(url){ return VaultStore.vaultHost(url); }
function vaultSort(a,b){ return VaultStore.vaultSort(a,b); }
function vaultTypeLabel(id){ return VaultStore.vaultTypeLabel(id); }
function vaultTagSet(){ return VaultStore.vaultTagSet(state.vaultItems); }
function vaultCardHTML(v){ return VaultStore.vaultCardHTML(v, vaultViewDeps()); }
function vaultRowHTML(v){ return VaultStore.vaultRowHTML(v, vaultViewDeps()); }

function vaultWidgetHTML(){ return VaultStore.vaultWidgetHTML(getVaultItems(), state.settings && state.settings.pinVault !== false); }
function renderVault(){
  const t0 = typeof performance!=='undefined' && performance.now ? performance.now() : Date.now();
  const items = getVaultFiltered();
  // Markup is built by src/vault/view.js; this function resolves state into a ctx,
  // writes the result, and owns the event wiring below.
  viewRoot().innerHTML = VaultStore.vaultViewHTML({
    items, allItems: state.vaultItems, collections: getVaultCollections(),
    filter: vaultFilter, viewMode: vaultViewMode, quotaUsed: vaultQuotaUsed(),
    tasks: state.tasks, tagSpan, ic,
  });
  // perf
  const ms = (typeof performance!=='undefined' && performance.now ? performance.now() : Date.now()) - t0;
  if(ms>50) console.warn('[Lumen perf] vault '+ms.toFixed(1)+'ms for '+items.length+' items');
  // bindings
  bindFilterInput('#vault-q', 160, v=>{ vaultFilter.q=v; renderVault(); });
  $('#vault-type')?.addEventListener('change', e=>{ vaultFilter.type=e.target.value; renderVault(); });
  $('#vault-tag')?.addEventListener('change', e=>{ vaultFilter.tag=e.target.value; renderVault(); });
  $('#vault-col')?.addEventListener('change', e=>{ vaultFilter.collection=e.target.value; renderVault(); });
  $('#vault-clear')?.addEventListener('click', ()=>{ vaultFilter={q:'',type:'',tag:'',collection:''}; renderVault(); });
  $('#vault-clear-filters')?.addEventListener('click', ()=>{ vaultFilter={q:'',type:'',tag:'',collection:''}; renderVault(); });
  $$('[data-vault-col]').forEach(b=>b.addEventListener('click', ()=>{ vaultFilter.collection=b.dataset.vaultCol; renderVault(); }));
  $$('[data-vault-type]').forEach(b=>b.addEventListener('click', ()=>{ vaultFilter.type=b.dataset.vaultType; renderVault(); }));
  $$('[data-vault-view]').forEach(b=>b.addEventListener('click', ()=>{ setVaultViewMode(b.dataset.vaultView); renderVault(); }));
  $$('#vault-add, #vault-empty-add, #vault-widget-add, #vault-widget-add2').forEach(b=>b && b.addEventListener('click', ()=> openVaultModal()));
  $('#vault-add-col')?.addEventListener('click', ()=>{
    const title=prompt('Collection name'); if(title) addVaultCollection(title);
  });
  // file inputs
  const handleVaultFiles = async (files)=>{
    for(const f of [...files]){
      if(f.size>VAULT_MAX_FILE){ toast(`"${f.name}" too large — 10MB max, link instead`, 'error'); continue; }
      if(vaultQuotaUsed()+f.size>VAULT_SOFT_CAP+5*1024*1024){ toastQuota('Vault quota exceeded — 100MB soft cap'); break; }
      if(vaultQuotaUsed()+f.size>VAULT_SOFT_CAP) toastQuota('Vault near quota — remove files or increase cap in Settings');
      const existing = state.vaultItems.find(v=>v.fileName===f.name && v.size===f.size);
      if(existing){ toast(`"${f.name}" already in vault`, 'error'); continue; }
      // prefill modal with file
      openVaultModal(null, f);
      break; // one at a time via modal
    }
  };
  $('#vault-upload')?.addEventListener('change', e=>{ if(e.target.files.length) handleVaultFiles(e.target.files); e.target.value=''; });
  $('#vault-empty-upload')?.addEventListener('change', e=>{ if(e.target.files.length) handleVaultFiles(e.target.files); e.target.value=''; });
  $('#vault-widget-upload')?.addEventListener('change', e=>{ if(e.target.files.length) handleVaultFiles(e.target.files); e.target.value=''; });
  // drag-drop
  const dropEl=$('#vault-drop');
  if(dropEl){
    ['dragenter','dragover'].forEach(ev=> dropEl.addEventListener(ev, e=>{ e.preventDefault(); dropEl.classList.add('drag-over'); }));
    ['dragleave','drop'].forEach(ev=> dropEl.addEventListener(ev, e=>{ if(ev==='dragleave' && e.target!==dropEl) return; dropEl.classList.remove('drag-over'); }));
    dropEl.addEventListener('drop', e=>{
      e.preventDefault();
      if(e.dataTransfer.files && e.dataTransfer.files.length) handleVaultFiles(e.dataTransfer.files);
      else if(e.dataTransfer.getData('text/uri-list')){ const url=e.dataTransfer.getData('text/uri-list').trim().split('\\n')[0]; openVaultModal(null, null, url); }
      else if(e.dataTransfer.getData('text/plain')){ const txt=e.dataTransfer.getData('text/plain').trim(); if(/^https?:\/\//.test(txt)) openVaultModal(null,null, txt); }
    });
  }
  $$('[data-vault-open]').forEach(el=> el.addEventListener('click', e=>{
    if(e.target.closest('[data-vault-action]')) return;
    const v=state.vaultItems.find(x=>x.id===el.dataset.vaultOpen); if(v) openVaultModal(v);
  }));
  $$('[data-vault-mini]').forEach(el=> el.addEventListener('click', ()=>{ const v=state.vaultItems.find(x=>x.id===el.dataset.vaultMini); if(v) openVaultModal(v); }));
  $$('[data-vault-action]').forEach(b=> b.addEventListener('click', async e=>{
    e.stopPropagation();
    const id=b.dataset.id; const v=state.vaultItems.find(x=>x.id===id); if(!v) return;
    const act=b.dataset.vaultAction;
    if(act==='open'){
      if(v.blobId){
        try{ const blob=await vaultBlobGet(v.blobId); if(blob){ const url=URL.createObjectURL(blob); window.open(url,'_blank','noopener'); setTimeout(()=>URL.revokeObjectURL(url), 60000); } else if(v.url && /^https?:\/\//i.test(v.url)) window.open(v.url,'_blank','noopener'); else toast('File missing','error'); }catch(_){ toast('Open failed','error'); }
      } else if(v.url && /^https?:\/\//i.test(v.url)) window.open(v.url,'_blank','noopener'); else toast('No link or file','error');
    } else if(act==='copy'){
      try{ await navigator.clipboard.writeText(v.url||''); toast('Copied link ⧉'); }catch(_){ toast('Copy failed','error'); }
    } else if(act==='edit'){ openVaultModal(v); }
    else if(act==='delete'){
      if(!confirm(`Delete "${v.title}"?`)) return;
      captureUndo('Delete vault item');
      if(v.blobId) try{ await vaultBlobDelete(v.blobId); }catch(_){}
      state.vaultItems = state.vaultItems.filter(x=>x.id!==id);
      if(!state._vaultItemsMeta) state._vaultItemsMeta={};
      state._vaultItemsMeta[id]=Date.now();
      tombstone('vaultItems', id);
      // remove reverse links from tasks
      state.tasks.forEach(t=>{ if((t.vaultIds||[]).includes(id)) { t.vaultIds=t.vaultIds.filter(x=>x!==id); t.updatedAt=Date.now(); } });
      save(); renderVault(); toast('Vault item deleted');
    } else if(act==='pin'){
      v.pinned=!v.pinned; v.updatedAt=Date.now(); if(!state._vaultItemsMeta) state._vaultItemsMeta={}; state._vaultItemsMeta[v.id]=Date.now(); save(); renderVault();
    }
  }));
  // preview click for image
  $$('[data-vault-preview]').forEach(el=> el.addEventListener('click', async e=>{
    e.stopPropagation();
    const v=state.vaultItems.find(x=>x.id===el.dataset.vaultPreview); if(!v||!v.blobId) return;
    try{ const blob=await vaultBlobGet(v.blobId); if(!blob) return; const url=URL.createObjectURL(blob); window.open(url,'_blank','noopener'); setTimeout(()=>URL.revokeObjectURL(url),60000);}catch(_){}
  }));
}
function openVaultModal(existing, preFile, preUrl){
  const isEdit=!!existing;
  const v = existing ? JSON.parse(JSON.stringify(existing)) : { id: uid(), title: '', url: preUrl||'', description: '', type: 'link', tags: [], collectionId: null, fileName:'', mime:'', size:0, blobId:null, linkedTaskIds:[], linkedGoalIds:[], linkedNoteIds:[], linkedStudentIds:[], pinned:false, createdAt: Date.now(), updatedAt: Date.now() };
  let pendingFile = preFile || null;
  if(preFile){
    v.fileName=preFile.name; v.mime=preFile.type||''; v.size=preFile.size; v.type=vaultGuessType(preFile.name, preFile.type);
    if(!v.title) v.title=preFile.name.replace(/\.[^.]+$/,'');
  }
  if(preUrl && !v.title) v.title=preUrl;
  // Form markup is built by src/vault/view.js; this function resolves state into it,
  // opens the modal, and owns every binding below.
  openModal(VaultStore.vaultModalHTML(v, {
    isEdit, pendingFile, collections: getVaultCollections(),
    tasks: state.tasks, goals: state.goals, notes: state.notes, students: getStudentsList(), ic,
  }));
  // auto-detect type from url/fileName
  const titleEl=$('#vm-title'), urlEl=$('#vm-url'), typeEl=$('#vm-type');
  const syncType=()=>{
    const fname = pendingFile? pendingFile.name : (v.fileName||'');
    const mime = pendingFile? pendingFile.type : (v.mime||'');
    const url = urlEl.value.trim();
    let guess='link';
    if(pendingFile) guess=vaultGuessType(fname,mime);
    else if(url){
      const ext=url.split('.').pop().split('?')[0].toLowerCase();
      if(['pdf'].includes(ext)) guess='pdf'; else if(['doc','docx'].includes(ext)) guess='doc'; else if(['xls','xlsx','csv'].includes(ext)) guess='sheet'; else if(['png','jpg','jpeg','gif','webp'].includes(ext)) guess='image'; else if(['mp4','webm','mov'].includes(ext)) guess='video';
    } else if(fname) guess=vaultGuessType(fname,mime);
    if(typeEl) typeEl.value=guess;
  };
  urlEl?.addEventListener('input', syncType);
  $('#vm-file')?.addEventListener('change', e=>{
    const f=e.target.files[0]; if(!f) return;
    if(f.size>VAULT_MAX_FILE){ toast('File too large — 10MB max, link instead','error'); e.target.value=''; return; }
    pendingFile=f; v.fileName=f.name; v.mime=f.type; v.size=f.size; $('#vm-file-info').textContent=f.name+' · '+fileSizeStr(f.size); syncType(); if(!titleEl.value.trim()) titleEl.value=f.name.replace(/\.[^.]+$/,'');
  });
  const drop=$('#vm-drop');
  if(drop){
    ['dragenter','dragover'].forEach(ev=> drop.addEventListener(ev, e=>{ e.preventDefault(); drop.classList.add('drag-over'); }));
    ['dragleave','drop'].forEach(ev=> drop.addEventListener(ev, e=>{ drop.classList.remove('drag-over'); }));
    drop.addEventListener('drop', e=>{
      e.preventDefault();
      const f=e.dataTransfer.files[0]; if(!f) return;
      if(f.size>VAULT_MAX_FILE){ toast('File too large — 10MB max','error'); return; }
      pendingFile=f; v.fileName=f.name; v.mime=f.type; v.size=f.size; $('#vm-file-info').textContent=f.name+' · '+fileSizeStr(f.size); syncType(); if(!titleEl.value.trim()) titleEl.value=f.name.replace(/\.[^.]+$/,'');
    });
  }
  $('#vm-file-clear')?.addEventListener('click', ()=>{ pendingFile=null; v.fileName=''; v.mime=''; v.size=0; v.blobId=null; $('#vm-file-info').textContent='No file — link only'; });
  $('#vm-delete')?.addEventListener('click', async ()=>{
    if(!confirm(`Delete "${existing.title}"?`)) return;
    captureUndo('Delete vault item');
    if(existing.blobId) try{ await vaultBlobDelete(existing.blobId); }catch(_){}
    state.vaultItems=state.vaultItems.filter(x=>x.id!==existing.id);
    if(!state._vaultItemsMeta) state._vaultItemsMeta={}; state._vaultItemsMeta[existing.id]=Date.now();
    tombstone('vaultItems', existing.id);
    state.tasks.forEach(t=>{ if((t.vaultIds||[]).includes(existing.id)) t.vaultIds=t.vaultIds.filter(id=>id!==existing.id); });
    save(); closeModal(); renderVault(); toast('Vault item deleted');
  });
  $('#vm-save')?.addEventListener('click', async ()=>{
    const title=titleEl.value.trim(); if(!title){ toast('Title required','error'); titleEl.focus(); return; }
    const url=urlEl.value.trim();
    if(url && !/^https?:\/\/.+/i.test(url)){ toast('URL must start with https://','error'); urlEl.focus(); return; }
    if(!url && !pendingFile && !v.blobId){ toast('Add a URL or file','error'); return; }
    // quota check if new file — atomic put then metadata
    let newBlobId=v.blobId || null;
    let newFileName=v.fileName||'', newMime=v.mime||'', newSize=v.size||0;
    let oldBlobToDelete=null;
    const vmFileEl = ($('#modal-root') ? $('#modal-root').querySelector('#vm-file') : null) || $('#vm-file');
    const activeFile = (vmFileEl && vmFileEl.files && vmFileEl.files[0]) ? vmFileEl.files[0] : pendingFile;
    if(activeFile || (v && v.fileName) || pendingFile){
      const targetFile = activeFile || pendingFile;
      if(targetFile){
        newBlobId='vault-'+uid();
        oldBlobToDelete = existing && existing.blobId && existing.blobId!==newBlobId ? existing.blobId : null;
        vaultBlobPut(newBlobId, targetFile).catch(e => console.warn('vaultBlobPut background warning:', e));
        newFileName=targetFile.name; newMime=targetFile.type; newSize=targetFile.size;
      }
    }
    const tags=($('#vm-tags')?.value||'').split(',').map(s=>s.trim()).filter(Boolean);
    const col=$('#vm-col')?.value || null;
    const type=($('#vm-type')?.value || (typeof typeEl!=='undefined' && typeEl?.value)) || vaultGuessType(newFileName,newMime) || 'link';
    const pinned=$('#vm-pinned')?.checked || (existing && existing.pinned) || false;
    const mrVault = $('#modal-root');
    const linkedTaskIds=[...(mrVault ? mrVault.querySelectorAll('#vm-tasks input:checked') : [])].map(i=>i.value);
    const linkedGoalIds=[...(mrVault ? mrVault.querySelectorAll('#vm-goals input:checked') : [])].map(i=>i.value);
    const linkedNoteIds=[...(mrVault ? mrVault.querySelectorAll('#vm-notes input:checked') : [])].map(i=>i.value);
    const linkedStudentIds=[...(mrVault ? mrVault.querySelectorAll('#vm-students input:checked') : [])].map(i=>i.value);
    const now=Date.now();
    const item={ id: (existing? existing.id : ('vault-'+uid())), title, url, description: ($('#vm-desc')?.value||'').trim(), type, tags, collectionId: col, fileName: newFileName, mime: newMime, size: newSize, blobId: newBlobId, linkedTaskIds, linkedGoalIds, linkedNoteIds, linkedStudentIds, pinned, createdAt: (existing && existing.createdAt) || now, updatedAt: now };
    try{
      captureUndo(isEdit? 'Edit vault item':'Add vault item');
      if(!Array.isArray(state.vaultItems)) state.vaultItems=[];
      if(isEdit){
        const idx=state.vaultItems.findIndex(x=>x.id===existing.id); if(idx>=0) state.vaultItems[idx]=item;
      } else {
        state.vaultItems.unshift(item);
      }
      if(!state._vaultItemsMeta) state._vaultItemsMeta={}; state._vaultItemsMeta[item.id]=now;
      // two-way sync for tasks: update task.vaultIds
      const allTaskIds=new Set([...linkedTaskIds, ...(existing? existing.linkedTaskIds||[] : [])]);
      allTaskIds.forEach(tid=>{
        const t=state.tasks.find(x=>x.id===tid); if(!t) return; if(!Array.isArray(t.vaultIds)) t.vaultIds=[];
        const shouldHave=linkedTaskIds.includes(tid);
        const has=t.vaultIds.includes(item.id);
        if(shouldHave && !has) t.vaultIds.push(item.id);
        if(!shouldHave && has) t.vaultIds=t.vaultIds.filter(id=>id!==item.id);
        t.updatedAt=now;
      });
      save();
      // old blob is now orphan — delete after metadata is in-memory and save() queued
      if(oldBlobToDelete) { try{ await vaultBlobDelete(oldBlobToDelete); }catch(_){} }
      closeModal();
      vaultFilter={q:'',type:'',tag:'',collection:''};
      if(currentView()==='vault') renderVault(); else if(currentView()==='dashboard') renderDashboard(); else renderView();
      toast(isEdit?'Vault item updated':'Vault item added ✅');
    }catch(e){
      // rollback new blob if we just put it and metadata failed — prevents orphan blob without metadata or metadata without blob
      if(pendingFile && newBlobId) { try{ await vaultBlobDelete(newBlobId); }catch(_){} }
      console.error('[Vault] atomic save failed', e);
      toast('Save failed — rolled back','error');
    }
  });
}
function linkGraphForVault(v){
  if(!v) return '';
  const tasks=(v.linkedTaskIds||[]).map(id=> state.tasks.find(t=>t.id===id)).filter(Boolean);
  if(!tasks.length) return '';
  return tasks.map(t=> `<span class="link-chip" data-vault-task="${t.id}" title="Vault → ${esc(t.title)}">→ ${esc(t.title.slice(0,24))}</span>`).join(' ');
}
function backfillVaultLinks(){
  // ensure task vaultIds ↔ vault linkedTaskIds two-way consistency on load
  if(!Array.isArray(state.vaultItems)) return;
  state.vaultItems.forEach(v=>{
    (v.linkedTaskIds||[]).forEach(tid=>{
      const t=state.tasks.find(x=>x.id===tid); if(t){ if(!Array.isArray(t.vaultIds)) t.vaultIds=[]; if(!t.vaultIds.includes(v.id)) t.vaultIds.push(v.id); }
    });
  });
  state.tasks.forEach(t=>{
    (t.vaultIds||[]).forEach(vid=>{
      const v=state.vaultItems.find(x=>x.id===vid); if(v){ if(!Array.isArray(v.linkedTaskIds)) v.linkedTaskIds=[]; if(!v.linkedTaskIds.includes(t.id)) v.linkedTaskIds.push(t.id); }
    });
  });
}
function vaultLinkPickerHTML(selectedIds){ return VaultStore.vaultLinkPickerHTML(selectedIds, getVaultItems()); }

// expose for tests/debug — Vite seam: src/vault/store.js + view.js are the source of truth, app.js shims for now
if (typeof window !== 'undefined') {
  window.LumenLib = window.LumenLib || {};
  window.LumenLib.vault = window.LumenLib.vault || {};
  Object.assign(window.LumenLib.vault, { getVaultItems, getVaultCollections, getVaultFiltered, openVaultModal, renderVault });
}

/* Lightweight markdown */
function renderMd(md) {
  const lines = String(md || '').replace(/\r\n/g, '\n').split('\n');
  let html = '', inCode = false, codeLines = [], inList = false;
  const inline = s => {
    const escaped = esc(s);
    // backlinks [[Goal Title]] → pill; resolve against goals/habits/tasks/notes/vault titles
    const withBacklinks = escaped.replace(/\[\[([^\]]+)\]\]/g, (_, inner) => {
      const raw = inner.trim();
      const q = raw.toLowerCase();
      if (q.startsWith('vault:') || q.startsWith('vault ')){
        const vq = q.replace(/^vault[:\s]+/, '').trim();
        const v = state.vaultItems.find(x => x.title.toLowerCase() === vq || x.id.toLowerCase() === vq);
        if (v) return `<span class="backlink-pill" data-backlink="vault:${v.id}" title="vault: ${esc(v.title)}">[[${esc(inner)}]]</span>`;
      }
      let target = null, type = '';
      const g = state.goals.find(x => x.title.toLowerCase() === q || x.id.toLowerCase() === q);
      if (g) { target = g; type = 'goal'; }
      else {
        const h = state.habits.find(x => x.name.toLowerCase() === q);
        if (h) { target = h; type = 'habit'; }
        else {
          const t = state.tasks.find(x => x.title.toLowerCase() === q);
          if (t) { target = t; type = 'task'; }
          else {
            const n = state.notes.find(x => (x.title || '').toLowerCase() === q);
            if (n) { target = n; type = 'note'; }
            else {
              const v2 = state.vaultItems.find(x => x.title.toLowerCase() === q);
              if (v2) { target = v2; type = 'vault'; }
            }
          }
        }
      }
      if (target) return `<span class="backlink-pill" data-backlink="${type}:${target.id}" title="${type}: ${esc(type === 'goal' ? target.title : type === 'habit' ? target.name : target.title)}">[[${esc(inner)}]]</span>`;
      return `[[${esc(inner)}]]`;
    });
    return withBacklinks
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/\*([^*]+)\*/g, '<i>$1</i>')
      .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  };
  lines.forEach((raw, lineIdx) => {
    const t = raw.trim();
    if (t.startsWith('```')) {
      if (!inCode) { inCode = true; codeLines = []; }
      else { inCode = false; html += `<pre><code>${esc(codeLines.join('\n'))}</code></pre>`; }
      return;
    }
    if (inCode) { codeLines.push(raw); return; }
    if (!t) { if (inList) { html += '</ul>'; inList = false; } return; }
    const h = t.match(/^(#{1,3})\s+(.*)/);
    if (h) { if (inList) { html += '</ul>'; inList = false; } html += `<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`; return; }
    const cb = t.match(/^[-*]\s+\[( |x|X)\]\s+(.*)/);
    if (cb) {
      if (!inList) { html += '<ul class="task-list">'; inList = true; }
      const checked = cb[1].toLowerCase() === 'x';
      html += `<li class="task-list-item ${checked ? 'checked' : ''}"><input type="checkbox" data-line-idx="${lineIdx}" ${checked ? 'checked' : ''}> <span>${inline(cb[2])}</span></li>`;
      return;
    }
    const li = t.match(/^[-*]\s+(.*)/);
    if (li) { if (!inList) { html += '<ul>'; inList = true; } html += `<li>${inline(li[1])}</li>`; return; }
    const qt = t.match(/^&gt;\s?(.*)/) || t.match(/^>\s?(.*)/);
    if (qt) { if (inList) { html += '</ul>'; inList = false; } html += `<blockquote>${inline(qt[1])}</blockquote>`; return; }
    if (inList) { html += '</ul>'; inList = false; }
    html += `<p>${inline(t)}</p>`;
  });
  if (inCode) html += `<pre><code>${esc(codeLines.join('\n'))}</code></pre>`;
  if (inList) html += '</ul>';
  return html;
}

/* ============ Voice ============ */
const rec = { active: false, startTs: 0, timer: null, chunks: [], mr: null, stream: null, sr: null, interim: '', final: '' };
let playingAudio = null, playingId = null;
let lastCapturedId = null;

/* Auto-tagging: pull meaningful tags straight out of the transcript. */
const TAG_RULES = [
  [/meeting|sync|standup|zoom|1:1|one-on-one|call with/i, 'work'],
  [/idea|inspiration|maybe we|could we|what if/i, 'idea'],
  [/buy|grocer|shop|order|errand|pick up|remember to get/i, 'errand'],
  [/to ?do|todo|task|need to|must|remind|don'?t forget/i, 'task'],
  [/goal|target|deadline|quarter|by (this|next) (week|month|friday|monday)/i, 'goal'],
  [/habit|daily|routine|exercise|workout|run|meditat|read for|journal/i, 'habit'],
  [/email|reply|follow up|send .*?email/i, 'email'],
  [/book|article|podcast|watch|learn|study/i, 'learn'],
  [/pay|bill|invoice|renew|bank/i, 'finance']
];
function autoTagTranscript(text) {
  const tags = [];
  TAG_RULES.forEach(([re, tag]) => { if (re.test(text) && !tags.includes(tag)) tags.push(tag); });
  return tags;
}

function updateMicButton() {
  const b = $('#global-mic-btn');
  if (!b) return;
  b.innerHTML = rec.active ? ic('stop', 17) : ic('mic', 17);
  b.classList.toggle('recording', rec.active);
}
function renderCapturePill(mode, recId) {
  const pill = $('#capture-pill');
  if (!pill) return;
  if (mode === 'rec') {
    lastCapturedId = null;
    pill.classList.remove('hidden');
    $('#cap-btn').innerHTML = ic('stop', 20);
    $('#cap-btn').classList.add('recording');
    $('#cap-live').classList.remove('hidden');
    $('#cap-actions').classList.add('hidden');
    $('#cap-close').classList.add('hidden');
    $('#cap-timer').textContent = '0m 0s';
    $('#cap-transcript').textContent = 'Listening…';
  } else if (mode === 'done') {
    lastCapturedId = recId || lastCapturedId;
    const r = state.recordings.find(x => x.id === lastCapturedId);
    pill.classList.remove('hidden');
    $('#cap-btn').innerHTML = ic('mic', 20);
    $('#cap-btn').classList.remove('recording');
    $('#cap-live').classList.add('hidden');
    $('#cap-actions').classList.remove('hidden');
    $('#cap-close').classList.remove('hidden');
    $('#cap-timer').textContent = r ? `Saved · ${fmtDur(r.duration)}` : 'Saved';
    $('#cap-transcript').textContent = r && r.transcript
      ? `“${r.transcript.slice(0, 90)}${r.transcript.length > 90 ? '…' : ''}”`
      : 'Memo saved (no transcription) — turn it into a note or task below.';
  } else {
    pill.classList.add('hidden');
  }
}
function hideCapturePill() { renderCapturePill(null); }
function toggleCapture() {
  if (rec.active) stopRec();
  else startRec();
}
function getSR() { const w = window; return w.SpeechRecognition || w.webkitSpeechRecognition || null; }
function defaultRecName() {
  return 'Recording ' + new Date().toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
async function startRec() {
  if (rec.active) return;
  if (!window.MediaRecorder) { toast('Voice recording isn’t supported in this browser', 'error'); return; }
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
  catch (e) { toast('Microphone access denied — allow mic permission to record', 'error'); return; }
  rec.stream = stream; rec.chunks = []; rec.final = ''; rec.interim = ''; rec.startTs = Date.now();
  rec.mr = new MediaRecorder(stream);
  rec.mr.ondataavailable = e => { if (e.data && e.data.size) rec.chunks.push(e.data); };
  rec.mr.onstop = saveRecording;
  rec.mr.start();
  const SR = getSR();
  if (SR) {
    try {
      rec.sr = new SR();
      rec.sr.continuous = true; rec.sr.interimResults = true;
      rec.sr.lang = navigator.language || 'en-US';
      rec.sr.onresult = e => {
        let final = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) final += e.results[i][0].transcript;
          else rec.interim = e.results[i][0].transcript;
        }
        if (final) { rec.final += final; rec.interim = ''; }
        updateTranscriptUI();
      };
      rec.sr.onerror = () => { try { rec.sr && rec.sr.abort(); } catch (_) {} };
      rec.sr.start();
    } catch (_) { rec.sr = null; }
  }
  rec.active = true;
  rec.timer = setInterval(() => {
    const t = fmtDur(Math.floor((Date.now() - rec.startTs) / 1000));
    $$('#rec-timer, #cap-timer').forEach(el => { el.textContent = t; });
  }, 250);
  renderView();
  updateMicButton();
  renderCapturePill('rec');
  toast(getSR() ? 'Recording… speak now' : 'Recording… (transcription not supported here)', getSR() ? '' : 'error');
}
function stopRec() {
  if (!rec.active) return;
  rec.active = false;
  clearInterval(rec.timer);
  try { rec.sr && rec.sr.stop(); } catch (_) {}
  if (rec.mr && rec.mr.state !== 'inactive') rec.mr.stop();
}
async function saveRecording() {
  const type = (rec.mr && rec.mr.mimeType) || 'audio/webm';
  const blob = new Blob(rec.chunks, { type });
  const duration = Math.max(1, Math.round((Date.now() - rec.startTs) / 1000));
  const id = uid();
  try { await blobPut(id, blob); localAudioIds.add(id); } catch (e) { toast('Couldn’t save audio to browser storage', 'error'); }
  const transcript = (rec.final || '').trim();
  const tags = ['voice', ...autoTagTranscript(transcript)];
  state.recordings.unshift({
    id, name: defaultRecName(), date: Date.now(), duration, type, updatedAt: Date.now(),
    transcript, tags
  });
  if (rec.stream) rec.stream.getTracks().forEach(t => t.stop());
  rec.stream = null; rec.chunks = []; rec.interim = ''; rec.final = '';
  save();
  evaluateAchievements();
  updateMicButton();
  renderCapturePill('done', id);
  if (currentView() === 'voice') renderVoice();
  toast(tags.length > 1 ? `Recording saved 🎙️ · tagged ${tags.slice(1).join(', ')}` : 'Recording saved 🎙️', 'success');
}
function updateTranscriptUI() {
  const text = (rec.final + ' ' + rec.interim).trim() || 'Listening…';
  const a = $('#rec-transcript');
  if (a) a.textContent = text;
  const b = $('#cap-transcript');
  if (b) b.textContent = text;
}
async function togglePlay(id, btn) {
  const r = state.recordings.find(x => x.id === id);
  if (!r) return;
  if (playingId === id && playingAudio) {
    playingAudio.pause(); playingAudio = null; playingId = null;
    updatePlayUI(); return;
  }
  if (playingAudio) { playingAudio.pause(); playingAudio = null; }
  const blob = await blobGet(id);
  if (!blob) { toast('Audio missing from browser storage', 'error'); return; }
  const url = URL.createObjectURL(blob);
  const a = new Audio(url);
  playingAudio = a; playingId = id;
  updatePlayUI();
  a.onended = () => { playingAudio = null; playingId = null; updatePlayUI(); URL.revokeObjectURL(url); };
  a.play().catch(() => toast('Playback failed', 'error'));
}
function updatePlayUI() {
  $$('.rec-play').forEach(b => {
    const on = b.dataset.id === playingId;
    b.classList.toggle('playing', on);
    b.innerHTML = on ? ic('pause', 16) : ic('play', 16);
  });
}
function renderVoice() {
  const items = [...state.recordings].sort((a, b) => (b.date || 0) - (a.date || 0)).map(r => `
    <div class="rec-item">
      <button class="rec-play" data-id="${r.id}" title="Play / pause">${ic('play', 16)}</button>
      <div class="rec-info">
        <div class="rec-name">${esc(r.name)}</div>
        <div class="rec-meta">${fmtWhen(r.date)} · ${fmtDur(r.duration)}${r.transcript ? ' · ' + r.transcript.length + ' chars' : ''}</div>
        ${r.transcript ? `<div class="rec-transcript-preview">“${esc(r.transcript.slice(0, 110))}${r.transcript.length > 110 ? '…' : ''}”</div>` : ''}
      </div>
      <div class="rec-actions">
        <button class="btn-icon" data-ai-extract="${r.id}" title="✨ Extract tasks with AI" style="color:#a78bfa">✨</button>
        <button class="btn-icon" data-to-note="${r.id}" title="Save as note">${ic('file-text', 15)}</button>
        <button class="btn-icon" data-to-task="${r.id}" title="Turn into task">${ic('check-square', 15)}</button>
        <button class="btn-icon" data-del-rec="${r.id}" title="Delete" style="color:var(--red)">${ic('trash', 15)}</button>
      </div>
    </div>`).join('') || '<div class="empty-state"><div class="es-icon">🎙️</div>No recordings yet. Hit the button and start talking.</div>';

  const srSupported = !!getSR();
  viewRoot().innerHTML = `
    <div class="voice-grid">
      <div class="card rec-card">
        <button class="rec-btn ${rec.active ? 'recording' : ''}" id="rec-btn">${rec.active ? ic('stop', 26) : ic('mic', 26)}</button>
        <div class="rec-timer" id="rec-timer">${rec.active ? '0m 0s' : 'Ready'}</div>
        ${rec.active ? '<div class="eq"><span></span><span></span><span></span><span></span><span></span></div>' : ''}
        <div class="rec-status">${rec.active ? 'Recording — click to stop' : srSupported ? 'Live transcription supported in this browser' : 'This browser has no speech-to-text'}</div>
        <div class="rec-transcript hidden" id="rec-transcript"></div>
      </div>
      <div>
        <div class="recs-title">Recordings <span class="muted">(${state.recordings.length})</span></div>
        ${items}
      </div>
    </div>`;
  const btn = $('#rec-btn');
  btn.addEventListener('click', () => rec.active ? stopRec() : startRec());
  $$('.rec-play').forEach(b => b.addEventListener('click', () => togglePlay(b.dataset.id, b)));
  $$('[data-to-note]').forEach(b => b.addEventListener('click', () => recToNote(b.dataset.toNote)));
  $$('[data-to-task]').forEach(b => b.addEventListener('click', () => recToTask(b.dataset.toTask)));
  $$('[data-ai-extract]').forEach(b => b.addEventListener('click', async () => {
    const r = state.recordings.find(x => x.id === b.dataset.aiExtract);
    if (!r || !r.transcript) { toast('No transcript available for this recording', 'error'); return; }
    if (!state.settings.geminiApiKey) { toast('Set your Gemini API key in Settings → AI Assistant 🤖', 'error'); return; }
    toast('✨ Extracting action items with AI…');
    try {
      const prompt = `Extract actionable tasks from this voice memo transcript. Transcript: "${r.transcript}". Return ONLY a JSON array of objects with schema [{"title": "task title", "subtasks": ["step 1", "step 2"]}]. No markdown, just valid JSON.`;
      const res = await callGemini(prompt, 'You are an executive assistant extracting structured tasks. Return valid JSON only.');
      const cleaned = res.replace(/```json/gi, '').replace(/```/g, '').trim();
      const items = JSON.parse(cleaned);
      if (Array.isArray(items) && items.length) {
        items.forEach(item => {
          const subtasks = (item.subtasks || []).map(st => ({ id: uid(), text: st, done: false }));
          state.tasks.unshift({
            id: uid(),
            title: item.title || 'Extracted task',
            desc: `From voice memo: ${r.name}`,
            status: 'today',
            priority: 'med',
            due: todayISO(),
            tags: ['voice-extracted'],
            subtasks,
            createdAt: Date.now(),
            completedAt: null,
            updatedAt: Date.now()
          });
        });
        save();
        toast(`✨ Created ${items.length} task${items.length === 1 ? '' : 's'} from memo!`, 'success');
        location.hash = '#tasks';
      } else {
        toast('No tasks could be extracted', 'error');
      }
    } catch (err) {
      toast(`AI Error: ${err.message}`, 'error');
    }
  }));
  $$('[data-del-rec]').forEach(b => b.addEventListener('click', async () => {
    const r = state.recordings.find(x => x.id === b.dataset.delRec);
    if (!r) return;
    if (confirm(`Delete “${r.name}”?`)) {
      state.recordings = state.recordings.filter(x => x.id !== r.id);
      try { await blobDelete(r.id); } catch(_) {}
      tombstone('recordings', r.id);
      localAudioIds.delete(r.id);
      save(); renderVoice(); toast('Recording deleted');
    }
  }));
  updatePlayUI();
  if (rec.active) updateTranscriptUI();
}
function recToNote(id) {
  const r = state.recordings.find(x => x.id === id);
  if (!r) return;
  const txt = (r.transcript || '').trim();
  const firstLine = (txt.split(/[.!?\n]/)[0] || '').trim();
  const title = (firstLine ? firstLine.slice(0, 50) : r.name);
  const n = {
    id: uid(), title, content: txt || 'Voice memo — no transcription available for this one.',
    tags: [...new Set([...(r.tags || []), 'voice'])], pinned: false, createdAt: Date.now(), updatedAt: Date.now(), audioId: r.id
  };
  state.notes.unshift(n);
  selectedNoteId = n.id;
  notePreview = false;
  save();
  hideCapturePill();
  location.hash = '#notes';
  toast('Saved as note 📝', 'success');
}
function recToTask(id) {
  const r = state.recordings.find(x => x.id === id);
  if (!r) return;
  const txt = (r.transcript || '').trim();
  const firstLine = (txt.split(/[.!?\n]/)[0] || '').trim();
  const title = (firstLine || r.name).slice(0, 60) || 'Voice task';
  const tags = (r.tags || []).filter(t => t !== 'voice');
  state.tasks.unshift({
    id: uid(), title, desc: txt, status: 'today', priority: 'med', due: '', goalId: '',
    tags, createdAt: Date.now(), completedAt: null, updatedAt: Date.now()
  });
  save();
  hideCapturePill();
  location.hash = '#tasks';
  toast('Voice memo → task ✅', 'success');
}

/* ============ Pomodoro ============ */
const pomo = { dur: 25 * 60, remain: 25 * 60, running: false, timer: null };
function pomodoroHTML() {
  const total = pomo.dur;
  const pct = total > 0 ? Math.round(((total - pomo.remain) / total) * 100) : 0;
  const mins = Math.floor(pomo.remain / 60), secs = pomo.remain % 60;
  const ss = state.settings.pomodoroDate === todayISO() ? state.settings.pomodoroCount : 0;
  const isIdle = !pomo.running && pomo.remain === pomo.dur && !taskPomo.taskId;
  const firstCommitted = isIdle ? getFirstCommittedTask() : null;
  const focusHint = firstCommitted ? (() => {
    const sched = firstCommitted.scheduleDay ? `${DAYS.find(d=>d.id===firstCommitted.scheduleDay)?.label || firstCommitted.scheduleDay} ${getPeriods().find(p=>p.id===firstCommitted.schedulePeriod)?.label || firstCommitted.schedulePeriod || ''}` : 'unplaced — drop in Schedule';
    return `<div class="pomo-focus-hint" data-focus-task="${firstCommitted.id}" data-testid="focus-hint" style="margin-top:10px;padding:8px 10px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;display:flex;align-items:center;gap:8px;cursor:pointer" title="Click to open">
      <span style="font-size:11px;font-weight:700;color:var(--accent)">🎯 Next up</span>
      <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;font-size:12.5px;font-weight:600" class="pomo-focus-title">${esc(firstCommitted.title)}</span>
      <span class="muted" style="font-size:11px">${esc(sched)}</span>
      ${linkGraphForTask(firstCommitted)}
    </div>`;
  })() : '';
  const idleHint = isIdle && !firstCommitted ? `<div class="muted" style="font-size:12px;margin-top:10px">Commit a day in Brief to seed Focus.</div>` : '';
  return `<div class="pomo-wrap">
      <div class="pomo-ring" style="--p:${pct}%">
        <div class="pomo-inner">
          <div class="pomo-time">${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}</div>
          <div class="pomo-state">${pomo.running ? 'focusing…' : 'paused'}</div>
        </div>
      </div>
      <div class="pomo-presets">
        ${[15, 25, 45].map(m => `<button class="btn btn-sm ${pomo.dur === m * 60 ? 'active' : ''}" data-pomo-min="${m}">${m}m</button>`).join('')}
      </div>
      <div class="pomo-controls">
        <button class="btn btn-accent" id="pomo-toggle">${pomo.running ? ic('pause', 14) + ' Pause' : ic('play', 14) + ' Start'}</button>
        <button class="btn btn-ghost" id="pomo-reset">${ic('x', 14)} Reset</button>
      </div>
      <div class="pomo-session">🍅 ${ss} session${ss === 1 ? '' : 's'} completed today</div>
      ${focusHint || idleHint}
    </div>`;
}
function bindPomodoro() {
  const toggle = $('#pomo-toggle'), reset = $('#pomo-reset');
  if (toggle) toggle.addEventListener('click', () => {
    if (pomo.running) { clearInterval(pomo.timer); pomo.running = false; }
    else {
      if (pomo.remain <= 0) pomo.remain = pomo.dur;
      pomo.running = true;
      pomo.timer = setInterval(() => {
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
      }, 1000);
    }
    updatePomoUI();
  });
  if (reset) reset.addEventListener('click', () => {
    clearInterval(pomo.timer); pomo.running = false; pomo.remain = pomo.dur; updatePomoUI();
  });
  $$('[data-pomo-min]').forEach(b => b.addEventListener('click', () => {
    clearInterval(pomo.timer); pomo.running = false;
    pomo.dur = parseInt(b.dataset.pomoMin, 10) * 60; pomo.remain = pomo.dur;
    state.settings.pomodoroMin = parseInt(b.dataset.pomoMin, 10);
    save(); updatePomoUI();
  }));
  // idle Focus → first committed task click to open + start task pomo
  const hint = $('.pomo-focus-hint');
  if (hint) hint.addEventListener('click', () => {
    const tid = hint.dataset.focusTask;
    const t = state.tasks.find(x=>x.id===tid);
    if (t) {
      openTaskModal(t);
      // if user starts pomo from modal, that will be task pomo; for quick start, also seed global hint
      state.settings.focusTaskId = tid; save();
    }
  });
}
function offerFocusHabitProtect() {
  const today = todayISO();
  const due = state.habits.filter(h => !h.dates[today] && !(h.freezes && h.freezes[today]));
  if (!due.length) return;
  const top = [...due].sort((a, b) => habitStreak(b) - habitStreak(a))[0];
  const root = $('#toast-root');
  if (!root) return;
  while (root.children.length >= 5) root.firstChild.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.style.display = 'flex'; el.style.alignItems = 'center'; el.style.gap = '8px';
  el.innerHTML = `<span>🍅 Streak protected via focus — freeze ${esc(top.name)}?</span><button class="btn btn-sm btn-accent" style="margin-left:8px">Freeze</button><button class="btn btn-sm btn-ghost">Undo</button>`;
  root.appendChild(el);
  const freezeBtn = el.querySelector('.btn-accent');
  const undoBtn = el.querySelector('.btn-ghost');
  let frozen = false;
  freezeBtn.addEventListener('click', () => {
    toggleHabitFreeze(top, today);
    logActivity('habit.freeze', top.emoji + ' ' + top.name + ' via focus', 'habit');
    save();
    frozen = true;
    el.innerHTML = `🛡️ ${esc(top.name)} frozen for today`;
    setTimeout(() => { el.style.animation = 'toastOut .3s ease-in forwards'; setTimeout(() => el.remove(), 320); }, 1800);
    updateTaskPomoUI(); updatePomoUI();
  });
  undoBtn.addEventListener('click', () => {
    if (frozen) { toggleHabitFreeze(top, today); save(); }
    el.remove();
  });
  setTimeout(() => { if (el.parentNode) { el.style.animation = 'toastOut .3s ease-in forwards'; setTimeout(() => el.remove(), 320); } }, 5000);
}
function tickPomo() {
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

function updatePomoUI() {
  const el = $('#pomo-toggle');
  const time = $('.pomo-time');
  const stateEl = $('.pomo-state');
  const ring = $('.pomo-ring');
  if (el) el.innerHTML = pomo.running ? ic('pause', 14) + ' Pause' : ic('play', 14) + ' Start';
  if (time) {
    const mins = Math.floor(pomo.remain / 60), secs = pomo.remain % 60;
    time.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  if (stateEl) stateEl.textContent = pomo.running ? 'focusing…' : 'paused';
  if (ring) ring.style.setProperty('--p', Math.round(((pomo.dur - pomo.remain) / pomo.dur) * 100) + '%');
  const ssEl = $('.pomo-session');  if (ssEl) {
    const ss = state.settings.pomodoroDate === todayISO() ? state.settings.pomodoroCount : 0;
    ssEl.textContent = `🍅 ${ss} session${ss === 1 ? '' : 's'} completed today`;
  }
  updateFloatingPomoPill();
}

/* Floating Focus Widget */
function updateFloatingPomoPill() {
  const pill = $('#floating-pomo-pill');
  if (!pill) return;
  const isTaskActive = !!taskPomo.taskId;
  const isGlobalActive = pomo.running || (pomo.remain < pomo.dur && pomo.remain > 0);
  
  if (!isTaskActive && !isGlobalActive) {
    pill.classList.add('hidden');
    pill.classList.remove('running');
    return;
  }
  
  pill.classList.remove('hidden');
  const running = isTaskActive ? taskPomo.running : pomo.running;
  const remain = isTaskActive ? taskPomo.remain : pomo.remain;
  const mins = Math.floor(remain / 60), secs = remain % 60;
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  
  pill.classList.toggle('running', running);
  const timeEl = $('#fp-time');
  const labelEl = $('#fp-label');
  const toggleBtn = $('#fp-toggle');
  
  if (timeEl) timeEl.textContent = timeStr;
  if (labelEl) {
    if (isTaskActive) {
      const t = state.tasks.find(x => x.id === taskPomo.taskId);
      labelEl.textContent = t ? t.title : 'Task focus';
    } else {
      labelEl.textContent = 'Pomodoro focus';
    }
  }
  if (toggleBtn) toggleBtn.textContent = running ? '⏸' : '▶';
}
function bindFloatingPomoPill() {
  const toggleBtn = $('#fp-toggle');
  const closeBtn = $('#fp-close');
  if (toggleBtn) toggleBtn.addEventListener('click', () => {
    if (taskPomo.taskId) {
      if (taskPomo.running) {
        clearInterval(taskPomo.timer);
        taskPomo.running = false;
      } else {
        startTaskPomo(taskPomo.taskId, Math.ceil(taskPomo.remain / 60));
      }
      updateTaskPomoUI();
    } else {
      $('#pomo-toggle')?.click();
    }
  });
  if (closeBtn) closeBtn.addEventListener('click', () => {
    if (taskPomo.taskId) stopTaskPomo(true);
    if (pomo.running) { clearInterval(pomo.timer); pomo.running = false; pomo.remain = pomo.dur; }
    updatePomoUI();
    updateTaskPomoUI();
  });
}

/* ---- Per-task focus timer ---- */
const taskPomo = { taskId: null, dur: 25 * 60, remain: 25 * 60, running: false, timer: null, sessionCount: 0 };
function startTaskPomo(taskId, minutes) {
  stopTaskPomo(false);
  taskPomo.taskId = taskId;
  taskPomo.dur = (minutes || 25) * 60;
  taskPomo.remain = taskPomo.dur;
  taskPomo.running = true;
  taskPomo.sessionCount = 0;
  taskPomo.timer = setInterval(() => {
    taskPomo.remain--;
    if (taskPomo.remain <= 0) {
      taskPomo.sessionCount++;
      taskPomo.remain = taskPomo.dur;
      if (state.settings.pomodoroDate === todayISO()) state.settings.pomodoroCount++;
      else { state.settings.pomodoroDate = todayISO(); state.settings.pomodoroCount = 1; }
      recordPomoSession(taskPomo.taskId, taskPomo.dur, true);
      save();
      playChime('pomo-done');
      toast('🍅 Focus session complete — great work!', 'success');
      offerFocusHabitProtect();
    }
    updateTaskPomoUI();
  }, 1000);
  updateTaskPomoUI();
  toast('🍅 Focus started — stay in the zone!');
}
function stopTaskPomo(countSession) {
  if (taskPomo.timer) clearInterval(taskPomo.timer);
  if (countSession && taskPomo.running && taskPomo.remain < taskPomo.dur) {
    const elapsed = taskPomo.dur - taskPomo.remain;
    taskPomo.sessionCount++;
    if (state.settings.pomodoroDate === todayISO()) state.settings.pomodoroCount++;
    else { state.settings.pomodoroDate = todayISO(); state.settings.pomodoroCount = 1; }
    recordPomoSession(taskPomo.taskId, elapsed, false);
    save();
  }
  taskPomo.taskId = null;
  taskPomo.running = false;
  taskPomo.sessionCount = 0;
  updateTaskPomoUI();
}
function toggleTaskPomo(taskId, minutes) {
  if (taskPomo.running && taskPomo.taskId === taskId) {
    stopTaskPomo(true);
    toast('🍅 Focus paused — ' + fmtDur(taskPomo.dur - taskPomo.remain) + ' logged');
  } else {
    startTaskPomo(taskId, minutes);
  }
}
function taskPomoHTML(t) {
  const active = taskPomo.running && taskPomo.taskId === t.id;
  const mins = Math.floor(taskPomo.remain / 60), secs = taskPomo.remain % 60;
  const elapsed = taskPomo.dur - taskPomo.remain;
  const pct = taskPomo.dur > 0 ? Math.round((elapsed / taskPomo.dur) * 100) : 0;
  if (active) {
    return `<div class="task-pomo active">
      <div class="task-pomo-progress" style="width:${pct}%"></div>
      <span class="task-pomo-icon">🍅</span>
      <span class="task-pomo-time">${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}</span>
      <button class="task-pomo-btn" data-task-pomo="${t.id}" title="Pause focus">
        ${ic('pause', 12)}
      </button>
    </div>`;
  }
  return `<button class="task-pomo-btn idle" data-task-pomo="${t.id}" data-pomo-min="25" title="Start 25 min focus">🍅</button>`;
}
function bindTaskPomoButtons(scope) {
  $$('[data-task-pomo]', scope).forEach(b => {
    b.addEventListener('click', e => {
      e.stopPropagation();
      const min = parseInt(b.dataset.pomoMin, 10) || 25;
      toggleTaskPomo(b.dataset.taskPomo, min);
    });
  });
}
function updateTaskPomoUI() {
  $$('.task-pomo').forEach(el => {
    const card = el.closest('[data-id]');
    const id = card ? card.dataset.id : null;
    const isActive = taskPomo.running && taskPomo.taskId === id;
    if (!isActive && el.classList.contains('active')) {
      // timer stopped — replace the active pomo strip with the idle button
      el.outerHTML = taskPomoHTML({ id });
      return;
    }
    if (isActive) {
      const timeEl = el.querySelector('.task-pomo-time');
      const progressEl = el.querySelector('.task-pomo-progress');
      if (timeEl) {
        const mins = Math.floor(taskPomo.remain / 60), secs = taskPomo.remain % 60;
        timeEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      }
      if (progressEl) {
        const pct = taskPomo.dur > 0 ? Math.round(((taskPomo.dur - taskPomo.remain) / taskPomo.dur) * 100) : 0;
        progressEl.style.width = pct + '%';
      }
    }
  });
  // Also handle idle buttons on cards that weren't rendered with a pomo strip yet
  if (taskPomo.running) {
    $$(`[data-id="${taskPomo.taskId}"] .task-pomo-btn.idle`).forEach(btn => {
      const card = btn.closest('[data-id]');
      if (card) {
        btn.outerHTML = taskPomoHTML({ id: taskPomo.taskId });
        bindTaskPomoButtons(card);
      }
    });
  }
  updateFloatingPomoPill();
}
// Update live progress timers on cards (runs every 10s)
setInterval(() => {
  $$('.time-live').forEach(el => {
    const start = parseInt(el.dataset.progressStart, 10);
    if (!start) return;
    const elapsed = Math.round((Date.now() - start) / 1000);
    el.textContent = fmtProgressTime(elapsed);
  });
}, 10000);

/* ============ Cross-device sync (WebRTC via PeerJS) ============ */
const SYNC_KEY = 'lumen.sync.v1';
function genPeerId() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let hex = '';
  bytes.forEach(b => { hex += b.toString(16).padStart(2, '0'); });
  return 'lumen-' + hex;
}
function defaultSyncMeta() {
  return { peerId: genPeerId(), rev: 1, autoSync: true, deviceName: '', passHash: '', passSalt: '', passHashV: 1, passHashLegacy: '', tombstones: { tasks: [], goals: [], habits: [], notes: [], recordings: [], vaultItems: [], vaultCollections: {} }, syncQueue: [] };
}
function loadSyncMeta() {
  try {
    const raw = localStorage.getItem(SYNC_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const def = defaultSyncMeta();
      // merge tombstones so new keys (vaultItems etc) appear on old syncMeta
      def.tombstones = Object.assign({}, def.tombstones, parsed.tombstones || {});
      if (parsed.tombstones && parsed.tombstones.vaultCollections && typeof parsed.tombstones.vaultCollections === 'object' && !Array.isArray(parsed.tombstones.vaultCollections)) def.tombstones.vaultCollections = parsed.tombstones.vaultCollections;
      else if (!def.tombstones.vaultCollections) def.tombstones.vaultCollections = {};
      if (!Array.isArray(def.tombstones.vaultItems)) def.tombstones.vaultItems = Array.isArray(parsed.tombstones?.vaultItems) ? parsed.tombstones.vaultItems : [];
      return Object.assign(def, parsed, { tombstones: def.tombstones });
    }
  } catch (e) { /* ignore */ }
  return defaultSyncMeta();
}
function saveSyncMeta() { try { localStorage.setItem(SYNC_KEY, JSON.stringify(syncMeta)); } catch (e) { /* ignore */ } }
async function hashPass(p) {
  // task 8: wired to salted PBKDF2 when passSalt exists (v2), fallback to legacy for v1 peers
  try {
    if (syncMeta && syncMeta.passSalt && syncMeta.passHashV === 2) {
      return await window.LumenLib.crypto.hashPass(p, syncMeta.passSalt);
    }
  } catch (_) {}
  return window.LumenLib.crypto.hashPassLegacy(p);
}

let syncMeta = loadSyncMeta();
if (typeof localStorage !== 'undefined') {
  if (!localStorage.getItem(SYNC_KEY)) saveSyncMeta(); // persist the ID immediately so it survives reloads
  // v104: nudge legacy (unsalted) sync passphrases to be re-entered so they upgrade to PBKDF2.
  if (syncMeta.passHash && !syncMeta.passSalt && !localStorage.getItem('lumen.passUpgradeNudged')) {
    setTimeout(() => {
      try { toast('Re-enter your sync passphrase (Settings → Sync) to upgrade its security', 'info'); } catch (_) {}
      try { localStorage.setItem('lumen.passUpgradeNudged', '1'); } catch (_) {}
    }, 2500);
  }
}
let peer = null, conn = null, peerStatus = 'offline', peerStatusDetail = '';
let suppressAutoPush = false, autoPushTimer = null;
/* PeerJS (~92KB) is loaded on demand — only when sync is actually used — instead of
   parsing it on every cold boot. The service worker keeps it cached for offline use. */
let _peerLibLoading = null;
function loadPeerLib() {
  if (window.Peer) return Promise.resolve(window.Peer);
  if (_peerLibLoading) return _peerLibLoading;
  _peerLibLoading = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'peerjs.min.js';
    s.onload = () => res(window.Peer);
    s.onerror = () => { _peerLibLoading = null; rej(new Error('Sync library unavailable (offline?)')); };
    document.head.appendChild(s);
  });
  return _peerLibLoading;
}
const isConnected = () => !!(conn && conn.open);

function ensurePeer() {
  if (!state.settings.syncEnabled) return;
  if (peer) return;
  if (!window.Peer) {
    loadPeerLib().then(P => { if (!peer && P) startPeer(P); })
      .catch(err => { peerStatus = 'error'; peerStatusDetail = err.message; updateSyncUI(); });
    return;
  }
  startPeer(window.Peer);
}

function startPeer(PeerCtor) {
  if (peer) return;
  peerStatus = 'starting';
  updateSyncUI();
  try {
    peer = new PeerCtor(syncMeta.peerId);
  } catch (e) { peerStatus = 'error'; peerStatusDetail = 'Could not start sync'; updateSyncUI(); return; }
  peer.on('open', () => {
    peerStatus = 'ready'; peerStatusDetail = '';
    updateSyncUI();
  });
  peer.on('error', err => {
    if (err.type === 'unavailable-id') {
      syncMeta.peerId = genPeerId(); saveSyncMeta();
      peer = null; ensurePeer();
      return;
    }
    peerStatus = 'error';
    peerStatusDetail = err.type || err.message || 'Sync error';
    updateSyncUI();
  });
  peer.on('connection', c => adoptConnection(c, true));
}

function adoptConnection(c) {
  conn = c;
  let opened = false;
  const timeout = setTimeout(() => {
    if (!opened) { peerStatus = 'error'; peerStatusDetail = 'Connection timed out'; updateSyncUI(); try { c.close(); } catch (_) {} }
  }, 15000);
  c.on('open', () => {
    opened = true;
    clearTimeout(timeout);
    peerStatus = 'connected';
    peerStatusDetail = 'Connected to ' + (c.peer || 'device');
    updateSyncUI();
    toast('Sync connected 🔗');
    try { c.send({ type: 'hello', name: syncMeta.deviceName, pass: syncMeta.passHash, passV: syncMeta.passHashV || 1, salt: syncMeta.passSalt || '', passLegacy: syncMeta.passHashLegacy || '' }); } catch (_) {}
    // Auto-flush any queued offline changes
    if (syncMeta.syncQueue && syncMeta.syncQueue.length) {
      setTimeout(flushSyncQueue, 500);
    } else {
      // No queue — do a normal push so the other device gets current state
      setTimeout(pushState, 500);
    }
  });
  c.on('data', d => handleData(d, c));
  c.on('close', () => {
    if (conn === c) {
      conn = null; peerStatus = 'ready'; peerStatusDetail = '';
      updateSyncUI();
      toast('Sync connection closed');
    }
  });
  c.on('error', () => {});
}

function connectToDevice(id) {
  if (!window.Peer && !_peerLibLoading) ensurePeer();
  if (!peer) { toast('Sync library is loading — try again in a second', 'error'); return; }
  if (peerStatus === 'starting') { toast('Sync is still starting — try again in a second', 'error'); return; }
  if (!peer) return;
  const target = String(id || '').trim().toLowerCase();
  if (!target) { toast('Enter the other device\'s ID', 'error'); return; }
  if (target === syncMeta.peerId) { toast('That\'s this device\'s own ID', 'error'); return; }
  try {
    const c = peer.connect(target, { reliable: true, serialization: 'binary' });
    adoptConnection(c);
    peerStatus = 'connecting';
    peerStatusDetail = 'Connecting to ' + target + '…';
    updateSyncUI();
  } catch (e) { toast('Could not connect: ' + e.message, 'error'); }
}

function handleData(d, c) {
  if (!d || typeof d !== 'object') return;
  if (d.type === 'hello') {
    const localHas = !!syncMeta.passHash;
    const remoteHas = !!d.pass;
    if (localHas && remoteHas) {
      const localV = syncMeta.passHashV || 1;
      const remoteV = d.passV || 1;
      let match = false;
      if (localV === 1 && remoteV === 1) {
        match = d.pass === syncMeta.passHash;
      } else if (localV === 2 && remoteV === 2) {
        // both v2 — require hash equality (salts differ → will mismatch if same passphrase but different salts; user must re-enter on both after upgrade)
        match = d.pass === syncMeta.passHash;
      } else if (localV === 2 && remoteV === 1) {
        // local v2, remote v1 — compare remote legacy to local legacy fallback
        match = d.pass === (syncMeta.passHashLegacy || syncMeta.passHash);
      } else if (localV === 1 && remoteV === 2) {
        // local v1, remote v2 — compare local to remote legacy
        match = syncMeta.passHash === (d.passLegacy || d.pass);
      }
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
  if (d.type === 'sync' && d.data) {    suppressAutoPush = true;
  let changed = false;
  // Detect conflicts before merging
  const conflicts = detectSyncConflicts(state.tasks, d.data?.tasks);
  try {
    changed = applyMerge(d.data, d.rev || 0);
    // Show conflict modal after merge if conflicts were detected
    if (conflicts.length) setTimeout(() => showConflictModal(conflicts), 500);
      toast('Synced with ' + (d.name || 'device') + ' ✓', 'success');
    } catch (e) {
      console.warn('Sync merge failed', e);
      toast('Sync merge failed', 'error');
    }
    suppressAutoPush = false;
    // echo the merged state back so both devices converge — only when the merge changed something, to avoid a ping-pong loop
    if (changed && syncMeta.autoSync && isConnected()) setTimeout(pushState, 300);
    requestMissingAudio();
    return;
  }
  if (d.type === 'audio-request') {
    (d.ids || []).forEach(id => { sendAudio(id); });
    return;
  }
  if (d.type === 'audio') {
    handleAudio(d);
    return;
  }
}

function applyMerge(inc, incomingRev) {
  const rev = incomingRev || 0;
  const changed = window.LumenLib.merge.applyMerge({ state, syncMeta, inc, incomingRev: rev });
  saveSyncMeta();
  if (changed) {
    syncMeta.rev = Math.max(syncMeta.rev || 0, rev) + 1;
    save();
    if (currentView() === 'settings') renderSettings(); else renderView();
  }
  return changed;
}

function pushState() {
  if (!isConnected()) return;
  syncMeta.rev = Math.max(syncMeta.rev + 1, Date.now());
  saveSyncMeta();
  try {
    conn.send({
      type: 'sync',
      rev: syncMeta.rev,
      name: syncMeta.deviceName,
        data: {
        tasks: state.tasks, goals: state.goals, habits: state.habits, notes: state.notes, recordings: state.recordings,
        projects: state.projects, krHistory: state.krHistory, tagColors: state.tagColors, _tagColorMeta: state._tagColorMeta, _incomeTypesMeta: state._incomeTypesMeta, _expenseCategoriesMeta: state._expenseCategoriesMeta,
        achievements: state.achievements, income: state.income, expenses: state.expenses,
        expectedIncome: state.expectedIncome, expectedExpenses: state.expectedExpenses, incomeTypes: state.incomeTypes, expenseCategories: state.expenseCategories,
        students: state.students, attendance: state.attendance, assignments: state.assignments, lessonPlans: state.lessonPlans, kanbanLists: state.kanbanLists,
        vaultItems: state.vaultItems, vaultCollections: state.vaultCollections, _vaultItemsMeta: state._vaultItemsMeta, _vaultCollectionsMeta: state._vaultCollectionsMeta,
        deleted: syncMeta.tombstones
      }
    });
  } catch (e) { /* ignore */ }
}

function maybeAutoSync() {
  if (suppressAutoPush || !syncMeta.autoSync) return;
  if (isConnected()) {
    clearTimeout(autoPushTimer);
    autoPushTimer = setTimeout(pushState, 1500);
  } else {
    // Queue the current state snapshot for later replay
    clearTimeout(autoPushTimer);
    autoPushTimer = setTimeout(() => {
      enqueueSyncSnapshot();
    }, 1500);
  }
}

const SYNC_QUEUE_MAX = 50; // cap to prevent unbounded localStorage growth

function enqueueSyncSnapshot() {
  if (!syncMeta.syncQueue) syncMeta.syncQueue = [];
  // Store a full state snapshot — on flush, the latest snapshot supersedes all earlier ones
  const snapshot = {
    ts: Date.now(),
    data: {
      tasks: state.tasks, goals: state.goals, habits: state.habits,
      notes: state.notes, recordings: state.recordings,
      achievements: state.achievements, income: state.income, expenses: state.expenses,
      expectedIncome: state.expectedIncome, expectedExpenses: state.expectedExpenses, incomeTypes: state.incomeTypes, expenseCategories: state.expenseCategories,
      _tagColorMeta: state._tagColorMeta, _incomeTypesMeta: state._incomeTypesMeta, _expenseCategoriesMeta: state._expenseCategoriesMeta,
      students: state.students, kanbanLists: state.kanbanLists,
      vaultItems: state.vaultItems, vaultCollections: state.vaultCollections, _vaultItemsMeta: state._vaultItemsMeta, _vaultCollectionsMeta: state._vaultCollectionsMeta,
      deleted: syncMeta.tombstones
    }
  };
  syncMeta.syncQueue.push(snapshot);
  // Cap queue: keep only the latest N snapshots
  if (syncMeta.syncQueue.length > SYNC_QUEUE_MAX) {
    syncMeta.syncQueue = syncMeta.syncQueue.slice(-SYNC_QUEUE_MAX);
  }
  saveSyncMeta();
  updateSyncUI();
}

function flushSyncQueue() {
  if (!syncMeta.syncQueue || !syncMeta.syncQueue.length || !isConnected()) return;
  // Optimization: only send the latest snapshot — it contains the full state
  const latest = syncMeta.syncQueue[syncMeta.syncQueue.length - 1];
  syncMeta.rev = Math.max(syncMeta.rev + 1, Date.now());
  saveSyncMeta();
  try {
    conn.send({
      type: 'sync',
      rev: syncMeta.rev,
      name: syncMeta.deviceName,
      data: latest.data
    });
    const count = syncMeta.syncQueue.length;
    syncMeta.syncQueue = [];
    saveSyncMeta();
    toast(`📤 Flushed ${count} queued change${count !== 1 ? 's' : ''}`, 'success');
    updateSyncUI();
  } catch (e) { /* will retry on next reconnect */ }
}

function tombstone(col, id) {
  if (col === 'vaultCollections') {
    if (!syncMeta.tombstones[col] || Array.isArray(syncMeta.tombstones[col])) syncMeta.tombstones[col] = {};
    syncMeta.tombstones[col][id] = Date.now();
  } else {
    if (!syncMeta.tombstones[col]) syncMeta.tombstones[col] = [];
    if (Array.isArray(syncMeta.tombstones[col])) {
      if (!syncMeta.tombstones[col].includes(id)) syncMeta.tombstones[col].push(id);
    } else {
      syncMeta.tombstones[col][id]=Date.now();
    }
  }
  saveSyncMeta();
}

/* Audio blob transfer over the peer connection */
const AUDIO_CHUNK = 16 * 1024; // 16 KB per message — safely under WebRTC SCTP limits
let localAudioIds = new Set();
const audioPending = {}; // id -> { chunks, total, name, mime }

async function loadLocalAudioIds() {
  try {
    const db = await idb();
    const tx = db.transaction('blobs', 'readonly');
    const rq = tx.objectStore('blobs').getAllKeys();
    rq.onsuccess = () => { localAudioIds = new Set(rq.result); };
  } catch (e) { /* ignore */ }
}

function requestMissingAudio() {
  if (!isConnected()) return;
  const missing = state.recordings.filter(r => r.id && !localAudioIds.has(r.id)).map(r => r.id);
  if (missing.length) {
    try { conn.send({ type: 'audio-request', ids: missing }); } catch (_) {}
  }
}

async function sendAudio(id) {
  if (!isConnected()) return;
  const rec = state.recordings.find(r => r.id === id);
  if (!rec) return;
  const blob = await blobGet(id);
  if (!blob) return;
  const buf = await blob.arrayBuffer();
  const total = Math.max(1, Math.ceil(buf.byteLength / AUDIO_CHUNK));
  for (let i = 0; i < total; i++) {
    conn.send({
      type: 'audio', id, name: rec.name, mime: blob.type,
      total, index: i, data: buf.slice(i * AUDIO_CHUNK, (i + 1) * AUDIO_CHUNK)
    });
  }
}

function handleAudio(msg) {
  const p = audioPending[msg.id] || (audioPending[msg.id] = { chunks: [], total: msg.total, name: msg.name, mime: msg.mime });
  p.chunks[msg.index] = msg.data;
  const got = p.chunks.filter(c => c !== undefined).length;
  if (got === p.total) {
    const blob = new Blob(p.chunks, { type: p.mime || 'audio/webm' });
    delete audioPending[msg.id];
    blobPut(msg.id, blob).then(() => {
      localAudioIds.add(msg.id);
      if (!state.recordings.find(r => r.id === msg.id)) {
        state.recordings.unshift({ id: msg.id, name: msg.name, date: Date.now(), duration: 0, type: p.mime || 'audio/webm', transcript: '', updatedAt: Date.now() });
        save();
      }
      toast('Received audio: ' + (msg.name || 'recording') + ' 🎙️', 'success');
      if (currentView() === 'voice') renderVoice();
    });
  }
}

function syncStatusText() {
  if (!window.Peer && !_peerLibLoading && peerStatus === 'offline') return '⚪ Not connected';
  const q = (syncMeta.syncQueue || []).length;
  const qBadge = q ? ` <span class="sync-q-badge">${q} queued</span>` : '';
  if (peerStatus === 'connected') return '🟢 ' + (peerStatusDetail || 'Connected') + qBadge;
  if (peerStatus === 'connecting') return '🟡 ' + peerStatusDetail + qBadge;
  if (peerStatus === 'starting') return '🟡 Starting…' + qBadge;
  if (peerStatus === 'error') return '🔴 ' + peerStatusDetail + qBadge;
  return '⚪ Not connected' + qBadge;
}
function updateSyncUI() {
  const el = $('#sync-status');
  if (el) el.innerHTML = syncStatusText();
  const btn = $('#sync-now');
  if (btn) btn.disabled = !isConnected();
}
function syncCardHTML() {
  if (!window.Peer && !_peerLibLoading && peerStatus === 'error') {
    return `<div class="card"><h2 class="card-title">🔄 Cross-device sync</h2><p class="muted" style="font-size:13px;line-height:1.5">The sync library (PeerJS) couldn't load — check your internet connection and reload the page. Everything else works fully offline.</p></div>`;
  }
  if (!state.settings.syncEnabled) {
    return `<div class="card">
      <h2 class="card-title">🔄 Cross-device sync</h2>
      <div class="empty-state" style="padding:16px 0;border:none">
        <p class="muted" style="font-size:13px;line-height:1.5;text-align:left;margin-bottom:12px"><b>Privacy Notice:</b> Peer sync is the one opt-in network path. It uses PeerJS's bundled defaults, which means three third parties are contacted when you turn it on: PeerJS's public broker (0.peerjs.com) to introduce the devices, a Google STUN server to discover your address, and PeerJS's TURN servers as a fallback relay. Data over WebRTC is DTLS-encrypted end to end. The broker and STUN see peer IDs, IP addresses and connection metadata.</p>
        <button class="btn btn-accent" id="sync-enable-btn">Agree & Enable Sync</button>
      </div>
    </div>`;
  }
  return `<div class="card">
    <h2 class="card-title">🔄 Cross-device sync</h2>
    <div class="set-row"><span class="stat-inline">Status</span><span class="stat-inline" id="sync-status">${syncStatusText()}</span></div>
    <div class="set-row"><span class="stat-inline">Your device ID</span>
      <div style="display:flex;gap:8px;align-items:center">
        <code id="sync-id" style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;color:var(--accent)">${syncMeta.peerId}</code>
        <button class="btn btn-sm btn-ghost" id="sync-copy" title="Copy device ID">Copy</button>
        <button class="btn btn-icon" id="sync-new-id" title="Generate a new ID">${ic('x', 13)}</button>
      </div>
    </div>
    <div class="set-row"><span class="stat-inline">Connect to device</span>
      <div style="display:flex;gap:6px">
        <input id="sync-connect-id" type="text" placeholder="Paste the other device's ID" style="width:230px">
        <button class="btn btn-sm" id="sync-connect">Connect</button>
      </div>
    </div>
    <div class="set-row"><span class="stat-inline">Device name</span>
      <input id="sync-name" type="text" placeholder="e.g. Laptop" value="${esc(syncMeta.deviceName)}" style="width:180px">
    </div>
    <div class="set-row"><span class="stat-inline">Sync passphrase <span class="muted" style="font-size:11px;font-weight:400">(optional, same on both)</span></span>
      <input id="sync-pass" type="password" placeholder="Lock connections" style="width:170px">
    </div>
    <div class="set-row"><span class="stat-inline">Auto-sync on change</span>
      <input type="checkbox" id="sync-auto" ${syncMeta.autoSync ? 'checked' : ''}>
    </div>
    <div class="set-row"><span class="stat-inline">Manual sync</span>
      <button class="btn btn-sm" id="sync-now">Sync now</button>
    </div>
    ${(syncMeta.syncQueue || []).length ? `<div class="set-row"><span class="stat-inline">📤 Queued changes</span>
      <span class="sync-q-badge">${(syncMeta.syncQueue || []).length} pending</span>
      <button class="btn btn-sm btn-accent" id="sync-flush" ${isConnected() ? '' : 'disabled title="Connect a device first"'}>Flush now</button>
      <button class="btn btn-sm btn-ghost" id="sync-discard-queue" title="Discard all queued changes">Discard</button>
    </div>` : ''}
    <p class="muted" style="font-size:12px;margin-top:10px;line-height:1.5">Peer-to-peer over WebRTC (PeerJS free signaling). Both devices need internet and must be online at the same time. Edits to the same item are merged newest-first. Voice recordings transfer over the same connection — long memos take a moment to arrive. Changes made while offline are queued and sent automatically when you reconnect.</p>
  </div>`;
}
if (typeof window !== 'undefined') { window.addEventListener('beforeunload', () => { try { peer && peer.destroy(); } catch (_) {} }); }

/* ============ ICS Calendar Export ============ */
function exportICS() {
  const tasks = state.tasks.filter(t => t.due && t.status !== 'done');
  if (!tasks.length) { toast('No tasks with due dates to export', 'error'); return; }
  const pad = n => String(n).padStart(2, '0');
  const fmtDT = dateStr => {
    const d = new Date(dateStr + 'T00:00:00');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T000000`;
  };
  const fmtDTEnd = dateStr => {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T000000`;
  };
  const escICS = s => s.replace(/\\n/g, ' ').replace(/\\r/g, '').replace(/[,;]/g, '\\$&');
  let ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Lumen//Task Export//EN\r\nCALSCALE:GREGORIAN\r\n';
  tasks.forEach(t => {
    const cat = CATEGORIES.find(c => c.id === t.category);
    ics += 'BEGIN:VEVENT\r\n';
    ics += `UID:${t.id}@lumen\r\n`;
    ics += `DTSTART:${fmtDT(t.due)}\r\n`;
    ics += `DTEND:${fmtDTEnd(t.due)}\r\n`;
    ics += `SUMMARY:${escICS(t.title)}\r\n`;
    if (t.desc) ics += `DESCRIPTION:${escICS(t.desc)}\r\n`;
    if (cat) ics += `CATEGORIES:${escICS(cat.label)}\r\n`;
    if (t.priority === 'high') ics += 'PRIORITY:1\r\n';
    else if (t.priority === 'med') ics += 'PRIORITY:5\r\n';
    else ics += 'PRIORITY:9\r\n';
    ics += 'BEGIN:VALARM\r\nTRIGGER:-P1D\r\nACTION:DISPLAY\r\nDESCRIPTION:Reminder\r\nEND:VALARM\r\n';
    ics += 'END:VEVENT\r\n';
  });
  ics += 'END:VCALENDAR\r\n';
  const blob = new Blob([ics], { type: 'text/calendar' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `lumen-tasks-${todayISO()}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast(`Exported ${tasks.length} task${tasks.length === 1 ? '' : 's'} to .ics 📅`);
}

/* ============ Sync Conflict Resolution ============ */
let pendingConflicts = [];
function detectSyncConflicts(local, incoming) {
  const conflicts = [];
  const inMap = new Map((incoming || []).map(t => [t.id, t]));
  (local || []).forEach(loc => {
    const inc = inMap.get(loc.id);
    if (inc && loc.updatedAt && inc.updatedAt && Math.abs(loc.updatedAt - inc.updatedAt) < 60000) {
      // Both edited within 60s — potential conflict
      const diffs = [];
      if (loc.title !== inc.title) diffs.push({ field: 'Title', local: loc.title, remote: inc.title });
      if (loc.priority !== inc.priority) diffs.push({ field: 'Priority', local: loc.priority, remote: inc.priority });
      if (loc.due !== inc.due) diffs.push({ field: 'Due', local: loc.due || '—', remote: inc.due || '—' });
      if (loc.status !== inc.status) diffs.push({ field: 'Status', local: loc.status, remote: inc.status });
      if (loc.category !== inc.category) diffs.push({ field: 'Category', local: loc.category || '—', remote: inc.category || '—' });
      if (diffs.length) conflicts.push({ id: loc.id, title: loc.title, local: loc, remote: inc, diffs });
    }
  });
  return conflicts;
}
function showConflictModal(conflicts) {
  if (!conflicts.length) return;
  pendingConflicts = conflicts;
  const rows = conflicts.map((c, i) => {
    const diffRows = c.diffs.map(d => `
      <tr class="conflict-diff">
        <td class="conflict-field">${d.field}</td>
        <td class="conflict-local">${esc(String(d.local))}</td>
        <td class="conflict-remote">${esc(String(d.remote))}</td>
      </tr>`).join('');
    return `<div class="conflict-card" data-conflict-idx="${i}">
      <div class="conflict-head">📝 ${esc(c.title)}</div>
      <table class="conflict-table">
        <thead><tr><th scope="col">Field</th><th scope="col">📱 This device</th><th scope="col">💻 Other device</th></tr></thead>
        <tbody>${diffRows}</tbody>
      </table>
      <div class="conflict-actions">
        <button class="btn btn-sm" data-resolve="local" data-conflict="${i}">Keep this device</button>
        <button class="btn btn-sm" data-resolve="remote" data-conflict="${i}">Keep other device</button>
        <button class="btn btn-sm" data-resolve="skip" data-conflict="${i}">Skip</button>
      </div>
    </div>`;
  }).join('');
  openModal(`
    <div class="modal">
      <div class="modal-head"><h3>🔗 Sync conflicts</h3><button class="btn-icon" data-close-modal>${ic('x', 16)}</button></div>
      <div class="modal-body">
        <p class="muted" style="margin-bottom:14px">${conflicts.length} task${conflicts.length === 1 ? '' : 's'} edited on both devices. Pick which version to keep.</p>
        ${rows}
      </div>
      <div class="modal-foot">
        <div style="flex:1"></div>
        <button class="btn btn-ghost" id="conflict-skip-all">Skip all</button>
        <button class="btn btn-accent" id="conflict-done">Done</button>
      </div>
    </div>`);
  $$('[data-resolve]').forEach(b => b.addEventListener('click', () => {
    const idx = parseInt(b.dataset.conflict, 10);
    const choice = b.dataset.resolve;
    const c = pendingConflicts[idx];
    if (!c) return;
    if (choice === 'local') { Object.assign(c.remote, c.local); c.remote.updatedAt = Date.now(); }
    else if (choice === 'remote') { Object.assign(c.local, c.remote); }
    const card = b.closest('.conflict-card');
    if (card) card.style.opacity = '0.4';
    toast('Conflict resolved');
  }));
  $('#conflict-skip-all')?.addEventListener('click', closeModal);
  $('#conflict-done')?.addEventListener('click', () => {
    save(); closeModal(); renderView(); toast('Conflicts resolved ✅');
  });
}

/* ============ Habit Analytics ============ */
function renderAnalytics() {
  const root = viewRoot();
  const today = todayISO();
  const tasks = state.tasks || [];
  const habits = state.habits || [];
  const goals = state.goals || [];
  const pomoHist = state.pomoHistory || [];
  const activity = state.activityLog || [];

  // ===== Summary stats =====
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const completionRate = totalTasks ? Math.round(doneTasks / totalTasks * 100) : 0;
  const totalFocusSec = pomoHist.reduce((s, h) => s + (h.duration || 0), 0);
  const totalTrackedSec = tasks.reduce((s, t) => s + (t.totalProgressTime || 0), 0);
  const activeHabits = habits.length;
  const bestStreak = habits.length ? Math.max(...habits.map(h => habitBest(h))) : 0;
  const goalsActive = goals.length;
  const avgGoalProgress = goals.length ? Math.round(goals.reduce((s, g) => s + goalProgress(g), 0) / goals.length) : 0;

  // ===== 14-day task completion trend (SVG line chart) =====
  const trendData = [];
  for (let i = 13; i >= 0; i--) {
    const day = isoDate(shiftDays(-i));
    const completed = tasks.filter(t => t.completedAt === day).length;
    const created = tasks.filter(t => isoDate(new Date(t.createdAt || 0)) === day).length;
    trendData.push({ day, completed, created });
  }
  const maxTrend = Math.max(...trendData.map(d => Math.max(d.completed, d.created)), 1);
  const tw = 600, th = 180, pw = 20, ph = 30;
  const cw = tw - pw * 2, ch = th - ph * 2;
  const xStep = cw / (trendData.length - 1);
  const yScale = v => ch - (v / maxTrend) * ch;
  const completedPath = trendData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${pw + i * xStep} ${ph + yScale(d.completed)}`).join(' ');
  const createdPath = trendData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${pw + i * xStep} ${ph + yScale(d.created)}`).join(' ');
  const completedArea = completedPath + ` L ${pw + (trendData.length - 1) * xStep} ${ph + ch} L ${pw} ${ph + ch} Z`;
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(p => `<line x1="${pw}" y1="${ph + p * ch}" x2="${pw + cw}" y2="${ph + p * ch}" stroke="var(--border)" stroke-width="1" stroke-dasharray="2 4"/>`).join('');
  const xLabels = trendData.filter((_, i) => i % 2 === 0).map((d, i) => `<text x="${pw + (i * 2) * xStep}" y="${th - 8}" text-anchor="middle" fill="var(--muted)" font-size="10">${d.day.slice(5)}</text>`).join('');

  // ===== Category distribution (donut chart) =====
  const catCounts = {};
  tasks.forEach(t => { const c = t.category || 'none'; catCounts[c] = (catCounts[c] || 0) + 1; });
  const catEntries = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);
  const catTotal = catEntries.reduce((s, [, n]) => s + n, 0) || 1;
  const donutR = 60, donutCx = 80, donutCy = 80, donutStroke = 24;
  let donutOffset = 0;
  const donutCircumference = 2 * Math.PI * donutR;
  const donutSegs = catEntries.map(([catId, count]) => {
    const cat = CATEGORIES.find(c => c.id === catId);
    const color = cat ? cat.color : '#8b93a7';
    const label = cat ? cat.label.split(' ')[0] : 'None';
    const pct = count / catTotal;
    const dashLen = pct * donutCircumference;
    const seg = `<circle cx="${donutCx}" cy="${donutCy}" r="${donutR}" fill="none" stroke="${color}" stroke-width="${donutStroke}" stroke-dasharray="${dashLen} ${donutCircumference - dashLen}" stroke-dashoffset="${-donutOffset}" transform="rotate(-90 ${donutCx} ${donutCy})"/>`;
    donutOffset += dashLen;
    return { seg, color, label, count, pct: Math.round(pct * 100) };
  });
  const donutHTML = donutSegs.map(s => s.seg).join('');
  const donutLegend = donutSegs.map(s => `<div class="vd-legend-item"><span class="vd-legend-dot" style="background:${s.color}"></span>${s.label} <b>${s.count}</b> <span class="muted">(${s.pct}%)</span></div>`).join('');

  // ===== 7-day time tracking bars (per day) =====
  const timeData = [];
  for (let i = 6; i >= 0; i--) {
    const day = isoDate(shiftDays(-i));
    const dayPomo = pomoHist.filter(s => {
      const ts = s.startedAt || s.endedAt || 0;
      return isoDate(new Date(ts)) === day;
    });
    const sec = dayPomo.reduce((sum, s) => sum + (s.duration || 0), 0);
    timeData.push({ day, sec, sessions: dayPomo.length });
  }
  const maxSec = Math.max(...timeData.map(d => d.sec), 1);
  const timeBars = timeData.map(d => {
    const h = d.sec > 0 ? (d.sec / maxSec * 100) : 0;
    const dayLabel = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][(new Date(d.day + 'T00:00:00').getDay() + 6) % 7];
    return `<div class="vd-time-col">
      <div class="vd-time-bar-wrap"><div class="vd-time-bar" style="height:${h}%;background:linear-gradient(180deg,#7c6cf6,#4f8cff)"></div></div>
      <div class="vd-time-label">${dayLabel}</div>
      <div class="vd-time-val">${d.sec > 0 ? fmtDur(d.sec) : '—'}</div>
    </div>`;
  }).join('');

  // ===== Goal progress bars =====
  const goalBars = goals.length ? goals.map(g => {
    const pct = goalProgress(g);
    const krDone = (g.keyResults || []).filter(k => k.current >= k.target).length;
    const krTotal = (g.keyResults || []).length;
    return `<div class="vd-goal-row">
      <div class="vd-goal-head"><span style="color:${g.color || '#7c6cf6'}">●</span> ${esc(g.title)} <span class="muted" style="font-size:11px">${krDone}/${krTotal} KRs</span></div>
      <div class="vd-goal-bar"><div class="vd-goal-fill" style="width:${pct}%;background:${g.color || '#7c6cf6'}"></div></div>
      <span class="vd-goal-pct">${pct}%</span>
    </div>`;
  }).join('') : '<div class="muted" style="padding:12px 0;font-size:13px">No goals yet — create goals to track progress.</div>';

  // ===== Habit heatmap (cross-habit, last 14 days) =====
  let heatmapHTML = '';
  if (habits.length) {
    const heatDays = [];
    for (let i = 13; i >= 0; i--) heatDays.push(isoDate(shiftDays(-i)));
    const heatRows = habits.map(h => {
      const dates = h.dates || {};
      const cells = heatDays.map(d => {
        const on = !!dates[d];
        const isToday = d === today;
        return `<span class="vd-heat-cell ${on ? 'on' : ''} ${isToday ? 'today' : ''}" title="${d}: ${on ? '✓' : '—'}"></span>`;
      }).join('');
      return `<div class="vd-heat-row"><span class="vd-heat-label">${h.emoji} ${esc(h.name)}</span><div class="vd-heat-cells">${cells}</div></div>`;
    }).join('');
    const heatHeaders = heatDays.map(d => `<span class="vd-heat-hdr">${d.slice(5)}</span>`).join('');
    heatmapHTML = `<div class="vd-heat-grid"><div class="vd-heat-row"><span class="vd-heat-label"></span><div class="vd-heat-cells">${heatHeaders}</div></div>${heatRows}</div>`;
  }

  // ===== Day-of-week habit consistency =====
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayCounts = [0, 0, 0, 0, 0, 0, 0];
  const dayPossible = [0, 0, 0, 0, 0, 0, 0];
  habits.forEach(h => {
    const dates = h.dates || {};
    Object.keys(dates).forEach(d => {
      const dt = new Date(d + 'T00:00:00');
      const dow = (dt.getDay() + 6) % 7;
      if (dates[d]) dayCounts[dow]++;
    });
    const created = h.createdAt ? new Date(h.createdAt) : new Date(Date.now() - 30 * 86400000);
    const now = new Date();
    for (let d = new Date(created); d <= now; d.setDate(d.getDate() + 1)) {
      const dow = (d.getDay() + 6) % 7;
      dayPossible[dow]++;
    }
  });
  const dayRates = dayCounts.map((c, i) => dayPossible[i] ? Math.round(c / dayPossible[i] * 100) : 0);
  const maxRate = Math.max(...dayRates, 1);
  const dayBars = dayNames.map((d, i) => `<div class="analytics-bar-col">
    <div class="analytics-bar-wrap"><div class="analytics-bar" style="height:${dayRates[i] / maxRate * 100}%;background:${dayRates[i] >= 70 ? '#34d399' : dayRates[i] >= 40 ? '#ffb020' : '#ff5d6c'}"></div></div>
    <div class="analytics-bar-label">${d}</div>
    <div class="analytics-bar-pct">${dayRates[i]}%</div>
  </div>`).join('');

  // ===== Per-habit table =====
  const habitStats = habits.map(h => {
    const dates = h.dates || {};
    const total = Object.values(dates).filter(Boolean).length;
    const streak = habitStreak(h);
    const best = habitBest(h);
    let done30 = 0, possible30 = 0;
    for (let i = 0; i < 30; i++) { const key = isoDate(shiftDays(-i)); if (key <= today) { possible30++; if (dates[key]) done30++; } }
    const rate30 = possible30 ? Math.round(done30 / possible30 * 100) : 0;
    return { h, total, streak, best, rate30 };
  }).sort((a, b) => b.rate30 - a.rate30);
  const habitRows = habitStats.map(s => `<tr class="analytics-row">
    <td><span class="hc-emoji">${s.h.emoji}</span> ${esc(s.h.name)}</td>
    <td>${s.streak} days</td>
    <td>${s.best} days</td>
    <td>${s.total}</td>
    <td><div class="analytics-rate-bar"><div class="analytics-rate-fill" style="width:${s.rate30}%;background:${s.rate30 >= 70 ? '#34d399' : s.rate30 >= 40 ? '#ffb020' : '#ff5d6c'}"></div><span>${s.rate30}%</span></div></td>
  </tr>`).join('') || '<tr><td colspan="5" class="muted" style="padding:12px">No habits yet.</td></tr>';
  // Decay warning: habits with 2 misses in last 7 days
  const decayHabits = habits.filter(h => {
    let misses = 0;
    for (let i = 0; i < 7; i++) {
      const d = isoDate(shiftDays(-i));
      if (d > today) continue;
      if (!h.dates[d] && !(h.freezes && h.freezes[d])) misses++;
    }
    return misses >= 2;
  });
  const decayBanner = decayHabits.length ? `<div class="card" style="border:1px solid #ffb020;background:rgba(255,176,32,.08)"><h2 class="card-title" style="color:#ffb020">⚠️ Decay warning — ${decayHabits.length} habit${decayHabits.length === 1 ? '' : 's'} slipping</h2><div style="display:flex;gap:6px;flex-wrap:wrap">${decayHabits.map(h => `<span class="badge" style="background:#ffb02022;color:#ffb020;border:1px solid #ffb02044">${h.emoji} ${esc(h.name)} — 2+ misses in 7d</span>`).join('')}</div><div class="muted" style="font-size:12px;margin-top:8px">Focus sessions protect streaks — try a 25m focus to freeze one.</div></div>` : '';

  // ===== Activity feed summary =====
  const todayActivity = activity.filter(e => e.at >= Date.now() - 86400000).length;
  const weekActivity = activity.filter(e => e.at >= Date.now() - 7 * 86400000).length;
  const activityCats = {};
  activity.filter(e => e.at >= Date.now() - 7 * 86400000).forEach(e => {
    const cat = (e.type || '').split('.')[0];
    activityCats[cat] = (activityCats[cat] || 0) + 1;
  });
  const activityBars = Object.entries(activityCats).sort((a, b) => b[1] - a[1]).map(([cat, count]) => {
    const maxAct = Math.max(...Object.values(activityCats), 1);
    const catIcons = { task: '📋', project: '🚀', goal: '🎯', habit: '🔥', note: '📝', pomo: '🍅', settings: '⚙️', data: '📦' };
    return `<div class="vd-act-row"><span class="vd-act-label">${catIcons[cat] || '•'} ${cat}</span><div class="vd-act-bar"><div class="vd-act-fill" style="width:${count / maxAct * 100}%"></div></div><span class="vd-act-count">${count}</span></div>`;
  }).join('') || '<div class="muted" style="font-size:12px">No activity this week.</div>';

  // ===== Priority distribution (horizontal bars) =====
  const prioCounts = { high: 0, med: 0, low: 0 };
  tasks.forEach(t => { if (prioCounts[t.priority] !== undefined) prioCounts[t.priority]++; });
  const prioTotal = tasks.length || 1;
  const prioColors = { high: '#ff5d6c', med: '#ffb020', low: '#34d399' };
  const prioBars = Object.entries(prioCounts).map(([p, c]) => {
    const pct = Math.round(c / prioTotal * 100);
    return `<div class="vd-prio-row"><span class="vd-prio-label">${p === 'high' ? '🔴 High' : p === 'med' ? '🟡 Medium' : '🟢 Low'}</span><div class="vd-prio-bar"><div class="vd-prio-fill" style="width:${pct}%;background:${prioColors[p]}"></div></div><span class="vd-prio-count">${c} (${pct}%)</span></div>`;
  }).join('');

  // ===== Project status overview =====
  const projects = state.projects || [];
  const projBuilt = projects.filter(p => p.status === 'built').length;
  const projBuilding = projects.filter(p => p.status === 'building').length;
  const projPlanned = projects.filter(p => p.status === 'planned').length;
  const projBars = projects.length ? `<div class="vd-proj-status">
    <div class="vd-proj-stat"><div class="vd-proj-stat-val" style="color:#34d399">${projBuilt}</div><div class="vd-proj-stat-lbl">Built</div></div>
    <div class="vd-proj-stat"><div class="vd-proj-stat-val" style="color:#ffb020">${projBuilding}</div><div class="vd-proj-stat-lbl">Building</div></div>
    <div class="vd-proj-stat"><div class="vd-proj-stat-val" style="color:#8b93a7">${projPlanned}</div><div class="vd-proj-stat-lbl">Planned</div></div>
  </div>` + projects.slice(0, 5).map(p => {
    const statusColor = p.status === 'built' ? '#34d399' : p.status === 'building' ? '#ffb020' : '#8b93a7';
    return `<div class="vd-proj-row"><span class="vd-proj-dot" style="background:${statusColor}"></span><span class="vd-proj-name">${esc(p.name)}</span><span class="vd-proj-status-tag" style="color:${statusColor}">${p.status}</span></div>`;
  }).join('') : '<div class="muted" style="font-size:12px;padding:8px 0">No projects yet.</div>';

  // ===== Tag usage (top tags) =====
  const tagCounts = {};
  tasks.forEach(t => (t.tags || []).forEach(tag => { tagCounts[tag] = (tagCounts[tag] || 0) + 1; }));
  const tagEntries = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxTag = tagEntries.length ? tagEntries[0][1] : 1;
  const tagBars = tagEntries.length ? tagEntries.map(([tag, count]) => {
    const color = getTagColor(tag) || '#7c6cf6';
    return `<div class="vd-tag-row"><span class="vd-tag-label" style="color:${color}">#${esc(tag)}</span><div class="vd-tag-bar"><div class="vd-tag-fill" style="width:${count / maxTag * 100}%;background:${color}"></div></div><span class="vd-tag-count">${count}</span></div>`;
  }).join('') : '<div class="muted" style="font-size:12px;padding:8px 0">No tags used yet.</div>';

  // ===== Subtask completion rate =====
  const tasksWithSubs = tasks.filter(t => t.subtasks && t.subtasks.length);
  const totalSubs = tasksWithSubs.reduce((s, t) => s + t.subtasks.length, 0);
  const doneSubs = tasksWithSubs.reduce((s, t) => s + t.subtasks.filter(st => st.done).length, 0);
  const subRate = totalSubs ? Math.round(doneSubs / totalSubs * 100) : 0;
  const subBar = `<div class="vd-sub-wrap"><div class="vd-sub-bar"><div class="vd-sub-fill" style="width:${subRate}%;background:${subRate >= 70 ? '#34d399' : subRate >= 40 ? '#ffb020' : '#ff5d6c'}"></div></div><span class="vd-sub-pct">${doneSubs}/${totalSubs} (${subRate}%)</span></div>`;

  // ===== Schedule utilization =====
  const schedTasks = tasks.filter(t => t.scheduleDay && t.schedulePeriod);
  const totalSlots = DAYS.length * getPeriods().length;
  const filledSlots = new Set(schedTasks.map(t => t.scheduleDay + '|' + t.schedulePeriod)).size;
  const utilPct = totalSlots ? Math.round(filledSlots / totalSlots * 100) : 0;

  // ===== Render =====
  const hasData = totalTasks > 0 || habits.length > 0 || goals.length > 0 || pomoHist.length > 0;
  if (!hasData) {
    root.innerHTML = '<div class="empty-state"><div class="es-icon">📊</div>No data yet — create tasks, habits, and goals to see visual analytics.</div>';
    return;
  }

  root.innerHTML = `
    <!-- Summary stat cards -->
    <div class="vd-summary">
      <div class="vd-stat-card"><div class="vd-stat-icon" style="background:rgba(52,211,153,.14)">✅</div><div><div class="vd-stat-val">${doneTasks}/${totalTasks}</div><div class="vd-stat-lbl">Tasks completed (${completionRate}%)</div></div></div>
      <div class="vd-stat-card"><div class="vd-stat-icon" style="background:rgba(124,108,246,.14)">🍅</div><div><div class="vd-stat-val">${fmtDur(totalFocusSec)}</div><div class="vd-stat-lbl">Pomodoro focus time</div></div></div>
      <div class="vd-stat-card"><div class="vd-stat-icon" style="background:rgba(255,176,32,.14)">⏱</div><div><div class="vd-stat-val">${fmtDur(totalTrackedSec)}</div><div class="vd-stat-lbl">Tracked in-progress time</div></div></div>
      <div class="vd-stat-card"><div class="vd-stat-icon" style="background:rgba(255,93,108,.14)">🔥</div><div><div class="vd-stat-val">${bestStreak}</div><div class="vd-stat-lbl">Best habit streak (days)</div></div></div>
      <div class="vd-stat-card"><div class="vd-stat-icon" style="background:rgba(79,140,255,.14)">🎯</div><div><div class="vd-stat-val">${avgGoalProgress}%</div><div class="vd-stat-lbl">Avg goal progress</div></div></div>
    </div>

    <div class="vd-grid">
      <!-- Task completion trend -->
      <div class="card vd-card-wide">
        <h2 class="card-title">📈 14-day task trend</h2>
        <div class="vd-chart-legend"><span class="vd-legend-dot" style="background:#34d399"></span>Completed <span class="vd-legend-dot" style="background:#4f8cff"></span>Created</div>
        <svg viewBox="0 0 ${tw} ${th}" class="vd-svg-chart" preserveAspectRatio="xMidYMid meet">
          ${gridLines}
          <path d="${completedArea}" fill="rgba(52,211,153,.08)"/>
          <path d="${completedPath}" fill="none" stroke="#34d399" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
          <path d="${createdPath}" fill="none" stroke="#4f8cff" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" stroke-dasharray="4 3"/>
          ${xLabels}
          ${trendData.map((d, i) => `<circle cx="${pw + i * xStep}" cy="${ph + yScale(d.completed)}" r="2.5" fill="#34d399"/>`).join('')}
        </svg>
      </div>

      <!-- Category donut -->
      <div class="card">
        <h2 class="card-title">🍩 Category distribution</h2>
        <div class="vd-donut-wrap">
          <svg viewBox="0 0 160 160" class="vd-donut">${donutHTML}<text x="${donutCx}" y="${donutCy}" text-anchor="middle" dy=".35em" fill="var(--text)" font-size="20" font-weight="800">${totalTasks}</text><text x="${donutCx}" y="${donutCy + 16}" text-anchor="middle" fill="var(--muted)" font-size="9">tasks</text></svg>
          <div class="vd-donut-legend">${donutLegend}</div>
        </div>
      </div>

      <!-- 7-day focus time -->
      <div class="card">
        <h2 class="card-title">🍅 7-day focus time</h2>
        <div class="vd-time-bars">${timeBars}</div>
      </div>

      <!-- Goal progress -->
      <div class="card">
        <h2 class="card-title">🎯 Goal progress</h2>
        <div class="vd-goal-list">${goalBars}</div>
      </div>

      <!-- Habit heatmap -->
      ${habits.length ? `<div class="card vd-card-wide">
        <h2 class="card-title">🔥 Habit heatmap (14 days)</h2>
        ${heatmapHTML}
      </div>` : ''}

      <!-- Day-of-week consistency -->
      ${habits.length ? `<div class="card">
        <h2 class="card-title">📅 Day-of-week consistency</h2>
        <div class="analytics-bars">${dayBars}</div>
      </div>` : ''}

      <!-- Activity breakdown -->
      <div class="card">
        <h2 class="card-title">📈 Activity (7 days)</h2>
        <div class="vd-act-summary"><span class="muted" style="font-size:12px">${todayActivity} today · ${weekActivity} this week</span></div>
        <div class="vd-act-list">${activityBars}</div>
      </div>

      <!-- Priority distribution -->
      <div class="card">
        <h2 class="card-title">🔴 Priority distribution</h2>
        <div class="vd-prio-list">${prioBars}</div>
      </div>

      <!-- Project status -->
      <div class="card">
        <h2 class="card-title">🚀 Project status</h2>
        ${projBars}
      </div>

      <!-- Tag usage -->
      <div class="card">
        <h2 class="card-title">🏷️ Top tags</h2>
        <div class="vd-tag-list">${tagBars}</div>
      </div>

      <!-- Subtask completion + Schedule utilization -->
      <div class="card">
        <h2 class="card-title">✅ Subtask completion</h2>
        ${subBar}
        <h2 class="card-title" style="margin-top:16px">📅 Schedule utilization</h2>
        <div class="vd-sub-wrap"><div class="vd-sub-bar"><div class="vd-sub-fill" style="width:${utilPct}%;background:linear-gradient(90deg,#7c6cf6,#4f8cff)"></div></div><span class="vd-sub-pct">${filledSlots}/${totalSlots} slots (${utilPct}%)</span></div>
      </div>

      ${decayBanner}
      <!-- Per-habit table -->
      ${habits.length ? `<div class="card vd-card-wide">
        <h2 class="card-title">📋 Per-habit breakdown</h2>
        <table class="analytics-table">
          <thead><tr><th scope="col">Habit</th><th scope="col">Current streak</th><th scope="col">Best streak</th><th scope="col">Total check-ins</th><th scope="col">30-day rate</th></tr></thead>
          <tbody>${habitRows}</tbody>
        </table>
      </div>` : ''}
    </div>`;
}

/* ============ Finance Tracker ============ */
let _finCurrFilter = 'ALL';
let _finStudentFilter = 'ALL';

function fmtM(v, curr = 'USD') {
  const num = (v || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return curr === 'TRY' ? `₺${num}` : `$${num}`;
}

function renderFinance() {
  const Fin = window.LumenLib.finance;
  const root = viewRoot();
  const rawInc = state.income || [];
  const rawExp = state.expenses || [];
  const rawExpInc = state.expectedIncome || [];
  const rawExpExp = state.expectedExpenses || [];
  const today = todayISO();
  const thisMonth = today.slice(0, 7);

  // Filter by currency & student if set (student filter matches by name or by FK id)
  const _finFilterStudentId = _finStudentFilter !== 'ALL' && _finStudentFilter !== '__NONE__'
    ? (getStudentsList().find(s => s.name === _finStudentFilter) || {}).id : null;
  // Filter predicate is owned by src/finance/store.js.
  const filterFn = e => Fin.matchesFinanceFilter(e, { currency: _finCurrFilter, student: _finStudentFilter, studentId: _finFilterStudentId });

  const inc = rawInc.filter(filterFn);
  const exp = rawExp.filter(filterFn);
  const expInc = rawExpInc.filter(filterFn);
  const expExp = rawExpExp.filter(filterFn);

  // Month Actuals (primary currency or filtered)
  const monthInc = Fin.sumByMonth(inc, thisMonth);
  const monthExp = Fin.sumByMonth(exp, thisMonth);
  const monthNet = monthInc - monthExp;

  // Expected this month
  const expIncMonth = Fin.sumByMonth(expInc, thisMonth);
  const expExpMonth = Fin.sumByMonth(expExp, thisMonth);
  const expNetMonth = expIncMonth - expExpMonth;

  // Total all-time
  const totalInc = Fin.sumAll(inc);
  const totalExp = Fin.sumAll(exp);
  const totalNet = totalInc - totalExp;

  // Dual currency summaries (USD & TRY totals across all transactions)
  const usdIncThisMonth = rawInc.filter(e => (e.currency || 'USD') === 'USD' && (e.date || '').startsWith(thisMonth)).reduce((s, e) => s + (e.amount || 0), 0);
  const tryIncThisMonth = rawInc.filter(e => e.currency === 'TRY' && (e.date || '').startsWith(thisMonth)).reduce((s, e) => s + (e.amount || 0), 0);
  const usdExpThisMonth = rawExp.filter(e => (e.currency || 'USD') === 'USD' && (e.date || '').startsWith(thisMonth)).reduce((s, e) => s + (e.amount || 0), 0);
  const tryExpThisMonth = rawExp.filter(e => e.currency === 'TRY' && (e.date || '').startsWith(thisMonth)).reduce((s, e) => s + (e.amount || 0), 0);

  // Trend data is owned by src/finance/store.js.
  const { labels: monthLabels, incomeData: monthIncData, expenseData: monthExpData, max: maxMonth } = Fin.sixMonthTrend(inc, exp, new Date());

  // Grouping is owned by src/finance/store.js.
  const { entries: incTypeEntries, max: maxIncType } = Fin.groupByField(inc, thisMonth, 'type');

  // Grouping is owned by src/finance/store.js.
  const { entries: expCatEntries, max: maxExpCat } = Fin.groupByField(exp, thisMonth, 'category');
  const expCatColors = ['#ff5d6c','#ffb020','#f472b6','#22d3ee','#a3e635','#7c6cf6','#4f8cff','#34d399'];

  // Currency label for charts & stats
  const activeCurr = _finCurrFilter === 'TRY' ? 'TRY' : 'USD';

  // Line chart geometry is owned by src/finance/view.js.
  const daysInMonth = new Date().getDate();
  const { paths: linePathsSVG, legend: lineLegend, xLabels: lineXLabels, grid: lineGridS } = Fin.dailyExpenseLineSVG(exp, thisMonth, daysInMonth, expCatColors);

  // Pie chart geometry is owned by src/finance/view.js.
  const { paths: pieSVG, legend: pieLegend, total: pieTotal } = Fin.categoryPieSVG({ entries: expCatEntries }, expCatColors, activeCurr);

  // Overdue-payment matching is owned by src/finance/store.js.
  const overdueExpected = Fin.overdueExpectedPayments(expInc, expExp, inc, exp, today);
  const overdueHTML = Fin.overdueRowsHTML(overdueExpected, Date.now(), today);

  // Recent transactions list
  const recent = [...inc.map(e => ({ ...e, kind: 'income' })), ...exp.map(e => ({ ...e, kind: 'expense' }))]
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 15);

  // Bar chart geometry is owned by src/finance/view.js.
  const { bars: barsSVG, grid: gridS } = Fin.trendBarsSVG({ labels: monthLabels, incomeData: monthIncData, expenseData: monthExpData, max: maxMonth });

  // Savings rate calculation
  // Savings rate calculation
  const savingsRate = Fin.savingsRate(monthInc, monthExp);
  const savingsGrade = savingsRate >= 30 ? { label: '🌟 Excellent', color: '#34d399' } : savingsRate >= 15 ? { label: '🟢 Healthy', color: '#605DFF' } : savingsRate >= 0 ? { label: '🟡 Moderate', color: '#f59e0b' } : { label: '🔴 Deficit', color: '#ff5d6c' };

  // Average monthly burn & Runway
  const pastNonZeroExp = monthExpData.filter(x => x > 0);
  const avgMonthlyBurn = pastNonZeroExp.length ? Math.round(pastNonZeroExp.reduce((s, x) => s + x, 0) / pastNonZeroExp.length) : Math.round(monthExp || 1);
  const currentRunwayMonths = Fin.estimateRunway(totalNet, avgMonthlyBurn);

  // Student filter options
  const studentList = getStudentsList();
  const studentFilterOpts = [
    `<option value="ALL" ${_finStudentFilter === 'ALL' ? 'selected' : ''}>All Students</option>`,
    `<option value="__NONE__" ${_finStudentFilter === '__NONE__' ? 'selected' : ''}>General / No Student</option>`,
    ...studentList.map(s => `<option value="${esc(s.name)}" ${_finStudentFilter === s.name ? 'selected' : ''}>🎓 ${esc(s.name)}</option>`)
  ].join('');

  // Per-student balance rollup is owned by src/finance/store.js.
  const perStudentHTML = Fin.perStudentBalances(studentList, state.income, state.expectedIncome).map(r => `<div class="fps-row">
    <span class="fps-name">🎓 ${esc(r.name)}</span>
    <div class="fps-bar"><div class="fps-fill" style="width:${r.pct}%"></div></div>
    <span class="fps-nums">${fmtM(r.paid, r.currency)} / ${fmtM(r.expected, r.currency)} · <b>${fmtM(r.outstanding, r.currency)} due</b></span>
  </div>`).join('');
  const perStudentCard = perStudentHTML ? `<div id="fin-per-student" style="margin-bottom:14px;padding:10px 12px;background:var(--surface2);border-radius:10px;border:1px solid var(--border)">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <span style="font-weight:700;font-size:13px">🎓 Per-student balance</span>
      <a class="link-btn" href="#students">Students →</a>
    </div>
    ${perStudentHTML}
  </div>` : '';

  root.innerHTML = `
    <!-- Top Workstation: Recent Transactions & Quick Logging (ON TOP) -->
    <div class="card" style="margin-bottom:20px">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:14px">
        <div>
          <h2 class="card-title" style="margin:0 0 2px">📜 Recent transactions</h2>
          <p class="muted" style="font-size:12px;margin:0">Log income, lessons, expenses and manage student earnings.</p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <button class="btn btn-accent" id="fin-add-inc">${ic('plus',14)} Log income</button>
          <button class="btn" id="fin-add-exp">${ic('plus',14)} Log expense</button>
          <button class="btn btn-ghost" id="fin-add-exp-inc">🔮 Log expected income</button>
          <button class="btn btn-ghost" id="fin-add-exp-exp">🔮 Log expected expense</button>
          <button class="btn btn-ghost" id="fin-manage-students">🎓 Students</button>
        </div>
      </div>

      <!-- Filters toolbar: Currency & Student Selection -->
      <div style="display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-bottom:14px;padding:8px 12px;background:var(--surface2);border-radius:10px;border:1px solid var(--border)">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span class="muted" style="font-size:12px;font-weight:700">CURRENCY:</span>
          <div style="display:flex;gap:4px">
            <button class="btn btn-sm ${!_finCurrFilter || _finCurrFilter === 'ALL' ? 'btn-accent' : 'btn-ghost'}" data-fin-curr="ALL">All</button>
            <button class="btn btn-sm ${_finCurrFilter === 'USD' ? 'btn-accent' : 'btn-ghost'}" data-fin-curr="USD">💵 USD ($)</button>
            <button class="btn btn-sm ${_finCurrFilter === 'TRY' ? 'btn-accent' : 'btn-ghost'}" data-fin-curr="TRY">₺ TRY (Turkish Lira)</button>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="muted" style="font-size:12px;font-weight:700">STUDENT:</span>
          <select id="fin-filter-student" style="font-size:12px;padding:4px 8px;border-radius:6px;width:auto;min-width:140px">
            ${studentFilterOpts}
          </select>
        </div>
      </div>

      ${perStudentCard}

      <!-- Transaction Table -->
      ${Fin.transactionRowsHTML(recent, { ic })}
    </div>

    <!-- Summary cards with Dual Currency indicators -->
    <div class="vd-summary">
      <div class="vd-stat-card">
        <div class="vd-stat-icon" style="background:rgba(52,211,153,.14)">📈</div>
        <div>
          <div class="vd-stat-val" style="color:#34d399">${fmtM(monthInc, activeCurr)}</div>
          <div class="vd-stat-lbl">Income this month</div>
          ${_finCurrFilter === 'ALL' && tryIncThisMonth > 0 ? `<div class="muted" style="font-size:11px;margin-top:2px">USD: $${usdIncThisMonth.toLocaleString()} · TRY: ₺${tryIncThisMonth.toLocaleString()}</div>` : ''}
        </div>
      </div>
      <div class="vd-stat-card">
        <div class="vd-stat-icon" style="background:rgba(255,93,108,.14)">📉</div>
        <div>
          <div class="vd-stat-val" style="color:#ff5d6c">${fmtM(monthExp, activeCurr)}</div>
          <div class="vd-stat-lbl">Expenses this month</div>
          ${_finCurrFilter === 'ALL' && tryExpThisMonth > 0 ? `<div class="muted" style="font-size:11px;margin-top:2px">USD: $${usdExpThisMonth.toLocaleString()} · TRY: ₺${tryExpThisMonth.toLocaleString()}</div>` : ''}
        </div>
      </div>
      <div class="vd-stat-card">
        <div class="vd-stat-icon" style="background:rgba(124,108,246,.14)">💰</div>
        <div>
          <div class="vd-stat-val" style="color:${monthNet >= 0 ? '#34d399' : '#ff5d6c'}">${fmtM(monthNet, activeCurr)}</div>
          <div class="vd-stat-lbl">Net cash flow</div>
        </div>
      </div>
      <div class="vd-stat-card">
        <div class="vd-stat-icon" style="background:rgba(79,140,255,.14)">🔮</div>
        <div>
          <div class="vd-stat-val" style="color:${expNetMonth >= 0 ? '#34d399' : '#ff5d6c'}">${fmtM(expNetMonth, activeCurr)}</div>
          <div class="vd-stat-lbl">Expected net (this month)</div>
        </div>
      </div>
      <div class="vd-stat-card">
        <div class="vd-stat-icon" style="background:rgba(255,176,32,.14)">🏦</div>
        <div>
          <div class="vd-stat-val">${fmtM(totalNet, activeCurr)}</div>
          <div class="vd-stat-lbl">All-time net balance</div>
        </div>
      </div>
    </div>

    <!-- Interactive Runway & Burn Rate Simulator -->
    <div class="fin-sim-card">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
        <div>
          <h2 class="card-title" style="margin-bottom:2px">🛡️ Financial Runway &amp; Burn Simulator</h2>
          <p class="muted" style="font-size:12px;margin:0">Estimate runway based on your average monthly burn of <b>${fmtM(avgMonthlyBurn, activeCurr)}/mo</b>.</p>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <div style="text-align:right">
            <span class="fin-sim-metric" id="fin-sim-runway-val">${currentRunwayMonths}</span>
            <span class="muted" style="font-size:13px;font-weight:600"> months runway</span>
          </div>
        </div>
      </div>
      <div class="fin-sim-row">
        <div class="fin-sim-slider-wrap">
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px">
            <span>Simulate spending reduction:</span>
            <b id="fin-slider-pct">0% cut</b>
          </div>
          <input type="range" id="fin-burn-slider" min="0" max="50" step="5" value="0" style="width:100%;accent-color:var(--accent)">
        </div>
        <div style="display:flex;gap:16px;font-size:12.5px">
          <div><span class="muted">Liquid Balance:</span> <b>${fmtM(totalNet, activeCurr)}</b></div>
          <div><span class="muted">Adj. Burn:</span> <b id="fin-sim-adj-burn">${fmtM(avgMonthlyBurn, activeCurr)}/mo</b></div>
        </div>
      </div>
    </div>

    <div class="vd-grid">
      <!-- 6-month trend chart -->
      <div class="card vd-card-wide">
        <h2 class="card-title">📊 6-month cash flow</h2>
        <div class="vd-chart-legend"><span class="vd-legend-dot" style="background:#34d399"></span>Income <span class="vd-legend-dot" style="background:#ff5d6c"></span>Expenses</div>
        <svg viewBox="0 0 560 160" class="vd-svg-chart" preserveAspectRatio="xMidYMid meet">
          ${gridS}${barsSVG}
        </svg>
      </div>

      <!-- Savings Rate Gauge -->
      <div class="card">
        <h2 class="card-title">🎯 Savings rate (this month)</h2>
        <div style="display:flex;align-items:center;gap:18px;padding:8px 0">
          <svg viewBox="0 0 100 100" style="width:90px;height:90px;transform:rotate(-90deg);flex-shrink:0">
            <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border)" stroke-width="8"/>
            <circle cx="50" cy="50" r="40" fill="none" stroke="${savingsGrade.color}" stroke-width="8" stroke-dasharray="${2 * Math.PI * 40}" stroke-dashoffset="${2 * Math.PI * 40 * (1 - Math.max(0, Math.min(100, savingsRate)) / 100)}" stroke-linecap="round"/>
            <text x="50" y="54" text-anchor="middle" transform="rotate(90 50 50)" fill="var(--text)" font-size="16" font-weight="800">${Math.max(0, savingsRate)}%</text>
          </svg>
          <div>
            <div style="font-size:14px;font-weight:700;color:${savingsGrade.color};margin-bottom:4px">${savingsGrade.label}</div>
            <p class="muted" style="font-size:12px;line-height:1.4;margin:0">Net savings: <b>${fmtM(monthNet, activeCurr)}</b> from <b>${fmtM(monthInc, activeCurr)}</b> revenue.</p>
          </div>
        </div>
      </div>

      <!-- Income by type -->
      <div class="card">
        <h2 class="card-title">📈 Income by type (this month)</h2>
        ${incTypeEntries.length ? incTypeEntries.map(([type, amt]) => {
          const pct = Math.round(amt / maxIncType * 100);
          return `<div class="vd-finc-row"><span class="vd-finc-label">${esc(type)}</span><div class="vd-finc-bar"><div class="vd-finc-fill" style="width:${pct}%;background:#34d399"></div></div><span class="vd-finc-amt">${fmtM(amt, activeCurr)}</span></div>`;
        }).join('') : '<div class="muted" style="padding:8px 0;font-size:12px">No income logged this month.</div>'}
        <button class="btn btn-sm btn-ghost" id="fin-manage-types" style="margin-top:8px">⚙️ Manage income types</button>
      </div>

      <!-- Expense by category & Budget adherence -->
      <div class="card">
        <h2 class="card-title">📉 Expenses by category</h2>
        ${expCatEntries.length ? expCatEntries.map(([cat, amt], i) => {
          const color = expCatColors[i % expCatColors.length];
          const pct = Math.round(amt / maxExpCat * 100);
          return `<div class="fin-budget-row">
            <span style="width:85px;flex-shrink:0">${esc(cat)}</span>
            <div class="fin-budget-track"><div class="fin-budget-fill" style="width:${pct}%;background:${color}"></div></div>
            <span style="font-weight:600;min-width:60px;text-align:right">${fmtM(amt, activeCurr)}</span>
          </div>`;
        }).join('') : '<div class="muted" style="padding:8px 0;font-size:12px">No expenses logged this month.</div>'}
        <button class="btn btn-sm btn-ghost" id="fin-manage-exp-cats" style="margin-top:8px">⚙️ Manage expense categories</button>
      </div>

      <!-- Daily expenses line graph -->
      <div class="card vd-card-wide">
        <h2 class="card-title">📉 Daily expenses by category (this month)</h2>
        ${linePathsSVG ? `<div class="vd-chart-legend">${lineLegend}</div>
        <svg viewBox="0 0 600 200" class="vd-svg-chart" preserveAspectRatio="xMidYMid meet">
          ${lineGridS}
          ${linePathsSVG}
          ${lineXLabels}
        </svg>` : '<div class="muted" style="padding:12px 0;font-size:13px">No expenses logged this month.</div>'}
      </div>

      <!-- Expenditure pie chart -->
      <div class="card">
        <h2 class="card-title">🥧 Expenditure proportion</h2>
        ${pieSVG ? `<div class="vd-donut-wrap">
          <svg viewBox="0 0 140 140" class="vd-donut">${pieSVG}<text x="70" y="70" text-anchor="middle" dy=".35em" fill="var(--text)" font-size="14" font-weight="800">${fmtM(pieTotal, activeCurr)}</text><text x="70" y="82" text-anchor="middle" fill="var(--muted)" font-size="8">total</text></svg>
          <div class="vd-donut-legend">${pieLegend}</div>
        </div>` : '<div class="muted" style="padding:12px 0;font-size:13px">No expenses logged this month.</div>'}
      </div>

      <!-- Overdue expected payments -->
      <div class="card">
        <h2 class="card-title">⏰ Overdue expected payments</h2>
        <div class="fin-overdue-list">${overdueHTML}</div>
      </div>

      <!-- Expected vs Actual comparison -->
      <div class="card">
        <h2 class="card-title">🔮 Expected vs actual (this month)</h2>
        <table class="fin-compare-table">
          <thead><tr><th scope="col"></th><th scope="col">Expected</th><th scope="col">Actual</th><th scope="col">Diff</th></tr></thead>
          <tbody>
            <tr><td class="fin-td-label">📈 Income</td><td>${fmtM(expIncMonth, activeCurr)}</td><td>${fmtM(monthInc, activeCurr)}</td><td class="${monthInc - expIncMonth >= 0 ? 'fin-pos' : 'fin-neg'}">${monthInc - expIncMonth >= 0 ? '+' : ''}${fmtM(monthInc - expIncMonth, activeCurr)}</td></tr>
            <tr><td class="fin-td-label">📉 Expenses</td><td>${fmtM(expExpMonth, activeCurr)}</td><td>${fmtM(monthExp, activeCurr)}</td><td class="${expExpMonth - monthExp >= 0 ? 'fin-pos' : 'fin-neg'}">${expExpMonth - monthExp >= 0 ? '+' : ''}${fmtM(expExpMonth - monthExp, activeCurr)}</td></tr>
            <tr class="fin-total-row"><td class="fin-td-label">💰 Net</td><td>${fmtM(expNetMonth, activeCurr)}</td><td>${fmtM(monthNet, activeCurr)}</td><td class="${monthNet - expNetMonth >= 0 ? 'fin-pos' : 'fin-neg'}">${monthNet - expNetMonth >= 0 ? '+' : ''}${fmtM(monthNet - expNetMonth, activeCurr)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>`;

  // Bind Runway Slider
  const burnSlider = $('#fin-burn-slider');
  if (burnSlider) {
    burnSlider.addEventListener('input', e => {
      const cutPct = parseInt(e.target.value, 10);
      $('#fin-slider-pct').textContent = cutPct + '% cut';
      const adjBurn = Math.max(1, Math.round(avgMonthlyBurn * (1 - cutPct / 100)));
      $('#fin-sim-adj-burn').textContent = fmtM(adjBurn, activeCurr) + '/mo';
      const adjRunway = totalNet > 0 ? (totalNet / adjBurn).toFixed(1) : '0.0';
      $('#fin-sim-runway-val').textContent = adjRunway;
    });
  }

  // Bind Filters
  $$('button[data-fin-curr]').forEach(b => b.addEventListener('click', () => {
    _finCurrFilter = b.dataset.finCurr;
    renderFinance();
  }));

  $('#fin-filter-student')?.addEventListener('change', e => {
    _finStudentFilter = e.target.value;
    renderFinance();
  });

  // Bind Actions
  $('#fin-add-inc')?.addEventListener('click', () => openFinanceModal('income'));
  $('#fin-add-exp')?.addEventListener('click', () => openFinanceModal('expense'));
  $('#fin-add-exp-inc')?.addEventListener('click', () => openFinanceModal('expectedIncome'));
  $('#fin-add-exp-exp')?.addEventListener('click', () => openFinanceModal('expectedExpense'));
  $('#fin-manage-students')?.addEventListener('click', openStudentManageModal);
  $('#fin-manage-types')?.addEventListener('click', openIncomeTypeModal);
  $('#fin-manage-exp-cats')?.addEventListener('click', openExpenseCategoryModal);
  $$('.fin-tx-del').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    const id = b.dataset.delTx;
    const kind = b.dataset.kind;
    const arr = kind === 'income' ? state.income : kind === 'expense' ? state.expenses : kind === 'expectedIncome' ? state.expectedIncome : state.expectedExpenses;
    const item = arr.find(x => x.id === id);
    if (!item || !confirm('Delete this transaction?')) return;
    captureUndo('Delete transaction');
    const idx = arr.indexOf(item);
    arr.splice(idx, 1);
    save();
    renderFinance();
    toast('Transaction deleted');
  }));
}

function openFinanceModal(kind = 'income', prefill = null) {
  const isIncome = kind === 'income' || kind === 'expectedIncome';
  const isExpected = kind === 'expectedIncome' || kind === 'expectedExpense';
  const title = isExpected
    ? (isIncome ? 'Log expected income' : 'Log expected expense')
    : (isIncome ? 'Log income' : 'Log expense');
  const typeOpts = (state.incomeTypes || ['ESL','IELTS','Tutoring','Exam Prep']).map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('');
  const expCats = state.expenseCategories || ['Rent','Utilities','Food','Transport','Supplies','Software','Marketing','Education','Healthcare','Other'];
  const catOpts = isIncome ? typeOpts : expCats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  const studentList = getStudentsList();
  const studentOpts = studentList.map(s => `<option value="${esc(s.name)}">${esc(s.name)}</option>`).join('');
  const today = todayISO();
  const defaultCurr = state.settings?.currency || 'USD';

  openModal(`
    <div class="modal">
      <div class="modal-head"><h3>${title}</h3><button class="btn-icon" data-close-modal>${ic('x', 16)}</button></div>
      <div class="modal-body">
        <div class="field-row">
          <div class="field" style="flex:1"><label for="fin-amt" class="field-label">Amount</label><input id="fin-amt" type="number" step="0.01" min="0" placeholder="0.00" autofocus></div>
          <div class="field" style="width:130px"><label for="fin-curr" class="field-label">Currency</label>
            <select id="fin-curr">
              <option value="USD" ${defaultCurr === 'USD' ? 'selected' : ''}>USD ($)</option>
              <option value="TRY" ${defaultCurr === 'TRY' ? 'selected' : ''}>TRY (₺)</option>
            </select>
          </div>
        </div>
        <div class="field-row">
          <div class="field"><label for="fin-cat" class="field-label">${isIncome ? 'Income type' : 'Category'}</label>
            <select id="fin-cat">${catOpts}</select>
            <button class="btn btn-sm btn-ghost" id="fin-add-type" style="margin-top:4px">${isIncome ? '+ Add income type' : '+ Add expense category'}</button>
          </div>
          <div class="field"><label for="fin-date" class="field-label">Date</label><input id="fin-date" type="date" value="${today}"></div>
        </div>
        ${isIncome ? `<div class="field"><label for="fin-student" class="field-label">Student / Client (optional)</label>
          <select id="fin-student">
            <option value="">— None / General —</option>
            ${studentOpts}
          </select>
          <button class="btn btn-sm btn-ghost" id="fin-add-student-inline" style="margin-top:4px">+ Add student</button>
        </div>` : ''}
        <div class="field"><label for="fin-desc" class="field-label">Description (optional)</label><input id="fin-desc" type="text" placeholder="What was this for?"></div>
      </div>
      <div class="modal-foot">
        <div style="flex:1"></div>
        <button class="btn btn-ghost" data-close-modal>Cancel</button>
        <button class="btn btn-accent" id="fin-save">Save</button>
      </div>
    </div>`);

  $('#fin-add-type')?.addEventListener('click', () => {
    closeModal();
    if (isIncome) openIncomeTypeModal();
    else openExpenseCategoryModal();
  });
  $('#fin-add-student-inline')?.addEventListener('click', () => { closeModal(); openStudentEditModal(null); });
  if (prefill && isIncome) {
    if (prefill.studentName && $('#fin-student')) $('#fin-student').value = prefill.studentName;
    if (prefill.currency && $('#fin-curr')) $('#fin-curr').value = prefill.currency;
    if (prefill.rate && $('#fin-amt') && !$('#fin-amt').value) $('#fin-amt').value = prefill.rate;
    if (prefill.studentName && $('#fin-desc') && !$('#fin-desc').value) $('#fin-desc').value = `Lesson fee: ${prefill.studentName}`;
  }
  $('#fin-student')?.addEventListener('change', e => {
    const sName = e.target.value;
    if (!sName) return;
    const std = studentList.find(x => x.name === sName);
    if (std) {
      if (std.currency && $('#fin-curr')) $('#fin-curr').value = std.currency;
      if (std.rate && $('#fin-amt') && !$('#fin-amt').value) $('#fin-amt').value = std.rate;
      if ($('#fin-desc') && !$('#fin-desc').value) $('#fin-desc').value = `Lesson fee: ${std.name}`;
    }
  });
  $('#fin-save').addEventListener('click', () => {
    const amount = parseFloat($('#fin-amt').value);
    if (!amount || amount <= 0) { toast('Enter a valid amount', 'error'); return; }
    const currency = $('#fin-curr').value || 'USD';
    const category = $('#fin-cat').value;
    const date = $('#fin-date').value || today;
    const student = isIncome ? ($('#fin-student')?.value || undefined) : undefined;
    const studentId = student ? (studentList.find(x => x.name === student) || {}).id : undefined;
    const description = $('#fin-desc').value.trim();
    captureUndo(title);
    const entry = { id: uid(), amount: Math.round(amount * 100) / 100, currency, type: isIncome ? category : undefined, category: !isIncome ? category : undefined, student: student || undefined, studentId: studentId || undefined, date, description, createdAt: Date.now(), updatedAt: Date.now() };
    const arr = kind === 'income' ? state.income : kind === 'expense' ? state.expenses : kind === 'expectedIncome' ? state.expectedIncome : state.expectedExpenses;
    arr.push(entry);
    save();
    const currSym = currency === 'TRY' ? '₺' : '$';
    logActivity('finance.' + kind, `${isIncome ? '📈' : '📉'} ${esc(category)} ${currSym}${amount}${student ? ` (${esc(student)})` : ''}`, 'finance');
    closeModal();
    if (currentView() === 'finance') renderFinance();
    else if (currentView() === 'students') renderStudents();
    toast(`${title} saved ✅`);
  });
}

function openStudentManageModal() {
  location.hash = '#students';
}

/* ============ Students Workspace & Dossiers ============ */
let _studentSearchQ = '';
let _studentStatusFilter = 'ALL';
let _studentViewMode = 'grid'; // 'grid' | 'table'
let _studentActiveSubTab = 'roster'; // 'roster' | 'attendance' | 'assignments' | 'lessonPlans'
let _attStatusFilter = 'ALL';
let _assignStatusFilter = 'ALL';
let _planStatusFilter = 'ALL';

function renderStudents() {
  const root = viewRoot();
  const students = getStudentsList();
  const inc = state.income || [];
  const expInc = state.expectedIncome || [];
  const tasks = state.tasks || [];
  const notes = state.notes || [];
  const attendance = state.attendance || [];
  const assignments = state.assignments || [];
  const lessonPlans = state.lessonPlans || [];
  const today = todayISO();
  const thisMonth = today.slice(0, 7);

  // High-level metrics
  const activeCount = students.filter(s => s.status === 'active').length;
  const monthStudentInc = inc.filter(e => e.student && (e.date || '').startsWith(thisMonth));
  const monthLessonsCount = monthStudentInc.length;
  const monthUsdRevenue = monthStudentInc.filter(e => (e.currency || 'USD') === 'USD').reduce((sum, e) => sum + (e.amount || 0), 0);
  const monthTryRevenue = monthStudentInc.filter(e => e.currency === 'TRY').reduce((sum, e) => sum + (e.amount || 0), 0);
  const allTimeUsd = inc.filter(e => e.student && (e.currency || 'USD') === 'USD').reduce((sum, e) => sum + (e.amount || 0), 0);
  const allTimeTry = inc.filter(e => e.student && e.currency === 'TRY').reduce((sum, e) => sum + (e.amount || 0), 0);

  // Owned by src/lib/students.js — fixes a bug found while extracting it: this
  // roster stats function never checked studentId for income/expectedIncome, while
  // the dossier three functions below already did, so a renamed student’s roster
  // card undercounted them while their dossier stayed correct.
  const getStudentStats = s => window.LumenLib.students.getStudentStats(s, { income: inc, expectedIncome: expInc, tasks, notes, attendance, assignments, lessonPlans });

  // Hero Section HTML
  const heroHTML = `
    <div class="student-hero">
      <div class="student-hero-icon">🎓</div>
      <div class="student-hero-content">
        <div class="student-hero-badge">Teacher Command Center</div>
        <h2 class="student-hero-title">Students &amp; Classroom Workstation</h2>
        <p class="student-hero-sub">Manage student roster, track attendance &amp; punctuality, grade assignments, and organize structured curriculum lesson plans.</p>
        <div class="student-hero-actions">
          <button class="btn btn-accent btn-sm" id="std-hero-new-student"><span class="hero-btn-icon">➕</span> New Student</button>
          <button class="btn btn-sm" id="std-hero-mark-attendance"><span class="hero-btn-icon">📅</span> Mark Attendance</button>
          <button class="btn btn-sm" id="std-hero-assign-hw"><span class="hero-btn-icon">📋</span> Assign Homework</button>
          <button class="btn btn-sm" id="std-hero-new-plan"><span class="hero-btn-icon">📖</span> New Lesson Plan</button>
          <button class="btn btn-sm btn-ghost" id="std-hero-log-income"><span class="hero-btn-icon">💰</span> Log Income</button>
        </div>
      </div>
    </div>`;

  // Sub-Tabs Header
  const subTabsHTML = `
    <div class="student-main-tabs">
      <button class="student-main-tab-btn ${_studentActiveSubTab === 'roster' ? 'active' : ''}" data-subtab="roster">👥 Students Roster (${students.length})</button>
      <button class="student-main-tab-btn ${_studentActiveSubTab === 'attendance' ? 'active' : ''}" data-subtab="attendance">📅 Attendance Tracker (${attendance.length})</button>
      <button class="student-main-tab-btn ${_studentActiveSubTab === 'assignments' ? 'active' : ''}" data-subtab="assignments">📋 Assignments &amp; Homework (${assignments.length})</button>
      <button class="student-main-tab-btn ${_studentActiveSubTab === 'lessonPlans' ? 'active' : ''}" data-subtab="lessonPlans">📖 Lesson Plans (${lessonPlans.length})</button>
    </div>`;

  let bodyContent = '';

  /* ------------------- TAB 1: ROSTER ------------------- */
  if (_studentActiveSubTab === 'roster') {
    const q = (_studentSearchQ || '').toLowerCase().trim();
    const filtered = students.filter(s => {
      if (_studentStatusFilter !== 'ALL' && s.status !== _studentStatusFilter) return false;
      if (q) {
        const haystack = (s.name + ' ' + (s.level || '') + ' ' + (s.email || '') + ' ' + (s.phone || '') + ' ' + (s.goals || '') + ' ' + (s.notes || '') + ' ' + (s.tags || []).join(' ')).toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    const cardsHTML = filtered.map(s => window.LumenLib.students.studentCardHTML(s, { stats: getStudentStats(s), tagSpan, ic })).join('');

    const tableHTML = `
      <div class="card" style="overflow-x:auto">
        <table class="fin-tx-table">
          <thead>
            <tr>
              <th scope="col">Student Name</th>
              <th scope="col">Level / Subject</th>
              <th scope="col">Rate</th>
              <th scope="col">Status</th>
              <th scope="col">Lessons</th>
              <th scope="col">Revenue</th>
              <th scope="col">Attendance</th>
              <th scope="col">Homework</th>
              <th scope="col"></th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(s => window.LumenLib.students.studentRowHTML(s, { stats: getStudentStats(s), ic })).join('')}
          </tbody>
        </table>
      </div>`;

    bodyContent = `
      <div class="students-stats">
        <div class="student-stat-card">
          <div class="student-stat-icon" style="background:rgba(96,93,255,.12);color:var(--accent)">🎓</div>
          <div>
            <div class="student-stat-val">${activeCount} <span class="muted" style="font-size:13px;font-weight:500">/ ${students.length}</span></div>
            <div class="student-stat-lbl">Active Students</div>
          </div>
        </div>
        <div class="student-stat-card">
          <div class="student-stat-icon" style="background:rgba(52,211,153,.12);color:#34d399">📅</div>
          <div>
            <div class="student-stat-val" style="color:#34d399">${monthLessonsCount}</div>
            <div class="student-stat-lbl">Lessons This Month</div>
          </div>
        </div>
        <div class="student-stat-card">
          <div class="student-stat-icon" style="background:rgba(81,141,191,.12);color:#518DBF">💵</div>
          <div>
            <div class="student-stat-val" style="color:#518DBF">$${monthUsdRevenue.toLocaleString()}${monthTryRevenue > 0 ? ` · <span style="font-size:15px">₺${monthTryRevenue.toLocaleString()}</span>` : ''}</div>
            <div class="student-stat-lbl">Revenue (This Month)</div>
          </div>
        </div>
        <div class="student-stat-card">
          <div class="student-stat-icon" style="background:rgba(255,176,32,.12);color:#f59e0b">🏦</div>
          <div>
            <div class="student-stat-val">$${allTimeUsd.toLocaleString()}${allTimeTry > 0 ? ` · <span style="font-size:15px">₺${allTimeTry.toLocaleString()}</span>` : ''}</div>
            <div class="student-stat-lbl">All-Time Student Earnings</div>
          </div>
        </div>
      </div>

      <div class="students-toolbar">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;flex:1;min-width:260px">
          <input type="text" class="search-input" id="student-search" placeholder="Search by name, level, goal, tags…" value="${esc(_studentSearchQ || '')}" style="max-width:280px">
          <div style="display:flex;gap:4px">
            <button class="btn btn-sm ${_studentStatusFilter === 'ALL' ? 'btn-accent' : 'btn-ghost'}" data-std-status="ALL">All</button>
            <button class="btn btn-sm ${_studentStatusFilter === 'active' ? 'btn-accent' : 'btn-ghost'}" data-std-status="active">🟢 Active</button>
            <button class="btn btn-sm ${_studentStatusFilter === 'paused' ? 'btn-accent' : 'btn-ghost'}" data-std-status="paused">🟡 Paused</button>
            <button class="btn btn-sm ${_studentStatusFilter === 'completed' ? 'btn-accent' : 'btn-ghost'}" data-std-status="completed">⚪ Completed</button>
          </div>
        </div>

        <div style="display:flex;align-items:center;gap:8px">
          <div style="display:flex;gap:2px;background:var(--surface2);padding:2px;border-radius:8px;border:1px solid var(--border)">
            <button class="btn btn-sm ${_studentViewMode === 'grid' ? 'btn-accent' : 'btn-ghost'}" id="std-mode-grid" title="Cards View">📇</button>
            <button class="btn btn-sm ${_studentViewMode === 'table' ? 'btn-accent' : 'btn-ghost'}" id="std-mode-table" title="Table View">📋</button>
          </div>
          <button class="btn btn-accent" id="std-new-btn">${ic('plus', 14)} New Student</button>
        </div>
      </div>

      ${filtered.length
        ? (_studentViewMode === 'grid' ? `<div class="students-grid">${cardsHTML}</div>` : tableHTML)
        : `<div class="card muted" style="padding:40px 20px;text-align:center">
             <div style="font-size:36px;margin-bottom:8px">🎓</div>
             <h2 style="margin:0 0 6px;color:var(--text)">Your Student Roster is Clean &amp; Ready</h2>
             <p style="margin:0 0 16px;font-size:13px">Add your students to start tracking attendance, assigning homework, and logging tutoring income.</p>
             <button class="btn btn-accent" id="std-empty-add">${ic('plus', 14)} Add First Student</button>
           </div>`}
    `;
  }

  /* ------------------- TAB 2: ATTENDANCE TRACKER ------------------- */
  else if (_studentActiveSubTab === 'attendance') {
    bodyContent = window.LumenLib.students.attendanceTabHTML({ attendance, filter: _attStatusFilter, ic });
  }

  /* ------------------- TAB 3: ASSIGNMENTS & HOMEWORK ------------------- */
  else if (_studentActiveSubTab === 'assignments') {
    bodyContent = window.LumenLib.students.assignmentsTabHTML({ assignments, filter: _assignStatusFilter, today, ic });
  }

  /* ------------------- TAB 4: LESSON PLANS ------------------- */
  else if (_studentActiveSubTab === 'lessonPlans') {
    bodyContent = window.LumenLib.students.lessonPlansTabHTML({ lessonPlans, filter: _planStatusFilter, ic });
  }

  root.innerHTML = heroHTML + subTabsHTML + bodyContent;

  // Bind Sub-Tabs
  $$('.student-main-tab-btn').forEach(b => b.addEventListener('click', () => {
    _studentActiveSubTab = b.dataset.subtab;
    renderStudents();
  }));

  // Bind Hero Actions
  $('#std-hero-new-student')?.addEventListener('click', () => openStudentEditModal(null));
  $('#std-hero-mark-attendance')?.addEventListener('click', () => openAttendanceModal(null));
  $('#std-hero-assign-hw')?.addEventListener('click', () => openAssignmentModal(null));
  $('#std-hero-new-plan')?.addEventListener('click', () => openLessonPlanModal(null));
  $('#std-hero-log-income')?.addEventListener('click', () => openFinanceModal('income'));

  // Bind Roster Tab Events
  bindFilterInput('#student-search', 150, v => { _studentSearchQ = v; renderStudents(); });
  $$('button[data-std-status]').forEach(b => b.addEventListener('click', () => { _studentStatusFilter = b.dataset.stdStatus; renderStudents(); }));
  $('#std-mode-grid')?.addEventListener('click', () => { _studentViewMode = 'grid'; renderStudents(); });
  $('#std-mode-table')?.addEventListener('click', () => { _studentViewMode = 'table'; renderStudents(); });
  $('#std-new-btn')?.addEventListener('click', () => openStudentEditModal(null));
  $('#std-empty-add')?.addEventListener('click', () => openStudentEditModal(null));

  $$('.std-open-dossier').forEach(b => b.addEventListener('click', () => openStudentDossier(b.dataset.id)));
  $$('.std-log-att').forEach(b => b.addEventListener('click', () => openAttendanceModal(null, b.dataset.student)));
  $$('.std-log-assign').forEach(b => b.addEventListener('click', () => openAssignmentModal(null, b.dataset.student)));
  $$('.std-edit-btn').forEach(b => b.addEventListener('click', () => {
    const s = getStudentsList().find(x => x.id === b.dataset.id);
    if (s) openStudentEditModal(s);
  }));
  $$('.std-log-income').forEach(b => b.addEventListener('click', () => {
    const sName = b.dataset.student;
    const sCurr = b.dataset.curr || 'USD';
    const sRate = b.dataset.rate;
    openFinanceModal('income');
    setTimeout(() => {
      if ($('#fin-student')) $('#fin-student').value = sName;
      if ($('#fin-curr')) $('#fin-curr').value = sCurr;
      if ($('#fin-amt') && sRate) $('#fin-amt').value = sRate;
      if ($('#fin-desc')) $('#fin-desc').value = `Lesson with ${sName}`;
    }, 50);
  }));
  $$('.std-del-btn').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.id;
    const name = b.dataset.name;
    if (!confirm(`Remove student "${name}" from your roster?`)) return;
    captureUndo('Remove student');
    state.students = state.students.filter(s => (s.id || s) !== id && s.name !== name);
    save();
    renderStudents();
    toast(`Student "${name}" removed`);
  }));

  // Bind Attendance Events
  $$('button[data-att-filter]').forEach(b => b.addEventListener('click', () => { _attStatusFilter = b.dataset.attFilter; renderStudents(); }));
  $('#att-new-btn')?.addEventListener('click', () => openAttendanceModal(null));
  $('#att-empty-add')?.addEventListener('click', () => openAttendanceModal(null));
  $$('.att-del-btn').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.id;
    captureUndo('Delete attendance entry');
    state.attendance = (state.attendance || []).filter(x => x.id !== id);
    save();
    renderStudents();
    toast('Attendance log deleted');
  }));

  // Bind Assignment Events
  $$('button[data-assign-filter]').forEach(b => b.addEventListener('click', () => { _assignStatusFilter = b.dataset.assignFilter; renderStudents(); }));
  $('#assign-new-btn')?.addEventListener('click', () => openAssignmentModal(null));
  $('#assign-empty-add')?.addEventListener('click', () => openAssignmentModal(null));
  $$('.assign-grade-btn').forEach(b => b.addEventListener('click', () => {
    const a = (state.assignments || []).find(x => x.id === b.dataset.id);
    if (a) openAssignmentGradingModal(a);
  }));
  $$('.assign-edit-btn').forEach(b => b.addEventListener('click', () => {
    const a = (state.assignments || []).find(x => x.id === b.dataset.id);
    if (a) openAssignmentModal(a);
  }));
  $$('.assign-del-btn').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.id;
    captureUndo('Delete assignment');
    state.assignments = (state.assignments || []).filter(x => x.id !== id);
    save();
    renderStudents();
    toast('Assignment deleted');
  }));

  // Bind Lesson Plan Events
  $$('button[data-plan-filter]').forEach(b => b.addEventListener('click', () => { _planStatusFilter = b.dataset.planFilter; renderStudents(); }));
  $('#plan-new-btn')?.addEventListener('click', () => openLessonPlanModal(null));
  $('#plan-empty-add')?.addEventListener('click', () => openLessonPlanModal(null));
  $$('.plan-deliver-btn').forEach(b => b.addEventListener('click', () => deliverLessonPlan(b.dataset.id)));
  $$('.plan-edit-btn').forEach(b => b.addEventListener('click', () => {
    const p = (state.lessonPlans || []).find(x => x.id === b.dataset.id);
    if (p) openLessonPlanModal(p);
  }));
  $$('.plan-del-btn').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.id;
    captureUndo('Delete lesson plan');
    state.lessonPlans = (state.lessonPlans || []).filter(x => x.id !== id);
    save();
    renderStudents();
    toast('Lesson plan deleted');
  }));
}

/* ============ Attendance Modal ============ */
function openAttendanceModal(record, presetStudent) {
  const students = getStudentsList();
  const isEdit = !!record;
  const a = record || {
    studentName: presetStudent || (students[0]?.name || ''),
    date: todayISO(),
    time: new Date().toTimeString().slice(0, 5),
    duration: 60,
    status: 'present',
    topic: '',
    notes: '',
    billed: false
  };

  const studentOpts = students.length
    ? students.map(s => `<option value="${esc(s.name)}" ${s.name === a.studentName ? 'selected' : ''}>🎓 ${esc(s.name)} (${s.currency === 'TRY' ? '₺' : '$'}${s.rate || 35}/hr)</option>`).join('')
    : '<option value="General Student">General Student</option>';

  openModal(`
    <div class="modal">
      <div class="modal-head">
        <h3>📅 ${isEdit ? 'Edit Attendance Log' : 'Mark Lesson Attendance'}</h3>
        <button class="btn-icon" data-close-modal>${ic('x', 16)}</button>
      </div>
      <div class="modal-body">
        <div class="field">
          <label for="att-student" class="field-label">Select Student *</label>
          <select id="att-student">${studentOpts}</select>
        </div>
        <div class="field-row">
          <div class="field"><label for="att-date" class="field-label">Date</label><input id="att-date" type="date" value="${a.date || todayISO()}"></div>
          <div class="field"><label for="att-time" class="field-label">Time</label><input id="att-time" type="time" value="${a.time || '14:00'}"></div>
          <div class="field"><label for="att-dur" class="field-label">Duration</label>
            <select id="att-dur">
              <option value="30" ${a.duration == 30 ? 'selected' : ''}>30 mins</option>
              <option value="45" ${a.duration == 45 ? 'selected' : ''}>45 mins</option>
              <option value="60" ${a.duration == 60 ? 'selected' : ''}>60 mins</option>
              <option value="90" ${a.duration == 90 ? 'selected' : ''}>90 mins</option>
              <option value="120" ${a.duration == 120 ? 'selected' : ''}>120 mins</option>
            </select>
          </div>
        </div>
        <div class="field">
          <label for="att-status" class="field-label">Attendance Status</label>
          <select id="att-status">
            <option value="present" ${a.status === 'present' ? 'selected' : ''}>🟢 Present (On-time)</option>
            <option value="late" ${a.status === 'late' ? 'selected' : ''}>🟡 Late Arrival</option>
            <option value="absent" ${a.status === 'absent' ? 'selected' : ''}>🔴 Absent / No Show</option>
            <option value="rescheduled" ${a.status === 'rescheduled' ? 'selected' : ''}>🔵 Rescheduled</option>
            <option value="excused" ${a.status === 'excused' ? 'selected' : ''}>⚪ Excused Absence</option>
          </select>
        </div>
        <div class="field">
          <label for="att-topic" class="field-label">Lesson Topic / Materials Covered</label>
          <input id="att-topic" type="text" value="${esc(a.topic || '')}" placeholder="e.g. IELTS Speaking Part 2 Mock, Conditionals Review…">
        </div>
        <div class="field">
          <label for="att-notes" class="field-label">Session Notes &amp; Observations</label>
          <textarea id="att-notes" rows="2" placeholder="Student performance, vocabulary hurdles, homework set…">${esc(a.notes || '')}</textarea>
        </div>
        <div class="field" style="margin-top:10px">
          <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer">
            <input id="att-auto-bill" type="checkbox" ${a.billed || !isEdit ? 'checked' : ''}>
            <span>💰 Automatically log payment into Finance ledger</span>
          </label>
        </div>
      </div>
      <div class="modal-foot">
        <div style="flex:1"></div>
        <button class="btn btn-ghost" data-close-modal>Cancel</button>
        <button class="btn btn-accent" id="att-save-btn">Save Attendance</button>
      </div>
    </div>`);

  $('#att-save-btn').addEventListener('click', () => {
    const studentName = $('#att-student').value;
    const date = $('#att-date').value || todayISO();
    const time = $('#att-time').value;
    const duration = parseInt($('#att-dur').value, 10) || 60;
    const status = $('#att-status').value;
    const topic = $('#att-topic').value.trim();
    const notes = $('#att-notes').value.trim();
    const autoBill = $('#att-auto-bill').checked;

    const matchedStudent = students.find(s => s.name === studentName);
    const rate = matchedStudent?.rate || 35;
    const currency = matchedStudent?.currency || 'USD';
    const billedAmount = Math.round((rate * (duration / 60)) * 100) / 100;

    captureUndo('Save attendance');
    if (!Array.isArray(state.attendance)) state.attendance = [];

    if (isEdit) {
      Object.assign(record, { studentName, studentId: matchedStudent?.id, date, time, duration, status, topic, notes, billed: autoBill, rate: billedAmount, currency, updatedAt: Date.now() });
    } else {
      state.attendance.unshift({
        id: uid(),
        studentName,
        studentId: matchedStudent?.id,
        date,
        time,
        duration,
        status,
        topic,
        notes,
        billed: autoBill,
        rate: billedAmount,
        currency,
        createdAt: Date.now()
      });
    }

    if (autoBill && (!isEdit || !record?.financeLogged)) {
      if (!Array.isArray(state.income)) state.income = [];
      state.income.push({
        id: uid(),
        amount: billedAmount,
        currency,
        type: 'ESL Lesson',
        student: studentName,
        studentId: matchedStudent?.id,
        date,
        description: `Lesson fee: ${topic || 'Tutoring session'} (${duration}m)`,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      logActivity('finance.income', `💰 ${currency === 'TRY' ? '₺' : '$'}${billedAmount} for ${studentName} (${topic || 'Lesson'})`, 'finance');
    }

    save();
    closeModal();
    if (currentView() === 'students') renderStudents();
    toast(`Attendance logged for ${studentName} ✅`);
  });
}

/* ============ Assignment Modal ============ */
function openAssignmentModal(assignment, presetStudent) {
  const students = getStudentsList();
  const isEdit = !!assignment;
  const a = assignment || {
    studentName: presetStudent || (students[0]?.name || ''),
    title: '',
    description: '',
    assignedDate: todayISO(),
    dueDate: isoDate(shiftDays(3)),
    status: 'assigned',
    scoreType: 'ielts_band',
    score: '',
    feedback: '',
    tags: ['Homework']
  };

  const studentOpts = students.length
    ? students.map(s => `<option value="${esc(s.name)}" ${s.name === a.studentName ? 'selected' : ''}>🎓 ${esc(s.name)}</option>`).join('')
    : '<option value="General Student">General Student</option>';

  openModal(`
    <div class="modal">
      <div class="modal-head">
        <h3>📋 ${isEdit ? 'Edit Assignment' : 'Assign Homework / Task'}</h3>
        <button class="btn-icon" data-close-modal>${ic('x', 16)}</button>
      </div>
      <div class="modal-body">
        <div class="field">
          <label for="as-student" class="field-label">Student *</label>
          <select id="as-student">${studentOpts}</select>
        </div>
        <div class="field">
          <label for="as-title" class="field-label">Assignment Title *</label>
          <input id="as-title" type="text" value="${esc(a.title || '')}" placeholder="e.g. Cambridge IELTS 18 Essay Task 2, Phrasal Verbs Quiz…" autofocus>
        </div>
        <div class="field-row">
          <div class="field"><label for="as-assigned" class="field-label">Assigned Date</label><input id="as-assigned" type="date" value="${a.assignedDate || todayISO()}"></div>
          <div class="field"><label for="as-due" class="field-label">Due Date</label><input id="as-due" type="date" value="${a.dueDate || ''}"></div>
        </div>
        <div class="field">
          <label for="as-desc" class="field-label">Instructions &amp; Prompts</label>
          <textarea id="as-desc" rows="3" placeholder="Write 250 words answering the prompt. Focus on formal transitions and vocabulary precision…">${esc(a.description || '')}</textarea>
        </div>
        <div class="field-row">
          <div class="field"><label for="as-scoretype" class="field-label">Evaluation Metric</label>
            <select id="as-scoretype">
              <option value="ielts_band" ${a.scoreType === 'ielts_band' ? 'selected' : ''}>IELTS Band Score (0-9)</option>
              <option value="percentage" ${a.scoreType === 'percentage' ? 'selected' : ''}>Percentage (0-100%)</option>
              <option value="letter" ${a.scoreType === 'letter' ? 'selected' : ''}>Letter Grade (A-F)</option>
              <option value="pass_fail" ${a.scoreType === 'pass_fail' ? 'selected' : ''}>Pass / Needs Revision</option>
            </select>
          </div>
          <div class="field"><label for="as-tags" class="field-label">Tags</label><input id="as-tags" type="text" value="${esc((a.tags || []).join(', '))}" placeholder="Writing, Speaking, Grammar"></div>
        </div>
        <div class="field" style="margin-top:10px">
          <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer">
            <input id="as-create-task" type="checkbox" ${!isEdit ? 'checked' : ''}>
            <span>✅ Create linked review task on Tasks board</span>
          </label>
        </div>
      </div>
      <div class="modal-foot">
        <div style="flex:1"></div>
        <button class="btn btn-ghost" data-close-modal>Cancel</button>
        <button class="btn btn-accent" id="as-save-btn">Save Assignment</button>
      </div>
    </div>`);

  $('#as-save-btn').addEventListener('click', () => {
    const title = $('#as-title').value.trim();
    if (!title) { toast('Please enter an assignment title', 'error'); $('#as-title').focus(); return; }
    const studentName = $('#as-student').value;
    const assignedDate = $('#as-assigned').value || todayISO();
    const dueDate = $('#as-due').value;
    const description = $('#as-desc').value.trim();
    const scoreType = $('#as-scoretype').value;
    const tags = $('#as-tags').value.split(',').map(x => x.trim()).filter(Boolean);
    const createTask = $('#as-create-task')?.checked;
    const _asStudentId = (getStudentsList().find(s => s.name === studentName) || {}).id;

    captureUndo('Save assignment');
    if (!Array.isArray(state.assignments)) state.assignments = [];

    const assignId = isEdit ? assignment.id : uid();
    if (isEdit) {
      Object.assign(assignment, { studentName, studentId: _asStudentId, title, assignedDate, dueDate, description, scoreType, tags, updatedAt: Date.now() });
    } else {
      state.assignments.unshift({
        id: assignId,
        studentName,
        studentId: _asStudentId,
        title,
        assignedDate,
        dueDate,
        description,
        scoreType,
        tags,
        status: 'assigned',
        score: '',
        feedback: '',
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      if (createTask) {
        if (!Array.isArray(state.tasks)) state.tasks = [];
        state.tasks.unshift({
          id: uid(),
          title: `Grade HW: ${title}`,
          desc: `Homework for ${studentName}. Due: ${dueDate || 'Flexible'}.${description ? '\n' + description : ''}`,
          status: 'today',
          priority: 'med',
          due: dueDate || todayISO(),
          tags: ['Homework', studentName],
          student: studentName,
          studentId: _asStudentId,
          assignmentId: assignId,
          subtasks: [
            { text: 'Check student submission', done: false, id: uid() },
            { text: 'Grade & provide feedback', done: false, id: uid() }
          ],
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }
    }

    save();
    closeModal();
    if (currentView() === 'students') renderStudents();
    toast(`Assignment "${title}" assigned to ${studentName} 📋`);
  });
}

function openAssignmentGradingModal(assignment) {
  openModal(`
    <div class="modal">
      <div class="modal-head">
        <div>
          <h3 style="margin:0">📝 Grade &amp; Review Homework</h3>
          <span class="muted" style="font-size:12px">Student: <b>${esc(assignment.studentName)}</b> · ${esc(assignment.title)}</span>
        </div>
        <button class="btn-icon" data-close-modal>${ic('x', 16)}</button>
      </div>
      <div class="modal-body">
        <div class="field-row">
          <div class="field" style="flex:1">
            <label for="gr-status" class="field-label">Submission Status</label>
            <select id="gr-status">
              <option value="assigned" ${assignment.status === 'assigned' ? 'selected' : ''}>Assigned</option>
              <option value="submitted" ${assignment.status === 'submitted' ? 'selected' : ''}>Submitted by Student</option>
              <option value="reviewed" ${assignment.status === 'reviewed' ? 'selected' : ''}>Reviewed &amp; Graded</option>
              <option value="completed" ${assignment.status === 'completed' ? 'selected' : ''}>Completed ✅</option>
            </select>
          </div>
          <div class="field" style="flex:1">
            <label for="gr-score" class="field-label">Grade / Score</label>
            <input id="gr-score" type="text" value="${esc(assignment.score || '')}" placeholder="e.g. Band 7.5, 92%, A+">
          </div>
        </div>
        <div class="field">
          <label for="gr-feedback" class="field-label">Teacher Feedback &amp; Action Items</label>
          <textarea id="gr-feedback" rows="4" placeholder="Excellent coherence and task response. Minor errors in article usage in paragraph 2…">${esc(assignment.feedback || '')}</textarea>
        </div>
      </div>
      <div class="modal-foot">
        <div style="flex:1"></div>
        <button class="btn btn-ghost" data-close-modal>Cancel</button>
        <button class="btn btn-accent" id="gr-save-btn">Save Evaluation</button>
      </div>
    </div>`);

  $('#gr-save-btn').addEventListener('click', () => {
    const newStatus = $('#gr-status').value;
    assignment.status = newStatus;
    assignment.score = $('#gr-score').value.trim();
    assignment.feedback = $('#gr-feedback').value.trim();
    assignment.updatedAt = Date.now();

    if (newStatus === 'completed' || newStatus === 'reviewed') {
      const linkedTask = (state.tasks || []).find(t => t.assignmentId === assignment.id || (t.student === assignment.studentName && t.title.includes(assignment.title)));
      if (linkedTask && linkedTask.status !== 'done') {
        linkedTask.status = 'done';
        linkedTask.completedAt = todayISO();
        linkedTask.updatedAt = Date.now();
        (linkedTask.subtasks || []).forEach(s => s.done = true);
      }
    }

    save();
    closeModal();
    if (currentView() === 'students') renderStudents();
    toast(`Evaluation saved for ${assignment.studentName} ⭐`);
  });
}

/* ============ Lesson Planning Workstation ============ */
const LESSON_TEMPLATES = [
  {
    name: '🎯 IELTS Speaking Parts 2 & 3 Drill',
    level: 'IELTS Band 7.0+',
    duration: 60,
    objective: 'Develop high-level fluency, lexical range, and structured 2-minute cue card responses without hesitation.',
    warmUp: '5-min fluency drill: rapid 30-sec impromptu responses on random modern topics.',
    mainActivity: 'Targeted cue card preparation (1 min prep, 2 min speech) with immediate phonetic and grammatical correction.',
    wrapUpHomework: 'Record a 2-minute response to IELTS Cambridge 18 Cue Card #3 and upload for evaluation.'
  },
  {
    name: '✍️ Academic Essay Writing & Cohesion',
    level: 'Advanced / TOEFL / IELTS',
    duration: 60,
    objective: 'Master logical paragraph sequencing, counter-argument refutations, and formal academic vocabulary.',
    warmUp: 'Review 3 sample thesis statements and identify clarity and grammatical flaws.',
    mainActivity: 'Co-construct an IELTS Task 2 essay outline focusing on topic sentences and inversion structures.',
    wrapUpHomework: 'Write a full 250-word essay following the structured template developed in class.'
  },
  {
    name: '🗣️ Conversational Idioms & Natural Fluency',
    level: 'Intermediate / B2',
    duration: 60,
    objective: 'Integrate 8 modern conversational phrasal verbs and idioms into spontaneous dialogues.',
    warmUp: 'Guess the idiom from contextual dialogues and comic strip prompts.',
    mainActivity: 'Simulated debate / workplace conversation requiring immediate usage of target idioms.',
    wrapUpHomework: 'Write a short 10-line dialogue using at least 5 new idioms introduced today.'
  }
];

function openLessonPlanModal(plan, presetStudent) {
  const students = getStudentsList();
  const isEdit = !!plan;
  const p = plan || {
    studentName: presetStudent || (students[0]?.name || 'All Students'),
    title: '',
    level: 'General ESL',
    date: todayISO(),
    duration: 60,
    status: 'planned',
    objective: '',
    warmUp: '',
    mainActivity: '',
    wrapUpHomework: '',
    materials: '',
    tags: ['Curriculum']
  };

  const studentOpts = `
    <option value="All Students" ${p.studentName === 'All Students' ? 'selected' : ''}>👥 All Students / Group</option>
    ${students.map(s => `<option value="${esc(s.name)}" ${s.name === p.studentName ? 'selected' : ''}>🎓 ${esc(s.name)}</option>`).join('')}`;

  openModal(`
    <div class="modal" style="max-width:680px">
      <div class="modal-head">
        <h3>📖 ${isEdit ? 'Edit Lesson Plan' : 'Create Structured Lesson Plan'}</h3>
        <button class="btn-icon" data-close-modal>${ic('x', 16)}</button>
      </div>
      <div class="modal-body">
        <div class="field" style="background:var(--surface2);padding:10px;border-radius:8px">
          <label class="field-label" style="margin-bottom:6px">⚡ Load Curriculum Template</label>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            ${LESSON_TEMPLATES.map((tpl, i) => `<button class="btn btn-sm btn-ghost lp-tpl-load" data-idx="${i}" type="button">${tpl.name}</button>`).join('')}
          </div>
        </div>

        <div class="field-row">
          <div class="field" style="flex:2">
            <label for="lp-student" class="field-label">Target Student / Class</label>
            <select id="lp-student">${studentOpts}</select>
          </div>
          <div class="field" style="flex:1">
            <label for="lp-level" class="field-label">Level</label>
            <input id="lp-level" type="text" value="${esc(p.level || 'General')}">
          </div>
        </div>

        <div class="field">
          <label for="lp-title" class="field-label">Lesson Title *</label>
          <input id="lp-title" type="text" value="${esc(p.title || '')}" placeholder="e.g. Inverted Conditionals &amp; Formal Cohesion" autofocus>
        </div>

        <div class="field-row">
          <div class="field"><label for="lp-date" class="field-label">Scheduled Date</label><input id="lp-date" type="date" value="${p.date || todayISO()}"></div>
          <div class="field"><label for="lp-dur" class="field-label">Duration (mins)</label><input id="lp-dur" type="number" value="${p.duration || 60}"></div>
          <div class="field"><label for="lp-status" class="field-label">Status</label>
            <select id="lp-status">
              <option value="planned" ${p.status === 'planned' ? 'selected' : ''}>Planned</option>
              <option value="delivered" ${p.status === 'delivered' ? 'selected' : ''}>Delivered ✅</option>
              <option value="draft" ${p.status === 'draft' ? 'selected' : ''}>Draft</option>
            </select>
          </div>
        </div>

        <div class="field">
          <label for="lp-obj" class="field-label">🎯 Key Learning Objective</label>
          <textarea id="lp-obj" rows="2" placeholder="Student will be able to…">${esc(p.objective || '')}</textarea>
        </div>

        <div class="field">
          <label for="lp-warmup" class="field-label">⏱️ Warm-up &amp; Hook (5-10 mins)</label>
          <textarea id="lp-warmup" rows="2" placeholder="Quick review, diagnostic prompt, icebreaker…">${esc(p.warmUp || '')}</textarea>
        </div>

        <div class="field">
          <label for="lp-main" class="field-label">💡 Main Guided Lesson &amp; Activities (25-30 mins)</label>
          <textarea id="lp-main" rows="3" placeholder="Step-by-step instructional stages, drills, simulations…">${esc(p.mainActivity || '')}</textarea>
        </div>

        <div class="field">
          <label for="lp-wrapup" class="field-label">📦 Wrap-up &amp; Homework Assignment (10 mins)</label>
          <textarea id="lp-wrapup" rows="2" placeholder="Exit ticket, homework assignment, reflection…">${esc(p.wrapUpHomework || '')}</textarea>
        </div>
      </div>
      <div class="modal-foot">
        <div style="flex:1"></div>
        <button class="btn btn-ghost" data-close-modal>Cancel</button>
        <button class="btn btn-accent" id="lp-save-btn">Save Lesson Plan</button>
      </div>
    </div>`);

  $$('.lp-tpl-load').forEach(b => b.addEventListener('click', () => {
    const tpl = LESSON_TEMPLATES[parseInt(b.dataset.idx, 10)];
    if (tpl) {
      $('#lp-title').value = tpl.name;
      $('#lp-level').value = tpl.level;
      $('#lp-dur').value = tpl.duration;
      $('#lp-obj').value = tpl.objective;
      $('#lp-warmup').value = tpl.warmUp;
      $('#lp-main').value = tpl.mainActivity;
      $('#lp-wrapup').value = tpl.wrapUpHomework;
      toast(`Loaded template: ${tpl.name}`);
    }
  }));

  $('#lp-save-btn').addEventListener('click', () => {
    const title = $('#lp-title').value.trim();
    if (!title) { toast('Please enter a lesson title', 'error'); $('#lp-title').focus(); return; }
    const studentName = $('#lp-student').value;
    const level = $('#lp-level').value.trim();
    const date = $('#lp-date').value || todayISO();
    const duration = parseInt($('#lp-dur').value, 10) || 60;
    const status = $('#lp-status').value;
    const objective = $('#lp-obj').value.trim();
    const warmUp = $('#lp-warmup').value.trim();
    const mainActivity = $('#lp-main').value.trim();
    const wrapUpHomework = $('#lp-wrapup').value.trim();

    captureUndo('Save lesson plan');
    if (!Array.isArray(state.lessonPlans)) state.lessonPlans = [];

    if (isEdit) {
      Object.assign(plan, { studentName, title, level, date, duration, status, objective, warmUp, mainActivity, wrapUpHomework, updatedAt: Date.now() });
    } else {
      state.lessonPlans.unshift({
        id: uid(),
        studentName,
        title,
        level,
        date,
        duration,
        status,
        objective,
        warmUp,
        mainActivity,
        wrapUpHomework,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }

    save();
    closeModal();
    if (currentView() === 'students') renderStudents();
    toast(`Lesson plan "${title}" saved 📖`);
  });
}

function deliverLessonPlan(planId) {
  const plan = (state.lessonPlans || []).find(p => p.id === planId);
  if (!plan) return;

  openModal(`
    <div class="modal">
      <div class="modal-head">
        <h3>🚀 Deliver Lesson: ${esc(plan.title)}</h3>
        <button class="btn-icon" data-close-modal>${ic('x', 16)}</button>
      </div>
      <div class="modal-body">
        <p style="font-size:13px;line-height:1.5;margin-top:0">
          Mark this lesson as delivered and automatically execute the follow-up teacher workflow for <b>${esc(plan.studentName)}</b>.
        </p>

        <div style="display:flex;flex-direction:column;gap:10px;background:var(--surface2);padding:14px;border-radius:10px;margin-top:10px">
          <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer">
            <input type="checkbox" id="del-mark-att" checked>
            <span>📅 Create Attendance Record (Present, ${plan.duration || 60}m)</span>
          </label>
          <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer">
            <input type="checkbox" id="del-log-fin" checked>
            <span>💰 Log Lesson Fee in Finance Ledger</span>
          </label>
          ${plan.wrapUpHomework ? `
            <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer">
              <input type="checkbox" id="del-create-hw" checked>
              <span>📋 Assign Wrap-up Homework: "<b>${esc(plan.wrapUpHomework.slice(0, 45))}…</b>"</span>
            </label>` : ''}
        </div>
      </div>
      <div class="modal-foot">
        <div style="flex:1"></div>
        <button class="btn btn-ghost" data-close-modal>Cancel</button>
        <button class="btn btn-accent" id="del-execute-btn">Confirm Delivery ✅</button>
      </div>
    </div>`);

  $('#del-execute-btn').addEventListener('click', () => {
    plan.status = 'delivered';
    plan.deliveredAt = Date.now();
    const markAtt = $('#del-mark-att')?.checked;
    const logFin = $('#del-log-fin')?.checked;
    const createHw = $('#del-create-hw')?.checked;
    const matchedStudent = getStudentsList().find(s => s.name === plan.studentName);
    const rate = matchedStudent?.rate || 35;
    const currency = matchedStudent?.currency || 'USD';
    const amount = Math.round((rate * ((plan.duration || 60) / 60)) * 100) / 100;

    if (markAtt && plan.studentName !== 'All Students') {
      if (!Array.isArray(state.attendance)) state.attendance = [];
      state.attendance.unshift({
        id: uid(),
        studentName: plan.studentName,
        studentId: matchedStudent?.id,
        date: todayISO(),
        time: new Date().toTimeString().slice(0, 5),
        duration: plan.duration || 60,
        status: 'present',
        topic: plan.title,
        notes: plan.objective,
        billed: logFin,
        rate: amount,
        currency,
        createdAt: Date.now()
      });
    }

    if (logFin && plan.studentName !== 'All Students') {
      if (!Array.isArray(state.income)) state.income = [];
      state.income.push({
        id: uid(),
        amount,
        currency,
        type: 'ESL Lesson',
        student: plan.studentName,
        studentId: matchedStudent?.id,
        date: todayISO(),
        description: `Delivered lesson: ${plan.title}`,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      logActivity('finance.income', `💰 ${currency === 'TRY' ? '₺' : '$'}${amount} for ${plan.studentName} (${plan.title})`, 'finance');
    }

    if (createHw && plan.wrapUpHomework && plan.studentName !== 'All Students') {
      if (!Array.isArray(state.assignments)) state.assignments = [];
      state.assignments.unshift({
        id: uid(),
        studentName: plan.studentName,
        studentId: matchedStudent?.id,
        title: `Homework: ${plan.title}`,
        description: plan.wrapUpHomework,
        assignedDate: todayISO(),
        dueDate: isoDate(shiftDays(3)),
        status: 'assigned',
        scoreType: 'ielts_band',
        tags: ['Homework'],
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }

    save();
    closeModal();
    if (currentView() === 'students') renderStudents();
    toast(`Lesson "${plan.title}" marked as Delivered! 🎓✅`);
  });
}

function openStudentDossier(studentId) {
  const students = getStudentsList();
  const s = students.find(x => x.id === studentId || x.name === studentId);
  if (!s) return;

  const inc = (state.income || []).filter(e => e.studentId ? e.studentId === s.id : (e.student === s.name || e.student === s.id));
  const expInc = (state.expectedIncome || []).filter(e => e.studentId ? e.studentId === s.id : (e.student === s.name || e.student === s.id));
  const linkedGoals = (state.goals || []).filter(g => (g.linkedStudentIds || []).includes(s.id));
  const studentTasks = (state.tasks || []).filter(t => t.student === s.name);
  const studentNotes = (state.notes || []).filter(n => n.student === s.name);
  const studentAttendance = (state.attendance || []).filter(a => a.studentName === s.name || a.studentId === s.id);
  const studentAssignments = (state.assignments || []).filter(a => a.studentName === s.name || a.studentId === s.id);
  const studentPlans = (state.lessonPlans || []).filter(p => p.studentName === s.name || p.studentId === s.id);

  const usdPaid = inc.filter(e => (e.currency || 'USD') === 'USD').reduce((sum, e) => sum + (e.amount || 0), 0);
  const tryPaid = inc.filter(e => e.currency === 'TRY').reduce((sum, e) => sum + (e.amount || 0), 0);
  const currSym = s.currency === 'TRY' ? '₺' : '$';
  let activeTab = 'overview';

  function renderDossierBody() {
    let content = '';
    if (activeTab === 'overview') {
      content = `
        <div class="student-dossier-grid">
          <div class="card" style="padding:14px">
            <h4 style="margin:0 0 10px;font-size:13px;color:var(--muted)">👤 STUDENT PROFILE</h4>
            <div style="display:flex;flex-direction:column;gap:8px;font-size:13px">
              <div><span class="muted">Level / Subject:</span> <b>${esc(s.level || 'General ESL')}</b></div>
              <div><span class="muted">Hourly Rate:</span> <b>${currSym}${s.rate ? s.rate.toLocaleString() : '35'} / hr</b></div>
              <div><span class="muted">Preferred Currency:</span> <b>${s.currency === 'TRY' ? '₺ TRY (Turkish Lira)' : '$ USD (US Dollar)'}</b></div>
              <div><span class="muted">Status:</span> <span class="badge" style="text-transform:capitalize">${s.status || 'active'}</span></div>
              <div><span class="muted">Email:</span> ${s.email ? `<a href="mailto:${window.LumenLib.helpers.safeAttr(s.email)}">${esc(s.email)}</a>` : '<span class="muted">Not set</span>'}</div>
              <div><span class="muted">Phone:</span> ${s.phone ? `<b>${esc(s.phone)}</b>` : '<span class="muted">Not set</span>'}</div>
            </div>
          </div>
          <div class="card" style="padding:14px">
            <h4 style="margin:0 0 10px;font-size:13px;color:var(--muted)">💰 FINANCIAL &amp; ATTENDANCE METRICS</h4>
            <div style="display:flex;flex-direction:column;gap:8px;font-size:13px">
              <div><span class="muted">Total Lessons Logged:</span> <b>${inc.length} payments</b></div>
              <div><span class="muted">Sessions Attended:</span> <b>${studentAttendance.length} sessions</b></div>
              <div><span class="muted">Total USD Paid:</span> <b style="color:#34d399">$${usdPaid.toLocaleString()}</b></div>
              <div><span class="muted">Total TRY Paid:</span> <b style="color:#518DBF">₺${tryPaid.toLocaleString()}</b></div>
            </div>
            <button class="btn btn-sm btn-accent" id="dossier-fin-add" style="margin-top:10px">${ic('plus', 13)} Log income for ${esc(s.name)}</button>
          </div>
        </div>

        ${linkedGoals.length ? `<div class="card" style="margin-top:14px;padding:14px">
          <h4 style="margin:0 0 8px;font-size:13px;color:var(--muted)">🎯 LINKED GOALS</h4>
          <div class="dossier-goals">
            ${linkedGoals.map(g => `<span class="chip chip-student">🎯 ${esc(g.title)} · ${goalProgress(g)}%</span>`).join('')}
          </div>
        </div>` : ''}
        ${(() => {
          const vRes = (state.vaultItems||[]).filter(v=> (v.linkedStudentIds||[]).includes(s.id));
          if (!vRes.length) return '';
          return `<div class="card" style="margin-top:14px;padding:14px">
            <h4 style="margin:0 0 8px;font-size:13px;color:var(--muted)">🔐 LINKED RESOURCES</h4>
            <div style="display:flex;flex-wrap:wrap;gap:6px">${vRes.map(v=> `<span class="chip chip-student" style="cursor:pointer" data-vault-res="${v.id}">${vaultTypeIcon(v.type)} ${esc(v.title)}</span>`).join('')}</div>
          </div>`;
        })()}

        ${s.goals ? `
          <div class="card" style="margin-top:14px;padding:14px">
            <h4 style="margin:0 0 6px;font-size:13px;color:var(--muted)">🎯 LEARNING GOALS &amp; TARGETS</h4>
            <p style="margin:0;font-size:13.5px;line-height:1.5">${esc(s.goals)}</p>
          </div>` : ''}

        ${s.notes ? `
          <div class="card" style="margin-top:14px;padding:14px">
            <h4 style="margin:0 0 6px;font-size:13px;color:var(--muted)">📝 TEACHER DIAGNOSTIC &amp; LESSON NOTES</h4>
            <p style="margin:0;font-size:13.5px;line-height:1.5;color:var(--text)">${esc(s.notes)}</p>
          </div>` : ''}

        <div style="display:flex;gap:8px;margin-top:18px;flex-wrap:wrap">
          <button class="btn btn-accent" id="dossier-mark-att">📅 Mark Attendance</button>
          <button class="btn" id="dossier-assign-hw">📋 Assign HW</button>
          <button class="btn btn-ghost" id="dossier-new-plan">📖 New Lesson Plan</button>
          <button class="btn btn-ghost" id="dossier-log-income">💰 Log Payment</button>
          <button class="btn btn-ghost" id="dossier-edit-profile">⚙️ Edit Profile</button>
        </div>`;
    } else if (activeTab === 'attendance') {
      content = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div><b>Attendance Timeline</b> (${studentAttendance.length} sessions)</div>
          <button class="btn btn-sm btn-accent" id="dossier-att-add">+ Mark Attendance</button>
        </div>
        ${studentAttendance.length ? `
          <div style="overflow-x:auto"><table class="fin-tx-table">
            <thead><tr><th scope="col">Date</th><th scope="col">Status</th><th scope="col">Duration</th><th scope="col">Topic Covered</th></tr></thead>
            <tbody>${studentAttendance.map(a => `
              <tr>
                <td><b>${a.date}</b></td>
                <td><span class="att-status-badge ${a.status}">${a.status}</span></td>
                <td>${a.duration || 60}m</td>
                <td>${esc(a.topic || 'General Lesson')}</td>
              </tr>`).join('')}
            </tbody>
          </table></div>` : '<div class="muted" style="padding:20px;text-align:center">No attendance logged yet for this student.</div>'}`;
    } else if (activeTab === 'assignments') {
      content = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div><b>Assignments &amp; Homework</b> (${studentAssignments.length} items)</div>
          <button class="btn btn-sm btn-accent" id="dossier-assign-add">+ Assign Homework</button>
        </div>
        ${studentAssignments.length ? `
          <div style="display:flex;flex-direction:column;gap:8px">${studentAssignments.map(a => `
            <div class="assignment-card" style="padding:12px 14px">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <b>📋 ${esc(a.title)}</b>
                <span class="badge">${a.status}</span>
              </div>
              ${a.description ? `<p style="margin:4px 0;font-size:12px">${esc(a.description)}</p>` : ''}
              <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px">
                <span class="muted">Due: <b>${a.dueDate || 'Flexible'}</b></span>
                ${a.score ? `<span class="assignment-grade-badge">⭐ ${esc(a.score)}</span>` : ''}
              </div>
            </div>`).join('')}</div>` : '<div class="muted" style="padding:20px;text-align:center">No assignments assigned to this student.</div>'}`;
    } else if (activeTab === 'financials') {
      content = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div><b>Payments Ledger</b> (${inc.length} transactions)</div>
          <button class="btn btn-sm btn-accent" id="dossier-fin-add">${ic('plus', 13)} Log Payment</button>
        </div>
        ${inc.length ? `
          <div style="overflow-x:auto"><table class="fin-tx-table">
            <thead><tr><th scope="col">Date</th><th scope="col">Type</th><th scope="col">Description</th><th scope="col">Amount</th></tr></thead>
            <tbody>${inc.map(e => `
              <tr class="fin-tx-row inc">
                <td>${e.date || '—'}</td>
                <td><b>${esc(e.type || 'Lesson')}</b></td>
                <td>${esc(e.description || '—')}</td>
                <td class="fin-tx-amt fin-pos">+${fmtM(e.amount, e.currency || 'USD')}</td>
              </tr>`).join('')}
            </tbody>
          </table></div>` : '<div class="muted" style="padding:20px;text-align:center">No payments logged yet for this student.</div>'}`;
    } else if (activeTab === 'tasks') {
      content = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div><b>Assigned Tasks &amp; Tasks</b> (${studentTasks.length} tasks)</div>
          <button class="btn btn-sm btn-accent" id="dossier-task-add">${ic('plus', 13)} Assign Task</button>
        </div>
        ${studentTasks.length ? `<div style="display:flex;flex-direction:column;gap:8px">${studentTasks.map(t => `
          <div class="task-card" style="padding:10px 14px">
            <div style="display:flex;align-items:center;gap:10px">
              <button class="check-circle ${t.status === 'done' ? 'done' : ''}" data-dossier-task-check="${t.id}">${ic('check', 12)}</button>
              <div style="flex:1">
                <div style="font-weight:600;font-size:13.5px;text-decoration:${t.status === 'done' ? 'line-through' : 'none'}">${esc(t.title)}</div>
                ${t.desc ? `<div class="muted" style="font-size:12px">${esc(t.desc)}</div>` : ''}
              </div>
              <span class="badge ${PRIOS[t.priority]?.cls || ''}">${PRIOS[t.priority]?.label || 'Med'}</span>
            </div>
          </div>`).join('')}</div>` : '<div class="muted" style="padding:20px;text-align:center">No tasks assigned to this student.</div>'}`;
    } else if (activeTab === 'notes') {
      content = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div><b>Lesson Notes &amp; Evaluations</b> (${studentNotes.length} notes)</div>
          <button class="btn btn-sm btn-accent" id="dossier-note-add">${ic('plus', 13)} New Lesson Note</button>
        </div>
        ${studentNotes.length ? `<div style="display:flex;flex-direction:column;gap:10px">${studentNotes.map(n => `
          <div class="card" style="padding:12px 14px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
              <b>📝 ${esc(n.title || 'Untitled Note')}</b>
              <span class="muted" style="font-size:11.5px">${new Date(n.updatedAt || Date.now()).toLocaleDateString()}</span>
            </div>
            <div style="font-size:13px;line-height:1.4;color:var(--text)">${renderMd((n.content || '').slice(0, 240) + ((n.content || '').length > 240 ? '…' : ''))}</div>
          </div>`).join('')}</div>` : '<div class="muted" style="padding:20px;text-align:center">No notes found for this student.</div>'}`;
    } else if (activeTab === 'plans') {
      content = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div><b>Lesson Plans for ${esc(s.name)}</b> (${studentPlans.length} plans)</div>
          <button class="btn btn-sm btn-accent" id="dossier-plan-add">+ Create Lesson Plan</button>
        </div>
        ${studentPlans.length ? `
          <div style="display:flex;flex-direction:column;gap:10px">${studentPlans.map(p => `
            <div class="lesson-stage-block" style="padding:12px;background:var(--surface)">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                <b>📖 ${esc(p.title)}</b>
                <span class="badge" style="text-transform:capitalize">${p.status || 'planned'}</span>
              </div>
              <div class="muted" style="font-size:12px;margin-bottom:6px">📅 ${p.date || 'Flexible'} · ⏱️ ${p.duration || 60} mins · Level: ${esc(p.level || 'General')}</div>
              ${p.objective ? `<div style="font-size:12.5px;margin-bottom:6px">🎯 <b>Objective:</b> ${esc(p.objective)}</div>` : ''}
              ${p.mainActivity ? `<div style="font-size:12px;color:var(--text);margin-bottom:6px"><b>Activity:</b> ${esc(p.mainActivity.slice(0, 100))}${p.mainActivity.length > 100 ? '…' : ''}</div>` : ''}
              <div style="display:flex;gap:6px;margin-top:8px">
                <button class="btn btn-sm btn-accent dossier-plan-deliver" data-id="${p.id}">${p.status === 'delivered' ? '✅ Re-deliver' : '🚀 Deliver Lesson'}</button>
              </div>
            </div>`).join('')}</div>` : '<div class="muted" style="padding:20px;text-align:center">No lesson plans created specifically for this student.</div>'}`;
    }

    const container = $('#student-dossier-content');
    if (container) {
      container.innerHTML = content;
      bindDossierContentEvents();
    }
  }

  function bindDossierContentEvents() {
    $$('[data-vault-res]').forEach(b=> b.addEventListener('click', ()=>{ const v=state.vaultItems.find(x=>x.id===b.dataset.vaultRes); if(v) { closeModal(); openVaultModal(v);} }));
    $('#dossier-mark-att')?.addEventListener('click', () => { closeModal(); openAttendanceModal(null, s.name); });
    $('#dossier-att-add')?.addEventListener('click', () => { closeModal(); openAttendanceModal(null, s.name); });
    $('#dossier-assign-hw')?.addEventListener('click', () => { closeModal(); openAssignmentModal(null, s.name); });
    $('#dossier-assign-add')?.addEventListener('click', () => { closeModal(); openAssignmentModal(null, s.name); });
    $('#dossier-new-plan')?.addEventListener('click', () => { closeModal(); openLessonPlanModal(null, s.name); });
    $('#dossier-plan-add')?.addEventListener('click', () => { closeModal(); openLessonPlanModal(null, s.name); });
    $$('.dossier-plan-deliver').forEach(b => b.addEventListener('click', () => { closeModal(); deliverLessonPlan(b.dataset.id); }));
    $('#dossier-log-income')?.addEventListener('click', () => {
      closeModal();
      openFinanceModal('income');
      setTimeout(() => {
        if ($('#fin-student')) $('#fin-student').value = s.name;
        if ($('#fin-curr')) $('#fin-curr').value = s.currency || 'USD';
        if ($('#fin-amt') && s.rate) $('#fin-amt').value = s.rate;
      }, 50);
    });
    $('#dossier-fin-add')?.addEventListener('click', () => {
      closeModal();
      openFinanceModal('income');
      setTimeout(() => {
        if ($('#fin-student')) $('#fin-student').value = s.name;
        if ($('#fin-curr')) $('#fin-curr').value = s.currency || 'USD';
        if ($('#fin-amt') && s.rate) $('#fin-amt').value = s.rate;
      }, 50);
    });
    $('#dossier-edit-profile')?.addEventListener('click', () => { closeModal(); openStudentEditModal(s); });
    $$('[data-dossier-task-check]').forEach(b => b.addEventListener('click', () => {
      const taskId = b.dataset.dossierTaskCheck;
      const t = state.tasks.find(x => x.id === taskId);
      if (t) {
        t.status = t.status === 'done' ? 'today' : 'done';
        t.updatedAt = Date.now();
        save();
        renderDossierBody();
      }
    }));
  }

  openModal(`
    <div class="modal student-dossier-modal">
      <div class="modal-head">
        <div>
          <h3 style="margin:0">🎓 ${esc(s.name)}</h3>
          <span class="muted" style="font-size:12px">${esc(s.level || 'General')} · Rate: ${currSym}${s.rate || 35}/hr</span>
        </div>
        <button class="btn-icon" data-close-modal>${ic('x', 16)}</button>
      </div>
      <div class="modal-body">
        <div class="student-tabs">
          <button class="student-tab-btn active" data-tab="overview">📋 Overview</button>
          <button class="student-tab-btn" data-tab="attendance">📅 Attendance (${studentAttendance.length})</button>
          <button class="student-tab-btn" data-tab="assignments">📋 Homework (${studentAssignments.length})</button>
          <button class="student-tab-btn" data-tab="plans">📖 Plans (${studentPlans.length})</button>
          <button class="student-tab-btn" data-tab="financials">💰 Payments (${inc.length})</button>
          <button class="student-tab-btn" data-tab="tasks">✅ Tasks (${studentTasks.length})</button>
          <button class="student-tab-btn" data-tab="notes">📝 Notes (${studentNotes.length})</button>
        </div>
        <div id="student-dossier-content"></div>
      </div>
      <div class="modal-foot">
        <div style="flex:1"></div>
        <button class="btn btn-accent" data-close-modal>Done</button>
      </div>
    </div>`);

  $$('.student-tab-btn').forEach(tb => tb.addEventListener('click', () => {
    $$('.student-tab-btn').forEach(x => x.classList.remove('active'));
    tb.classList.add('active');
    activeTab = tb.dataset.tab;
    renderDossierBody();
  }));

  renderDossierBody();
}

function openStudentEditModal(student) {
  const isEdit = !!student;
  const s = student || { name: '', level: '', rate: '', currency: 'USD', status: 'active', email: '', phone: '', goals: '', notes: '', tags: [] };

  openModal(`
    <div class="modal">
      <div class="modal-head">
        <h3>${isEdit ? 'Edit Student Profile' : '➕ Add New Student'}</h3>
        <button class="btn-icon" data-close-modal>${ic('x', 16)}</button>
      </div>
      <div class="modal-body">
        <div class="field">
          <label for="se-name" class="field-label">Student / Client Full Name *</label>
          <input id="se-name" type="text" value="${esc(s.name || '')}" placeholder="e.g. Student Full Name…" autofocus>
        </div>
        <div class="field-row">
          <div class="field" style="flex:1">
            <label for="se-level" class="field-label">Level / Subject Course</label>
            <input id="se-level" type="text" value="${esc(s.level || '')}" placeholder="e.g. IELTS Prep, Academic Writing, Business ESL">
          </div>
          <div class="field" style="width:140px">
            <label for="se-status" class="field-label">Status</label>
            <select id="se-status">
              <option value="active" ${s.status === 'active' ? 'selected' : ''}>🟢 Active</option>
              <option value="paused" ${s.status === 'paused' ? 'selected' : ''}>🟡 Paused</option>
              <option value="completed" ${s.status === 'completed' ? 'selected' : ''}>⚪ Completed</option>
            </select>
          </div>
        </div>
        <div class="field-row">
          <div class="field" style="flex:1">
            <label for="se-rate" class="field-label">Hourly Lesson Rate</label>
            <input id="se-rate" type="number" step="1" min="0" value="${s.rate || ''}" placeholder="35">
          </div>
          <div class="field" style="width:140px">
            <label for="se-curr" class="field-label">Currency</label>
            <select id="se-curr">
              <option value="USD" ${(s.currency || 'USD') === 'USD' ? 'selected' : ''}>USD ($)</option>
              <option value="TRY" ${s.currency === 'TRY' ? 'selected' : ''}>TRY (₺)</option>
            </select>
          </div>
        </div>
        <div class="field-row">
          <div class="field"><label for="se-email" class="field-label">Email (optional)</label><input id="se-email" type="email" value="${esc(s.email || '')}" placeholder="student@example.com"></div>
          <div class="field"><label for="se-phone" class="field-label">Phone / WhatsApp (optional)</label><input id="se-phone" type="text" value="${esc(s.phone || '')}" placeholder="+1 555 123 4567"></div>
        </div>
        <div class="field">
          <label for="se-goals" class="field-label">Target Learning Goals</label>
          <textarea id="se-goals" rows="2" placeholder="e.g. Score 7.5 on IELTS Speaking & Writing by November…">${esc(s.goals || '')}</textarea>
        </div>
        <div class="field">
          <label for="se-notes" class="field-label">Teacher Diagnostic &amp; Private Notes</label>
          <textarea id="se-notes" rows="2" placeholder="Strengths, weaknesses, lesson schedule preferences…">${esc(s.notes || '')}</textarea>
        </div>
        <div class="field">
          <label for="se-tags" class="field-label">Tags (comma separated)</label>
          <input id="se-tags" type="text" value="${esc((s.tags || []).join(', '))}" placeholder="IELTS, Speaking, Grammar, TOEFL">
        </div>
      </div>
      <div class="modal-foot">
        ${isEdit ? `<button class="btn btn-danger" id="se-delete">Delete</button>` : ''}
        <div style="flex:1"></div>
        <button class="btn btn-ghost" data-close-modal>Cancel</button>
        <button class="btn btn-accent" id="se-save">Save Student</button>
      </div>
    </div>`);

  $('#se-save').addEventListener('click', () => {
    const name = $('#se-name').value.trim();
    if (!name) { toast('Please enter a student name', 'error'); $('#se-name').focus(); return; }
    const level = $('#se-level').value.trim() || 'General ESL';
    const status = $('#se-status').value;
    const rate = parseFloat($('#se-rate').value) || 0;
    const currency = $('#se-curr').value || 'USD';
    const email = $('#se-email').value.trim();
    const phone = $('#se-phone').value.trim();
    const goals = $('#se-goals').value.trim();
    const notes = $('#se-notes').value.trim();
    const tags = $('#se-tags').value.split(',').map(x => x.trim()).filter(Boolean);

    captureUndo(isEdit ? 'Edit student' : 'Add student');

    if (!Array.isArray(state.students)) state.students = [];

    if (isEdit) {
      const oldName = student.name;
      Object.assign(student, { name, level, status, rate, currency, email, phone, goals, notes, tags, updatedAt: Date.now() });
      if (oldName && oldName !== name) {
        (state.income || []).forEach(e => { if (e.student === oldName) e.student = name; });
        (state.expectedIncome || []).forEach(e => { if (e.student === oldName) e.student = name; });
        (state.tasks || []).forEach(t => { if (t.student === oldName) t.student = name; });
        (state.notes || []).forEach(n => { if (n.student === oldName) n.student = name; });
        (state.attendance || []).forEach(a => { if (a.studentName === oldName) a.studentName = name; });
        (state.assignments || []).forEach(a => { if (a.studentName === oldName) a.studentName = name; });
        (state.lessonPlans || []).forEach(p => { if (p.studentName === oldName) p.studentName = name; });
      }
      logActivity('student.edit', name, 'student');
    } else {
      const newStd = { id: uid(), name, level, status, rate, currency, email, phone, goals, notes, tags, createdAt: Date.now(), updatedAt: Date.now() };
      state.students.push(newStd);
      logActivity('student.create', name, 'student');
    }

    save();
    closeModal();
    if (currentView() === 'students') renderStudents();
    else if (currentView() === 'finance') renderFinance();
    toast(`Student "${name}" ${isEdit ? 'updated' : 'saved'} 🎓`);
  });

  if (isEdit) {
    $('#se-delete')?.addEventListener('click', () => {
      if (!confirm(`Delete student "${student.name}"?`)) return;
      captureUndo('Delete student');
      state.students = state.students.filter(x => x.id !== student.id && x.name !== student.name);
      save();
      closeModal();
      if (currentView() === 'students') renderStudents();
      toast(`Student "${student.name}" deleted`);
    });
  }
}

function openIncomeTypeModal() {
  const types = state.incomeTypes || ['ESL','IELTS','Software'];
  openModal(`
    <div class="modal">
      <div class="modal-head"><h3>Income types</h3><button class="btn-icon" data-close-modal>${ic('x', 16)}</button></div>
      <div class="modal-body">
        <div id="type-list">${types.map((t, i) => `<div class="fin-type-row" data-type-idx="${i}">
          <span class="fin-type-name">${esc(t)}</span>
          <button class="btn-icon fin-type-del" data-del-type="${i}" title="Remove">${ic('trash', 14)}</button>
        </div>`).join('')}</div>
        <div class="field" style="margin-top:12px"><label class="field-label">Add new type</label>
          <div style="display:flex;gap:8px">
            <input id="new-type" type="text" placeholder="e.g. Tutoring, Consulting…" style="flex:1">
            <button class="btn btn-accent btn-sm" id="add-type-btn">${ic('plus',14)} Add</button>
          </div>
        </div>
      </div>
      <div class="modal-foot"><div style="flex:1"></div><button class="btn btn-accent" data-close-modal="finance">Done</button></div>
    </div>`);
  $('#add-type-btn').addEventListener('click', () => {
    const v = $('#new-type').value.trim();
    if (!v) return;
    if (state.incomeTypes.includes(v)) { toast('Type already exists', 'error'); return; }
    captureUndo('Add income type');
    if (!state._incomeTypesMeta) state._incomeTypesMeta = {};
    state.incomeTypes.push(v); state._incomeTypesMeta[v] = Date.now();
    save(); closeModal(); openIncomeTypeModal();
    toast('Type added');
  });
  $$('.fin-type-del').forEach(b => b.addEventListener('click', () => {
    const idx = parseInt(b.dataset.delType, 10);
    const removed = state.incomeTypes[idx];
    captureUndo('Remove income type');
    if (!state._incomeTypesMeta) state._incomeTypesMeta = {};
    if (!syncMeta.tombstones.incomeTypes) syncMeta.tombstones.incomeTypes = {};
    const ts = Date.now();
    if (removed) { state._incomeTypesMeta[removed] = ts; syncMeta.tombstones.incomeTypes[removed] = ts; saveSyncMeta(); }
    state.incomeTypes.splice(idx, 1);
    save(); closeModal(); openIncomeTypeModal();
    toast('Type removed');
  }));
}

function openExpenseCategoryModal() {
  if (!Array.isArray(state.expenseCategories)) {
    state.expenseCategories = ['Rent','Utilities','Food','Transport','Supplies','Software','Marketing','Education','Healthcare','Other'];
  }
  const cats = state.expenseCategories;
  openModal(`
    <div class="modal">
      <div class="modal-head"><h3>Expense categories</h3><button class="btn-icon" data-close-modal>${ic('x', 16)}</button></div>
      <div class="modal-body">
        <div id="type-list">${cats.map((c, i) => `<div class="fin-type-row" data-type-idx="${i}">
          <span class="fin-type-name">${esc(c)}</span>
          <button class="btn-icon fin-cat-del" data-del-cat="${i}" title="Remove">${ic('trash', 14)}</button>
        </div>`).join('')}</div>
        <div class="field" style="margin-top:12px"><label class="field-label">Add new category</label>
          <div style="display:flex;gap:8px">
            <input id="new-cat" type="text" placeholder="e.g. Subscriptions, Travel, Insurance…" style="flex:1">
            <button class="btn btn-accent btn-sm" id="add-cat-btn">${ic('plus',14)} Add</button>
          </div>
        </div>
      </div>
      <div class="modal-foot"><div style="flex:1"></div><button class="btn btn-accent" data-close-modal="finance-if-active">Done</button></div>
    </div>`);
  $('#add-cat-btn').addEventListener('click', () => {
    const v = $('#new-cat').value.trim();
    if (!v) return;
    if (state.expenseCategories.includes(v)) { toast('Category already exists', 'error'); return; }
    captureUndo('Add expense category');
    if (!state._expenseCategoriesMeta) state._expenseCategoriesMeta = {};
    state.expenseCategories.push(v); state._expenseCategoriesMeta[v] = Date.now();
    save(); closeModal(); openExpenseCategoryModal();
    toast('Category added');
  });
  $$('.fin-cat-del').forEach(b => b.addEventListener('click', () => {
    const idx = parseInt(b.dataset.delCat, 10);
    const removed = state.expenseCategories[idx];
    captureUndo('Remove expense category');
    if (!state._expenseCategoriesMeta) state._expenseCategoriesMeta = {};
    if (!syncMeta.tombstones.expenseCategories) syncMeta.tombstones.expenseCategories = {};
    const ts = Date.now();
    if (removed) { state._expenseCategoriesMeta[removed] = ts; syncMeta.tombstones.expenseCategories[removed] = ts; saveSyncMeta(); }
    state.expenseCategories.splice(idx, 1);
    save(); closeModal(); openExpenseCategoryModal();
    toast('Category removed');
  }));
}

/* ============ Offline indicator ============ */
function updateOnlineStatus() {
  let badge = $('#offline-badge');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'offline-badge';
    badge.className = 'offline-badge hidden';
    document.querySelector('.topbar-right')?.prepend(badge);
  }
  let syncBadge = $('#sync-queue-badge');
  if (!syncBadge) {
    syncBadge = document.createElement('div');
    syncBadge.id = 'sync-queue-badge';
    syncBadge.className = 'offline-badge hidden';
    syncBadge.style.background = 'rgba(96,93,255,.18)';
    syncBadge.style.color = 'var(--accent)';
    syncBadge.style.border = '1px solid rgba(96,93,255,.3)';
    document.querySelector('.topbar-right')?.prepend(syncBadge);
  }
  const q = (syncMeta.syncQueue || []).length;
  if (q) {
    syncBadge.classList.remove('hidden');
    syncBadge.textContent = `📤 ${q} queued`;
    syncBadge.title = `${q} offline change${q===1?'':'s'} queued — will sync when online`;
  } else {
    syncBadge.classList.add('hidden');
  }
  if (navigator.onLine) {
    badge.classList.add('hidden');
  } else {
    badge.classList.remove('hidden');
    badge.textContent = '📶 Offline' + (q ? ` · ${q} queued` : '');
  }
  if (_debugVisible) updateDebugOverlay();
}

let perfActiveTab = 'velocity';

/* ============ Performance & Velocity Monitor ============ */
function renderPerf() {
  const stats = perfStats();
  const totalRenders = perfLog.length;
  const totalSlow = perfLog.filter(e => e.slow).length;
  const allMs = perfLog.map(e => e.ms).sort((a, b) => a - b);
  const globalAvg = allMs.length ? (allMs.reduce((s, x) => s + x, 0) / allMs.length).toFixed(1) : '0.0';
  const globalP95 = allMs.length ? allMs[Math.floor(allMs.length * 0.95)] : 0;
  const slowEntries = perfLog.filter(e => e.slow).slice(-20).reverse();
  const viewNames = Object.keys(stats).sort((a, b) => stats[b].p95 - stats[a].p95);
  const maxMs = Math.max(1, ...viewNames.map(v => stats[v].max));

  // --- 14-day Velocity calculation ---
  const velocityDays = [];
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(now.getDate() - i);
    const iso = d.toLocaleDateString('en-CA');
    const label = d.toLocaleDateString(undefined, { weekday: 'narrow', month: 'numeric', day: 'numeric' });
    const count = state.tasks.filter(t => t.completedAt === iso).length;
    velocityDays.push({ iso, label, count });
  }
  const maxVelocity = Math.max(1, ...velocityDays.map(v => v.count));
  const totalDone14d = velocityDays.reduce((s, v) => s + v.count, 0);
  const avgVelocity = (totalDone14d / 14).toFixed(1);

  // SVG Velocity Chart
  const vw = 580, vh = 160, vp = 20, vph = 25;
  const vcw = vw - vp * 2, vch = vh - vph * 2;
  const vxStep = vcw / velocityDays.length;
  const vBarW = vxStep * 0.6;
  const vBarsSVG = velocityDays.map((d, i) => {
    const x = vp + i * vxStep + (vxStep - vBarW) / 2;
    const h = (d.count / maxVelocity) * vch;
    const y = vph + vch - h;
    return `<rect x="${x}" y="${y}" width="${vBarW}" height="${h}" fill="var(--accent)" rx="3" opacity="${d.count ? '1' : '0.2'}"/>
            <text x="${vp + i * vxStep + vxStep / 2}" y="${vh - 4}" text-anchor="middle" fill="var(--muted)" font-size="9">${d.label.split(' ')[0]}</text>
            ${d.count ? `<text x="${vp + i * vxStep + vxStep / 2}" y="${y - 4}" text-anchor="middle" fill="var(--text)" font-size="10" font-weight="700">${d.count}</text>` : ''}`;
  }).join('');

  // Moving average path
  let movingAvgPoints = '';
  for (let i = 0; i < velocityDays.length; i++) {
    const window = velocityDays.slice(Math.max(0, i - 2), i + 1);
    const avg = window.reduce((s, v) => s + v.count, 0) / window.length;
    const x = vp + i * vxStep + vxStep / 2;
    const y = vph + vch - (avg / maxVelocity) * vch;
    movingAvgPoints += `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)} `;
  }

  // --- 24-Hour Peak Productivity Histogram ---
  const hourCounts = new Array(24).fill(0);
  (state.pomoHistory || []).forEach(p => {
    if (p.at) hourCounts[new Date(p.at).getHours()]++;
  });
  state.tasks.filter(t => t.completedAt && t.updatedAt).forEach(t => {
    hourCounts[new Date(t.updatedAt).getHours()]++;
  });
  const maxHourCount = Math.max(1, ...hourCounts);
  const peakHour = hourCounts.indexOf(maxHourCount);
  const peakWindowStr = `${peakHour}:00 – ${peakHour + 1}:00`;

  // --- Focus Time Allocation by Category ---
  const catFocusMap = {};
  (state.pomoHistory || []).forEach(p => {
    const cat = p.category || 'other';
    catFocusMap[cat] = (catFocusMap[cat] || 0) + (p.duration || 0);
  });
  const catFocusEntries = Object.entries(catFocusMap).sort((a, b) => b[1] - a[1]);
  const totalFocusSecs = catFocusEntries.reduce((s, [, d]) => s + d, 0);

  function bar(ms, slow) {
    const pct = Math.min(100, (ms / maxMs) * 100);
    const cls = slow ? 'perf-bar-slow' : ms > 50 ? 'perf-bar-warn' : 'perf-bar-ok';
    return `<div class="perf-bar-track"><div class="perf-bar ${cls}" style="width:${pct}%"></div><span class="perf-bar-val">${ms}ms</span></div>`;
  }

  const velocityViewHTML = `
    <!-- Productivity Velocity Metric Cards -->
    <div class="vd-summary">
      <div class="vd-stat-card"><div class="vd-stat-icon" style="background:rgba(96,93,255,.14)">⚡</div><div><div class="vd-stat-val" style="color:var(--accent)">${avgVelocity}</div><div class="vd-stat-lbl">Tasks / day (14d avg)</div></div></div>
      <div class="vd-stat-card"><div class="vd-stat-icon" style="background:rgba(52,211,153,.14)">🎯</div><div><div class="vd-stat-val" style="color:#34d399">${totalDone14d}</div><div class="vd-stat-lbl">Tasks finished (14d)</div></div></div>
      <div class="vd-stat-card"><div class="vd-stat-icon" style="background:rgba(245,158,11,.14)">🔥</div><div><div class="vd-stat-val" style="color:#f59e0b">${peakWindowStr}</div><div class="vd-stat-lbl">Peak energy window</div></div></div>
      <div class="vd-stat-card"><div class="vd-stat-icon" style="background:rgba(79,140,255,.14)">⏱️</div><div><div class="vd-stat-val">${fmtDur(totalFocusSecs)}</div><div class="vd-stat-lbl">Total logged focus</div></div></div>
    </div>

    <div class="vd-grid">
      <!-- 14-day Velocity Chart -->
      <div class="card vd-card-wide">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <h2 class="card-title" style="margin:0">📈 14-Day Task Completion Velocity</h2>
          <span class="muted" style="font-size:12px">── Moving 3-day average</span>
        </div>
        <svg viewBox="0 0 ${vw} ${vh}" class="vd-svg-chart" preserveAspectRatio="xMidYMid meet">
          ${[0, 0.5, 1].map(p => `<line x1="${vp}" y1="${vph + p * vch}" x2="${vp + vcw}" y2="${vph + p * vch}" stroke="var(--border)" stroke-width="1" stroke-dasharray="2 4"/>`).join('')}
          ${vBarsSVG}
          <path d="${movingAvgPoints}" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>

      <!-- 24-Hour Peak Productivity Histogram -->
      <div class="card">
        <h2 class="card-title">⏰ 24-Hour Peak Activity Hours</h2>
        <p class="muted" style="font-size:12px;margin:0 0 10px">When you complete tasks and run focus sessions.</p>
        <div class="peak-hours-grid">
          ${hourCounts.map((c, h) => {
            const pct = Math.round((c / maxHourCount) * 100);
            const isPeak = h === peakHour && c > 0;
            return `<div class="peak-hour-bar ${isPeak ? 'peak' : ''}" style="height:${Math.max(4, pct)}%" title="${h}:00 – ${c} activities">
              ${h % 4 === 0 ? `<span class="peak-hour-lbl">${h}h</span>` : ''}
            </div>`;
          }).join('')}
        </div>
      </div>

      <!-- Focus Time by Category -->
      <div class="card">
        <h2 class="card-title">🍅 Focus Time Allocation</h2>
        ${catFocusEntries.length ? catFocusEntries.map(([catId, sec]) => {
          const cat = CATEGORIES.find(c => c.id === catId);
          const color = cat ? cat.color : '#a78bfa';
          const label = cat ? cat.label : catId;
          const pct = Math.round((sec / totalFocusSecs) * 100);
          return `<div class="fin-budget-row">
            <span style="width:90px;flex-shrink:0">${esc(label)}</span>
            <div class="fin-budget-track"><div class="fin-budget-fill" style="width:${pct}%;background:${color}"></div></div>
            <span style="font-weight:600;min-width:65px;text-align:right">${fmtDur(sec)} <span class="muted">(${pct}%)</span></span>
          </div>`;
        }).join('') : '<div class="muted" style="padding:12px 0;font-size:12.5px">No focus sessions logged yet. Start a pomodoro to track time!</div>'}
      </div>
    </div>`;

  const engineViewHTML = `
    <div class="perf-toolbar">
      <div class="perf-summary">
        <div class="perf-stat-card"><div class="perf-stat-num">${totalRenders}</div><div class="perf-stat-label">Total renders</div></div>
        <div class="perf-stat-card ${totalSlow ? 'perf-stat-warn' : ''}"><div class="perf-stat-num">${totalSlow}</div><div class="perf-stat-label">Slow (>${PERF_SLOW_MS}ms)</div></div>
        <div class="perf-stat-card"><div class="perf-stat-num">${globalAvg}ms</div><div class="perf-stat-label">Global avg</div></div>
        <div class="perf-stat-card"><div class="perf-stat-num">${globalP95}ms</div><div class="perf-stat-label">Global P95</div></div>
      </div>
    </div>
    <div class="perf-section">
      <h2 class="card-title"><span>📊 Per-view breakdown</span><button class="btn btn-sm btn-ghost" id="perf-clear">Clear data</button></h2>
      ${viewNames.length ? `<div class="perf-table">
        <div class="perf-row perf-head"><span class="perf-col-view">View</span><span class="perf-col-num">Renders</span><span class="perf-col-num">Avg</span><span class="perf-col-num">P50</span><span class="perf-col-num">P95</span><span class="perf-col-num">Max</span><span class="perf-col-num">Slow</span><span class="perf-col-bar">Last render</span></div>
        ${viewNames.map(v => {
          const s = stats[v];
          const last = perfLog.filter(e => e.view === v).slice(-1)[0];
          return `<div class="perf-row ${last && last.slow ? 'perf-row-slow' : ''}">
            <span class="perf-col-view">${v}</span>
            <span class="perf-col-num">${s.count}</span>
            <span class="perf-col-num">${s.avg}ms</span>
            <span class="perf-col-num">${s.p50}ms</span>
            <span class="perf-col-num ${s.p95 > PERF_SLOW_MS ? 'perf-num-bad' : ''}">${s.p95}ms</span>
            <span class="perf-col-num ${s.max > PERF_SLOW_MS ? 'perf-num-bad' : ''}">${s.max}ms</span>
            <span class="perf-col-num ${s.slow ? 'perf-num-bad' : ''}">${s.slow}</span>
            <span class="perf-col-bar">${bar(last ? last.ms : 0, last ? last.slow : false)}</span>
          </div>`;
        }).join('')}
      </div>` : '<p class="muted" style="padding:12px">No render data yet. Navigate between views to collect timing data.</p>'}
    </div>
    ${slowEntries.length ? `<div class="perf-section">
      <h2 class="card-title">⚠️ Slow renders (last ${slowEntries.length})</h2>
      <div class="perf-slow-list">
        ${slowEntries.map(e => {
          const ago = Math.round((Date.now() - e.ts) / 1000);
          const agoStr = ago < 60 ? ago + 's ago' : Math.round(ago / 60) + 'm ago';
          return `<div class="perf-slow-item">
            <span class="perf-slow-view">${e.view}</span>
            <span class="perf-slow-ms">${e.ms}ms</span>
            <span class="perf-slow-time">${agoStr}</span>
          </div>`;
        }).join('')}
      </div>
    </div>` : ''}`;

  viewRoot().innerHTML = `
    <div class="perf-tab-bar">
      <button class="perf-tab-btn ${perfActiveTab === 'velocity' ? 'active' : ''}" id="perf-tab-vel">⚡ Productivity Velocity &amp; Focus</button>
      <button class="perf-tab-btn ${perfActiveTab === 'engine' ? 'active' : ''}" id="perf-tab-eng">🛠️ Engine &amp; Render Latency</button>
    </div>
    ${perfActiveTab === 'velocity' ? velocityViewHTML : engineViewHTML}
  `;

  // Bind Tabs
  $('#perf-tab-vel')?.addEventListener('click', () => { perfActiveTab = 'velocity'; renderPerf(); });
  $('#perf-tab-eng')?.addEventListener('click', () => { perfActiveTab = 'engine'; renderPerf(); });
  const clearBtn = $('#perf-clear');
  if (clearBtn) clearBtn.addEventListener('click', () => { perfLog.length = 0; renderPerf(); toast('Perf data cleared'); });
}

/* ============ Teaching Schedule ============ */
/** Check if two tasks overlap in time (same cell). Two tasks overlap when
    both have start/end times and their ranges intersect. */
// Schedule logic and markup are owned by src/lib/schedule.js + src/schedule/view.js.
const Sched = typeof window !== 'undefined' && window.LumenLib ? window.LumenLib.schedule : {};

let _schedViewMode = 'timetable';
let _schedWeekOffset = 0;
let _schedMonthOffset = 0;

function renderSchedule() {
  // personal schedule: dynamic intervals (customizable)
  PERIODS = getPeriods();
  const today = todayISO();
  const dow = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const todayDow = dow[new Date().getDay()];

  // Calculate week dates
  const baseDate = new Date();
  const dayOfWeek = (baseDate.getDay() + 6) % 7; // 0 = Mon, 6 = Sun
  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() - dayOfWeek + (_schedWeekOffset * 7));

  // Date math is owned by src/lib/schedule.js — it also fixes a real bug: the
  // previous version serialized each local-midnight Date with toISOString(), which
  // converts to UTC first and rolls the date back a day whenever the local clock is
  // still inside the UTC offset window (e.g. 00:00-03:00 for UTC+3). 'today' landed
  // on the wrong column during that window for anyone east of UTC.
  const weekDays = Sched.buildWeekDays(monday, DAYS, today);

  const startDay = weekDays[0];
  const endDay = weekDays[6];
  const weekDateTitle = `${startDay.monthShort} ${startDay.dayNum} – ${endDay.monthShort} ${endDay.dayNum}, ${monday.getFullYear()}`;

  // Month date calculation
  const curMonthDate = new Date();
  curMonthDate.setDate(1);
  curMonthDate.setMonth(curMonthDate.getMonth() + _schedMonthOffset);
  const monthTitle = curMonthDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const curYear = curMonthDate.getFullYear();
  const curMonth = curMonthDate.getMonth();
  const firstDay = new Date(curYear, curMonth, 1);
  const lastDay = new Date(curYear, curMonth + 1, 0);
  const startDayIdx = (firstDay.getDay() + 6) % 7; // 0=Mon, 6=Sun
  const totalDays = lastDay.getDate();

  const scheduledTasks = state.tasks.filter(t => (t.scheduleDay || t.schedulePeriod) && t.status !== 'done');
  
  // Grid construction and overlap detection are owned by src/lib/schedule.js.
  const { grid, overlapIds } = Sched.buildScheduleGrid(scheduledTasks, PERIODS, DAYS);

  const schedTaskCell = (t) => Sched.schedTaskCell(t, { today, overlapIds });

  const unscheduled = state.tasks.filter(t => t.status !== 'done' && !t.scheduleDay && !t.schedulePeriod)
    .sort((a, b) => (a.startTime || 'zz') < (b.startTime || 'zz') ? -1 : (a.startTime || 'zz') > (b.startTime || 'zz') ? 1 : 0);
  // Trello → Commit → Timebox: committed today tasks that are still unplaced (no scheduleDay/Period)
  const committedUnplaced = state.tasks.filter(t => (t.status === 'today' || t.scheduleDay === today || ((state.settings && state.settings.reviewCommit && state.settings.reviewCommit.taskIds) || []).includes(t.id)) && !t.schedulePeriod && !isArchivedTask(t) && t.status !== 'done')
    .sort((a,b)=> (a.updatedAt||0)-(b.updatedAt||0));
  const otherUnscheduled = unscheduled.filter(t => !committedUnplaced.find(c=>c.id===t.id));
  const committedTrayHTML = Sched.committedTrayHTML(committedUnplaced, { todayDow, days: DAYS, linkGraph: linkGraphForTask });

  // Render HTML based on view mode
  let mainScheduleContent = '';
  if (_schedViewMode === 'month') {
    // Calendar markup is owned by src/schedule/view.js; the date arithmetic above
    // stays here, together with the month/week offsets it depends on.
    mainScheduleContent = Sched.monthGridHTML({
      year: curYear, month: curMonth, startDayIdx, totalDays,
      today, todayDow, tasks: state.tasks, days: DAYS,
    });
  } else {
    // Timetable / Weekly Schedule Grid with Time Columns and Dates
    // Grid markup is owned by src/schedule/view.js; schedTaskCell is threaded in
    // because it alone knows today's date and the overlap set.
    mainScheduleContent = Sched.weekGridHTML({ weekDays, periods: PERIODS, grid, cellHTML: schedTaskCell });
  }

  viewRoot().innerHTML = `
    <div class="sched-toolbar">
      <div class="sched-controls-left">
        <div class="sched-view-tabs">
          <button class="sched-view-btn ${_schedViewMode === 'timetable' ? 'active' : ''}" data-set-view="timetable">📋 Timetable</button>
          <button class="sched-view-btn ${_schedViewMode === 'month' ? 'active' : ''}" data-set-view="month">🗓️ Month View</button>
        </div>
        <div class="sched-date-nav">
          <button class="btn btn-sm btn-ghost" id="sched-nav-prev" title="Previous">◀</button>
          <button class="btn btn-sm btn-ghost" id="sched-nav-today" title="Jump to Today">Today</button>
          <button class="btn btn-sm btn-ghost" id="sched-nav-next" title="Next">▶</button>
          <span class="sched-date-title">${_schedViewMode === 'month' ? monthTitle : weekDateTitle}</span>
        </div>
      </div>
      <div class="sched-controls-right">
        <div class="sched-info">📋 ${scheduledTasks.length} scheduled · ${unscheduled.length} unscheduled${committedUnplaced.length?` · 🎯 ${committedUnplaced.length} committed unplaced`:''} · ⏱ ${getPeriods().length} intervals</div>
        ${overlapIds.size ? `<div class="sched-overlap-banner">⚠ ${overlapIds.size} overlap${overlapIds.size !== 1 ? 's' : ''}</div>` : ''}
        <button class="btn btn-sm btn-ghost" id="sched-intervals" title="Customize personal intervals — start, end, duration">⚙️ Intervals</button>
        <button class="btn btn-sm btn-ai" id="sched-ai-plan" title="Auto-schedule tasks with AI timeboxing">✨ AI Day Plan</button>
        <button class="btn btn-accent" id="sched-new">${ic('plus', 15)} New task</button>
      </div>
    </div>
    <div class="sched-legend">${CATEGORIES.map(c => `<span class="sched-legend-item" style="border-left:3px solid ${c.color}">${c.label}</span>`).join('')}</div>
    ${committedTrayHTML}
    ${mainScheduleContent}
    ${Sched.unscheduledListHTML(otherUnscheduled)}`;

  // View switcher bindings
  $$('[data-set-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      _schedViewMode = btn.dataset.setView;
      renderSchedule();
    });
  });

  // Date nav bindings
  $('#sched-nav-prev')?.addEventListener('click', () => {
    if (_schedViewMode === 'month') _schedMonthOffset--;
    else _schedWeekOffset--;
    renderSchedule();
  });
  $('#sched-nav-next')?.addEventListener('click', () => {
    if (_schedViewMode === 'month') _schedMonthOffset++;
    else _schedWeekOffset++;
    renderSchedule();
  });
  $('#sched-nav-today')?.addEventListener('click', () => {
    _schedWeekOffset = 0;
    _schedMonthOffset = 0;
    renderSchedule();
  });

  // Cell click to quickly create a task for that slot/day
  $$('.sched-cell').forEach(cell => {
    cell.addEventListener('click', e => {
      if (e.target.closest('.sched-task')) return;
      const day = cell.dataset.day;
      const period = cell.dataset.period;
      const pObj = getPeriods().find(p => p.id === period);
      openTaskModal({
        scheduleDay: day,
        schedulePeriod: period,
        startTime: pObj ? pObj.start : '',
        endTime: pObj ? pObj.end : '',
        due: cell.dataset.date || todayISO()
      });
    });
  });

  // Month cell click
  $$('.cal-month-cell:not(.other-month)').forEach(cell => {
    cell.addEventListener('click', e => {
      if (e.target.closest('.sched-task')) return;
      const dStr = cell.dataset.calendarDate;
      if (dStr) openTaskModal({ due: dStr });
    });
  });

  // Bind new task + commit tray auto-place (reuses AI timeboxing path without Gemini for committed unplaced)
  $('#sched-new').addEventListener('click', () => openTaskModal());
  $('#sched-intervals')?.addEventListener('click', openScheduleIntervalsModal);
  $('#sched-commit-ai')?.addEventListener('click', () => {
    const todayDowInner = DAYS[new Date().getDay()===0?6:new Date().getDay()-1].id; // map today
    const toPlace = state.tasks.filter(t=>t.status==='today' && !t.scheduleDay && !t.schedulePeriod && !isArchivedTask(t));
    if (!toPlace.length) { toast('Nothing committed to place'); return; }
    captureUndo('Auto-place committed');
    // reuse AI path logic but local round-robin: distribute across today's periods sequentially (skip lunch breaks)
    let periodsToday = getPeriods().filter(p=> p.id !== 'lunch' && !String(p.label||'').toLowerCase().includes('lunch'));
    if (!periodsToday.length) periodsToday = getPeriods();
    toPlace.forEach((t,i)=>{
      const p = periodsToday[i % periodsToday.length];
      t.scheduleDay = todayDowInner;
      t.schedulePeriod = p.id;
      t.startTime = p.start;
      t.endTime = p.end;
      t.updatedAt = Date.now();
    });
    save(); renderSchedule();
    toast(`✨ Placed ${toPlace.length} committed task${toPlace.length===1?'':'s'} onto today`);
  });
  const aiPlanBtn = $('#sched-ai-plan');
  if (aiPlanBtn) {
    aiPlanBtn.addEventListener('click', async () => {
      if (!state.settings.geminiApiKey) {
        toast('Set your Gemini API key in Settings → AI Assistant 🤖', 'error');
        return;
      }
      const toPlan = state.tasks.filter(t => t.status !== 'done' && (t.status === 'today' || t.due === todayISO() || !t.scheduleDay));
      if (!toPlan.length) { toast('No tasks to schedule for today', 'error'); return; }
      aiPlanBtn.disabled = true;
      aiPlanBtn.textContent = '✨ Planning…';
      try {
        const payload = toPlan.slice(0, 8).map(t => ({ id: t.id, title: t.title, priority: t.priority }));
        let availPeriods = getPeriods().filter(p=> p.id !== 'lunch' && !String(p.label||'').toLowerCase().includes('lunch')).slice(0,8);
        if (!availPeriods.length) availPeriods = getPeriods().slice(0,8);
        const periodDesc = availPeriods.map(p=>`${p.id} (${p.label} ${p.time})`).join(', ');
        const periodIds = availPeriods.map(p=>p.id).join('|');
        const prompt = `You are an expert timeboxing planner for a personal schedule. Schedule these tasks across periods ${periodDesc} for day "${todayDow}".
Tasks: ${JSON.stringify(payload)}.
Return ONLY a valid JSON array of objects with schema: [{"id": "...", "scheduleDay": "${todayDow}", "schedulePeriod": "${periodIds}", "startTime": "09:00", "endTime": "10:30"}]. No markdown.`;
        const res = await callGemini(prompt, 'You are an executive day planner. Output valid JSON only.');
        const cleaned = res.replace(/```json/gi, '').replace(/```/g, '').trim();
        const planned = JSON.parse(cleaned);
        if (Array.isArray(planned) && planned.length) {
          planned.forEach(p => {
            const t = state.tasks.find(x => x.id === p.id);
            if (t) {
              t.scheduleDay = p.scheduleDay || todayDow;
              t.schedulePeriod = p.schedulePeriod || 'p1';
              if (p.startTime) t.startTime = p.startTime;
              if (p.endTime) t.endTime = p.endTime;
              t.updatedAt = Date.now();
            }
          });
          save();
          renderSchedule();
          toast(`✨ Scheduled ${planned.length} tasks for ${todayDow.toUpperCase()}!`, 'success');
        }
      } catch (err) {
        toast(`AI Error: ${err.message}`, 'error');
      } finally {
        aiPlanBtn.disabled = false;
        aiPlanBtn.textContent = '✨ AI Day Plan';
      }
    });
  }
  $$('.sched-task').forEach(el => el.addEventListener('click', e => {
    e.stopPropagation();
    const t = state.tasks.find(x => x.id === el.dataset.id);
    if (t) openTaskModal(t);
  }));
  $$('.sched-unsched-item').forEach(el => el.addEventListener('click', e => {
    if (e.target.closest('.sched-assign')) return;
    const t = state.tasks.find(x => x.id === el.dataset.id);
    if (t) openTaskModal(t);
  }));
  $$('.sched-assign').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    const t = state.tasks.find(x => x.id === b.dataset.assign);
    if (t) openTaskModal(t);
  }));
  // Drag-and-drop (event delegation on the entire schedule view so unscheduled tray items work too)
  const schedRoot = viewRoot();
  if (schedRoot && !schedRoot._dragBound) {
    schedRoot._dragBound = true;
    let _dragTaskId = null;
    schedRoot.addEventListener('dragstart', e => {
      const el = e.target.closest('.sched-task, .sched-unsched-item');
      if (!el) return;
      _dragTaskId = el.dataset.id;
      el.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', _dragTaskId);
      if (el.classList.contains('sched-unsched-item')) {
        el.classList.add('drag-from-tray');
      }
    });
    schedRoot.addEventListener('dragend', e => {
      const el = e.target.closest('.sched-task, .sched-unsched-item');
      if (el) { el.classList.remove('dragging'); el.classList.remove('drag-from-tray'); }
      _dragTaskId = null;
      schedRoot.querySelectorAll('.sched-cell').forEach(c => c.classList.remove('drag-over'));
    });
    schedRoot.addEventListener('dragover', e => {
      const c = e.target.closest('.sched-cell');
      if (c) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
    });
    schedRoot.addEventListener('dragenter', e => {
      const c = e.target.closest('.sched-cell');
      if (c) { e.preventDefault(); c.classList.add('drag-over'); }
    });
    schedRoot.addEventListener('dragleave', e => {
      const c = e.target.closest('.sched-cell');
      if (c && !c.contains(e.relatedTarget)) c.classList.remove('drag-over');
    });
    schedRoot.addEventListener('drop', e => {
      e.preventDefault();
      const cell = e.target.closest('.sched-cell');
      if (!cell) return;
      cell.classList.remove('drag-over');
      const taskId = e.dataTransfer.getData('text/plain') || _dragTaskId;
      const t = state.tasks.find(x => x.id === taskId);
      if (!t) return;
      const newDay = cell.dataset.day, newPeriod = cell.dataset.period;
      if (!newDay || !newPeriod) return;
      if (t.scheduleDay === newDay && t.schedulePeriod === newPeriod) return;
      const wasUnscheduled = !t.scheduleDay && !t.schedulePeriod;
      captureUndo('Reschedule task');
      t.scheduleDay = newDay;
      t.schedulePeriod = newPeriod;
      const _pp = getPeriods().find(p=>p.id===newPeriod);
      if (_pp) { t.startTime = _pp.start || ''; t.endTime = _pp.end || ''; }
      t.updatedAt = Date.now();
      logActivity('task.move', `${t.title} → ${DAYS.find(d => d.id === newDay)?.label || newDay} ${getPeriods().find(p => p.id === newPeriod)?.label || newPeriod}`);
      save();
      renderSchedule();
      const dayLabel = DAYS.find(d => d.id === newDay)?.label || newDay;
      const periodLabel = getPeriods().find(p => p.id === newPeriod)?.label || newPeriod;
      toast(wasUnscheduled ? `📅 Scheduled to ${dayLabel} ${periodLabel}` : `📅 Moved to ${dayLabel} ${periodLabel}`);
    });
  }
}

/* ============ Activity log ============ */
function renderActivity() {
  const log = (state.activityLog || []).slice(0, 200);
  const types = {};
  log.forEach(e => { const cat = e.type.split('.')[0]; types[cat] = (types[cat] || 0) + 1; });
  const totalToday = log.filter(e => {
    const d = new Date(e.at); const t = new Date();
    return d.toDateString() === t.toDateString();
  }).length;
  const totalWeek = log.filter(e => e.at >= Date.now() - 7 * 86400000).length;

  const catIcons = { task: '📋', project: '🚀', goal: '🎯', habit: '🔥', note: '📝', pomo: '🍅', settings: '⚙️', data: '📦' };
  const catLabels = { task: 'Tasks', project: 'Projects', goal: 'Goals', habit: 'Habits', note: 'Notes', pomo: 'Focus', settings: 'Settings', data: 'Data' };

  const statsHTML = `<div class="act-stats">
    <div class="act-stat"><div class="act-stat-val">${log.length}</div><div class="act-stat-lbl">Total changes</div></div>
    <div class="act-stat act-stat-today"><div class="act-stat-val">${totalToday}</div><div class="act-stat-lbl">Today</div></div>
    <div class="act-stat act-stat-week"><div class="act-stat-val">${totalWeek}</div><div class="act-stat-lbl">This week</div></div>
    ${Object.entries(types).sort((a,b) => b[1]-a[1]).slice(0,5).map(([cat, n]) => `<div class="act-stat"><div class="act-stat-val">${catIcons[cat]||'📌'} ${n}</div><div class="act-stat-lbl">${catLabels[cat]||cat}</div></div>`).join('')}
  </div>`;

  const filterHTML = `<div class="act-filter">
    <input class="input" id="act-search" placeholder="🔍 Search activity…" style="font-size:13px;padding:7px 12px;">
    <select class="input" id="act-cat-filter" style="font-size:13px;padding:7px 10px;width:auto;">
      <option value="">All categories</option>
      ${Object.keys(types).sort().map(c => `<option value="${c}">${catIcons[c]||''} ${catLabels[c]||c} (${types[c]})</option>`).join('')}
    </select>
  </div>`;

  function actEntry(e) {
    const icon = ACTIVITY_ICONS[e.type] || '📌';
    const ago = timeAgo(e.at);
    const d = new Date(e.at);
    const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const cat = e.type.split('.')[0];
    const catBadge = `<span class="act-cat-badge" style="background:${cat === 'task' ? 'rgba(52,211,153,.12);color:#4ade80' : cat === 'project' ? 'rgba(124,108,246,.12);color:#7c6cf6' : cat === 'goal' ? 'rgba(255,176,32,.12);color:#ffb020' : cat === 'habit' ? 'rgba(239,68,68,.12);color:#ef4444' : cat === 'note' ? 'rgba(79,140,255,.12);color:#4f8cff' : cat === 'pomo' ? 'rgba(239,68,68,.12);color:#ef4444' : 'rgba(148,163,184,.12);color:#94a3b8'}">${catLabels[cat]||cat}</span>`;
    return `<div class="act-row" data-type="${e.type}" data-detail="${esc(e.detail)}">
      <span class="act-icon">${icon}</span>
      <div class="act-content">
        <div class="act-main"><span class="act-detail">${esc(e.detail)}</span> ${catBadge}</div>
        <div class="act-sub">${ago} · ${time}</div>
      </div>
    </div>`;
  }

  viewRoot().innerHTML = `
    <div class="card">
      <h2 class="card-title"><span>📊 Activity</span><button class="btn btn-sm btn-ghost" id="act-export-btn" title="Export as CSV">📥 CSV</button></h2>
      ${log.length ? statsHTML : ''}
      ${log.length > 5 ? filterHTML : ''}
      <div class="act-timeline" id="act-timeline">
        ${log.length ? log.map(actEntry).join('') : '<div class="empty-state"><div class="es-icon">📊</div>No activity yet. Start using Lumen and your changes will appear here!</div>'}
      </div>
    </div>`;

  // Bind filters
  function filterActivity() {
    const q = ($('#act-search') || {}).value?.toLowerCase() || '';
    const cat = ($('#act-cat-filter') || {}).value || '';
    $$('.act-row').forEach(row => {
      const matchQ = !q || (row.dataset.detail || '').toLowerCase().includes(q);
      const matchCat = !cat || row.dataset.type.startsWith(cat);
      row.style.display = (matchQ && matchCat) ? '' : 'none';
    });
  }
  const as = $('#act-search'); if (as) as.addEventListener('input', filterActivity);
  const ac = $('#act-cat-filter'); if (ac) ac.addEventListener('change', filterActivity);

  // Export
  const expBtn = $('#act-export-btn');
  if (expBtn) expBtn.addEventListener('click', () => {
    if (!log.length) { toast('No activity to export'); return; }
    const header = 'Date,Time,Type,Detail';
    const rows = log.map(e => {
      const d = new Date(e.at);
      return [d.toLocaleDateString('en-CA'), d.toLocaleTimeString('en-US', {hour:'2-digit',minute:'2-digit',hour12:false}), e.type, csvEsc(e.detail)].join(',');
    }).join('\n');
    const blob = new Blob([header+'\n'+rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'activity-'+todayISO()+'.csv'; a.click();
    URL.revokeObjectURL(url); toast('📥 Exported '+log.length+' entries');
  });

  updateNavBadges();
}

/* ============ Settings ============ */
function renderSettings() {
  const totalTasks = state.tasks.length, doneTasks = state.tasks.filter(t => t.status === 'done').length;
  const soundOn = state.settings.soundEnabled !== false;
  viewRoot().innerHTML = `
    <div class="settings-grid">
      ${syncCardHTML()}
      <div class="card">
        <h2 class="card-title">🤖 AI Assistant</h2>
        <div class="muted" style="font-size:12px;margin-bottom:10px">Bring your own Google Gemini API key for smart task breakdown, morning briefings, and voice memo structuring. Stored strictly in local browser storage.</div>
        <div class="field" style="margin-bottom:8px">
          <label class="field-label" for="set-ai-key">Gemini API Key</label>
          <div style="display:flex;gap:6px">
            <input type="password" id="set-ai-key" class="input" style="flex:1;font-family:monospace;font-size:12px" placeholder="AIzaSy..." value="${esc(sessionSecrets.geminiApiKey || '')}">
            <button class="btn btn-sm btn-ghost" id="set-ai-toggle-key" title="Toggle visibility">👁️</button>
          </div>
        </div>
        <div class="field" style="margin-bottom:8px; display:flex; align-items:center; gap:6px;">
          <input type="checkbox" id="set-ai-remember" ${state.settings.secretsRef ? 'checked' : ''}>
          <label for="set-ai-remember" style="font-size:12px">Remember on this device</label>
        </div>
        <div class="field-row" style="margin-bottom:8px">
          <div class="field">
            <label for="set-ai-model" class="field-label">Model</label>
            <select id="set-ai-model">
              <option value="gemini-2.5-flash" ${state.settings.geminiModel === 'gemini-2.5-flash' ? 'selected' : ''}>Gemini 2.5 Flash (Fastest)</option>
              <option value="gemini-1.5-flash" ${state.settings.geminiModel === 'gemini-1.5-flash' ? 'selected' : ''}>Gemini 1.5 Flash</option>
              <option value="gemini-1.5-pro" ${state.settings.geminiModel === 'gemini-1.5-pro' ? 'selected' : ''}>Gemini 1.5 Pro</option>
            </select>
          </div>
        </div>
        <div class="set-row">
          <span class="stat-inline" id="set-ai-status">${sessionSecrets.geminiApiKey ? 'Key saved 🟢' : 'No API key set ⚪'}</span>
          <div style="display:flex;gap:6px">
            <button class="btn btn-sm btn-accent" id="set-ai-save">Save key</button>
            <button class="btn btn-sm btn-ghost" id="set-ai-test">Test</button>
          </div>
        </div>
      </div>
      <div class="card">
        <h2 class="card-title">📲 Install app</h2>
        ${installCardBody()}
      </div>
      <div class="card">
        <h2 class="card-title">🔔 Notifications &amp; Sound</h2>
        <div class="set-row"><span class="stat-inline">Sound effects (Web Audio chimes)</span>
          <input type="checkbox" id="sound-toggle" ${soundOn ? 'checked' : ''}>
        </div>
        <div class="set-row"><span class="stat-inline">Notify when a deadline goes overdue</span>
          <input type="checkbox" id="notify-toggle" ${state.settings.notifyOverdue ? 'checked' : ''}>
        </div>
        <div class="set-row"><span class="stat-inline">Browser permission</span>
          <span class="stat-inline" id="notify-status">${notifyPermission() === 'granted' ? 'Granted ✅' : notifyPermission() === 'denied' ? 'Denied' : notifyPermission() === 'default' ? 'Not asked yet' : 'Not supported'}</span>
        </div>
        <div class="set-row"><span class="stat-inline">Test</span>
          <div style="display:flex;gap:6px">
            <button class="btn btn-sm" id="sound-test">Play chime</button>
            <button class="btn btn-sm" id="notify-test">Send notification</button>
          </div>
        </div>
        <p class="muted" style="font-size:12px;margin-top:10px;line-height:1.5">Zero external audio dependencies — sounds are synthesized natively with the Web Audio API.</p>
      </div>
      <div class="card">
        <h2 class="card-title">🎨 Appearance &amp; Aesthetics</h2>
        <div class="field" role="group" aria-labelledby="set-theme-label" style="margin-bottom:12px">
          <label class="field-label" id="set-theme-label">Color Theme — purposeful palettes</label>
          <div class="muted" style="font-size:11px;margin-bottom:8px;line-height:1.4">Professional · Academic · Personal · Creative — each tuned for its context. <span style="color:var(--accent)">● current</span> is <b>${(THEME_PALETTES.find(p=>p.id===(state.settings.theme||'dracula'))||{}).name||state.settings.theme}</b></div>
          ${(() => {
            const grouped={}; THEME_PALETTES.forEach(p=>{ const c=p.category||'Other'; (grouped[c]=grouped[c]||[]).push(p); });
            const order=['Professional','Academic','Personal','Creative','Other'];
            const icons={Professional:'💼',Academic:'🎓',Personal:'🌿',Creative:'✨',Other:'🎨'};
            const cats=[...order.filter(c=>grouped[c]), ...Object.keys(grouped).filter(c=>!order.includes(c))];
            return cats.map(cat=>`
              <div style="margin-top:10px">
                <div style="font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:6px;display:flex;align-items:center;gap:6px">
                  <span>${icons[cat]||'•'} ${cat}</span>
                  <span style="font-weight:600;text-transform:none;letter-spacing:0;opacity:.7">· ${grouped[cat].length} themes</span>
                  <span style="margin-left:auto;font-weight:600;text-transform:none;letter-spacing:0;font-size:10px;background:var(--surface2);border:1px solid var(--border);padding:1px 6px;border-radius:999px">${cat==='Professional'?'Trust & clarity':cat==='Academic'?'Read & teach':cat==='Personal'?'Calm & reflect':cat==='Creative'?'Make & explore':''}</span>
                </div>
                <div class="theme-grid">
                  ${grouped[cat].map(p=>`
                    <div class="theme-card ${(state.settings.theme||'dracula')===p.id?'active':''}" data-theme-id="${p.id}" title="${esc(p.purpose||p.desc||p.name)}">
                      <div class="theme-preview-swatches">
                        <div class="theme-swatch" style="background:${p.bg}"></div>
                        <div class="theme-swatch" style="background:${p.surface}"></div>
                        <div class="theme-swatch" style="background:${p.accent}"></div>
                      </div>
                      <span style="font-size:11.5px;font-weight:700;line-height:1.2">${p.name}</span>
                      <span style="font-size:10px;color:var(--muted);line-height:1.25;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:26px">${esc(p.purpose||p.desc||(p.dark?'Dark':'Light'))}</span>
                      <span style="font-size:9px;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);opacity:.8">${p.dark?'Dark':'Light'} · ${p.accent}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            `).join('');
          })()}
        </div>

        <div class="field" role="group" aria-labelledby="set-accent-label" style="margin-bottom:12px">
          <label class="field-label" id="set-accent-label">Accent Color</label>
          <div class="accent-picker-row">
            ${ACCENT_COLORS.map(a => `
              <button class="accent-dot-btn ${state.settings.accent === a.id ? 'active' : ''}" data-accent-id="${a.id}" style="background:${a.hex}" title="${a.label}"></button>
            `).join('')}
          </div>
          <div style="margin-top:8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <button class="btn btn-xs ${!state.settings.accent?'btn-accent':'btn-ghost'}" id="accent-clear" title="Let the purposeful theme's own accent shine">${!state.settings.accent?'✓ Theme default':'✕ Use theme default'}</button>
            <span class="muted" style="font-size:11px">${state.settings.accent ? `Custom: <b style="color:var(--accent)">${esc(state.settings.accent)}</b> overrides purposeful palette` : `Purposeful accent <b style="color:var(--accent)">${esc((THEME_PALETTES.find(p=>p.id===(state.settings.theme||'dracula'))||{}).accent||'auto')}</b> is active`}</span>
          </div>
        </div>

        <div class="field-row" style="margin-bottom:10px">
          <div class="field">
            <label for="set-density" class="field-label">UI Density</label>
            <select id="set-density">
              <option value="comfortable" ${state.settings.density !== 'compact' ? 'selected' : ''}>Comfortable (Spacious)</option>
              <option value="compact" ${state.settings.density === 'compact' ? 'selected' : ''}>Compact (Power-User)</option>
            </select>
          </div>
          <div class="field">
            <label for="set-font" class="field-label">Typography Font</label>
            <select id="set-font">
              <option value="sans" ${state.settings.font === 'sans' || !state.settings.font ? 'selected' : ''}>System Sans</option>
              <option value="inter" ${state.settings.font === 'inter' ? 'selected' : ''}>Inter / Modern Sans</option>
              <option value="mono" ${state.settings.font === 'mono' ? 'selected' : ''}>Developer Monospace</option>
              <option value="serif" ${state.settings.font === 'serif' ? 'selected' : ''}>Editorial Serif</option>
            </select>
          </div>
        </div>

        <div class="set-row">
          <span class="stat-inline">Frosted Acrylic Glassmorphism (Backdrop blur)</span>
          <input type="checkbox" id="set-glass-toggle" ${state.settings.glass !== false ? 'checked' : ''}>
        </div>
      </div>
      <div class="card">
        <h2 class="card-title">Your data</h2>
        <div class="set-row"><span class="stat-inline"><b>${totalTasks}</b> tasks · <b>${doneTasks}</b> done</span></div>
        <div class="set-row"><span class="stat-inline"><b>${state.goals.length}</b> goals · <b>${state.habits.length}</b> habits · <b>${state.notes.length}</b> notes · <b>${state.recordings.length}</b> recordings</span></div>
        <div class="set-row"><span class="stat-inline">Everything is stored locally in your browser.</span></div>
        <div class="set-row">
          <span class="stat-inline">Backup</span>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn btn-sm" id="set-export">${ic('download', 13)} Export</button>
            <button class="btn btn-sm btn-accent" id="set-export-enc">🔐 Encrypted</button>
            <button class="btn btn-sm" id="set-import">${ic('upload', 13)} Import</button>
          </div>
        </div>
        <div class="set-row">
          <span class="stat-inline">Encrypted auto-backup <span class="muted" style="font-size:11px">opt-in, 3 rotating IDB slots</span></span>
          <div style="display:flex;gap:6px;align-items:center">
            <label style="display:flex;gap:6px;align-items:center;font-size:13px"><input type="checkbox" id="set-auto-backup" ${state.settings.autoBackup ? 'checked' : ''}> Auto-backup</label>
            <input type="password" id="set-auto-backup-pwd" placeholder="Vault password" value="${esc(sessionSecrets.autoBackupPassword || '')}" style="width:140px;padding:5px 8px;font-size:12px">
            <button class="btn btn-sm btn-ghost" id="set-auto-backup-restore" title="Restore from latest auto vault">↩ Restore</button>
          </div>
        </div>
        <div class="set-row">
          <span class="stat-inline">Import tasks (CSV / Markdown)</span>
          <button class="btn btn-sm" id="set-import-tasks">${ic('file-text', 13)} Import CSV/MD</button>
        </div>
        <div class="set-row">
          <span class="stat-inline">Calendar export (.ics)</span>
          <button class="btn btn-sm" id="set-export-ics">${ic('calendar', 13)} Export to calendar</button>
        </div>
        <div class="set-row">
          <span class="stat-inline">Danger zone</span>
          <div style="display:flex;gap:6px">
            <button class="btn btn-sm btn-danger" id="set-clear">Clear all data</button>
          </div>
        </div>
        <input type="file" id="set-import-file" accept="application/json" class="hidden">
        <input type="file" id="set-import-tasks-file" accept=".csv,.txt,.md" class="hidden">
      </div>
      <div class="card">
        <h2 class="card-title">📋 Task templates</h2>
        <div class="muted" style="font-size:12px;margin-bottom:10px">Save time by creating reusable task templates for your recurring workflows.</div>
        <div id="templates-list">${(state.templates || []).map((tpl, i) => `<div class="set-row template-row">
          <span class="stat-inline"><b>${esc(tpl.title)}</b> <span class="muted">(${tpl.category ? CATEGORIES.find(c => c.id === tpl.category)?.label || tpl.category : 'No category'})</span></span>
          <div style="display:flex;gap:4px">
            <button class="btn btn-sm" data-tpl-use="${i}" title="Create task from template">${ic('plus', 13)} Use</button>
            <button class="btn btn-sm btn-danger" data-tpl-del="${i}" title="Delete template">${ic('trash', 13)}</button>
          </div>
        </div>`).join('') || '<div class="muted" style="padding:8px 0;font-size:12.5px">No templates yet. Save a task as a template from the task modal.</div>'}</div>
      </div>
      <div class="card">
        <h2 class="card-title">🍅 Focus history <button class="btn btn-sm btn-ghost" id="export-focus-csv" title="Download as CSV">📥 CSV</button></h2>
        <div class="muted" style="font-size:12px;margin-bottom:10px">Recent Pomodoro sessions across all tasks.</div>
        <div id="pomo-history-list">${(() => {
          const hist = (state.pomoHistory || []).slice(0, 30);
          if (!hist.length) return '<div class="muted" style="padding:8px 0;font-size:12.5px">No focus sessions yet. Start one from a task card 🍅</div>';
          const totalAll = hist.reduce((s, h) => s + h.duration, 0);
          return `<div class="muted" style="font-size:12px;margin-bottom:8px">${hist.length} sessions · ${fmtDur(totalAll)} total</div>` + hist.map(h => {
            const cat = CATEGORIES.find(c => c.id === h.category);
            const catBadge = cat ? `<span class="badge cat-badge" style="background:${cat.color}22;color:${cat.color};border:1px solid ${cat.color}44;font-size:11px">${cat.label}</span>` : '';
            const ago = timeAgo(h.at);
            return `<div class="set-row pomo-history-row">
              <span class="stat-inline"><b>${esc(h.taskTitle)}</b> ${catBadge}</span>
              <span class="stat-inline">${fmtDur(h.duration)} ${h.completed ? '✅' : '⏸'} <span class="muted">${ago}</span></span>
            </div>`;
          }).join('');
        })()}</div>
      </div>
      <div class="card">
        <h2 class="card-title">Shortcuts</h2>
        <div class="kbd-list">
          <div class="row"><span>Search everything</span><span><kbd>Ctrl</kbd> <kbd>K</kbd></span></div>
          <div class="row"><span>Close dialog / menu</span><span><kbd>Esc</kbd></span></div>
          <div class="row"><span>New task (from board)</span><span><kbd>N</kbd></span></div>
          <div class="row"><span>Select all tasks</span><span><kbd>Ctrl</kbd> <kbd>A</kbd></span></div>
          <div class="row"><span>Delete selected tasks</span><span><kbd>Del</kbd></span></div>
          <div class="row"><span>Toggle task selection</span><span><kbd>Shift</kbd>+click</span></div>
          <div class="row"><span>Focus timer</span><span><kbd>V</kbd></span></div>
          <div class="row"><span>Undo last action</span><span><kbd>Ctrl</kbd> <kbd>Z</kbd></span></div>
          <div class="row"><span>Redo last action</span><span><kbd>Ctrl</kbd> <kbd>Shift</kbd> <kbd>Z</kbd></span></div>
        </div>
      </div>
    </div>`;

  // AI Assistant listeners
  const aiKeyInp = $('#set-ai-key');
  const aiModelSel = $('#set-ai-model');
  const aiToggleBtn = $('#set-ai-toggle-key');
  if (aiToggleBtn && aiKeyInp) {
    aiToggleBtn.addEventListener('click', () => {
      aiKeyInp.type = aiKeyInp.type === 'password' ? 'text' : 'password';
    });
  }
  const aiSaveBtn = $('#set-ai-save');
  const aiRememberCb = $('#set-ai-remember');
  if (aiSaveBtn && aiKeyInp) {
    aiSaveBtn.addEventListener('click', async () => {
      const keyVal = aiKeyInp.value.trim();
      sessionSecrets.geminiApiKey = keyVal;
      if (aiModelSel) state.settings.geminiModel = aiModelSel.value;
      
      const doRemember = aiRememberCb && aiRememberCb.checked;
      const persist = window.LumenLib.persist;
      const crypto = window.LumenLib.crypto;
      const localKey = getLocalSecretKey();
      
      if (doRemember && keyVal) {
        state.settings.secretsRef = true;
        const sealed = await crypto.sealSecret(keyVal, localKey);
        await persist.secretsDbPut('gemini:apiKey', sealed);
      } else {
        await persist.secretsDbDelete('gemini:apiKey');
        // If they also don't have vault auto-backup, we could clear secretsRef, but simpler to just leave it or let next load sort it out.
      }
      
      save();
      const statusEl = $('#set-ai-status');
      if (statusEl) statusEl.textContent = sessionSecrets.geminiApiKey ? 'Key saved 🟢' : 'No API key set ⚪';
      toast(sessionSecrets.geminiApiKey ? 'Gemini API key saved 🤖' : 'API key cleared');
    });
  }
  const aiTestBtn = $('#set-ai-test');
  if (aiTestBtn) {
    aiTestBtn.addEventListener('click', async () => {
      aiTestBtn.disabled = true;
      aiTestBtn.textContent = 'Testing…';
      try {
        const key = aiKeyInp ? aiKeyInp.value.trim() : sessionSecrets.geminiApiKey;
        if (!key) throw new Error('Enter an API key first');
        sessionSecrets.geminiApiKey = key;
        if (aiModelSel) state.settings.geminiModel = aiModelSel.value;
        const res = await callGemini('Say "Connected" in one word.');
        toast(`AI Connected: ${res} 🎉`, 'success');
      } catch (err) {
        toast(`AI Test Failed: ${err.message}`, 'error');
      } finally {
        aiTestBtn.disabled = false;
        aiTestBtn.textContent = 'Test';
      }
    });
  }

  // Sound toggle
  const soundToggle = $('#sound-toggle');
  if (soundToggle) {
    soundToggle.addEventListener('change', e => {
      state.settings.soundEnabled = e.target.checked;
      save();
      if (e.target.checked) playChime('task-done');
      toast(e.target.checked ? 'Sound effects enabled 🔔' : 'Sound effects muted 🔕');
    });
  }
  const soundTestBtn = $('#sound-test');
  if (soundTestBtn) {
    soundTestBtn.addEventListener('click', () => {
      playChime('pomo-done');
    });
  }

  $$('[data-theme-id]').forEach(b => b.addEventListener('click', () => {
    const tid = b.dataset.themeId;
    state.settings.theme = tid;
    save();
    applyTheme();
    $$('.theme-card').forEach(tc => tc.classList.toggle('active', tc.dataset.themeId === tid));
    toast(`Theme: ${THEME_PALETTES.find(p=>p.id===tid)?.name || tid}`);
  }));
  $$('[data-accent-id]').forEach(b => b.addEventListener('click', () => {
    const aid = b.dataset.accentId;
    state.settings.accent = aid;
    save();
    applyTheme();
    $$('.accent-dot-btn').forEach(ab => ab.classList.toggle('active', ab.dataset.accentId === aid));
    const clearBtn=$('#accent-clear');
    if(clearBtn){ clearBtn.textContent='✕ Use theme default'; clearBtn.className='btn btn-xs btn-ghost'; }
    toast(`Accent set to ${aid}`);
  }));
  $('#accent-clear')?.addEventListener('click', () => {
    if(state.settings.accent){
      delete state.settings.accent; save(); applyTheme();
      $$('.accent-dot-btn').forEach(ab=>ab.classList.remove('active'));
      const cb=$('#accent-clear'); if(cb){ cb.textContent='✓ Theme default'; cb.className='btn btn-xs btn-accent'; }
      toast('Accent cleared — purposeful palette active');
    } else {
      toast('Theme default already active');
    }
    if(currentView()==='settings') {
      // refresh the muted text showing current accent hex? Re-render settings quickly
      const cur = THEME_PALETTES.find(p=>p.id===state.settings.theme);
      const span = document.querySelector('#accent-clear + span');
      if(span && cur) span.innerHTML=`Purposeful accent <b style="color:var(--accent)">${esc(cur.accent)}</b> is active`;
    }
  });
  $('#set-density')?.addEventListener('change', e => {
    state.settings.density = e.target.value;
    save(); applyTheme();
    toast(`UI density set to ${e.target.value}`);
  });
  $('#set-font')?.addEventListener('change', e => {
    state.settings.font = e.target.value;
    save(); applyTheme();
    toast(`Font set to ${e.target.value}`);
  });
  $('#set-glass-toggle')?.addEventListener('change', e => {
    state.settings.glass = e.target.checked;
    save(); applyTheme();
    toast(e.target.checked ? 'Glassmorphism enabled' : 'Glassmorphism disabled');
  });
  const installBtn = $('#install-btn');
  if (installBtn) installBtn.addEventListener('click', async () => {
    if (!deferredPrompt || typeof deferredPrompt.prompt !== 'function') return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice.catch(() => null);
    if (choice && choice.outcome === 'accepted') {
      deferredPrompt = null;
      renderSettings();
      toast('Lumen installed 🎉', 'success');
    }
  });

  async function getBackupPayload() {
    const audioBlobs = {};
    for (const rec of (state.recordings || [])) {
      try {
        const blob = await blobGet(rec.id);
        if (blob) {
          const buf = await blob.arrayBuffer();
          const bytes = new Uint8Array(buf);
          let bin = '';
          for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
          audioBlobs[rec.id] = { data: btoa(bin), mime: blob.type || 'audio/webm', name: rec.name || '' };
        }
      } catch (_) { /* skip unreadable blobs */ }
    }
    return Object.assign({}, state, { _audioBlobs: audioBlobs });
  }

  $('#set-export').addEventListener('click', async () => {
    toast('Preparing backup…');
    try {
      const backup = await getBackupPayload();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `lumen-backup-${todayISO()}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      const count = Object.keys(backup._audioBlobs || {}).length;
      toast(`Backup downloaded ✅ (${count} audio blob${count === 1 ? '' : 's'} included)`);
    } catch (e) { toast('Export failed: ' + e.message, 'error'); }
  });

  // Encrypted Backup Export
  const expEncBtn = $('#set-export-enc');
  if (expEncBtn) {
    expEncBtn.addEventListener('click', async () => {
      openModal(`
        <div class="modal" style="max-width:380px">
          <div class="modal-head"><h3>🔐 Encrypted Vault Export</h3><button class="btn-icon" data-close-modal>${ic('x', 16)}</button></div>
          <div class="modal-body">
            <p class="muted" style="font-size:13px;line-height:1.5;margin-bottom:12px">Set a password to encrypt your entire Lumen backup with standard AES-GCM (PBKDF2 SHA-256). You will need this password to restore your vault.</p>
            <div class="field"><label for="vault-export-pwd" class="field-label">Vault Password</label><input type="password" id="vault-export-pwd" placeholder="Enter password…" autofocus></div>
          </div>
          <div class="modal-foot">
            <button class="btn btn-ghost" data-close-modal>Cancel</button>
            <button class="btn btn-accent" id="vault-export-confirm">Export Encrypted</button>
          </div>
        </div>`);
      $('#vault-export-confirm')?.addEventListener('click', async () => {
        const pwd = $('#vault-export-pwd').value;
        if (!pwd) { toast('Please enter a password', 'error'); return; }
        closeModal();
        toast('Encrypting vault with AES-GCM…');
        try {
          const backup = await getBackupPayload();
          const json = JSON.stringify(backup);
          const encryptedJSON = await encryptVaultBackup(json, pwd);
          const blob = new Blob([encryptedJSON], { type: 'application/json' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `lumen-vault-encrypted-${todayISO()}.json`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 4000);
          toast('🔐 Encrypted vault downloaded successfully!', 'success');
        } catch (e) {
          toast('Encryption failed: ' + e.message, 'error');
        }
      });
    });
  }

  async function restoreDataPayload(data) {
    const audioBlobs = data._audioBlobs || {};
    delete data._audioBlobs;
    state = Object.assign({}, state, data, { settings: Object.assign(state.settings, data.settings || {}) });
    save();
    let audioCount = 0;
    for (const [id, entry] of Object.entries(audioBlobs)) {
      try {
        const bin = atob(entry.data);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const blob = new Blob([bytes], { type: entry.mime || 'audio/webm' });
        await blobPut(id, blob);
        localAudioIds.add(id);
        audioCount++;
      } catch (_) { /* skip corrupt blobs */ }
    }
    renderView();
    toast(`Backup imported ✅ (${audioCount} audio blob${audioCount === 1 ? '' : 's'} restored)`, 'success');
  }

  $('#set-import').addEventListener('click', () => $('#set-import-file').click());
  $('#set-import-file').addEventListener('change', e => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (parsed && parsed.lumenEncrypted === true) {
          // Encrypted vault file — prompt for password
          openModal(`
            <div class="modal" style="max-width:380px">
              <div class="modal-head"><h3>🔐 Decrypt Lumen Vault</h3><button class="btn-icon" data-close-modal>${ic('x', 16)}</button></div>
              <div class="modal-body">
                <p class="muted" style="font-size:13px;line-height:1.5;margin-bottom:12px">This file is encrypted with AES-GCM. Enter your vault password to decrypt and restore.</p>
                <div class="field"><label for="vault-import-pwd" class="field-label">Vault Password</label><input type="password" id="vault-import-pwd" placeholder="Enter password…" autofocus></div>
              </div>
              <div class="modal-foot">
                <button class="btn btn-ghost" data-close-modal>Cancel</button>
                <button class="btn btn-accent" id="vault-import-confirm">Decrypt &amp; Restore</button>
              </div>
            </div>`);
          $('#vault-import-confirm')?.addEventListener('click', async () => {
            const pwd = $('#vault-import-pwd').value;
            if (!pwd) { toast('Please enter password', 'error'); return; }
            closeModal();
            toast('Decrypting vault…');
            try {
              const decryptedStr = await decryptVaultBackup(parsed, pwd);
              const data = JSON.parse(decryptedStr);
              if (!data || !Array.isArray(data.tasks)) throw new Error('Invalid vault contents');
              await restoreDataPayload(data);
              toast('🔐 Encrypted vault successfully restored!', 'success');
            } catch (err) {
              toast(`Decryption failed: ${err.message}`, 'error');
            }
          });
          return;
        }
        if (!parsed || !Array.isArray(parsed.tasks)) throw new Error('bad file');
        await restoreDataPayload(parsed);
      } catch (err) { toast('That file isn\'t a valid Lumen backup', 'error'); }
    };
    reader.readAsText(f);
    e.target.value = '';
  });

  const importTasksBtn = $('#set-import-tasks');
  const importTasksFile = $('#set-import-tasks-file');
  if (importTasksBtn && importTasksFile) {
    importTasksBtn.addEventListener('click', () => importTasksFile.click());
    importTasksFile.addEventListener('change', e => {
      const f = e.target.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const content = reader.result || '';
          const lines = content.replace(/\r\n/g, '\n').split('\n').filter(l => l.trim());
          let added = 0;
          if (f.name.endsWith('.csv')) {
            // CSV parser
            let headerChecked = false;
            let titleIdx = 0, dueIdx = -1, prioIdx = -1, tagIdx = -1;
            lines.forEach(line => {
              const parts = line.split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
              if (!parts[0]) return;
              if (!headerChecked) {
                headerChecked = true;
                const lower = parts.map(p => p.toLowerCase());
                if (lower.includes('title') || lower.includes('task') || lower.includes('name')) {
                  titleIdx = Math.max(0, lower.findIndex(p => p === 'title' || p === 'task' || p === 'name'));
                  dueIdx = lower.findIndex(p => p === 'due' || p === 'date' || p === 'deadline');
                  prioIdx = lower.findIndex(p => p === 'priority' || p === 'prio');
                  tagIdx = lower.findIndex(p => p === 'tags' || p === 'tag');
                  return; // skip header row
                }
              }
              const title = parts[titleIdx];
              if (!title) return;
              const due = dueIdx >= 0 ? parts[dueIdx] : '';
              const prio = prioIdx >= 0 && ['high', 'med', 'low'].includes(parts[prioIdx].toLowerCase()) ? parts[prioIdx].toLowerCase() : 'med';
              const tags = tagIdx >= 0 && parts[tagIdx] ? parts[tagIdx].split(';').map(t => t.trim()) : ['imported'];
              state.tasks.unshift({
                id: uid(),
                title,
                desc: 'Imported from CSV',
                status: 'backlog',
                priority: prio,
                due,
                tags,
                subtasks: [],
                createdAt: Date.now(),
                completedAt: null,
                updatedAt: Date.now()
              });
              added++;
            });
          } else {
            // Markdown / Text parser
            lines.forEach(line => {
              const m = line.match(/^[-*]?\s*(\[( |x|X)\])?\s*(.+)/);
              if (m && m[3]) {
                const title = m[3].trim();
                const done = m[2] && m[2].toLowerCase() === 'x';
                state.tasks.unshift({
                  id: uid(),
                  title,
                  desc: 'Imported from markdown',
                  status: done ? 'done' : 'today',
                  priority: 'med',
                  due: todayISO(),
                  tags: ['imported'],
                  subtasks: [],
                  createdAt: Date.now(),
                  completedAt: done ? todayISO() : null,
                  updatedAt: Date.now()
                });
                added++;
              }
            });
          }
          if (added > 0) {
            save();
            renderSettings();
            toast(`Imported ${added} task${added === 1 ? '' : 's'} from ${f.name}! ✅`, 'success');
          } else {
            toast('No tasks could be parsed from that file', 'error');
          }
        } catch (err) {
          toast(`Import failed: ${err.message}`, 'error');
        }
      };
      reader.readAsText(f);
      e.target.value = '';
    });
  }

  $('#set-clear').addEventListener('click', async () => {
    if (confirm('Delete ALL data — tasks, goals, habits, notes, students, attendance, lesson plans, recordings?')) {
      state = { tasks: [], goals: [], habits: [], notes: [], recordings: [], krHistory: [], tagColors: {}, projects: [], activityLog: [], settings: Object.assign({}, state.settings), incomeTypes: ['ESL','IELTS','Tutoring','Exam Prep'], expenseCategories: ['Rent','Utilities','Food','Transport','Supplies','Software','Marketing','Education','Healthcare','Other'], students: [], income: [], expenses: [], expectedIncome: [], expectedExpenses: [], attendance: [], assignments: [], lessonPlans: [] };
      save();
      try { await blobClear(); } catch (_) {}
      renderView(); toast('All data cleared');
    }
  });
  // Encrypted auto-backup toggle
  const autoCb = $('#set-auto-backup');
  const autoPwd = $('#set-auto-backup-pwd');
  if (autoCb) autoCb.addEventListener('change', e => { state.settings.autoBackup = e.target.checked; _autoBackupPwdWarned = false; save(); if (e.target.checked && !sessionSecrets.autoBackupPassword) toast('🔐 Set a dedicated vault password for auto-backup in this section', 'error'); else toast(e.target.checked ? '🔐 Auto-backup enabled' : 'Auto-backup disabled'); });
  if (autoPwd) autoPwd.addEventListener('change', async e => {
    const pwd = e.target.value;
    sessionSecrets.autoBackupPassword = pwd;
    if (state.settings.secretsRef && pwd) {
      const crypto = window.LumenLib.crypto;
      const persist = window.LumenLib.persist;
      const sealed = await crypto.sealSecret(pwd, getLocalSecretKey());
      await persist.secretsDbPut('vault:autoBackupPassword', sealed);
    } else if (!pwd) {
      window.LumenLib.persist.secretsDbDelete('vault:autoBackupPassword').catch(()=>{});
    }
    save();
    if (state.settings.autoBackup) toast('Vault password saved for auto-backup');
  });
  const restoreBtn = $('#set-auto-backup-restore');
  if (restoreBtn) restoreBtn.addEventListener('click', async () => {
    const pwd = (sessionSecrets.autoBackupPassword || '');
    if (!pwd) { toast('Set vault password first', 'error'); return; }
    const slots = await autoVaultList();
    if (!slots.length) { toast('No auto-backup found', 'error'); return; }
    const latest = slots[slots.length - 1];
    try {
      const parsed = JSON.parse(latest);
      const dec = await decryptVaultBackup(parsed, pwd);
      const data = JSON.parse(dec);
      if (!data || !Array.isArray(data.tasks)) throw new Error('bad');
      if (confirm('Restore from latest auto-backup? Current state will be replaced.')) {
        await restoreDataPayload(data);
        toast('♻️ Restored from auto-backup!', 'success');
      }
    } catch (err) { toast('Restore failed: ' + err.message, 'error'); }
  });
  // Template handlers
  $$('[data-tpl-use]').forEach(b => b.addEventListener('click', () => {
    const idx = parseInt(b.dataset.tplUse, 10);
    const tpl = (state.templates || [])[idx];
    if (!tpl) return;
    openTaskModal({
      title: tpl.title,
      desc: tpl.desc || '',
      status: 'today',
      priority: tpl.priority || 'med',
      due: '',
      goalId: tpl.goalId || '',
      tags: tpl.tags || [],
      category: tpl.category || '',
      recurrence: tpl.recurrence || '',
      subtasks: (tpl.subtasks || []).map(s => ({ text: s.text, done: false, id: uid() }))
    });
    toast('Template loaded — edit and save');
  }));
  $$('[data-tpl-del]').forEach(b => b.addEventListener('click', () => {
    const idx = parseInt(b.dataset.tplDel, 10);
    if (!confirm('Delete this template?')) return;
    state.templates.splice(idx, 1);
    save(); renderSettings(); toast('Template deleted');
  }));

  const exportCsvBtn = $('#export-focus-csv');
  if (exportCsvBtn) exportCsvBtn.addEventListener('click', downloadFocusHistoryCSV);
  const icsBtn = $('#set-export-ics');
  if (icsBtn) icsBtn.addEventListener('click', exportICS);

  /* notifications */
  $('#notify-toggle')?.addEventListener('change', e => setNotifyEnabled(e.target.checked));
  $('#notify-test')?.addEventListener('click', () => {
    if (!notifySupported()) { toast('Desktop notifications aren’t supported in this browser', 'error'); return; }
    if (Notification.permission !== 'granted') {
      Notification.requestPermission().then(p => {
        if (p === 'granted') { sendNotification('Lumen test 🔔', 'Desktop notifications are working.'); renderSettings(); }
        else toast('Notification permission denied', 'error');
      });
      return;
    }
    sendNotification('Lumen test 🔔', 'Desktop notifications are working.');
  });

  /* cross-device sync — deferred so opening Settings never waits on the sync connection */
  setTimeout(() => { ensurePeer(); updateSyncUI(); }, 0);
  const enableSyncBtn = $('#sync-enable-btn');
  if (enableSyncBtn) {
    enableSyncBtn.addEventListener('click', () => {
      state.settings.syncEnabled = true;
      save();
      ensurePeer();
      renderSettings();
    });
  }
  $('#sync-copy')?.addEventListener('click', () => {
    navigator.clipboard.writeText(syncMeta.peerId)
      .then(() => toast('Device ID copied'))
      .catch(() => toast('Copy failed — select it manually', 'error'));
  });
  $('#sync-new-id')?.addEventListener('click', () => {
    if (confirm('Generate a new device ID? Existing connections will drop.')) {
      syncMeta.peerId = genPeerId(); saveSyncMeta();
      if (peer) { try { peer.destroy(); } catch (_) {} peer = null; conn = null; }
      peerStatus = 'offline'; peerStatusDetail = '';
      ensurePeer(); renderSettings();
    }
  });
  $('#sync-connect')?.addEventListener('click', () => connectToDevice($('#sync-connect-id').value));
  $('#sync-connect-id')?.addEventListener('keydown', e => { if (e.key === 'Enter') connectToDevice(e.target.value); });
  $('#sync-name')?.addEventListener('change', e => { syncMeta.deviceName = e.target.value.trim(); saveSyncMeta(); });
  $('#sync-pass')?.addEventListener('change', async e => {
    const v = e.target.value.trim();
    if (!v) { syncMeta.passHash = ''; syncMeta.passSalt = ''; syncMeta.passHashV = 1; syncMeta.passHashLegacy = ''; saveSyncMeta(); toast('Passphrase removed'); return; }
    try {
      if (!syncMeta.passSalt) syncMeta.passSalt = window.LumenLib.crypto.randomSaltB64();
      syncMeta.passHash = await window.LumenLib.crypto.hashPass(v, syncMeta.passSalt);
      syncMeta.passHashLegacy = await window.LumenLib.crypto.hashPassLegacy(v);
      syncMeta.passHashV = 2;
      saveSyncMeta();
      toast('Passphrase set — enter the same one on your other device');
    } catch(err) { console.error('Hash failed:', err); }
    e.target.value = '';
  });
  $('#sync-auto')?.addEventListener('change', e => { syncMeta.autoSync = e.target.checked; saveSyncMeta(); });
  $('#sync-now')?.addEventListener('click', () => { pushState(); requestMissingAudio(); toast('State sent to connected device'); });
  const flushBtn = $('#sync-flush');
  if (flushBtn) flushBtn.addEventListener('click', () => { flushSyncQueue(); });
  const discardBtn = $('#sync-discard-queue');
  if (discardBtn) discardBtn.addEventListener('click', () => {
    if (confirm(`Discard ${(syncMeta.syncQueue || []).length} queued change(s)? They won't be sent to the other device.`)) {
      syncMeta.syncQueue = [];
      saveSyncMeta();
      renderSettings();
      toast('Queue cleared');
    }
  });
}

/* ============ Global search ============ */
/* Search results instance (group headers + items, variable row heights). */
let searchRows = [];
let searchResults = [];
let searchItemH = 40;
let searchGroupH = 26;
function searchRowHTML(row) {
  if (row.type === 'group') return `<div class="search-group">${esc(row.label)}</div>`;
  const r = searchResults[row.idx];
  return `<button class="search-item" data-idx="${row.idx}"><span class="si-icon" ${r.overdue ? 'style="color:var(--red)"' : ''}>${ic(r.icon, 16)}</span><span class="si-title">${esc(r.title)}</span><span class="si-sub">${esc(r.sub)}</span>${r.count != null ? `<span class="si-badge si-count${r.done === r.count ? ' done' : ''}">${r.done}/${r.count}</span>` : ''}${r.overdue ? '<span class="si-badge">Overdue</span>' : ''}</button>`;
}
const searchVirt = createListVirt({
  containerSel: '#search-results', rangeSel: null,
  rowH: r => r.type === 'group' ? searchGroupH : searchItemH,
  measureH: el => {
    const it = el.querySelector('.search-item'); if (it) searchItemH = it.offsetHeight;
    const gr = el.querySelector('.search-group'); if (gr) searchGroupH = gr.offsetHeight;
  },
  bindItems: el => $$('.search-item', el).forEach(b => b.addEventListener('click', () => {
    const r = searchResults[parseInt(b.dataset.idx, 10)];
    closeSearch();
    if (r && r.act) r.act();
  })),
  threshold: 24, estimate: 40
});
function buildSearchRows(results) {
  const rows = [];
  let last = null;
  results.forEach((r, i) => {
    const group = r.group || (r.type + 's');
    if (group !== last) { rows.push({ type: 'group', label: group }); last = group; }
    rows.push({ type: 'item', idx: i });
  });
  return rows;
}

let searchCat = '';
let searchDateFrom = '';
let searchDateTo = '';
const RECENT_CMD_KEY = 'lumen.recent.cmds';
function getRecentCmds() { try { return JSON.parse(localStorage.getItem(RECENT_CMD_KEY) || '[]'); } catch (_) { return []; } }
function pushRecentCmd(cmd) {
  try {
    let arr = getRecentCmds().filter(c => c !== cmd);
    arr.unshift(cmd);
    arr = arr.slice(0, 5);
    localStorage.setItem(RECENT_CMD_KEY, JSON.stringify(arr));
  } catch (_) {}
}
function fuzzyScore(name, label, q) {
  const n = name.toLowerCase(), l = label.toLowerCase();
  if (n === q) return 100;
  if (n.startsWith(q)) return 90;
  if (l.toLowerCase().startsWith(q)) return 80;
  if (n.includes(q)) return 60;
  if (l.includes(q)) return 50;
  // subsequence fuzzy
  let i = 0, j = 0;
  while (i < n.length && j < q.length) { if (n[i] === q[j]) j++; i++; }
  if (j === q.length) return 30;
  i = 0; j = 0;
  while (i < l.length && j < q.length) { if (l[i] === q[j]) j++; i++; }
  if (j === q.length) return 20;
  return 0;
}
let _searchReturnFocus = null;
let _searchKeyHandler = null;
function openSearch() {
  if (!$("#search-root").innerHTML) _searchReturnFocus = document.activeElement;
  searchCat = '';
  searchDateFrom = '';
  searchDateTo = '';
  $('#search-root').innerHTML = `
    <div class="search-overlay" id="search-overlay">
      <div class="search-panel">
        <div class="search-input-bar">
          <span style="color:var(--accent)">${ic('search', 18)}</span>
          <input type="text" id="search-input" placeholder="Search… or type > for commands (>task, >goal, >habit)" autofocus>
          <kbd>Esc</kbd>
        </div>
        <div class="search-filters">
          <select id="search-cat"><option value="">All categories</option>${CATEGORIES.map(c => `<option value="${c.id}">${c.label}</option>`).join('')}</select>
          <input type="date" id="search-date-from" placeholder="From">
          <input type="date" id="search-date-to" placeholder="To">
        </div>
        <div class="search-results" id="search-results"></div>
      </div>
    </div>`;
  const vr = document.getElementById('view-root');
  if (vr) {
    vr.setAttribute('inert', '');
    vr.setAttribute('aria-hidden', 'true');
  }
  const input = $('#search-input');
  // The palette is a dialog like any other, it just does not route through
  // openModal(). Same contract: named, trapped, focus handed back on close.
  const panel = $('.search-panel');
  if (panel) {
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Search and commands');
    panel.setAttribute('tabindex', '-1');
    if (_searchKeyHandler) {
      document.removeEventListener('keydown', _searchKeyHandler);
      _searchKeyHandler = null;
    }
    _searchKeyHandler = e => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeSearch();
        return;
      }
      if (e.key !== 'Tab') return;
      const f = modalFocusables(panel);
      if (!f.length) { e.preventDefault(); panel.focus(); return; }
      const firstEl = f[0], lastEl = f[f.length - 1];
      const outside = !panel.contains(document.activeElement);
      if (e.shiftKey && (outside || document.activeElement === firstEl)) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && (outside || document.activeElement === lastEl)) { e.preventDefault(); firstEl.focus(); }
    };
    document.addEventListener('keydown', _searchKeyHandler);
  }
  const run = () => {
    if (!document.querySelector('#search-results')) return; // search closed mid-typing
    const raw = input.value.trim();
    const q = raw.toLowerCase();
    // ---- Command palette: > prefix creates items ----
    if (raw.startsWith('>')) {
      const cmd = raw.slice(1).trim().toLowerCase();
      const rawCmd = raw.slice(1).trim();
      const commands = [
        { name: 'task', icon: 'check-square', label: 'New task', act: () => { pushRecentCmd('task'); closeSearch(); openTaskModal(); } },
        { name: 'student', icon: 'users', label: 'New student profile', act: () => { pushRecentCmd('student'); closeSearch(); openStudentEditModal(); } },
        { name: 'students', icon: 'users', label: 'View students roster', act: () => { pushRecentCmd('students'); closeSearch(); location.hash = '#students'; } },
        { name: 'goal', icon: 'target', label: 'New goal', act: () => { pushRecentCmd('goal'); closeSearch(); openGoalModal(); } },
        { name: 'habit', icon: 'flame', label: 'New habit', act: () => { pushRecentCmd('habit'); closeSearch(); openHabitModal(); } },
        { name: 'note', icon: 'file-text', label: 'New note', act: () => { pushRecentCmd('note'); closeSearch(); newNote(); location.hash = '#notes'; } },
        { name: 'project', icon: 'folder', label: 'New project', act: () => { pushRecentCmd('project'); closeSearch(); location.hash = '#projects'; openProjectModal(null); } },
        { name: 'tag', icon: 'tag', label: 'Manage tags', act: () => { pushRecentCmd('tag'); closeSearch(); location.hash = '#tags'; } },
        { name: 'schedule', icon: 'calendar-plus', label: 'View schedule', act: () => { pushRecentCmd('schedule'); closeSearch(); location.hash = '#schedule'; } },
        { name: 'voice', icon: 'mic', label: 'Record voice memo', act: () => { pushRecentCmd('voice'); closeSearch(); toggleCapture(); } },
        { name: 'focus', icon: 'clock', label: 'Start focus timer (25m)', act: () => { pushRecentCmd('focus'); closeSearch(); location.hash = '#dashboard'; setTimeout(() => $('#pomo-toggle')?.click(), 300); } },
        { name: 'ics', icon: 'calendar', label: 'Export tasks to .ics calendar', act: () => { pushRecentCmd('ics'); closeSearch(); exportICS(); } },
        { name: 'analytics', icon: 'bar-chart', label: 'View habit analytics', act: () => { pushRecentCmd('analytics'); closeSearch(); location.hash = '#analytics'; } },
        { name: 'finance', icon: 'dollar-sign', label: 'Open finance tracker', act: () => { pushRecentCmd('finance'); closeSearch(); location.hash = '#finance'; } },
        { name: 'income', icon: 'dollar-sign', label: 'Log income', act: () => { pushRecentCmd('income'); closeSearch(); location.hash = '#finance'; openFinanceModal('income'); } },
        { name: 'expense', icon: 'dollar-sign', label: 'Log expense', act: () => { pushRecentCmd('expense'); closeSearch(); location.hash = '#finance'; openFinanceModal('expense'); } },
        { name: 'vault', icon: 'folder', label: 'Open Vault', act: () => { pushRecentCmd('vault'); closeSearch(); location.hash = '#vault'; } },
        { name: 'backup', icon: 'download', label: 'Export backup (JSON)', act: () => { pushRecentCmd('backup'); closeSearch(); $('#set-export')?.click(); } },
        { name: 'undo', icon: 'zap', label: 'Undo last action', act: () => { pushRecentCmd('undo'); closeSearch(); performUndo(); } },
        { name: 'redo', icon: 'zap', label: 'Redo last action', act: () => { pushRecentCmd('redo'); closeSearch(); performRedo(); } },
      ];
      let quickAdds = [];
      if (cmd.startsWith('task ') && cmd.length > 5) {
        const taskText = rawCmd.replace(/^task\s+/i, '');
        const parsed = parseNaturalLanguageTask(taskText);
        if (parsed) {
          quickAdds.push({
            type: 'Command', icon: 'plus',
            title: `⚡ Quick add: “${parsed.title}”${parsed.due ? ' · 📅 ' + fmtShort(parsed.due) : ''}${parsed.priority !== 'med' ? ' · !' + parsed.priority : ''}`,
            sub: '>task',
            act: () => {
              pushRecentCmd('task ' + parsed.title);
              closeSearch();
              state.tasks.push(Object.assign({ id: uid(), desc: '', recurrence: '', subtasks: [], createdAt: Date.now(), updatedAt: Date.now() }, parsed));
              save();
              renderView();
              toast(`Task added: ${parsed.title} ✅`);
            }
          });
        }
      } else if (cmd.startsWith('habit ') && cmd.length > 6) {
        const habitName = rawCmd.replace(/^habit\s+/i, '').trim();
        if (habitName) {
          quickAdds.push({
            type: 'Command', icon: 'flame',
            title: `⚡ Quick add habit: “${habitName}”`,
            sub: '>habit',
            act: () => {
              pushRecentCmd('habit ' + habitName);
              closeSearch();
              state.habits.push({ id: uid(), name: habitName, emoji: '🌱', color: COLORS[1], freqType: 'daily', weeklyTarget: 7, dates: {}, freezes: {}, updatedAt: Date.now() });
              save(); location.hash = '#habits'; renderHabits(); toast(`Habit added: ${habitName} 🌱`);
            }
          });
        }
      } else if (cmd.startsWith('note ') && cmd.length > 5) {
        const noteText = rawCmd.replace(/^note\s+/i, '').trim();
        if (noteText) {
          quickAdds.push({
            type: 'Command', icon: 'file-text',
            title: `⚡ Quick add note: “${noteText.slice(0, 40)}”`,
            sub: '>note',
            act: () => {
              pushRecentCmd('note ' + noteText);
              closeSearch();
              const n = { id: uid(), title: noteText.slice(0, 40), content: noteText, tags: [], pinned: false, createdAt: Date.now(), updatedAt: Date.now(), audioId: null };
              state.notes.unshift(n); selectedNoteId = n.id; save(); location.hash = '#notes'; toast('Note added 📝');
            }
          });
        }
      } else if (cmd.startsWith('focus')) {
        const m = rawCmd.replace(/^focus\s*/i, '').trim();
        const mins = parseInt(m, 10) || 25;
        quickAdds.push({
          type: 'Command', icon: 'clock',
          title: `⚡ Start focus: ${mins} min`,
          sub: '>focus',
          act: () => { pushRecentCmd('focus ' + mins); closeSearch(); location.hash = '#dashboard'; setTimeout(() => { pomo.dur = mins * 60; pomo.remain = pomo.dur; $('#pomo-toggle')?.click(); }, 300); }
        });
      }
      const cmdWord = cmd.split(/\s+/)[0] || '';
      if (cmdWord === 'vault' || cmd.startsWith('vault ') || cmd.startsWith('vault:')) {
        const vq = cmd.replace(/^vault[:\s]*/, '').trim().toLowerCase();
        const vaultList = state.vaultItems.filter(v => !vq || getVaultHay(v).includes(vq)).sort((a,b)=> b.updatedAt - a.updatedAt).slice(0,30);
        const vResults = vaultList.map(v => ({ type: 'Vault', icon: 'folder', title: v.title, sub: (vaultTypeLabel(v.type)||v.type)+' · '+(v.url? vaultHost(v.url): (v.fileName||'')), act: () => { closeSearch(); location.hash='#vault'; openVaultModal(v); }}));
        // also show vault command itself
        const vaultCmd = { name:'vault', icon:'folder', label:'Open Vault', act:()=>{ pushRecentCmd('vault'); closeSearch(); location.hash='#vault'; }};
        const combined = [...vResults, { type:'Command', icon:vaultCmd.icon, title:vaultCmd.label, sub:'>vault', act:vaultCmd.act }];
        searchResults = combined.slice(0,50);
        searchRows = buildSearchRows(searchResults);
        searchVirt.setItems(searchRows, searchRowHTML, 'vault|'+vq);
        searchVirt.render();
        if(!vaultList.length && !vq) { /* show vault command at least */ }
        else if(!vaultList.length) $('#search-results').innerHTML='<div class="search-empty">No vault items for “'+esc(vq)+'”.</div>';
        return;
      }
      // fuzzy ranking
      let scored = commands.map(c => ({ c, score: cmdWord ? fuzzyScore(c.name, c.label, cmdWord) : 10 })).filter(x => x.score > 0).sort((a, b) => b.score - a.score);
      // if empty query, show recent first
      if (!cmdWord) {
        const recents = getRecentCmds();
        const recentSet = new Set(recents);
        scored = commands.map(c => ({ c, score: recentSet.has(c.name) ? 70 + (5 - recents.indexOf(c.name)) : 10 })).sort((a, b) => b.score - a.score);
        // surface recent as group hint: push them to top via high score already
      }
      const filtered = scored.map(x => x.c);
      const results = quickAdds.concat(filtered.map(c => ({ type: 'Command', icon: c.icon, title: c.label, sub: '>' + c.name, act: c.act })));
      searchResults = results.slice(0, 50);
      searchRows = buildSearchRows(searchResults);
      searchVirt.setItems(searchRows, searchRowHTML, 'cmd|' + searchResults.length + '|' + cmd);
      searchVirt.render();
      if (!searchResults.length) $('#search-results').innerHTML = '<div class="search-empty">No commands matching “' + esc(raw) + '”. Try >task, >goal, >habit…</div>';
      return;
    }
    // ---- Normal search ----
    let results = []; // fixed for ESM: was const but reassigned
    const push = r => results.push(r);
    // vault-only prefix — isolate vault before any other pushes (prevents overdue/tags pollution)
    if (q.startsWith('>vault')) {
      const vq = q.replace(/^>vault\s*/,'').replace(/^vault[:\s]+/,'');
      const vaultOnlyHay = getSearchVaultHay().filter(e => !vq || e.hay.includes(vq));
      if(vq){
        vaultOnlyHay.sort((a,b)=>{
          const aTitle=a.v.title.toLowerCase(), bTitle=b.v.title.toLowerCase();
          const aScore = aTitle===vq?3: aTitle.startsWith(vq)?2: aTitle.includes(vq)?1:0;
          const bScore = bTitle===vq?3: bTitle.startsWith(vq)?2: bTitle.includes(vq)?1:0;
          if(bScore!==aScore) return bScore-aScore;
          return b.v.updatedAt - a.v.updatedAt;
        });
      }
      vaultOnlyHay.forEach(({v})=> push({ type:'Vault', icon:'folder', title: v.title, sub: (v.type? vaultTypeLabel(v.type)+' · ':'')+ (v.url? vaultHost(v.url): (v.fileName||'')), act: ()=>{ closeSearch(); location.hash='#vault'; openVaultModal(v); }}));
      if (!results.length) {
        $('#search-results').innerHTML = '<div class="search-empty">No vault items for “' + esc(vq||q) + '”.</div>';
        searchRows = [];
        searchVirt.setItems([], searchRowHTML, q + '|0');
        return;
      }
      searchResults = results.slice(0, 50);
      searchRows = buildSearchRows(searchResults);
      searchVirt.setItems(searchRows, searchRowHTML, q + '|vaultOnly|' + results.length);
      searchVirt.render();
      return;
    }
    const overdue = deadlineInfo().overdue;
    if (!q) {
      // opening search surfaces what needs attention
      overdue.forEach(it => push({
        group: '⚠ Overdue', icon: 'target', title: it.label, sub: it.sub, overdue: true,
        act: () => { location.hash = '#goals'; }
      }));
    } else {
      const matches = s => s.toLowerCase().includes(q);
      overdue.filter(it => matches(it.label + ' ' + it.sub)).forEach(it => push({
        group: '⚠ Overdue', icon: 'target', title: it.label, sub: it.sub, overdue: true,
        act: () => { location.hash = '#goals'; }
      }));
      // Tag group: searching a tag name jumps straight to the filtered board
      const tagMap = new Map();
      state.tasks.forEach(t => {
        const tg = (t.tags && t.tags.length) ? t.tags : ['untagged'];
        tg.forEach(tag => {
          const k = tag.toLowerCase();
          if (!tagMap.has(k)) tagMap.set(k, { name: tag === 'untagged' ? 'Untagged' : tag, count: 0, done: 0 });
          const e = tagMap.get(k);
          e.count++;
          if (t.status === 'done') e.done++;
        });
      });
      [...tagMap.values()]
        .filter(tag => matches(tag.name.toLowerCase()))
        .sort((a, b) => b.count - a.count || (b.name.toLowerCase() === q ? 1 : 0) - (a.name.toLowerCase() === q ? 1 : 0))
        .forEach(tag => push({
          type: 'Tag', icon: 'tag',
          title: tag.name.toLowerCase() === 'untagged' ? 'Untagged' : '#' + tag.name,
          count: tag.count, done: tag.done,
          sub: 'tap to filter board',
          act: () => applyTagFilter(tag.name.toLowerCase())
        }));
      // Guard the status lookup: legacy/imported tasks can carry a status that is no
      // longer in STATUSES — one throw here used to abort the whole search run.
      // Fuzzy ranking: exact title > tag > due proximity
      const taskHits = getSearchTasksHay().filter(e => !q || e.hay.includes(q)).map(e => e.t).filter(t => {
        if (searchCat && t.category !== searchCat) return false;
        if (searchDateFrom && t.due && t.due < searchDateFrom) return false;
        if (searchDateTo && t.due && t.due > searchDateTo) return false;
        return true;
      });
      if (q) {
        taskHits.sort((a, b) => {
          const aTitle = a.title.toLowerCase(), bTitle = b.title.toLowerCase();
          const aExact = aTitle === q ? 3 : aTitle.startsWith(q) ? 2 : aTitle.includes(q) ? 1 : 0;
          const bExact = bTitle === q ? 3 : bTitle.startsWith(q) ? 2 : bTitle.includes(q) ? 1 : 0;
          if (bExact !== aExact) return bExact - aExact;
          const aTag = (a.tags || []).some(t => t.toLowerCase().includes(q)) ? 1 : 0;
          const bTag = (b.tags || []).some(t => t.toLowerCase().includes(q)) ? 1 : 0;
          if (bTag !== aTag) return bTag - aTag;
          // due proximity: sooner due first
          if (a.due && b.due) return a.due.localeCompare(b.due);
          if (a.due && !b.due) return -1;
          if (!a.due && b.due) return 1;
          return 0;
        });
      }
      taskHits.forEach(t => push({ type: 'Task', icon: 'check-square', title: t.title, sub: (STATUSES.find(s => s.id === t.status) || {}).title || t.status || 'Task', act: () => { openTaskModal(t); } }));
      // vault hits — normal search (vault-only already returned early)
      const vaultHits = getSearchVaultHay().filter(e => !q || e.hay.includes(q));
      if(q) {
        vaultHits.sort((a,b)=>{
          const aTitle=a.v.title.toLowerCase(), bTitle=b.v.title.toLowerCase();
          const aScore = aTitle===q?3: aTitle.startsWith(q)?2: aTitle.includes(q)?1:0;
          const bScore = bTitle===q?3: bTitle.startsWith(q)?2: bTitle.includes(q)?1:0;
          if(bScore!==aScore) return bScore-aScore;
          return b.v.updatedAt - a.v.updatedAt;
        });
      }
      vaultHits.forEach(({v})=> push({ type:'Vault', icon:'folder', title: v.title, sub: (v.type? vaultTypeLabel(v.type)+' · ':'')+ (v.url? vaultHost(v.url): (v.fileName||'')), act: ()=>{ closeSearch(); location.hash='#vault'; openVaultModal(v); }}));
      state.notes.filter(n => matches(n.title + ' ' + n.content + ' ' + (n.tags || []).join(' ')))
        .forEach(n => push({ type: 'Note', icon: 'file-text', title: n.title || 'Untitled', sub: n.audioId ? 'Voice memo' : 'Note', act: () => { selectedNoteId = n.id; location.hash = '#notes'; } }));
      const goalHits = state.goals.filter(g => matches(g.title + ' ' + (g.desc || '') + ' ' + (g.tags || []).join(' ')))
        .sort((a, b) => (isGoalOverdue(b) ? 1 : 0) - (isGoalOverdue(a) ? 1 : 0));
      goalHits.forEach(g => push({ type: 'Goal', icon: 'target', title: g.title, sub: goalProgress(g) + '% complete', overdue: isGoalOverdue(g), act: () => { location.hash = '#goals'; } }));
      state.habits.filter(h => matches(h.name))
        .forEach(h => push({ type: 'Habit', icon: 'flame', title: h.name, sub: habitStreak(h) + ' day streak', act: () => { location.hash = '#habits'; } }));
      getStudentsList().filter(s => matches(s.name + ' ' + (s.level || '') + ' ' + (s.email || '') + ' ' + (s.phone || '') + ' ' + (s.tags || []).join(' ')))
        .forEach(s => push({ type: 'Student', icon: 'users', title: '🎓 ' + s.name, sub: (s.level || 'Student') + (s.rate ? ' · ' + (s.currency === 'TRY' ? '₺' : '$') + s.rate + '/hr' : ''), act: () => { closeSearch(); location.hash = '#students'; openStudentDossier(s.id); } }));
    }
    if (!results.length) {
      $('#search-results').innerHTML = q ? '<div class="search-empty">No matches for “' + esc(q) + '”.</div>' : '<div class="search-empty">Start typing to search across everything.</div>';
      searchRows = [];
      searchVirt.setItems([], searchRowHTML, q + '|0');
      return;
    }
    if (results.length > 50) results = results.slice(0, 50);
    searchResults = results;
    searchRows = buildSearchRows(results);
    searchVirt.setItems(searchRows, searchRowHTML, q + '|' + results.length);
    searchVirt.render();
  };
  input.addEventListener('input', debounce(run, 150));
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const first = $('.search-item');
      if (first) first.click();
    }
  });
  const catEl = $('#search-cat');
  const dateFromEl = $('#search-date-from');
  const dateToEl = $('#search-date-to');
  if (catEl) catEl.addEventListener('change', e => { searchCat = e.target.value; run(); });
  if (dateFromEl) dateFromEl.addEventListener('change', e => { searchDateFrom = e.target.value; run(); });
  if (dateToEl) dateToEl.addEventListener('change', e => { searchDateTo = e.target.value; run(); });
  run();
  let downOnSearchOverlay = false;
  $('#search-overlay').addEventListener('mousedown', e => { downOnSearchOverlay = (e.target.id === 'search-overlay'); });
  $('#search-overlay').addEventListener('click', e => { if (e.target.id === 'search-overlay' && downOnSearchOverlay) closeSearch(); });
  input.focus();
}
function closeSearch() {
  if (_searchKeyHandler) { document.removeEventListener("keydown", _searchKeyHandler); _searchKeyHandler = null; }
  $('#search-root').innerHTML = '';
  const vr = document.getElementById('view-root');
  if (vr && !$('#modal-root').innerHTML) {
    vr.removeAttribute('inert');
    vr.removeAttribute('aria-hidden');
  }
  const back = _searchReturnFocus;
  _searchReturnFocus = null;
  if (back && back.isConnected && typeof back.focus === 'function') back.focus();
}

/* ============ PWA install ============ */
let deferredPrompt = null;
function isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream; }
function installCardBody() {
  if (deferredPrompt) {
    return `<div class="set-row"><span class="stat-inline"><b>Install Lumen as an app</b><br><span class="muted" style="font-size:12px">Runs in its own window, works offline, lives on your home screen.</span></span>
      <button class="btn btn-accent" id="install-btn">📲 Install app</button></div>`;
  }
  if (isIOS()) {
    return `<div class="set-row"><span class="stat-inline"><b>Add Lumen to your home screen</b><br><span class="muted" style="font-size:12px">In Safari: tap <b>Share</b> → <b>Add to Home Screen</b>. It opens in its own window and works offline.</span></span></div>`;
  }
  return `<div class="set-row"><span class="stat-inline">Offline-ready — every screen you open is cached so Lumen keeps working without a connection.</span></div>
    <div class="set-row"><span class="muted" style="font-size:12px">On Chrome or Edge, an install button appears here automatically once Lumen is installable.</span></div>`;
}
function initInstall() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (currentView() === 'settings') renderSettings();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    if (currentView() === 'settings') renderSettings();
    toast('Lumen installed 🎉', 'success');
  });
}

/* ============ Keyboard shortcuts overlay ============ */
function showShortcutsOverlay() {
  const shortcuts = [
    { cat: 'General', items: [
      ['Ctrl+K', 'Open search / command palette'], ['Ctrl+Z', 'Undo'], ['Ctrl+Shift+Z', 'Redo'],
      ['Esc', 'Close modal / menu'], ['?', 'Show shortcuts'], ['V', 'Toggle voice capture']
    ]},
    { cat: 'Tasks', items: [
      ['N', 'New task (on Tasks view)'], ['Enter', 'Quick add from input'],
      ['Delete/Backspace', 'Batch delete selected'], ['Ctrl+A', 'Select all tasks']
    ]},
    { cat: 'Navigation', items: [
      ['#brief', 'Morning Brief'], ['#dashboard', 'Dashboard'], ['#tasks', 'Tasks'],
      ['#projects', 'Projects'], ['#goals', 'Goals'], ['#habits', 'Habits'],
      ['#notes', 'Notes'], ['#activity', 'Activity']
    ]}
  ];
  const html = `<div class="modal-content" style="max-width:480px;max-height:80vh;overflow-y:auto">
    <div class="modal-head">
      <h2>⌨️ Keyboard Shortcuts</h2>
      <button class="modal-close" id="sc-close">✕</button>
    </div>
    <div class="modal-body">
      ${shortcuts.map(s => `<div class="sc-section">
        <div class="sc-cat">${s.cat}</div>
        ${s.items.map(([key, desc]) => `<div class="sc-row"><kbd class="sc-key">${key}</kbd><span class="sc-desc">${desc}</span></div>`).join('')}
      </div>`).join('')}
    </div>
  </div>`;
  openModal(html);
  $('#sc-close').addEventListener('click', closeModal);
}
/* ============ Focus mode ============ */
let focusModeActive = false;
function toggleFocusMode() {
  focusModeActive = !focusModeActive;
  document.documentElement.classList.toggle('focus-mode', focusModeActive);
  const sidebar = $('.sidebar');
  const topbar = $('header.topbar');
  if (sidebar) sidebar.classList.toggle('hidden', focusModeActive);
  if (topbar) {
    if (focusModeActive) {
      topbar.style.display = 'flex';
      topbar.innerHTML = `<div style="flex:1"></div><button class="btn btn-ghost" id="focus-exit" title="Exit focus mode">🎯 Exit focus</button>`;
      $('#focus-exit').addEventListener('click', toggleFocusMode);
    } else {
      location.reload(); // simplest way to restore full UI
    }
  }
  toast(focusModeActive ? '🎯 Focus mode ON — distractions hidden' : '🎯 Focus mode OFF');
}
/* ============ Keyboard ============ */
function onKey(e) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    if ($('#search-root').innerHTML) closeSearch();
    else openSearch();
    return;
  }
  // Undo: Ctrl/Cmd+Z, Redo: Ctrl/Cmd+Shift+Z
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.altKey) {
    // Skip if focus is in an input/textarea/contentEditable (native undo)
    const active = document.activeElement;
    const inInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
    if (inInput) return;
    e.preventDefault();
    if (e.shiftKey) performRedo();
    else performUndo();
    return;
  }
  if (e.key === 'Escape') {
    const projModal = $('#project-modal');
    if (projModal) { projModal.remove(); return; }
    if ($('#search-root').innerHTML) closeSearch();
    else if ($('#modal-root').innerHTML) closeModal();
    else if (taskSelectMode) { taskSelectMode = false; taskSelected.clear(); lastSelectedId = null; renderTasks(); }
    else if (!rec.active && !$('#capture-pill').classList.contains('hidden')) { hideCapturePill(); return; }
    else hideQuickMenu();
    return;
  }
  // ? key — show shortcuts overlay
  if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return;
    if (!$('#modal-root').innerHTML && !$('#search-root').innerHTML) { showShortcutsOverlay(); return; }
  }
  // Debug overlay: Ctrl+Shift+D
  if (e.key.toLowerCase() === 'd' && (e.ctrlKey || e.metaKey) && e.shiftKey) {
    e.preventDefault(); toggleDebugOverlay(); return;
  }
  // F key — toggle focus mode
  if (e.key.toLowerCase() === 'f' && !e.metaKey && !e.ctrlKey && !e.altKey) {
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return;
    if (!$('#modal-root').innerHTML && !$('#search-root').innerHTML) { toggleFocusMode(); return; }
  }
  if (e.key.toLowerCase() === 'n' && currentView() === 'tasks' && !$('#modal-root').innerHTML && !e.metaKey && !e.ctrlKey) {
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
    openTaskModal();
  }
  if (e.key.toLowerCase() === 'v' && !e.metaKey && !e.ctrlKey && !e.altKey) {
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return;
    if (!$('#modal-root').innerHTML && !$('#search-root').innerHTML) toggleCapture();
  }
  if (e.key.toLowerCase() === 'h' && !e.metaKey && !e.ctrlKey && !e.altKey) {
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return;
    if (!$('#modal-root').innerHTML && !$('#search-root').innerHTML) { openFocusHubModal(); return; }
  }
  // ---- Batch select keyboard shortcuts ----
  if (currentView() === 'tasks' && taskViewMode === 'kanban' && !$('#modal-root').innerHTML && !$('#search-root').innerHTML) {
    const active = document.activeElement;
    const inInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
    // Ctrl/Cmd+A: select all visible tasks (enter select mode if not active)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a' && !inInput) {
      e.preventDefault();
      if (!taskSelectMode) { taskSelectMode = true; }
      taskSelected.clear();
      $$('.task-card').forEach(c => {
        const id = c.dataset.id;
        if (id) {
          taskSelected.add(id);
          c.classList.add('selected');
          const cb = c.querySelector('.task-sel-check');
          if (cb) cb.checked = true;
        }
      });
      const bc = $('#batch-count');
      if (bc) bc.textContent = taskSelected.size + ' selected';
      if (!$('#batch-cancel')) renderTasks(); // re-render to show batch toolbar
      return;
    }
    // Delete/Backspace: batch delete selected tasks
    if ((e.key === 'Delete' || e.key === 'Backspace') && !inInput && taskSelectMode && taskSelected.size) {
      e.preventDefault();
      if (!confirm(`Delete ${taskSelected.size} task(s)?`)) return;
      captureUndo('Batch delete');
      state.tasks = state.tasks.filter(t => !taskSelected.has(t.id));
      taskSelected.forEach(id => tombstone('tasks', id));
      taskSelected.clear();
      lastSelectedId = null;
      save(); renderTasks();
      toast('Batch deleted');
      return;
    }
    // Space: toggle focused task's selection (when a card is focused)
    if (e.key === ' ' && !inInput && taskSelectMode && active) {
      const card = active.closest('.task-card');
      if (card && card.dataset.id) {
        e.preventDefault();
        const id = card.dataset.id;
        if (taskSelected.has(id)) taskSelected.delete(id); else taskSelected.add(id);
        card.classList.toggle('selected', taskSelected.has(id));
        const cb = card.querySelector('.task-sel-check');
        if (cb) cb.checked = taskSelected.has(id);
        lastSelectedId = id;
        const bc = $('#batch-count');
        if (bc) bc.textContent = taskSelected.size + ' selected';
        return;
      }
    }
  }
}

/* ============ Init ============ */
function init() {
  load();
  loadLocalAudioIds();
  applyTheme();
  // theme toggle — purposeful light ↔ dark (respects current theme's dark flag)
  const themeBtn = $('#theme-toggle');
  if (themeBtn) themeBtn.addEventListener('click', () => {
    const cur = THEME_PALETTES.find(p=>p.id===state.settings.theme);
    const isLight = cur ? !cur.dark : (state.settings.theme === 'sepia' || state.settings.theme === 'coral-dawn' || state.settings.theme === 'boardroom');
    // pair: light -> most recent dark, dark -> most recent light; default to boardroom/executive as purposeful defaults
    const lightDefault = THEME_PALETTES.find(p=>p.id==='boardroom') || THEME_PALETTES.find(p=>!p.dark) || {id:'coral-dawn'};
    const darkDefault = THEME_PALETTES.find(p=>p.id==='executive') || THEME_PALETTES.find(p=>p.id==='dracula') || THEME_PALETTES.find(p=>p.dark) || {id:'dracula'};
    state.settings.theme = isLight ? darkDefault.id : lightDefault.id;
    save(); applyTheme();
    if (currentView() === 'settings') {
      $$('.theme-card').forEach(tc => tc.classList.toggle('active', tc.dataset.themeId === state.settings.theme));
    }
    toast(`Theme: ${THEME_PALETTES.find(p=>p.id===state.settings.theme)?.name||state.settings.theme}`);
  });
  // nav — render icons only for the main 4 items; 'more' is handled separately
  $$('.nav-item[data-view]').forEach(b => {
    const view = b.dataset.view;
    if (view === 'more') return; // the More button keeps its static HTML
    const entry = NAV[view];
    if (entry) b.innerHTML = `${ic(entry[0], 17)} <span>${entry[1]}</span>`;
    b.addEventListener('click', () => { location.hash = '#' + view; });
  });
  // More menu toggle
  const moreBtn = $('#nav-more');
  const moreMenu = $('#more-menu');
  if (moreBtn && moreMenu) {
    moreBtn.addEventListener('click', e => {
      e.stopPropagation();
      moreMenu.classList.toggle('hidden');
      if (!moreMenu.classList.contains('hidden')) {
        const btnRect = moreBtn.getBoundingClientRect();
        const sidebarRect = moreBtn.closest('.sidebar').getBoundingClientRect();
        // If sidebar is collapsed (width < 100), show menu to the right. Otherwise show below.
        if (sidebarRect.width < 100) {
          moreMenu.style.left = (sidebarRect.right + 4) + 'px';
          moreMenu.style.top = btnRect.top + 'px';
        } else {
          moreMenu.style.left = btnRect.left + 'px';
          moreMenu.style.top = (btnRect.bottom + 4) + 'px';
        }
        
        // Handle bottom overflow
        const menuRect = moreMenu.getBoundingClientRect();
        if (menuRect.bottom > window.innerHeight) {
          moreMenu.style.top = 'auto';
          moreMenu.style.bottom = '10px';
        } else {
          moreMenu.style.bottom = 'auto';
        }
      }
      // Highlight current view inside the menu
      const cv = currentView();
      $$('.more-item', moreMenu).forEach(mi => mi.classList.toggle('active', mi.dataset.view === cv));
      // Focus first item when opening
      if (!moreMenu.classList.contains('hidden')) {
        const firstItem = moreMenu.querySelector('.more-item');
        if (firstItem) firstItem.focus();
      }
    });
    $$('.more-item', moreMenu).forEach(mi => {
      mi.addEventListener('click', () => {
        moreMenu.classList.add('hidden');
        location.hash = '#' + mi.dataset.view;
      });
      // Arrow key navigation
      mi.addEventListener('keydown', e => {
        if (e.key === 'ArrowDown') { e.preventDefault(); mi.nextElementSibling?.focus(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); mi.previousElementSibling?.focus(); }
        else if (e.key === 'Escape') { moreMenu.classList.add('hidden'); moreBtn.focus(); }
      });
    });
    document.addEventListener('click', e => {
      if (!e.target.closest('#nav-more') && !e.target.closest('#more-menu')) moreMenu.classList.add('hidden');
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !moreMenu.classList.contains('hidden')) {
        moreMenu.classList.add('hidden');
        moreBtn.focus();
      }
    });
  }
  $('#search-icon').innerHTML = ic('search', 15);
  $('#quick-add-icon').innerHTML = ic('plus', 15);
  updateMicButton();
  bindTopbar();
  bindFloatingPomoPill();
  initInstall();
  if (!location.hash || !NAV[location.hash.slice(1)]) location.hash = '#brief';
  // init() renders below; the hashchange fired by the default-view assignment above
  // arrives after this and used to trigger a second full render on every cold boot.
  window.addEventListener('hashchange', () => { if (location.hash !== _lastHashRendered) renderView(); });
  document.addEventListener('keydown', onKey);
  setInterval(checkOverdueNotifications, 60000); // catch deadlines passing while the app stays open
  // re-render a filtered board every minute so the amber pulse fires when a hidden deadline
  // crosses into the 7-day window while the user is idle
  setInterval(() => {
    if (currentView() === 'tasks' && taskFilterActive && !taskDragging) renderTasks();
  }, 60000);
  // Offline indicator
  updateOnlineStatus();
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  renderView();
  // Fast loading — idle warm-up: preload themes, peerjs, and memo caches without blocking first paint
  _whenIdle(() => {
    ensureThemesCSS();
    // warm memo caches for next dashboard visit
    if (state.tasks.length > 20) {
      _whenIdle(() => { try { getSearchTasksHay(); deadlinesCardHTML(); if (state.tasks.length < 500) { timeTrackDashboardHTML(); teachingDashboardHTML(); } } catch (_) {} });
    }
    // mark first paint
    if (!_firstPaintDone) {
      _firstPaintDone = true;
      const ms = Math.round(performance.now() - _bootStart);
      // eslint-disable-next-line no-console
      console.log(`[Lumen] first paint ${ms}ms · tasks:${state.tasks.length} · ${navigator.onLine ? 'online' : 'offline'}`);
      if (ms > 800) console.warn(`[Lumen] slow boot ${ms}ms — consider clearing old data`);
      try { if (performance.mark) performance.mark('lumen-first-paint'); } catch (_) {}
      if (_debugVisible) updateDebugOverlay();
      // SW update toast
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.addEventListener('controllerchange', () => toast('🔄 Lumen updated — reload to get latest', 'success'));
      }
    }
  });
  // Watch state size budget (warn at 4MB)
  _whenIdle(() => {
    try {
      const sz = JSON.stringify(state).length;
      if (sz > 4 * 1024 * 1024) toast(`⚠️ State is ${(sz/1024/1024).toFixed(1)}MB — consider archiving tasks`, 'error');
    } catch (_) {}
  });
}
if (typeof document !== 'undefined') { document.addEventListener('DOMContentLoaded', init); }

// Runtime seam: src/state/store.js and other src/ modules read these off window.
if (typeof window !== 'undefined') { try {
  // handing out the pre-rebind object to src/state/store.js and to the specs.
  Object.defineProperty(window, 'state', { get: () => state, set: (v) => { state = v; }, configurable: true }); window.save = save; window.saveIdle = saveIdle; window.load = load; window.renderView = typeof renderView !== 'undefined' ? renderView : undefined; window.flushSave = typeof flushSave !== 'undefined' ? flushSave : undefined; window.autoVaultBackup = typeof autoVaultBackup !== 'undefined' ? autoVaultBackup : undefined; window.autoVaultList = typeof autoVaultList !== 'undefined' ? autoVaultList : undefined; window.autoVaultDb = typeof autoVaultDb !== 'undefined' ? autoVaultDb : undefined; window.decryptVaultBackup = typeof decryptVaultBackup !== 'undefined' ? decryptVaultBackup : undefined; window.encryptVaultBackup = typeof encryptVaultBackup !== 'undefined' ? encryptVaultBackup : undefined; window.vaultGuessType = typeof vaultGuessType !== 'undefined' ? vaultGuessType : undefined; } catch(_){} }

/* Test seam. app.js is an ES module, so nothing here is global by accident —
   anything a spec needs must be named below on purpose. Keep this list small:
   every entry is a coupling between the suite and app internals.
   Mutable bindings are exposed as getters so specs observe reassignment. */
if (typeof window !== 'undefined') {
  const T = {
    captureUndo, performUndo, performRedo,
    getBriefCandidates, reviewCtx,
    teachingDashboardHTML,
    openGoalModal, openAssignmentModal, openStudentDossier, openStudentEditModal,
    toast,
    saveSyncMeta,
    sessionSecrets,
  };
  Object.defineProperty(T, 'syncMeta', { get: () => syncMeta, enumerable: true });
  Object.defineProperty(T, 'undoStack', { get: () => undoStack, enumerable: true });
  window.__LUMEN_TEST = T;
  window.__LUMEN_DEBUG = { perfLog, perfStats };
}
