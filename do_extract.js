const fs = require('fs');
const app = fs.readFileSync('app.js', 'utf8');
const start = app.indexOf('/* ============ Tasks (kanban) ============ */');
const end = app.indexOf('/* ============ Goals ============ */');
const block = app.substring(start, end);
let newApp = app.substring(0, start) + app.substring(end);
const importStmt = `import { setupTasksController } from './src/tasks/controller.js';\n`;
const firstImport = newApp.indexOf('import ');
newApp = newApp.substring(0, firstImport) + importStmt + newApp.substring(firstImport);
const initCall = `
setupTasksController({
  get state() { return state; },
  $, $$, toast, captureUndo, logActivity, save, parseNaturalLanguageTask, uid, todayISO,
  goalProgressToast, trackProgressTime, applyTaskGoalProgress, getKanbanLists,
  addKanbanList, renameKanbanList, deleteKanbanList, currentView, closeModal,
  bindFilterInput, esc, vaultBlobGet, openModal, renderView, getSearchTasksHay,
  viewRoot, isMobile, updateOnlineStatus,
  get taskFilter() { return taskFilter; },
  set taskFilter(v) { taskFilter = v; },
  get taskShowArchived() { return taskShowArchived; },
  set taskShowArchived(v) { taskShowArchived = v; }
});
`;
const initPos = newApp.indexOf('/* ---- Core state & UI tools ---- */');
newApp = newApp.substring(0, initPos) + initCall + newApp.substring(initPos);
fs.writeFileSync('app.js', newApp);

let controllerJs = `import { STATUSES, COLORS, EMOJIS, PRIOS, CATEGORIES, RECURRENCE, COVER_COLORS, MATRIX_PAGE } from '../lib/constants.js';
import * as view from './view.js';
import * as virtual from './virtual.js';

let app = {};
export function setupTasksController(ctx) {
  app = ctx;
  if (!window.LumenLib) window.LumenLib = {};
  if (!window.LumenLib.tasks) window.LumenLib.tasks = {};
  Object.assign(window.LumenLib.tasks, { renderTasks, openTaskModal, applyTagFilter, matrixShowMore });
}

` + block;

const globals = ['state', '\\$', '\\$\\$', 'toast', 'captureUndo', 'logActivity', 'save', 'parseNaturalLanguageTask', 'uid', 'todayISO', 'goalProgressToast', 'trackProgressTime', 'applyTaskGoalProgress', 'getKanbanLists', 'addKanbanList', 'renameKanbanList', 'deleteKanbanList', 'currentView', 'closeModal', 'bindFilterInput', 'esc', 'vaultBlobGet', 'openModal', 'renderView', 'getSearchTasksHay', 'viewRoot', 'isMobile', 'updateOnlineStatus'];
globals.forEach(g => {
  const cleanG = g.replace(/\\/g, '');
  const regex = new RegExp('(?<![A-Za-z0-9_.])' + g + '(?![A-Za-z0-9_])', 'g');
  controllerJs = controllerJs.replace(regex, 'app.' + cleanG);
});

controllerJs = controllerJs.replace(/TasksView\./g, 'view.');
controllerJs = controllerJs.replace(/view\.visibleWindow/g, 'virtual.visibleWindow');
controllerJs = controllerJs.replace(/app\.app\./g, 'app.');
controllerJs = controllerJs.replace('function renderTasks(', 'export function renderTasks(');
controllerJs = controllerJs.replace('function openTaskModal(', 'export function openTaskModal(');
controllerJs = controllerJs.replace('function applyTagFilter(', 'export function applyTagFilter(');
controllerJs = controllerJs.replace('function matrixShowMore(', 'export function matrixShowMore(');

fs.writeFileSync('src/tasks/controller.js', controllerJs);
console.log('Done!');
