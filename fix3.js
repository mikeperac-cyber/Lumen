const fs = require('fs');
let src = fs.readFileSync('app.js', 'utf8');

const helper = `
function bindFilterInput(selector, debounceMs, callback) {
  const el = document.querySelector(selector);
  if (!el) return;
  let timer;
  el.addEventListener('input', e => {
    clearTimeout(timer);
    timer = setTimeout(() => callback(e.target.value.toLowerCase()), debounceMs);
  });
}
`;

src = src.replace('const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));', 'const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));\n' + helper);

fs.writeFileSync('app.js', src);
