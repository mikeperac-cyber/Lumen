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
  sparkles: '<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>'
};
function ic(name, size = 18) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;
}

/* ---------- Helpers ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
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

/* ---------- State & persistence ---------- */
const KEY = 'lumen.state.v1';
let state = { tasks: [], goals: [], habits: [], notes: [], recordings: [], krHistory: [], settings: {} };

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state = Object.assign(state, parsed);
      state.settings = Object.assign({ theme: 'dark', pomodoroMin: 25, pomodoroDate: '', pomodoroCount: 0, notifyOverdue: false }, parsed.settings || {});
      if (!Array.isArray(state.krHistory)) state.krHistory = [];
    }
  } catch (e) { console.warn('Failed to load state', e); }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.warn('Failed to save', e); }
  maybeAutoSync();
  checkOverdueNotifications();
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
const COLORS = ['#7c6cf6', '#4f8cff', '#34d399', '#ffb020', '#ff5d6c', '#f472b6', '#22d3ee', '#a3e635'];
const EMOJIS = ['💧', '🏋️', '📚', '🧘', '🥗', '✍️', '🌅', '💪', '🎸', '🌱', '🧠', '🚶'];
const TITLES = {
  brief: ['Morning Brief', 'Your day, assembled before you start'],
  dashboard: ['Dashboard', 'Your day at a glance'],
  review: ['Weekly review', 'What got done this week'],
  tasks: ['Tasks', 'Kanban board — drag cards to move them'],
  goals: ['Goals', 'Objectives & key results'],
  habits: ['Habits', 'Build streaks, one day at a time'],
  achievements: ['Achievements', 'Badges earned from real progress'],
  notes: ['Notes', 'Capture and organize your thoughts'],
  voice: ['Voice', 'Record, transcribe, and save ideas'],
  settings: ['Settings', 'Theme, data & shortcuts']
};
const NAV = {
  brief: ['sparkles', 'Brief'], dashboard: ['dashboard', 'Dashboard'], review: ['calendar', 'Weekly review'], tasks: ['check-square', 'Tasks'], goals: ['target', 'Goals'],
  habits: ['flame', 'Habits'], achievements: ['trophy', 'Achievements'], notes: ['file-text', 'Notes'], voice: ['mic', 'Voice'], settings: ['settings', 'Settings']
};

/* ---------- Seed data ---------- */
function d(offset) { return isoDate(shiftDays(offset)); }
function seed() {
  const habits = [
    { id: uid(), name: 'Drink water', emoji: '💧', color: '#4f8cff', dates: {} },
    { id: uid(), name: 'Work out', emoji: '🏋️', color: '#7c6cf6', dates: {} },
    { id: uid(), name: 'Read 20 min', emoji: '📚', color: '#34d399', dates: {} },
    { id: uid(), name: 'Meditate', emoji: '🧘', color: '#ffb020', dates: {} }
  ];
  // deterministic-ish streaks over the past 30 days
  for (let i = 0; i < 30; i++) {
    const day = d(-i);
    if (i % 5 !== 3) habits[0].dates[day] = true;            // water: almost daily
    if (i % 3 !== 1 || i >= 6) habits[1].dates[day] = true;  // workout: solid
    if (i % 4 !== 0) habits[2].dates[day] = true;            // reading: good
    if (i < 8) habits[3].dates[day] = true;                  // meditation: fresh 8-day streak
  }
  const goals = [
    { id: uid(), title: 'Ship my side project', desc: 'From prototype to real users.', color: '#7c6cf6', createdAt: Date.now() - 86400000 * 20, due: d(21), keyResults: [
      { id: uid(), title: 'Launch MVP to 10 beta users', target: 10, current: 4, due: d(-3) },
      { id: uid(), title: 'Get 5 paying customers', target: 5, current: 1, due: d(30) },
      { id: uid(), title: 'Publish 3 posts about it', target: 3, current: 2, due: d(3) }
    ]},
    { id: uid(), title: 'Get healthier', desc: 'Small consistent wins.', color: '#34d399', createdAt: Date.now() - 86400000 * 45, due: d(45), keyResults: [
      { id: uid(), title: 'Work out 30 times', target: 30, current: 22, due: d(5) },
      { id: uid(), title: 'Track 90 days of sleep', target: 90, current: 41, due: d(45) }
    ]},
    { id: uid(), title: 'Learn Spanish', desc: 'Conversational by year end.', color: '#ffb020', createdAt: Date.now() - 86400000 * 60, due: d(75), keyResults: [
      { id: uid(), title: 'Complete Duolingo unit 20', target: 20, current: 9, due: d(60) },
      { id: uid(), title: 'Hold a 10-minute conversation', target: 1, current: 0, due: d(120) }
    ]}
  ];
  const result = {
    tasks: [
      { id: uid(), title: 'Set up Lumen workspace', desc: 'Board, goals and first habit round.', status: 'done', priority: 'med', due: d(-1), goalId: '', tags: ['setup'], createdAt: Date.now() - 86400000 * 3, completedAt: d(0) },
      { id: uid(), title: 'Write project kickoff notes', desc: '', status: 'done', priority: 'low', due: d(-2), goalId: '', tags: ['notes'], createdAt: Date.now() - 86400000 * 2, completedAt: d(0) },
      { id: uid(), title: 'Design onboarding flow', desc: 'Sketch the first-run experience for new users.', status: 'progress', priority: 'high', due: d(1), goalId: '', tags: ['design', 'ship'], createdAt: Date.now() - 86400000 * 4, completedAt: null },
      { id: uid(), title: 'Finish quarterly review doc', desc: 'Numbers for Q2, focus areas for Q3.', status: 'today', priority: 'high', due: d(0), goalId: '', tags: ['work'], createdAt: Date.now() - 86400000, completedAt: null },
      { id: uid(), title: 'Book dentist appointment', desc: '', status: 'today', priority: 'med', due: d(0), goalId: '', tags: ['errand'], createdAt: Date.now() - 3600000, completedAt: null },
      { id: uid(), title: 'Build habit heatmap UI', desc: 'GitHub-style grid, 16 weeks.', status: 'progress', priority: 'med', due: d(2), goalId: goals[0].id, krId: goals[0].keyResults[0].id, tags: ['ship'], createdAt: Date.now() - 86400000 * 2, completedAt: null },
      { id: uid(), title: 'Write blog post about Lumen', desc: 'Draft outline only.', status: 'backlog', priority: 'low', due: d(5), goalId: goals[0].id, krId: goals[0].keyResults[2].id, tags: ['writing'], createdAt: Date.now() - 86400000, completedAt: null },
      { id: uid(), title: 'Learn 20 new Spanish words', desc: '', status: 'backlog', priority: 'med', due: d(3), goalId: goals[2].id, krId: goals[2].keyResults[0].id, tags: ['spanish'], createdAt: Date.now() - 3600000 * 5, completedAt: null }
    ],
    goals,
    habits,
    notes: [
      { id: uid(), title: 'Welcome to Lumen ✨', content: '# Welcome to Lumen\n\nYour personal command center — part Trello, part life coach.\n\n## Quick tour\n\n- **Tasks** — a kanban board. Drag cards between columns.\n- **Goals** — set objectives with measurable key results.\n- **Habits** — check in daily, watch your streaks grow.\n- **Notes** — write with light markdown, tag and pin.\n- **Voice** — record memos right in the browser.\n\n## Try it\n\n- [ ] Create your first task\n- [ ] Check off a habit today\n- [ ] Record a voice memo\n- [ ] Set a goal with key results\n\n> Everything is stored locally in your browser. Export a backup from Settings any time.', tags: ['guide'], createdAt: Date.now() - 86400000, updatedAt: Date.now() - 86400000, pinned: true, audioId: null },
      { id: uid(), title: 'Q3 goals brainstorm', content: '## Ideas\n\n- Launch the beta with a friend-of-friends invite\n- Write one deep-dive post per week\n- Morning routine: water → workout → read\n\n## Decisions\n\nFocus on **one** thing at a time. Deep work before noon.', tags: ['planning'], createdAt: Date.now() - 86400000 * 3, updatedAt: Date.now() - 86400000 * 3, pinned: false, audioId: null },
      { id: uid(), title: 'Books to read', content: '- [x] The Pragmatic Programmer\n- [ ] Atomic Habits\n- [ ] Deep Work\n- [ ] Thinking, Fast and Slow\n\n_Update once a month._', tags: ['books', 'personal'], createdAt: Date.now() - 86400000 * 6, updatedAt: Date.now() - 86400000 * 5, pinned: false, audioId: null }
    ],
    recordings: [],
    achievements: {
      'habit-first': { unlockedAt: Date.now() - 86400000 * 21 },
      'streak-7': { unlockedAt: Date.now() - 86400000 * 14 },
      'perfect-day': { unlockedAt: Date.now() - 86400000 * 7 }
    },
    settings: { theme: 'dark', pomodoroMin: 25, pomodoroDate: d(0), pomodoroCount: 0 },
    seeded: true
  };
  result.tasks.forEach(t => { t.updatedAt = t.createdAt || Date.now(); });
  result.goals.forEach(g => { g.updatedAt = g.createdAt || Date.now(); });
  result.habits.forEach(h => { h.updatedAt = Date.now(); });
  // synthetic weekly progress history so the deadline trend has data to show
  const monday0 = shiftDays(-((new Date().getDay() + 6) % 7));
  const days = [];
  for (let w = 7; w >= 0; w--) days.push(isoDate(shiftDays(-w * 7, monday0)));
  days.push(todayISO());
  result.krHistory = [];
  days.forEach((day, i) => {
    const frac = (i + 1) / days.length;
    result.goals.forEach(g => {
      const krs = (g.keyResults || []).filter(kr => kr.target > 0);
      if (!krs.length) return;
      const sum = krs.reduce((s, kr) => s + Math.floor(kr.current * frac) / kr.target, 0);
      result.krHistory.push({ goalId: g.id, day, pct: Math.round(sum / krs.length * 100) });
    });
  });
  return result;
}

