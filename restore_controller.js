const fs = require('fs');
const block = fs.readFileSync('tasks_extract.js', 'utf8') + fs.readFileSync('matrix_extract.js', 'utf8');

let controllerJs = `import { STATUSES, COLORS, EMOJIS, PRIOS, CATEGORIES, RECURRENCE, COVER_COLORS } from '../lib/constants.js';
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
controllerJs = controllerJs.replace('const MATRIX_PAGE = 60;', '');
controllerJs = controllerJs.replace(/MATRIX_PAGE/g, '60');

fs.writeFileSync('src/tasks/controller.js', controllerJs);
console.log('Restored controller.js');
