const fs = require('fs');
const path = require('path');

function analyzeFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  const lines = code.split('\n');
  
  const imports = [];
  const exports = [];

  const importRegex = /import\s+(?:(\*\s+as\s+[\w]+|\{[^}]+\}|[\w]+)\s+from\s+)?['"]([^'"]+)['"]/g;
  let m;
  while ((m = importRegex.exec(code)) !== null) {
    imports.push({ specifier: m[1] || '', from: m[2] });
  }

  const exportRegex = /export\s+(?:default\s+)?(?:const|let|var|function\*?|class|async\s+function\*?|\{[^}]+\})\s*([\w]+)?/g;
  while ((m = exportRegex.exec(code)) !== null) {
    if (m[1]) exports.push(m[1]);
    else {
      // export { a, b, c }
      const matched = m[0];
      const matchBraces = matched.match(/\{([^}]+)\}/);
      if (matchBraces) {
        matchBraces[1].split(',').forEach(s => exports.push(s.trim()));
      }
    }
  }

  return { filePath, lines: lines.length, imports, exports };
}

function walk(dir) {
  let results = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (!['node_modules', 'dist', '.git', '.agents'].includes(f)) {
        results = results.concat(walk(full));
      }
    } else if (f.endsWith('.js') || f.endsWith('.mjs')) {
      results.push(analyzeFile(full));
    }
  }
  return results;
}

const all = walk('src');
console.log(JSON.stringify(all, null, 2));