/* ---------- Toasts ---------- */
function toast(msg, type = '') {
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  $('#toast-root').appendChild(el);
  setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 320); }, 2600);
}

/* ---------- Modal ---------- */
function openModal(html) {
  $('#modal-root').innerHTML = `<div class="modal-backdrop" id="backdrop">${html}</div>`;
  const b = $('#backdrop');
  b.addEventListener('mousedown', e => { if (e.target === b) closeModal(); });
  const first = $('input, textarea, select', b);
  if (first) setTimeout(() => first.focus(), 40);
}
function closeModal() { $('#modal-root').innerHTML = ''; }

/* ---------- Router ---------- */
const viewRoot = () => $('#view-root');
function currentView() {
  const h = location.hash.slice(1);
  return NAV[h] ? h : 'brief';
}
function renderView() {
  const view = currentView();
  evaluateAchievements();
  const [title, sub] = TITLES[view];
  $('#view-title').textContent = title;
  $('#view-sub').textContent = sub;
  $$('.nav-item[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  hideQuickMenu();
  updateNavBadges();
  const root = viewRoot();
  if (view === 'brief') renderBrief();
  else if (view === 'review') renderReview();
  else if (view === 'achievements') renderAchievements();
  else if (view === 'tasks') renderTasks();
  else if (view === 'goals') renderGoals();
  else if (view === 'habits') renderHabits();
  else if (view === 'notes') renderNotes();
  else if (view === 'voice') renderVoice();
  else if (view === 'settings') renderSettings();
  else renderDashboard();
  root.scrollTop = 0;
}

/* ---------- Quick add ---------- */
function hideQuickMenu() { $('#quick-menu').classList.add('hidden'); }
function bindTopbar() {
  $('#quick-add-btn').addEventListener('click', e => {
    e.stopPropagation();
    $('#quick-menu').classList.toggle('hidden');
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('.quick-add')) hideQuickMenu();
  });
  $$('#quick-menu .quick-item').forEach(b => b.addEventListener('click', () => {
    const a = b.dataset.action;
    hideQuickMenu();
    if (a === 'task') openTaskModal();
    else if (a === 'goal') openGoalModal();
    else if (a === 'habit') openHabitModal();
    else if (a === 'note') { newNote(); location.hash = '#notes'; }
    else if (a === 'voice') toggleCapture();
  }));
  $('#global-search-btn').addEventListener('click', openSearch);
  $('#global-mic-btn').addEventListener('click', toggleCapture);
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

/* ---------- Theme ---------- */
function applyTheme() {
  document.documentElement.dataset.theme = state.settings.theme === 'light' ? 'light' : 'dark';
  const t = $('#theme-toggle');
  if (t) t.innerHTML = state.settings.theme === 'light' ? `${ic('moon', 17)} <span>Dark mode</span>` : `${ic('sun', 17)} <span>Light mode</span>`;
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
function renderBrief() {
  const today = todayISO();
  const hour = new Date().getHours();
  const greet = hour < 5 ? 'Burning the midnight oil' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const dateLine = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  const todayTasks = state.tasks.filter(t => t.status !== 'done' && (t.status === 'today' || t.due === today));
  const taskRows = todayTasks.length
    ? todayTasks.map(dashTaskHTML).join('')
    : '<div class="empty-state"><div class="es-icon">🎉</div>Nothing due today. Enjoy the headroom.</div>';

  const habitsTop = [...state.habits].sort((a, b) => habitStreak(b) - habitStreak(a)).slice(0, 4);
  const habitRows = habitsTop.map(h => {
    const on = !!h.dates[today];
    const streak = habitStreak(h);
    return `<div class="brief-habit ${on ? 'on' : ''}" data-habit="${h.id}">
      <span class="hc-emoji">${h.emoji}</span>
      <span class="hc-name">${esc(h.name)}</span>
      ${on
        ? '<span class="brief-hint">✓ checked today</span>'
        : `<span class="brief-hint protect">Protect today · 🔥 ${streak}</span>`}
      <span class="check-circle">${ic('check', 12)}</span>
    </div>`;
  }).join('') || '<div class="empty-state"><div class="es-icon">🌱</div>No habits yet.</div>';

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

  viewRoot().innerHTML = `
    <div class="card brief-banner">
      <div class="brief-banner-glow"></div>
      <div class="brief-banner-main">
        <div class="brief-greet">${greet} 👋</div>
        <div class="brief-date muted">${dateLine}</div>
        <div class="brief-summary">${summaryLine}</div>
      </div>
      <div class="brief-stamp">${ic('sparkles', 40)}</div>
    </div>
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

  // quick complete a task
  $$('[data-complete]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    const t = state.tasks.find(x => x.id === b.dataset.complete);
    if (!t) return;
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
  // pinned note → open it
  $$('[data-open-note]').forEach(el => el.addEventListener('click', () => {
    selectedNoteId = el.dataset.openNote;
    location.hash = '#notes';
  }));
}

/* ============ Dashboard ============ */
function renderDashboard() {
  const today = todayISO();
  const doneToday = state.tasks.filter(t => t.completedAt === today).length;
  const streaks = state.habits.map(h => habitStreak(h));
  const bestStreak = streaks.length ? Math.max(...streaks) : 0;
  const goalsWithKR = state.goals.filter(g => g.keyResults && g.keyResults.length);
  const avgProgress = goalsWithKR.length
    ? Math.round(goalsWithKR.reduce((s, g) => s + goalProgress(g), 0) / goalsWithKR.length)
    : 0;

  const todayTasks = state.tasks.filter(t =>
    t.status !== 'done' && (t.status === 'today' || t.due === today)
  ).slice(0, 6);

  const hour = new Date().getHours();
  const greet = hour < 5 ? 'Burning the midnight oil' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const dateLine = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  const taskRows = todayTasks.length
    ? todayTasks.map(t => dashTaskHTML(t)).join('')
    : '<div class="empty-state"><div class="es-icon">🎉</div>Nothing due today. Enjoy the headroom.</div>';

  const habitChips = state.habits.map(h => {
    const on = !!h.dates[today];
    return `<div class="habit-chip ${on ? 'on' : ''}" data-habit="${h.id}">
      <span class="hc-emoji">${h.emoji}</span>
      <span class="hc-name">${esc(h.name)}</span>
      <span class="hc-streak">🔥 ${habitStreak(h)} day streak</span>
    </div>`;
  }).join('') || '<div class="empty-state"><div class="es-icon">🌱</div>No habits yet.</div>';

  const recentNotes = [...state.notes].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5).map(n =>
    `<div class="dash-task" data-open-note="${n.id}">
      <span>${n.audioId ? '🎙️' : '📝'}</span>
      <span class="t-title">${esc(n.title)}</span>
      <span class="due-chip">${n.tags && n.tags.length ? esc(n.tags[0]) : ''}</span>
    </div>`
  ).join('') || '<div class="empty-state"><div class="es-icon">📝</div>No notes yet.</div>';

  viewRoot().innerHTML = `
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
        <div><div class="stat-value">${state.notes.length}</div><div class="stat-label">notes captured</div></div>
      </div>
    </div>
    <div class="dash-grid">
      <div class="dash-stack">
        <div class="card">
          <h3 class="card-title"><span>☀️ Today</span><a class="link-btn" href="#tasks">Open board →</a></h3>
          ${taskRows}
        </div>
        <div class="card">
          <h3 class="card-title"><span>🔥 Habit check-in</span><a class="link-btn" href="#habits">All habits →</a></h3>
          ${habitChips}
        </div>
      </div>
      <div class="dash-stack">
        <div class="card">${pomodoroHTML()}</div>
        <div class="card">
          <h3 class="card-title"><span>📝 Recent notes</span><a class="link-btn" href="#notes">All notes →</a></h3>
          ${recentNotes}
        </div>
      </div>
    </div>`;

  // deadline rows → jump to goals
  $$('.dl-row').forEach(el => el.addEventListener('click', () => { location.hash = '#goals'; }));
  // one-tap bump: push a slipping deadline out by a week
  $$('.dl-bump').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    bumpDeadline(b.dataset.goalId, b.dataset.krId);
  }));
  // snooze: silence an overdue alert until a chosen date
  $$('.dl-snooze').forEach(b => b.addEventListener('click', e => {
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
  $$('.dl-unsnooze').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    snoozeItem(b.dataset.goalId, b.dataset.krId, null);
  }));
  // habit check-in
  $$('.habit-chip[data-habit]').forEach(chip => chip.addEventListener('click', () => {
    const h = state.habits.find(x => x.id === chip.dataset.habit);
    if (!h) return;
    toggleHabitDate(h, todayISO());
    renderDashboard();
  }));
  // open note
  $$('[data-open-note]').forEach(el => el.addEventListener('click', () => {
    selectedNoteId = el.dataset.openNote;
    location.hash = '#notes';
  }));
  updateNavBadges();
  // quick complete a task right from the dashboard
  $$('[data-complete]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    const t = state.tasks.find(x => x.id === b.dataset.complete);
    if (!t) return;
    const { wasDone, kr } = toggleTaskDone(t);
    save(); renderDashboard();
    if (kr) goalProgressToast(t, wasDone, kr);
  }));
  // click a dashboard task to edit it
  $$('.dash-task[data-id]').forEach(el => el.addEventListener('click', e => {
    if (e.target.closest('[data-complete]')) return;
    const t = state.tasks.find(x => x.id === el.dataset.id);
    if (t) openTaskModal(t);
  }));
  // pomodoro buttons
  bindPomodoro();
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
function goalPctAt(goal, day) {
  let best = null;
  (state.krHistory || []).forEach(h => {
    if (h.goalId === goal.id && h.day <= day && (!best || h.day > best.day)) best = h;
  });
  return best ? best.pct : null;
}
function deadlineHealthCardHTML(w) {
  const today = todayISO();
  const rows = state.goals.map(g => {
    const asOf = w.endISO < today ? w.endISO : today;
    const asOfMs = new Date(asOf + 'T00:00:00').getTime();
    const actual = goalPctAt(g, asOf);
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
    const pctStart = goalPctAt(g, w.startISO);
    const pctEnd = goalPctAt(g, w.endISO);
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
  return `<div class="card dh-card">
    <h3 class="card-title"><span>📅 Deadline health</span><a class="link-btn" href="#goals">All goals →</a></h3>
    <div class="review-goals-grid">${rows}</div>
  </div>`;
}
function habitStreakAt(h, endISO) {
  let streak = 0;
  let d = new Date(endISO + 'T00:00:00');
  if (d > new Date()) d = new Date();
  if (!h.dates[isoDate(d)]) d.setDate(d.getDate() - 1);
  while (h.dates[isoDate(d)]) { streak++; d.setDate(d.getDate() - 1); }
  return streak;
}
function renderReview() {
  const w = weekRange(reviewOffset);
  const today = todayISO();
  const weekTasks = state.tasks.filter(t => t.completedAt && t.completedAt >= w.startISO && t.completedAt <= w.endISO);
  const prevCount = state.tasks.filter(t => t.completedAt && t.completedAt >= weekRange(reviewOffset + 1).startISO && t.completedAt <= weekRange(reviewOffset + 1).endISO).length;
  const delta = weekTasks.length - prevCount;

  let habitDone = 0, habitPossible = 0;
  const habitRows = state.habits.map(h => {
    const cells = [];
    let done = 0, possible = 0;
    for (let i = 0; i < 7; i++) {
      const d = shiftDays(i, w.start);
      const key = isoDate(d);
      const future = key > today;
      const on = !future && !!h.dates[key];
      if (!future) possible++;
      if (on) done++;
      cells.push(`<span class="day readonly ${on ? 'on' : ''} ${key === today ? 'today' : ''} ${future ? 'future' : ''}" title="${fmtFull(key)}">${on ? '✓' : ''}</span>`);
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
  const notesCreated = state.notes.filter(n => {
    const k = isoDate(new Date(n.createdAt));
    return k >= w.startISO && k <= w.endISO;
  }).length;

  const taskRows = [...weekTasks].sort((a, b) => a.completedAt.localeCompare(b.completedAt)).map(t => {
    const goal = state.goals.find(g => g.id === t.goalId);
    return `<div class="dash-task">
      <span class="check-circle done">${ic('check', 12)}</span>
      <span class="t-title">${esc(t.title)}</span>
      ${goal ? `<span class="goal-chip" style="background:${goal.color}">${esc(goal.title)}</span>` : ''}
      <span class="due-chip">${fmtFull(t.completedAt)}</span>
    </div>`;
  }).join('') || '<div class="empty-state"><div class="es-icon">📭</div>Nothing completed this week.</div>';

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
  const streakAtEnd = reviewOffset === 0 ? wkStreak.current : weeklyStreakAt(weekIndex(w.end));
  const achRows = weekUnlocks.map(u => `
    <div class="dash-task">
      <span>${u.def.icon}</span>
      <span class="t-title">${esc(u.def.title)}</span>
      <span class="due-chip">${fmtFull(isoDate(new Date(u.a.unlockedAt)))}</span>
    </div>`).join('');
  const deltaTxt = delta === 0 ? 'same as last week' : delta > 0 ? `+${delta} vs last week` : `${delta} vs last week`;
  viewRoot().innerHTML = `
    <div class="toolbar review-toolbar">
      <button class="btn btn-sm" id="rev-prev" title="Previous week">${ic('chevron-left', 15)}</button>
      <span class="review-label">${w.label}</span>
      <button class="btn btn-sm" id="rev-next" title="Next week" ${reviewOffset === 0 ? 'disabled' : ''}>${ic('chevron-right', 15)}</button>
      <button class="btn btn-sm btn-ghost" id="rev-today" ${reviewOffset === 0 ? 'disabled' : ''}>This week</button>
      <div style="flex:1"></div>
    </div>
    <div class="stats">
      <div class="stat-card">
        <div class="stat-icon" style="background:rgba(52,211,153,.14)">✅</div>
        <div><div class="stat-value">${weekTasks.length}</div><div class="stat-label">tasks completed · ${deltaTxt}</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:rgba(96,93,255,.14)">🔥</div>
        <div><div class="stat-value">${habitPct}%</div><div class="stat-label">habits checked · ${habitDone}/${habitPossible} days</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:rgba(255,176,32,.14)">🎯</div>
        <div><div class="stat-value">${avgGoal}%</div><div class="stat-label">avg goal progress</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:rgba(79,140,255,.14)">📝</div>
        <div><div class="stat-value">${notesCreated}</div><div class="stat-label">notes created</div></div>
      </div>
    </div>
    ${deadlineHealthCardHTML(w)}
    <div class="dash-grid">
      <div class="dash-stack">
        <div class="card">
          <h3 class="card-title"><span>✅ Completed this week</span><a class="link-btn" href="#tasks">Open board →</a></h3>
          ${taskRows}
        </div>
        <div class="card">
          <h3 class="card-title"><span>🎯 Goal progress</span><a class="link-btn" href="#goals">All goals →</a></h3>
          <div class="review-goals-grid">${goalRows}</div>
        </div>
      </div>
      <div class="dash-stack">
        <div class="card">
          <h3 class="card-title"><span>🏆 Achievements unlocked</span><a class="link-btn" href="#achievements">All achievements →</a></h3>
          ${achRows || '<div class="empty-state"><div class="es-icon">🎁</div>Nothing unlocked this week — check-ins, completions and memos earn badges.</div>'}
          ${(streakAtEnd >= 1 || reviewOffset === 0) ? `<div class="muted" style="font-size:12px;margin-top:8px">🔁 Weekly unlock streak: <b>${streakAtEnd}</b> week${streakAtEnd === 1 ? '' : 's'}${reviewOffset === 0 && streakAtEnd >= 2 ? ' and counting' : ''}</div>` : ''}
        </div>
        <div class="card">
          <h3 class="card-title"><span>🔥 Habit week</span><a class="link-btn" href="#habits">All habits →</a></h3>
          ${habitRows}
        </div>
      </div>
    </div>`;

  $$('.dh-row').forEach(el => el.addEventListener('click', () => { location.hash = '#goals'; }));
  $('#rev-prev').addEventListener('click', () => { reviewOffset++; renderReview(); });
  $('#rev-next').addEventListener('click', () => { if (reviewOffset > 0) { reviewOffset--; renderReview(); } });
  $('#rev-today').addEventListener('click', () => { reviewOffset = 0; renderReview(); });
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
  if (changed || fresh.length) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }
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
function deadlinesCardHTML() {
  const { overdue, upcoming, snoozed } = deadlineInfo();
  const today = todayISO();
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
    return `<div class="card dl-card">
      <h3 class="card-title"><span>⏰ Deadlines</span></h3>
      <div class="empty-state" style="padding:14px 0 6px"><div class="es-icon">🎉</div>No overdue, upcoming, or snoozed deadlines.</div>
    </div>`;
  }
  return `<div class="card dl-card">
    <h3 class="card-title"><span>⏰ Deadlines</span>
      <span class="dl-counts">
        ${overdue.length ? `<span class="badge priority-high">${overdue.length} overdue</span>` : ''}
        ${upcoming.length ? `<span class="badge priority-med">${upcoming.length} soon</span>` : ''}
        ${snoozed.length ? `<span class="badge dl-snoozed-badge">${snoozed.length} snoozed</span>` : ''}
      </span>
    </h3>
    ${overdue.map(r => row(r, true)).join('')}
    ${upcoming.map(r => row(r, false)).join('')}
    ${snoozed.map(srow).join('')}
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
  else { t.status = 'done'; t.completedAt = todayISO(); }
  t.updatedAt = Date.now();
  const kr = applyTaskGoalProgress(t, !wasDone);
  evaluateAchievements();
  return { wasDone, kr };
}
function goalProgressToast(t, wasDone, kr) {
  if (!kr) return;
  const dir = wasDone ? '↩️ Reverted —' : '✅ Goal progress —';
  toast(`${dir} “${kr.title}” is now ${kr.current}/${kr.target}`);
}

/* ============ Tasks (kanban) ============ */
let taskFilter = { q: '', goal: '' };
function renderTasks() {
  const goals = state.goals;
  const filtered = state.tasks.filter(t => {
    if (taskFilter.goal && t.goalId !== taskFilter.goal) return false;
    if (taskFilter.q) {
      const hay = (t.title + ' ' + t.desc + ' ' + (t.tags || []).join(' ')).toLowerCase();
      if (!hay.includes(taskFilter.q.toLowerCase())) return false;
    }
    return true;
  });
  const cols = STATUSES.map(s => {
    const items = filtered.filter(t => t.status === s.id);
    const cards = items.map(t => taskCardHTML(t)).join('');
    return `<div class="col" data-status="${s.id}">
      <div class="col-head"><span class="col-dot" style="background:${s.color}"></span>${s.title}<span class="col-count">${items.length}</span></div>
      <div class="col-body">${cards || `<div class="empty-state" style="padding:18px 8px"><div style="font-size:14px">Drop cards here</div></div>`}</div>
      <button class="col-add" data-add-status="${s.id}">${ic('plus', 14)} Add task</button>
    </div>`;
  }).join('');

  viewRoot().innerHTML = `
    <div class="toolbar">
      <input type="text" class="search-input" id="task-q" placeholder="Search tasks…" value="${esc(taskFilter.q)}">
      <select id="task-goal">
        <option value="">All goals</option>
        ${goals.map(g => `<option value="${g.id}" ${g.id === taskFilter.goal ? 'selected' : ''}>${esc(g.title)}</option>`).join('')}
      </select>
      <button class="btn btn-ghost" id="task-clear-filter">Clear</button>
      <div style="flex:1"></div>
      <button class="btn btn-accent" id="task-new">${ic('plus', 15)} New task</button>
    </div>
    <div class="kanban">${cols}</div>`;

  // drag & drop
  $$('.task-card').forEach(card => {
    card.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', card.dataset.id);
      e.dataTransfer.effectAllowed = 'move';
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
  });
  $$('.col').forEach(col => {
    col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('drag-over'); });
    col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
    col.addEventListener('drop', e => {
      e.preventDefault();
      col.classList.remove('drag-over');
      const id = e.dataTransfer.getData('text/plain');
      const task = state.tasks.find(t => t.id === id);
      if (!task) return;
      const status = col.dataset.status;
      if (task.status !== status) {
        const completing = status === 'done';
        const wasDone = task.status === 'done';
        task.status = status;
        task.completedAt = completing ? todayISO() : null;
        task.updatedAt = Date.now();
        const kr = applyTaskGoalProgress(task, completing);
        save();
        renderTasks();
        toast(completing ? 'Nice — task completed ✅' : `Moved to ${STATUSES.find(s => s.id === status).title}`);
        if (kr) goalProgressToast(task, wasDone, kr);
      }
    });
  });
  // card click → edit
  $$('.task-card').forEach(card => card.addEventListener('click', e => {
    if (e.target.closest('[data-complete]')) return;
    openTaskModal(state.tasks.find(t => t.id === card.dataset.id));
  }));
  // quick complete
  $$('[data-complete]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    const t = state.tasks.find(x => x.id === b.dataset.complete);
    if (!t) return;
    const { wasDone, kr } = toggleTaskDone(t);
    save();
    if (currentView() === 'tasks') renderTasks(); else renderView();
    if (kr) goalProgressToast(t, wasDone, kr);
  }));
  // add column buttons
  $$('.col-add').forEach(b => b.addEventListener('click', () => openTaskModal(null, b.dataset.addStatus)));
  $('#task-new').addEventListener('click', () => openTaskModal());
  $('#task-q').addEventListener('input', e => { taskFilter.q = e.target.value; renderTasks(); });
  $('#task-goal').addEventListener('change', e => { taskFilter.goal = e.target.value; renderTasks(); });
  $('#task-clear-filter').addEventListener('click', () => { taskFilter = { q: '', goal: '' }; renderTasks(); });
}

