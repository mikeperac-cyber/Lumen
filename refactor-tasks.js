const fs = require('fs');
const app = fs.readFileSync('app.js', 'utf8');

const start = app.indexOf('/* ============ Tasks (kanban) ============ */');
const end = app.indexOf('/* ============ Goals ============ */');
if (start === -1 || end === -1) throw new Error('bounds not found');

const block = app.substring(start, end);
let newApp = app.substring(0, start) + app.substring(end);

const importStmt = import { renderTasks, openTaskModal, applyTagFilter, matrixShowMore, initTasksController } from './src/tasks/view.js';\n;
const firstImport = newApp.indexOf('import ');
newApp = newApp.substring(0, firstImport) + importStmt + newApp.substring(firstImport);

const initCall = 
initTasksController({
  get state() { return state; },
  $, , toast, captureUndo, logActivity, save, parseNaturalLanguageTask, uid, todayISO,
  goalProgressToast, trackProgressTime, applyTaskGoalProgress, getKanbanLists,
  addKanbanList, renameKanbanList, deleteKanbanList, currentView, closeModal,
  bindFilterInput, esc, vaultBlobGet
});
;
const initPos = newApp.indexOf('/* ---- Core state & UI tools ---- */');
newApp = newApp.substring(0, initPos) + initCall + newApp.substring(initPos);

fs.writeFileSync('app.js', newApp);
console.log('Modified app.js');

let viewJs = fs.readFileSync('src/tasks/view.js', 'utf8');
viewJs = viewJs.replace(
  /} from '\\.\\.\\/lib\\/constants\\.js';/,
  ', STATUSES, COLORS } from \\'../lib/constants.js\\';'
);

let newViewJs = viewJs + '\n\n' + 
let app = {};
export function initTasksController(ctx) { app = ctx; }

 + block;

const globalsToReplace = ['state', '\\$', '\\$\\$', 'toast', 'captureUndo', 'logActivity', 'save', 'parseNaturalLanguageTask', 'uid', 'todayISO', 'goalProgressToast', 'trackProgressTime', 'applyTaskGoalProgress', 'getKanbanLists', 'addKanbanList', 'renameKanbanList', 'deleteKanbanList', 'currentView', 'closeModal', 'bindFilterInput', 'vaultBlobGet', 'esc'];
globalsToReplace.forEach(g => {
  const cleanG = g.replace(/\\\\/g, '');
  const regex = new RegExp('(?<![A-Za-z0-9_.])' + g + '(?![A-Za-z0-9_])', 'g');
  newViewJs = newViewJs.replace(regex, 'app.' + cleanG);
});

// app.todayISO is already imported as todayISO in view.js, but our regex replaced it.
newViewJs = newViewJs.replace(/app\.todayISO/g, 'todayISO');
newViewJs = newViewJs.replace(/app\.esc/g, 'esc');
newViewJs = newViewJs.replace(/app\.app\./g, 'app.');
newViewJs = newViewJs.replace('function renderTasks(', 'export function renderTasks(');
newViewJs = newViewJs.replace('function openTaskModal(', 'export function openTaskModal(');
newViewJs = newViewJs.replace('function applyTagFilter(', 'export function applyTagFilter(');
newViewJs = newViewJs.replace('function matrixShowMore(', 'export function matrixShowMore(');

// One thing: KANBAN is defined in app.js!
// Let's add KANBAN to the app context.

