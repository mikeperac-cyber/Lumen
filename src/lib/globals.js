// src/lib/globals.js
// Bridges the src/lib ES modules into the classic-script world of app.js.
// Loaded as <script type="module"> immediately before app.js, so window.LumenLib
// is populated before any app.js code runs (a module script and a deferred classic
// script execute in document order after parsing completes).
import * as cryptoLib from './crypto.js';
import * as scheduleLib from './schedule.js';
import * as parserLib from './parser.js';
import * as mergeLib from './merge.js';
import * as geminiLib from './gemini.js';
import * as studentsLib from './students.js';
import * as vaultStore from '../vault/store.js';
import * as vaultView from '../vault/view.js';

window.LumenLib = {
  crypto: cryptoLib,
  schedule: scheduleLib,
  parser: parserLib,
  merge: mergeLib,
  gemini: geminiLib,
  students: studentsLib,
  vault: { ...vaultStore, ...vaultView },
};