function taskCardHTML(t) {
  const goal = state.goals.find(g => g.id === t.goalId);
  const p = PRIOS[t.priority] || PRIOS.med;
  const overdue = t.due && t.due < todayISO() && t.status !== 'done';
  const tags = (t.tags || []).map(tg => `<span class="tag">${esc(tg)}</span>`).join('');
  return `<div class="task-card" draggable="true" data-id="${t.id}">
    <div class="tc-top">
      <button class="check-circle ${t.status === 'done' ? 'done' : ''}" data-complete="${t.id}" title="Mark done">${ic('check', 12)}</button>
      <div style="flex:1;min-width:0">
        <div class="tc-title">${esc(t.title)}</div>
        ${t.desc ? `<div class="tc-desc">${esc(t.desc)}</div>` : ''}
      </div>
    </div>
    <div class="tc-meta">
      <span class="badge ${p.cls}">${p.label}</span>
      ${goal ? `<span class="goal-chip" style="background:${goal.color}">${esc(goal.title)}</span>` : ''}
      ${t.krId && goal ? `<span class="tag kr-tag">→ ${esc((goal.keyResults.find(k => k.id === t.krId) || {}).title || 'KR')}</span>` : ''}
      ${t.due ? `<span class="due-chip ${overdue ? 'overdue' : ''}">${overdue ? '⚠ ' : ''}${fmtShort(t.due)}</span>` : ''}
    </div>
    ${tags ? `<div class="tc-foot"><span></span><span class="tc-meta" style="margin-top:0">${tags}</span></div>` : ''}
  </div>`;
}

