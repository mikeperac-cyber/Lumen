// src/lib/constants.js
export const STORAGE_KEY = 'lumen.state.v1';
export const STATE_DB = 'lumen-state';
export const STATE_STORE = 'kv';
export const AUTO_VAULT_DB = 'lumen-autovault';
export const AUTO_VAULT_STORE = 'autovault-slots';
export const AUTO_VAULT_SLOTS = 3;

export const UNDO_MAX = 40;
export const UNDO_BYTES = 25165824; // 24 * 1024 * 1024
export const UNDO_DEDUP_WINDOW = 5;

export const MAX_TOASTS = 5;
export const TOAST_DURATION_MS = 2500;
export const TOAST_DEBOUNCE_MS = 24;

export const PERF_MAX = 200;
export const PERF_SLOW_MS = 800;
export const ACTIVITY_LOG_MAX = 500;
export const BRIEF_COMMIT_KEY = 'lumen.brief.commit';

export const THEME_TRANSITION_FALLBACK_MS = 350;
export const AMBIENT_DEFAULT_VOLUME = 0.4;
export const AMBIENT_MAX_VOLUME = 1;
export const ACHIEVAL_EVAL_INTERVAL_MS = 60000;

export const VAULT_CRYPTO_ITERATIONS_V1 = 100000;
export const VAULT_CRYPTO_ITERATIONS_V2 = 300000;
export const VAULT_CRYPTO_VERSION = 2;
export const VAULT_MAX_FILE = 10485760; // 10 * 1024 * 1024
export const VAULT_SOFT_CAP = 314572800;
export const VAULT_PAGE = 50;

export const SCHEDULE_INTERVAL_MIN = 5;
export const SCHEDULE_INTERVAL_MAX = 480;

export const MATRIX_PAGE = 60;

export const STATUSES = [
  { id: 'backlog', title: 'Backlog', color: '#8b93a7' },
  { id: 'today', title: 'Today', color: '#ffb020' },
  { id: 'progress', title: 'In Progress', color: '#4f8cff' },
  { id: 'done', title: 'Done', color: '#34d399' }
];

export const COLORS = ['#7c6cf6', '#4f8cff', '#34d399', '#ffb020', '#ff5d6c', '#f472b6', '#22d3ee', '#a3e635'];
export const EMOJIS = ['💧', '🏋️', '📚', '🧘', '🥗', '✍️', '🌅', '💪', '🎸', '🌱', '🧠', '🚶'];

export const TITLES = {
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
  schedule: ['Personal Schedule', 'Your personal daily intervals — customizable timeboxes'],
  settings: ['Settings', 'Theme, data & shortcuts'],
  perf: ['Performance', 'Render times & slow view alerts'],
  analytics: ['Habit Analytics', 'Day-of-week patterns & cross-habit insights'],
  finance: ['Finance', 'Income, expenses & cash flow'],
  students: ['Students', 'Teaching roster, lesson dossiers & student progress'],
  vault: ['Vault', 'Your links & files — local-first, pinned & searchable']
};

export const NAV = {
  brief: ['sparkles', 'Brief'], dashboard: ['dashboard', 'Dashboard'], students: ['graduation-cap', 'Students'], vault: ['folder', 'Vault'], review: ['calendar', 'Weekly review'], tasks: ['check-square', 'Tasks'], projects: ['folder', 'Projects'], schedule: ['calendar-plus', 'Personal Schedule'], tags: ['tag', 'Tags'], goals: ['target', 'Goals'],
  habits: ['flame', 'Habits'], achievements: ['trophy', 'Achievements'], notes: ['file-text', 'Notes'], voice: ['mic', 'Voice'], activity: ['activity', 'Activity'], perf: ['zap', 'Performance'],  analytics: ['bar-chart', 'Analytics'], finance: ['dollar-sign', 'Finance'], settings: ['settings', 'Settings']
};

export const PRIOS = {
  high: { label: 'High', cls: 'priority-high' },
  med:  { label: 'Medium', cls: 'priority-med' },
  low:  { label: 'Low', cls: 'priority-low' }
};

export const CATEGORIES = [
  { id: 'teaching', label: '📚 Teaching', color: '#4f8cff' },
  { id: 'grading', label: '📝 Grading', color: '#f472b6' },
  { id: 'planning', label: '📋 Planning', color: '#34d399' },
  { id: 'admin', label: '🏛️ Admin', color: '#ffb020' },
  { id: 'meetings', label: '🤝 Meetings', color: '#22d3ee' },
  { id: 'professional', label: '🎓 Professional Dev', color: '#a3e635' },
  { id: 'personal', label: '🏠 Personal', color: '#ff5d6c' },
  { id: 'errands', label: '🏃 Errands', color: '#8b93a7' }
];

export const RECURRENCE = [
  { id: '', label: 'None' },
  { id: 'daily', label: 'Daily' },
  { id: 'weekdays', label: 'Weekdays' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'biweekly', label: 'Every 2 weeks' },
  { id: 'monthly', label: 'Monthly' }
];

export const COVER_COLORS = [
  '#00000000',
  '#ff5d6c',
  '#ffb020',
  '#ffde0a',
  '#34d399',
  '#4f8cff',
  '#7c6cf6',
  '#f472b6',
  '#22d3ee',
  '#8b93a7'
];
