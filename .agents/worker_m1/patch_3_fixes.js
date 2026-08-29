const fs = require('fs');

let code = fs.readFileSync('app.js', 'utf8').replace(/\r\n/g, '\n');

// 1. Import isArchivedTask, linkGraphForTask
const targetTop = `import * as VaultStore from './src/vault/view.js';`;
const replacementTop = `import * as VaultStore from './src/vault/view.js';
import { isArchivedTask, linkGraphForTask } from './src/tasks/view.js';`;

if (!code.includes("import { isArchivedTask, linkGraphForTask } from './src/tasks/view.js';")) {
  code = code.replace(targetTop, replacementTop);
  console.log('Imported isArchivedTask, linkGraphForTask');
}

// 2. Fix $('[data-dw-pin]').forEach to $$('[data-dw-pin]').forEach
const targetPin = `$('[data-dw-pin]').forEach(b => b.addEventListener('click', e => {`;
const replacementPin = `$$('[data-dw-pin]').forEach(b => b.addEventListener('click', e => {`;

if (code.includes(targetPin)) {
  code = code.replace(targetPin, replacementPin);
  console.log('Fixed data-dw-pin selector to $$');
}

// 3. Fix $, $ to $, $$ in setupTasksController
const targetContext = `setupTasksController({
  get state() { return state; },
  $, $, toast, captureUndo,`;

const replacementContext = `setupTasksController({
  get state() { return state; },
  $, $$, toast, captureUndo,`;

if (code.includes(targetContext)) {
  code = code.replace(targetContext, replacementContext);
  console.log('Fixed $, $$ in setupTasksController context');
}

fs.writeFileSync('app.js', code, 'utf8');
console.log('app.js patched successfully');