function krOptionsHTML(goalId, selected) {
  const g = state.goals.find(x => x.id === goalId);
  const opts = [`<option value="">Auto — first incomplete</option>`];
  (g && g.keyResults || []).forEach(kr => {
    const done = kr.current >= kr.target;
    opts.push(`<option value="${kr.id}" ${kr.id === selected ? 'selected' : ''}>${esc(kr.title)}${done ? ' ✓' : ''}${kr.current >= 1 ? ` (${kr.current}/${kr.target})` : ''}</option>`);
  });
  return opts.join('');
}
function openTaskModal(task, presetStatus) {
  const t = task || { title: '', desc: '', status: presetStatus || 'today', priority: 'med', due: '', goalId: '', tags: [] };
  const statusOpts = STATUSES.map(s => `<option value="${s.id}" ${s.id === t.status ? 'selected' : ''}>${s.title}</option>`).join('');
  const prioOpts = Object.keys(PRIOS).map(k => `<option value="${k}" ${k === t.priority ? 'selected' : ''}>${PRIOS[k].label}</option>`).join('');
  const goalOpts = state.goals.map(g => `<option value="${g.id}" ${g.id === t.goalId ? 'selected' : ''}>${esc(g.title)}</option>`).join('');
  openModal(`
    <div class="modal">
      <div class="modal-head"><h3>${task ? 'Edit task' : 'New task'}</h3><button class="btn-icon" onclick="closeModal()">${ic('x', 16)}</button></div>
      <div class="modal-body">
        <div class="field"><label class="field-label">Title</label><input id="f-title" type="text" value="${esc(t.title)}" placeholder="What needs doing?"></div>
        <div class="field"><label class="field-label">Description</label><textarea id="f-desc" rows="3" placeholder="Optional details…">${esc(t.desc)}</textarea></div>
        <div class="field-row">
          <div class="field"><label class="field-label">Status</label><select id="f-status">${statusOpts}</select></div>
          <div class="field"><label class="field-label">Priority</label><select id="f-prio">${prioOpts}</select></div>
        </div>
        <div class="field-row">
          <div class="field"><label class="field-label">Due date</label><input id="f-due" type="date" value="${t.due || ''}"></div>
          <div class="field"><label class="field-label">Goal</label><select id="f-goal"><option value="">— None —</option>${goalOpts}</select></div>
        </div>
        <div class="field"><label class="field-label">Key result (optional) — completing this task advances it</label><select id="f-kr">${krOptionsHTML(t.goalId, t.krId)}</select></div>
        <div class="field"><label class="field-label">Tags (comma separated)</label><input id="f-tags" type="text" value="${esc((t.tags || []).join(', '))}" placeholder="work, focus, errand"></div>
      </div>
      <div class="modal-foot">
        ${task ? `<button class="btn btn-danger" id="f-delete">Delete</button>` : ''}
        <div style="flex:1"></div>
        <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn btn-accent" id="f-save">Save</button>
      </div>
    </div>`);
  $('#f-goal').addEventListener('change', e => {
    const krSel = $('#f-kr');
    if (krSel) krSel.innerHTML = krOptionsHTML(e.target.value, '');
  });
  $('#f-save').addEventListener('click', () => {
    const title = $('#f-title').value.trim();
    if (!title) { toast('Give the task a title', 'error'); return; }
    const data = {
      title,
      desc: $('#f-desc').value.trim(),
      status: $('#f-status').value,
      priority: $('#f-prio').value,
      due: $('#f-due').value,
      goalId: $('#f-goal').value,
      tags: $('#f-tags').value.split(',').map(s => s.trim()).filter(Boolean)
    };
    const krSel = $('#f-kr');
    if (krSel) data.krId = krSel.value;
    if (task) { Object.assign(task, data); task.updatedAt = Date.now(); }
    else state.tasks.unshift(Object.assign({ id: uid(), createdAt: Date.now(), completedAt: null, updatedAt: Date.now() }, data));
    save(); closeModal(); renderView();
    toast(task ? 'Task updated' : 'Task added ✅');
  });
  const del = $('#f-delete');
  if (del) del.addEventListener('click', () => {
    state.tasks = state.tasks.filter(x => x.id !== task.id);
    tombstone('tasks', task.id);
    save(); closeModal(); renderView(); toast('Task deleted');
  });
}

