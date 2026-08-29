// src/lib/globals.js
// Bridges the src/lib ES modules into the classic-script world of app.js.
// Loaded as <script type="module"> immediately before app.js, so window.LumenLib
// is populated before any app.js code runs (a module script and a deferred classic
// script execute in document order after parsing completes).
import * as cryptoLib from './crypto.js';
import * as scheduleLib from './schedule.js';
import * as scheduleView from '../schedule/view.js';
import * as financeStore from '../finance/store.js';
import * as financeView from '../finance/view.js';
import * as notesView from '../notes/view.js';
import * as habitsStore from '../habits/store.js';
import * as parserLib from './parser.js';
import * as mergeLib from './merge.js';
import * as geminiLib from './gemini.js';
import * as studentsLib from './students.js';
import * as studentsView from '../students/view.js';
import * as helpersLib from './helpers.js';
import * as constantsLib from './constants.js';
import * as persistLib from '../state/persist.js';
import * as vaultStore from '../vault/store.js';
import * as tasksView from '../tasks/view.js';
import * as tasksVirtual from '../tasks/virtual.js';
import * as vaultView from '../vault/view.js';

window.LumenLib = {
  crypto: cryptoLib,
  schedule: { ...scheduleLib, ...scheduleView },
  parser: parserLib,
  merge: mergeLib,
  gemini: geminiLib,
  students: { ...studentsLib, ...studentsView },
  helpers: helpersLib,
  constants: constantsLib,
  persist: persistLib,
  tasks: { ...tasksView, ...tasksVirtual },
  finance: { ...financeStore, ...financeView },
  notes: notesView,
  habits: habitsStore,
  vault: { ...vaultStore, ...vaultView },
};
