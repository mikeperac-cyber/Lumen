const fs = require('fs');
const path = require('path');

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const issues = [];
  if (content.includes('app.$' + '{')) issues.push('app.${ found');
  if (content.includes('app.$app.$')) issues.push('app.$app.$ found');
  if (content.includes('\\nimport')) issues.push('literal \\n found');
  if (issues.length) {
    console.log(filePath, ':', issues.join(', '));
  }
}

function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (!['node_modules', 'dist', '.git', '.agents'].includes(f)) walk(full);
    } else if (f.endsWith('.js') || f.endsWith('.mjs')) {
      checkFile(full);
    }
  }
}

walk('.');
