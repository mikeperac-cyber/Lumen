const fs = require('fs');

let code = fs.readFileSync('app.js', 'utf8').replace(/\r\n/g, '\n');

const targetTheme = `function applyTheme() {`;
const replacementTheme = `function ensureThemesCSS() { if (typeof applyTheme === 'function') applyTheme(); }

function applyTheme() {`;

if (code.includes(targetTheme)) {
  code = code.replace(targetTheme, replacementTheme);
  console.log('ensureThemesCSS added');
} else {
  console.error('targetTheme not found');
}

fs.writeFileSync('app.js', code, 'utf8');
console.log('app.js updated');
