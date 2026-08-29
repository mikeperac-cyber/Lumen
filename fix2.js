const fs = require('fs');
let src = fs.readFileSync('app.js', 'utf8');

const helper = `
function bindFilterInput(selector, debounceMs, callback) {
  const el = $(selector);
  if (!el) return;
  let timer;
  el.addEventListener('input', e => {
    clearTimeout(timer);
    timer = setTimeout(() => callback(e.target.value.toLowerCase()), debounceMs);
  });
}
`;

src = src.replace('const $ = (s, ctx = document) => ctx.querySelector(s);', 'const $ = (s, ctx = document) => ctx.querySelector(s);\n' + helper);

fs.writeFileSync('app.js', src);