/* ============ Goals ============ */
function goalProgress(g) {
  if (!g.keyResults || !g.keyResults.length) return 0;
  const sum = g.keyResults.reduce((s, kr) => s + (kr.target > 0 ? clamp(kr.current, 0, kr.target) / kr.target : 0), 0);
  return Math.round((sum / g.keyResults.length) * 100);
}
function renderGoals() {
  const cards = state.goals.map(g => {
    const pct = goalProgress(g);
    const today = todayISO();
    const goalOverdue = g.due && g.due < today && pct < 100;
    const krs = g.keyResults.map(kr => {
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
      <div class="goal-foot">
        <span class="goal-created">Started ${fmtShort(isoDate(new Date(g.createdAt)))}${g.due ? ` · ${goalOverdue ? '<span class="kr-overdue">⚠ overdue ' : 'due '}${fmtShort(g.due)}${goalOverdue ? '</span>' : ''}` : ''}</span>
        <div style="display:flex;gap:4px">
          <button class="btn-icon" data-edit-goal="${g.id}" title="Edit">${ic('pencil', 15)}</button>
          <button class="btn-icon" data-del-goal="${g.id}" title="Delete">${ic('trash', 15)}</button>
        </div>
      </div>
    </div>`;
  }).join('') || '<div class="empty-state"><div class="es-icon">🎯</div>No goals yet. Set your first one.<br><br><button class="btn btn-accent" id="goal-new-empty">+ New goal</button></div>';

  updateNavBadges();
  viewRoot().innerHTML = `
    <div class="toolbar">
      <span class="muted">${state.goals.length} goal${state.goals.length === 1 ? '' : 's'}</span>
      <div style="flex:1"></div>
      <button class="btn btn-accent" id="goal-new">${ic('plus', 15)} New goal</button>
    </div>
    <div class="goals-grid">${cards}</div>`;

  $$('[data-edit-goal]').forEach(b => b.addEventListener('click', () => openGoalModal(state.goals.find(g => g.id === b.dataset.editGoal))));
  $$('[data-del-goal]').forEach(b => b.addEventListener('click', () => {
    const g = state.goals.find(x => x.id === b.dataset.delGoal);
    if (g && confirm(`Delete goal “${g.title}”?`)) {
      state.goals = state.goals.filter(x => x.id !== g.id);
      tombstone('goals', g.id);
      if (state.krHistory) state.krHistory = state.krHistory.filter(h => h.goalId !== g.id);
      save(); renderGoals(); toast('Goal deleted');
    }
  }));
  $$('.kr-input').forEach(inp => inp.addEventListener('change', () => {
    const g = state.goals.find(x => x.id === inp.dataset.goal);
    const kr = g && g.keyResults.find(k => k.id === inp.dataset.kr);
    if (g && kr) {
      kr.current = clamp(parseFloat(inp.value) || 0, 0, kr.target);
      g.updatedAt = Date.now();
      save(); recordGoalSnapshot(g); renderGoals();
    }
  }));
  const btn = $('#goal-new') || $('#goal-new-empty');
  if (btn) btn.addEventListener('click', () => openGoalModal());
}

function openGoalModal(goal) {
  const g = goal || { title: '', desc: '', color: COLORS[0], keyResults: [{ id: uid(), title: '', target: 10, current: 0 }] };
  const swatches = COLORS.map(c => `<button class="swatch ${c === g.color ? 'active' : ''}" data-color="${c}" style="background:${c}"></button>`).join('');
  const krRows = g.keyResults.map(kr => krRowHTML(kr)).join('');
  openModal(`
    <div class="modal">
      <div class="modal-head"><h3>${goal ? 'Edit goal' : 'New goal'}</h3><button class="btn-icon" onclick="closeModal()">${ic('x', 16)}</button></div>
      <div class="modal-body">
        <div class="field"><label class="field-label">Goal title</label><input id="g-title" type="text" value="${esc(g.title)}" placeholder="e.g. Get healthier"></div>
        <div class="field"><label class="field-label">Description</label><input id="g-desc" type="text" value="${esc(g.desc)}" placeholder="Why does this matter?"></div>
        <div class="field-row">
          <div class="field"><label class="field-label">Target date</label><input id="g-due" type="date" value="${g.due || ''}"></div>
          <div class="field"><label class="field-label">Color</label><div class="swatches">${swatches}</div></div>
        </div>
        <div class="field"><label class="field-label">Key results</label>
          <div id="kr-rows">${krRows}</div>
          <button class="btn btn-sm btn-ghost" id="kr-add">${ic('plus', 13)} Add key result</button>
        </div>
      </div>
      <div class="modal-foot">
        ${goal ? `<button class="btn btn-danger" id="g-delete">Delete</button>` : ''}
        <div style="flex:1"></div>
        <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn btn-accent" id="g-save">Save</button>
      </div>
    </div>`);
  $$('.swatch').forEach(s => s.addEventListener('click', () => {
    $$('.swatch').forEach(x => x.classList.remove('active'));
    s.classList.add('active');
  }));
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
    const data = { title, desc: $('#g-desc').value.trim(), color, keyResults: krs, due: $('#g-due').value || '' };
    let target;
    if (goal) { Object.assign(goal, data); goal.updatedAt = Date.now(); target = goal; }
    else { target = Object.assign({ id: uid(), createdAt: Date.now(), updatedAt: Date.now() }, data); state.goals.push(target); }
    save(); recordGoalSnapshot(target); closeModal(); renderGoals();
    toast(goal ? 'Goal updated' : 'Goal created 🎯');
  });
  const del = $('#g-delete');
  if (del) del.addEventListener('click', () => {
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
function habitStreak(h) {
  let streak = 0;
  const d = new Date();
  if (!h.dates[isoDate(d)]) d.setDate(d.getDate() - 1);
  while (h.dates[isoDate(d)]) { streak++; d.setDate(d.getDate() - 1); }
  return streak;
}
function habitBest(h) {
  let best = 0, cur = 0;
  const d = new Date(); d.setDate(d.getDate() - 364);
  for (let i = 0; i < 400; i++) {
    if (h.dates[isoDate(d)]) { cur++; best = Math.max(best, cur); }
    else cur = 0;
    d.setDate(d.getDate() + 1);
    if (d > new Date()) break;
  }
  return best;
}
function toggleHabitDate(h, date) {
  if (date > todayISO()) return;
  if (h.dates[date]) delete h.dates[date];
  else h.dates[date] = true;
  h.updatedAt = Date.now();
  save();
  evaluateAchievements();
}
function weekDays() {
  const now = new Date();
  const dow = (now.getDay() + 6) % 7; // Mon = 0
  const out = [];
  for (let i = 0; i < 7; i++) out.push(isoDate(shiftDays(i - dow)));
  return out;
}
function heatmapHTML(h) {
  const today = new Date();
  const start = shiftDays(-111);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  let html = '';
  for (let w = 0; w < 16; w++) {
    for (let d = 0; d < 7; d++) {
      const dt = shiftDays(w * 7 + d, start);
      const key = isoDate(dt);
      const isToday = key === todayISO();
      const on = !!h.dates[key];
      const future = dt > today;
      let cls = 'hm';
      if (on) {
        let n = 0; const c = new Date(dt);
        while (h.dates[isoDate(c)]) { n++; c.setDate(c.getDate() - 1); }
        cls += ' l' + clamp(Math.ceil(n / 3), 1, 3);
      }
      if (isToday) cls += ' today';
      if (future) cls += ' future';
      html += `<span class="${cls}" title="${key}: ${on ? 'done' : future ? '—' : 'missed'}"></span>`;
    }
  }
  return html;
}
function renderHabits() {
  const today = todayISO();
  const days = weekDays();
  const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((l, i) =>
    `<span class="day-label">${l}</span>`).join('');
  const cards = state.habits.map(h => {
    const weekCells = days.map(day => {
      const on = !!h.dates[day];
      const isToday = day === today;
      const future = day > today;
      return `<span class="day ${on ? 'on' : ''} ${isToday ? 'today' : ''} ${future ? 'future' : ''}" data-date="${day}" data-habit="${h.id}" title="${fmtFull(day)}">${on ? '✓' : isToday ? '·' : ''}</span>`;
    }).join('');
    return `<div class="habit-card">
      <div class="habit-head">
        <div class="habit-emoji" style="border-color:${h.color}33;background:${h.color}1a">${h.emoji}</div>
        <div style="flex:1;min-width:0">
          <div class="habit-name">${esc(h.name)}</div>
          <div class="habit-stats"><span>🔥 <b>${habitStreak(h)}</b> day streak</span><span>🏆 best <b>${habitBest(h)}</b></span></div>
        </div>
        <button class="btn-icon" data-del-habit="${h.id}" title="Delete habit">${ic('trash', 15)}</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:4px">${labels}</div>
      <div class="week">${weekCells}</div>
      <div class="heatmap">${heatmapHTML(h)}</div>
      <div class="heatmap-legend"><span>Less</span><span class="hm"></span><span class="hm l1"></span><span class="hm l2"></span><span class="hm l3"></span><span>More</span></div>
    </div>`;
  }).join('') || '<div class="empty-state"><div class="es-icon">🌱</div>No habits yet. Start building one.<br><br><button class="btn btn-accent" id="habit-new-empty">+ New habit</button></div>';

  viewRoot().innerHTML = `
    <div class="toolbar">
      <span class="muted">${state.habits.length} habit${state.habits.length === 1 ? '' : 's'} · tap a day to check in</span>
      <div style="flex:1"></div>
      <button class="btn btn-accent" id="habit-new">${ic('plus', 15)} New habit</button>
    </div>
    <div class="habits-grid">${cards}</div>`;

  $$('.day[data-habit]').forEach(day => day.addEventListener('click', () => {
    if (day.classList.contains('future')) return;
    const h = state.habits.find(x => x.id === day.dataset.habit);
    if (h) { toggleHabitDate(h, day.dataset.date); renderHabits(); }
  }));
  $$('[data-del-habit]').forEach(b => b.addEventListener('click', () => {
    const h = state.habits.find(x => x.id === b.dataset.delHabit);
    if (h && confirm(`Delete habit “${h.name}”?`)) {
      state.habits = state.habits.filter(x => x.id !== h.id);
      tombstone('habits', h.id);
      save(); renderHabits(); toast('Habit deleted');
    }
  }));
  const btn = $('#habit-new') || $('#habit-new-empty');
  if (btn) btn.addEventListener('click', () => openHabitModal());
}

function openHabitModal() {
  const emojiPicks = EMOJIS.map(e => `<button class="emoji-pick" data-emoji="${e}">${e}</button>`).join('');
  const swatches = COLORS.map(c => `<button class="swatch ${c === COLORS[1] ? 'active' : ''}" data-color="${c}" style="background:${c}"></button>`).join('');
  openModal(`
    <div class="modal">
      <div class="modal-head"><h3>New habit</h3><button class="btn-icon" onclick="closeModal()">${ic('x', 16)}</button></div>
      <div class="modal-body">
        <div class="field"><label class="field-label">Habit name</label><input id="h-name" type="text" placeholder="e.g. Drink water" autofocus></div>
        <div class="field"><label class="field-label">Icon</label><div class="emoji-picks">${emojiPicks}</div></div>
        <div class="field"><label class="field-label">Color</label><div class="swatches">${swatches}</div></div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn btn-accent" id="h-save">Create habit</button>
      </div>
    </div>`);
  let emoji = EMOJIS[0], color = COLORS[1];
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
    state.habits.push({ id: uid(), name, emoji, color, dates: {}, updatedAt: Date.now() });
    save(); closeModal(); renderHabits(); toast('Habit created 🌱');
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
function achievementMetrics() {
  const tasksDone = state.tasks.filter(t => t.status === 'done').length;
  const krsDone = state.goals.reduce((s, g) => s + (g.keyResults || []).filter(kr => kr.current >= kr.target).length, 0);
  const goalsDone = state.goals.filter(g => goalProgress(g) >= 100).length;
  const notes = state.notes.length;
  const recordings = state.recordings.length;
  const bestStreak = state.habits.length ? Math.max(...state.habits.map(habitBest)) : 0;
  const habitCheckins = state.habits.reduce((s, h) => s + Object.keys(h.dates || {}).length, 0);
  const wk = weeklyUnlockStreaks();
  let perfectDays = 0, perfectWeeks = 0;
  if (state.habits.length) {
    const days = [];
    const d = new Date(); d.setDate(d.getDate() - 399);
    for (let i = 0; i < 400; i++) { days.push(isoDate(d)); d.setDate(d.getDate() + 1); }
    const allOn = day => state.habits.every(h => h.dates[day]);
    perfectDays = days.filter(allOn).length;
    for (let i = 0; i + 7 <= days.length; i++) {
      let ok = true;
      for (let j = 0; j < 7; j++) if (!allOn(days[i + j])) { ok = false; break; }
      if (ok) { perfectWeeks++; i += 6; }
    }
  }
  return { tasksDone, krsDone, goalsDone, notes, recordings, bestStreak, habitCheckins, perfectDays, perfectWeeks, weeklyStreak: wk.longest, weeklyCurrent: wk.current };
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
function renderAchievements() {
  const m = evaluateAchievements();
  const earned = ACHIEVEMENTS.filter(a => state.achievements[a.key]);
  const cards = ACHIEVEMENTS.map(a => {
    const cur = Math.min(a.metric(m), a.target);
    const pct = Math.round(cur / a.target * 100);
    const got = state.achievements[a.key];
    return `<div class="ach-card ${got ? 'earned' : ''}" title="${esc(a.desc)}">
      <div class="ach-icon">${a.icon}</div>
      <div class="ach-body">
        <div class="ach-title">${esc(a.title)}</div>
        <div class="ach-desc">${esc(a.desc)}</div>
        <div class="bar"><div class="bar-fill ${got ? 'done' : ''}" style="width:${pct}%${got ? ';background:var(--grad)' : ''}"></div></div>
        <div class="ach-meta">${got ? `Unlocked ${new Date(got.unlockedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} 🎉` : `${cur} / ${a.target}`}</div>
      </div>
    </div>`;
  }).join('');
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
      return `<div class="card"><h3 class="card-title"><span>🔁 Weekly consistency</span></h3>
        <div class="ach-weeks">${cells.join('')}</div>
        <div class="dash-task"><span>📅</span><span class="t-title">Unlock streak — current</span><span class="due-chip">${m.weeklyCurrent} week${m.weeklyCurrent === 1 ? '' : 's'}</span></div>
        <div class="dash-task"><span>🏆</span><span class="t-title">Unlock streak — best</span><span class="due-chip">${m.weeklyStreak} week${m.weeklyStreak === 1 ? '' : 's'}</span></div>
        <div class="muted" style="font-size:12px;margin-top:8px">Unlock at least one achievement every week to keep the streak alive — miss a week and it resets.</div></div>`;
    })()}
    ${topHabits.length ? `<div class="card"><h3 class="card-title"><span>✨ Current best streaks</span></h3>
      <div class="ach-streaks">${topHabits.map(h => `<div class="dash-task"><span>${h.emoji}</span><span class="t-title">${esc(h.name)}</span><span class="due-chip">best ${habitBest(h)}d · now ${habitStreak(h)}d</span></div>`).join('')}</div></div>` : ''}
    <div class="ach-grid">${cards}</div>`;
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
function renderNotes() {
  const q = (noteFilterQ || '').toLowerCase();
  const notes = [...state.notes].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.updatedAt - a.updatedAt)
    .filter(n => !q || (n.title + ' ' + n.content + ' ' + (n.tags || []).join(' ')).toLowerCase().includes(q));

  const items = notes.map(n => `
    <div class="note-item ${n.id === selectedNoteId ? 'active' : ''}" data-note="${n.id}">
      <div class="ni-title">${n.pinned ? ic('pin', 13) : ''}${n.audioId ? '🎙️ ' : ''}${esc(n.title) || 'Untitled'}</div>
      ${n.content ? `<div class="ni-snippet">${esc(n.content.replace(/[#*`>_-]/g, '').slice(0, 90))}</div>` : ''}
      <div class="ni-meta">
        <span class="ni-date">${fmtWhen(n.updatedAt)}</span>
        ${(n.tags || []).slice(0, 3).map(t => `<span class="tag">${esc(t)}</span>`).join('')}
        <button class="btn-icon pin-btn ${n.pinned ? 'on' : ''}" data-pin="${n.id}" title="${n.pinned ? 'Unpin' : 'Pin'}">${ic('pin', 13)}</button>
      </div>
    </div>`).join('') || '<div class="empty-state"><div class="es-icon">🔍</div>No notes match.</div>';

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
        <div class="note-items">${items}</div>
      </div>
      ${editor}
    </div>`;

  $('#note-q').addEventListener('input', e => { noteFilterQ = e.target.value; renderNotes(); });
  $$('.note-item').forEach(item => item.addEventListener('click', e => {
    if (e.target.closest('[data-pin]')) return;
    selectedNoteId = item.dataset.note;
    renderNotes();
  }));
  $$('[data-pin]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    const n = state.notes.find(x => x.id === b.dataset.pin);
    if (n) { n.pinned = !n.pinned; n.updatedAt = Date.now(); save(); renderNotes(); }
  }));
  const nbtn = $('#note-new') || $('#note-new-empty');
  if (nbtn) nbtn.addEventListener('click', () => { newNote(); renderNotes(); });
  if (note) bindNoteEditor(note);
}
let noteFilterQ = '';

function noteEditorHTML(note) {
  return `<div class="note-editor">
    <div class="note-editor-head">
      <input id="ne-title" type="text" value="${esc(note.title)}" placeholder="Untitled note">
      <button class="btn btn-sm btn-ghost" id="ne-preview">${notePreview ? 'Edit' : 'Preview'}</button>
      <button class="btn-icon ${note.pinned ? 'pin-btn on' : 'pin-btn'}" id="ne-pin" title="Pin">${ic('pin', 15)}</button>
      <button class="btn-icon" id="ne-del" title="Delete note" style="color:var(--red)">${ic('trash', 15)}</button>
    </div>
    <div class="note-tags-row">
      ${(note.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('')}
      <input id="ne-tags" type="text" value="${esc((note.tags || []).join(', '))}" placeholder="tags, comma separated">
    </div>
    ${note.audioId ? `<div class="audio-box"><span>🎙️</span><span class="audio-title">Voice memo attached</span><button class="btn btn-sm btn-ghost" id="ne-audio-play">${ic('play', 13)} Play</button></div>` : ''}
    <div class="note-editor-body">
      ${notePreview
        ? `<div class="note-preview">${renderMd(note.content)}</div>`
        : `<textarea class="note-textarea" id="ne-content" placeholder="Write your thoughts…">${esc(note.content)}</textarea>`}
    </div>
  </div>`;
}
function bindNoteEditor(note) {
  const title = $('#ne-title');
  const content = $('#ne-content');
  const tags = $('#ne-tags');
  const saveNote = debounce(() => { note.updatedAt = Date.now(); save(); }, 350);
  if (title) title.addEventListener('input', () => { note.title = title.value; saveNote(); });
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
      state.notes = state.notes.filter(n => n.id !== note.id);
      tombstone('notes', note.id);
      selectedNoteId = null; save(); renderNotes(); toast('Note deleted');
    }
  });
  const playBtn = $('#ne-audio-play');
  if (playBtn) playBtn.addEventListener('click', () => togglePlay(note.audioId, playBtn));
}
function newNote() {
  const n = { id: uid(), title: '', content: '', tags: [], pinned: false, createdAt: Date.now(), updatedAt: Date.now(), audioId: null };
  state.notes.unshift(n);
  selectedNoteId = n.id;
  notePreview = false;
  save();
}

/* Lightweight markdown */
function renderMd(md) {
  const lines = String(md || '').replace(/\r\n/g, '\n').split('\n');
  let html = '', inCode = false, codeLines = [], inList = false;
  const inline = s => esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/\*([^*]+)\*/g, '<i>$1</i>')
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  for (const raw of lines) {
    const t = raw.trim();
    if (t.startsWith('```')) {
      if (!inCode) { inCode = true; codeLines = []; }
      else { inCode = false; html += `<pre><code>${esc(codeLines.join('\n'))}</code></pre>`; }
      continue;
    }
    if (inCode) { codeLines.push(raw); continue; }
    if (!t) { if (inList) { html += '</ul>'; inList = false; } continue; }
    const h = t.match(/^(#{1,3})\s+(.*)/);
    if (h) { if (inList) { html += '</ul>'; inList = false; } html += `<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`; continue; }
    const cb = t.match(/^[-*]\s+\[( |x|X)\]\s+(.*)/);
    if (cb) {
      if (!inList) { html += '<ul>'; inList = true; }
      html += `<li><span class="${cb[1].toLowerCase() === 'x' ? 'md-check' : 'md-uncheck'}">${cb[1].toLowerCase() === 'x' ? '☑' : '☐'}</span> ${inline(cb[2])}</li>`;
      continue;
    }
    const li = t.match(/^[-*]\s+(.*)/);
    if (li) { if (!inList) { html += '<ul>'; inList = true; } html += `<li>${inline(li[1])}</li>`; continue; }
    const qt = t.match(/^&gt;\s?(.*)/) || t.match(/^>\s?(.*)/);
    if (qt) { if (inList) { html += '</ul>'; inList = false; } html += `<blockquote>${inline(qt[1])}</blockquote>`; continue; }
    if (inList) { html += '</ul>'; inList = false; }
    html += `<p>${inline(t)}</p>`;
  }
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
  $$('[data-del-rec]').forEach(b => b.addEventListener('click', async () => {
    const r = state.recordings.find(x => x.id === b.dataset.delRec);
    if (!r) return;
    if (confirm(`Delete “${r.name}”?`)) {
      state.recordings = state.recordings.filter(x => x.id !== r.id);
      await blobDelete(r.id);
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
  const n = {
    id: uid(), title: r.name, content: r.transcript || 'Voice memo — no transcription available for this one.',
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
  return `<h3 class="card-title"><span>🍅 Focus timer</span></h3>
    <div class="pomo-wrap">
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
          save();
          toast('🍅 Session complete — take a break!', 'success');
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
  const ssEl = $('.pomo-session');
  if (ssEl) {
    const ss = state.settings.pomodoroDate === todayISO() ? state.settings.pomodoroCount : 0;
    ssEl.textContent = `🍅 ${ss} session${ss === 1 ? '' : 's'} completed today`;
  }
}

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
  return { peerId: genPeerId(), rev: 1, autoSync: true, deviceName: '', passHash: '', tombstones: { tasks: [], goals: [], habits: [], notes: [], recordings: [] } };
}
function loadSyncMeta() {
  try {
    const raw = localStorage.getItem(SYNC_KEY);
    if (raw) return Object.assign(defaultSyncMeta(), JSON.parse(raw));
  } catch (e) { /* ignore */ }
  return defaultSyncMeta();
}
function saveSyncMeta() { try { localStorage.setItem(SYNC_KEY, JSON.stringify(syncMeta)); } catch (e) { /* ignore */ } }
async function hashPass(p) {
  const data = new TextEncoder().encode('lumen-sync::' + p);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

let syncMeta = loadSyncMeta();
if (!localStorage.getItem(SYNC_KEY)) saveSyncMeta(); // persist the ID immediately so it survives reloads
let peer = null, conn = null, peerStatus = 'offline', peerStatusDetail = '';
let suppressAutoPush = false, autoPushTimer = null;
const PeerCtor = window.Peer || null;
const isConnected = () => !!(conn && conn.open);

function ensurePeer() {
  if (peer || !PeerCtor) return;
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
    try { c.send({ type: 'hello', name: syncMeta.deviceName, pass: syncMeta.passHash }); } catch (_) {}
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
  if (!PeerCtor) { toast('Sync library not loaded (offline?)', 'error'); return; }
  if (!peer) ensurePeer();
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
    if (syncMeta.passHash && d.pass !== syncMeta.passHash) {
      toast('Sync passphrase mismatch — closing connection', 'error');
      try { c.close(); } catch (_) {}
      return;
    }
    if (!syncMeta.passHash && d.pass) {
      toast('Other device has a passphrase set — set the same one here to connect', 'error');
      try { c.close(); } catch (_) {}
      return;
    }
    if (d.name) { peerStatusDetail = 'Connected to ' + d.name; updateSyncUI(); }
    return;
  }
  if (d.type === 'sync' && d.data) {
    suppressAutoPush = true;
    let changed = false;
    try {
      changed = applyMerge(d.data, d.rev || 0);
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
  const key = arr => JSON.stringify([...(arr || [])].sort((a, b) => (a.id < b.id ? -1 : 1)));
  const keyAch = a => JSON.stringify(Object.entries(a || {}).sort((x, y) => (x[0] < y[0] ? -1 : 1)));
  const before = key(state.tasks) + key(state.goals) + key(state.habits) + key(state.notes) + key(state.recordings) + keyAch(state.achievements);
  const mergeOne = (local, incoming, tombKey) => {
    const tomb = new Set(syncMeta.tombstones[tombKey] || []);
    ((inc.deleted && inc.deleted[tombKey]) || []).forEach(id => tomb.add(id));
    syncMeta.tombstones[tombKey] = [...tomb];
    const byId = new Map();
    (local || []).forEach(it => { if (!tomb.has(it.id)) byId.set(it.id, it); });
    (incoming || []).forEach(it => {
      if (!it || !it.id || tomb.has(it.id)) return;
      const ex = byId.get(it.id);
      if (!ex || (it.updatedAt || 0) > (ex.updatedAt || 0)) byId.set(it.id, it);
    });
    return [...byId.values()];
  };
  state.tasks = mergeOne(state.tasks, inc.tasks, 'tasks');
  state.goals = mergeOne(state.goals, inc.goals, 'goals');
  state.habits = mergeOne(state.habits, inc.habits, 'habits');
  state.notes = mergeOne(state.notes, inc.notes, 'notes');
  state.recordings = mergeOne(state.recordings, inc.recordings, 'recordings');
  state.achievements = Object.assign({}, state.achievements || {});
  Object.keys(inc.achievements || {}).forEach(k => {
    const iu = (inc.achievements[k] || {}).unlockedAt || 0;
    if (!state.achievements[k] || iu > ((state.achievements[k] || {}).unlockedAt || 0)) state.achievements[k] = inc.achievements[k];
  });
  const changed = before !== key(state.tasks) + key(state.goals) + key(state.habits) + key(state.notes) + key(state.recordings) + keyAch(state.achievements);
  saveSyncMeta();
  if (changed) {
    syncMeta.rev = Math.max(syncMeta.rev || 0, incomingRev) + 1;
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
        achievements: state.achievements,
        deleted: syncMeta.tombstones
      }
    });
  } catch (e) { /* ignore */ }
}

function maybeAutoSync() {
  if (suppressAutoPush || !syncMeta.autoSync || !isConnected()) return;
  clearTimeout(autoPushTimer);
  autoPushTimer = setTimeout(pushState, 1500);
}

function tombstone(col, id) {
  if (!syncMeta.tombstones[col]) syncMeta.tombstones[col] = [];
  syncMeta.tombstones[col].push(id);
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
  if (!PeerCtor) return 'Unavailable — sync library failed to load';
  if (peerStatus === 'connected') return '🟢 ' + (peerStatusDetail || 'Connected');
  if (peerStatus === 'connecting') return '🟡 ' + peerStatusDetail;
  if (peerStatus === 'starting') return '🟡 Starting…';
  if (peerStatus === 'error') return '🔴 ' + peerStatusDetail;
  return '⚪ Not connected';
}
function updateSyncUI() {
  const el = $('#sync-status');
  if (el) el.textContent = syncStatusText();
  const btn = $('#sync-now');
  if (btn) btn.disabled = !isConnected();
}
function syncCardHTML() {
  if (!PeerCtor) {
    return `<div class="card"><h3 class="card-title">🔄 Cross-device sync</h3><p class="muted" style="font-size:13px;line-height:1.5">The sync library (PeerJS) couldn't load — check your internet connection and reload the page. Everything else works fully offline.</p></div>`;
  }
  return `<div class="card">
    <h3 class="card-title">🔄 Cross-device sync</h3>
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
    <p class="muted" style="font-size:12px;margin-top:10px;line-height:1.5">Peer-to-peer over WebRTC (PeerJS free signaling). Both devices need internet and must be online at the same time. Edits to the same item are merged newest-first. Voice recordings transfer over the same connection — long memos take a moment to arrive.</p>
  </div>`;
}
window.addEventListener('beforeunload', () => { try { peer && peer.destroy(); } catch (_) {} });

/* ============ Settings ============ */
function renderSettings() {
  const totalTasks = state.tasks.length, doneTasks = state.tasks.filter(t => t.status === 'done').length;
  viewRoot().innerHTML = `
    <div class="settings-grid">
      ${syncCardHTML()}
      <div class="card">
        <h3 class="card-title">📲 Install app</h3>
        ${installCardBody()}
      </div>
      <div class="card">
        <h3 class="card-title">🔔 Notifications</h3>
        <div class="set-row"><span class="stat-inline">Notify when a deadline goes overdue</span>
          <input type="checkbox" id="notify-toggle" ${state.settings.notifyOverdue ? 'checked' : ''}>
        </div>
        <div class="set-row"><span class="stat-inline">Browser permission</span>
          <span class="stat-inline" id="notify-status">${notifyPermission() === 'granted' ? 'Granted ✅' : notifyPermission() === 'denied' ? 'Denied' : notifyPermission() === 'default' ? 'Not asked yet' : 'Not supported'}</span>
        </div>
        <div class="set-row"><span class="stat-inline">Test</span>
          <button class="btn btn-sm" id="notify-test">Send test notification</button>
        </div>
        <p class="muted" style="font-size:12px;margin-top:10px;line-height:1.5">Fires once when a goal or key result becomes overdue while Lumen is open (checked every minute and after changes). Bumping or snoozing it will re-arm the alert if it goes overdue again.</p>
      </div>
      <div class="card">
        <h3 class="card-title">Appearance</h3>
        <div class="set-row"><span>Theme</span>
          <div class="theme-btns">
            <button class="btn btn-sm ${state.settings.theme === 'dark' ? 'active' : ''}" data-theme="dark">${ic('moon', 14)} Dark</button>
            <button class="btn btn-sm ${state.settings.theme === 'light' ? 'active' : ''}" data-theme="light">${ic('sun', 14)} Light</button>
          </div>
        </div>
      </div>
      <div class="card">
        <h3 class="card-title">Your data</h3>
        <div class="set-row"><span class="stat-inline"><b>${totalTasks}</b> tasks · <b>${doneTasks}</b> done</span></div>
        <div class="set-row"><span class="stat-inline"><b>${state.goals.length}</b> goals · <b>${state.habits.length}</b> habits · <b>${state.notes.length}</b> notes · <b>${state.recordings.length}</b> recordings</span></div>
        <div class="set-row"><span class="stat-inline">Everything is stored in your browser.</span></div>
        <div class="set-row">
          <span class="stat-inline">Backup (JSON)</span>
          <div style="display:flex;gap:6px">
            <button class="btn btn-sm" id="set-export">${ic('download', 13)} Export</button>
            <button class="btn btn-sm" id="set-import">${ic('upload', 13)} Import</button>
          </div>
        </div>
        <div class="set-row">
          <span class="stat-inline">Danger zone</span>
          <div style="display:flex;gap:6px">
            <button class="btn btn-sm btn-ghost" id="set-reset">Reset sample data</button>
            <button class="btn btn-sm btn-danger" id="set-clear">Clear all</button>
          </div>
        </div>
        <input type="file" id="set-import-file" accept="application/json" class="hidden">
      </div>
      <div class="card">
        <h3 class="card-title">Shortcuts</h3>
        <div class="kbd-list">
          <div class="row"><span>Search everything</span><span><kbd>Ctrl</kbd> <kbd>K</kbd></span></div>
          <div class="row"><span>Close dialog / menu</span><span><kbd>Esc</kbd></span></div>
          <div class="row"><span>New task (from board)</span><span><kbd>N</kbd></span></div>
        </div>
      </div>
    </div>`;

  $$('[data-theme]').forEach(b => b.addEventListener('click', () => {
    state.settings.theme = b.dataset.theme;
    save(); applyTheme(); renderSettings();
  }));
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
  $('#set-export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `lumen-backup-${todayISO()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast('Backup downloaded (audio stays in browser storage)');
  });
  $('#set-import').addEventListener('click', () => $('#set-import-file').click());
  $('#set-import-file').addEventListener('change', e => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || !Array.isArray(data.tasks)) throw new Error('bad file');
        state = Object.assign({}, state, data, { settings: Object.assign(state.settings, data.settings || {}) });
        save(); renderView(); toast('Backup imported ✅', 'success');
      } catch (err) { toast('That file isn’t a valid Lumen backup', 'error'); }
    };
    reader.readAsText(f);
    e.target.value = '';
  });
  $('#set-reset').addEventListener('click', () => {
    if (confirm('Replace everything with fresh sample data?')) {
      state = seed(); save(); renderView(); toast('Sample data restored');
    }
  });
  $('#set-clear').addEventListener('click', async () => {
    if (confirm('Delete ALL data — tasks, goals, habits, notes, recordings?')) {
      state = { tasks: [], goals: [], habits: [], notes: [], recordings: [], krHistory: [], achievements: {}, settings: Object.assign({}, state.settings), seeded: true };
      save();
      try { await blobClear(); } catch (_) {}
      renderView(); toast('All data cleared');
    }
  });

  /* notifications */
  $('#notify-toggle').addEventListener('change', e => setNotifyEnabled(e.target.checked));
  $('#notify-test').addEventListener('click', () => {
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

  /* cross-device sync */
  ensurePeer();
  updateSyncUI();
  $('#sync-copy').addEventListener('click', () => {
    navigator.clipboard.writeText(syncMeta.peerId)
      .then(() => toast('Device ID copied'))
      .catch(() => toast('Copy failed — select it manually', 'error'));
  });
  $('#sync-new-id').addEventListener('click', () => {
    if (confirm('Generate a new device ID? Existing connections will drop.')) {
      syncMeta.peerId = genPeerId(); saveSyncMeta();
      if (peer) { try { peer.destroy(); } catch (_) {} peer = null; conn = null; }
      peerStatus = 'offline'; peerStatusDetail = '';
      ensurePeer(); renderSettings();
    }
  });
  $('#sync-connect').addEventListener('click', () => connectToDevice($('#sync-connect-id').value));
  $('#sync-connect-id').addEventListener('keydown', e => { if (e.key === 'Enter') connectToDevice(e.target.value); });
  $('#sync-name').addEventListener('change', e => { syncMeta.deviceName = e.target.value.trim(); saveSyncMeta(); });
  $('#sync-pass').addEventListener('change', async e => {
    const v = e.target.value.trim();
    if (!v) { syncMeta.passHash = ''; saveSyncMeta(); toast('Passphrase removed'); return; }
    syncMeta.passHash = await hashPass(v);
    saveSyncMeta();
    toast('Passphrase set — enter the same one on your other device');
    e.target.value = '';
  });
  $('#sync-auto').addEventListener('change', e => { syncMeta.autoSync = e.target.checked; saveSyncMeta(); });
  $('#sync-now').addEventListener('click', () => { pushState(); requestMissingAudio(); toast('State sent to connected device'); });
}

/* ============ Global search ============ */
function openSearch() {
  $('#search-root').innerHTML = `
    <div class="search-overlay" id="search-overlay">
      <div class="search-panel">
        <div class="search-input-bar">
          <span style="color:var(--accent)">${ic('search', 18)}</span>
          <input type="text" id="search-input" placeholder="Search tasks, notes, goals, habits…" autofocus>
          <kbd>Esc</kbd>
        </div>
        <div class="search-results" id="search-results"></div>
      </div>
    </div>`;
  const input = $('#search-input');
  const run = () => {
    const q = input.value.trim().toLowerCase();
    const results = [];
    const push = r => results.push(r);
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
      state.tasks.filter(t => matches(t.title + ' ' + (t.tags || []).join(' '))).slice(0, 5)
        .forEach(t => push({ type: 'Task', icon: 'check-square', title: t.title, sub: STATUSES.find(s => s.id === t.status).title, act: () => { openTaskModal(t); } }));
      state.notes.filter(n => matches(n.title + ' ' + n.content + ' ' + (n.tags || []).join(' '))).slice(0, 5)
        .forEach(n => push({ type: 'Note', icon: 'file-text', title: n.title || 'Untitled', sub: n.audioId ? 'Voice memo' : 'Note', act: () => { selectedNoteId = n.id; location.hash = '#notes'; } }));
      const goalHits = state.goals.filter(g => matches(g.title + ' ' + (g.desc || '')))
        .sort((a, b) => (isGoalOverdue(b) ? 1 : 0) - (isGoalOverdue(a) ? 1 : 0)).slice(0, 5);
      goalHits.forEach(g => push({ type: 'Goal', icon: 'target', title: g.title, sub: goalProgress(g) + '% complete', overdue: isGoalOverdue(g), act: () => { location.hash = '#goals'; } }));
      state.habits.filter(h => matches(h.name)).slice(0, 5)
        .forEach(h => push({ type: 'Habit', icon: 'flame', title: h.name, sub: habitStreak(h) + ' day streak', act: () => { location.hash = '#habits'; } }));
    }
    if (!results.length) {
      $('#search-results').innerHTML = q ? '<div class="search-empty">No matches for “' + esc(q) + '”.</div>' : '<div class="search-empty">Start typing to search across everything.</div>';
      return;
    }
    let html = '', lastGroup = null;
    results.forEach((r, i) => {
      const group = r.group || (r.type + 's');
      if (group !== lastGroup) { html += `<div class="search-group">${esc(group)}</div>`; lastGroup = group; }
      html += `<button class="search-item" data-idx="${i}"><span class="si-icon" ${r.overdue ? 'style="color:var(--red)"' : ''}>${ic(r.icon, 16)}</span><span class="si-title">${esc(r.title)}</span><span class="si-sub">${esc(r.sub)}</span>${r.overdue ? '<span class="si-badge">Overdue</span>' : ''}</button>`;
    });
    $('#search-results').innerHTML = html;
    $$('.search-item').forEach(b => b.addEventListener('click', () => {
      const r = results[parseInt(b.dataset.idx, 10)];
      closeSearch();
      if (r.act) r.act();
    }));
  };
  input.addEventListener('input', run);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const first = $('.search-item');
      if (first) first.click();
    }
  });
  run();
  $('#search-overlay').addEventListener('mousedown', e => { if (e.target.id === 'search-overlay') closeSearch(); });
  input.focus();
}
function closeSearch() { $('#search-root').innerHTML = ''; }

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

/* ============ Keyboard ============ */
function onKey(e) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    if ($('#search-root').innerHTML) closeSearch();
    else openSearch();
    return;
  }
  if (e.key === 'Escape') {
    if ($('#search-root').innerHTML) closeSearch();
    else if ($('#modal-root').innerHTML) closeModal();
    else if (!rec.active && !$('#capture-pill').classList.contains('hidden')) { hideCapturePill(); return; }
    else hideQuickMenu();
    return;
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
}

/* ============ Init ============ */
function init() {
  load();
  loadLocalAudioIds();
  if (!state.seeded) { state = seed(); save(); }
  applyTheme();
  // nav
  $$('.nav-item[data-view]').forEach(b => {
    const [icon, label] = NAV[b.dataset.view];
    b.innerHTML = `${ic(icon, 17)} <span>${label}</span>`;
    b.addEventListener('click', () => { location.hash = '#' + b.dataset.view; });
  });
  $('#search-icon').innerHTML = ic('search', 15);
  $('#quick-add-icon').innerHTML = ic('plus', 15);
  updateMicButton();
  bindTopbar();
  initInstall();
  if (!location.hash || !NAV[location.hash.slice(1)]) location.hash = '#brief';
  window.addEventListener('hashchange', renderView);
  document.addEventListener('keydown', onKey);
  setInterval(checkOverdueNotifications, 60000); // catch deadlines passing while the app stays open
  renderView();
}
document.addEventListener('DOMContentLoaded', init);
