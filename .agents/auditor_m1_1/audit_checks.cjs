const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');

console.log('=== AUDITING REPOSITORY INTEGRITY ===');

// Check 1: Corruption in src/tasks/controller.js
const controllerContent = fs.readFileSync(path.join(root, 'src/tasks/controller.js'), 'utf8');

const controllerCorruptions = [
  { name: 'app.$app.$', re: /app\.\$app\.\$/g },
  { name: 'app.${', re: /app\.\$\{[^}]+\}/g },
  { name: '#f-app.save', re: /#f-app\.save/g },
  { name: 'style="height:app.', re: /style="height:app\./g },
  { name: 'style=\'height:app.', re: /style='height:app\./g },
  { name: 'app.$$app.$', re: /app\.\$\$app\.\$/g }
];

console.log('\n--- Checking src/tasks/controller.js ---');
let controllerIssues = 0;
controllerCorruptions.forEach(c => {
  const matches = [...controllerContent.matchAll(c.re)];
  console.log(`Check [${c.name}]: ${matches.length} found`);
  if (matches.length > 0) {
    controllerIssues += matches.length;
    matches.forEach(m => console.log(`  Found: ${m[0]} at char ${m.index}`));
  }
});

// Check 2: App.js boot and imports
const appContent = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
console.log('\n--- Checking app.js syntax & imports ---');
const appChecks = [
  { name: 'unescaped \\n in imports', re: /^import [^\n]+\\n/gm },
  { name: 'duplicate setupTasksController', re: /import .*setupTasksController/g },
  { name: 'getSearchTasksHay import/definition', re: /getSearchTasksHay/g },
  { name: 'getSearchVaultHay import/definition', re: /getSearchVaultHay/g },
  { name: 'vaultBlobGet import/definition', re: /vaultBlobGet/g },
  { name: 'VaultStore usage vs import', re: /VaultStore\./g },
  { name: '_whenIdle definition', re: /function _whenIdle|const _whenIdle|let _whenIdle/g },
  { name: 'ensureThemesCSS definition', re: /function ensureThemesCSS|const ensureThemesCSS|let ensureThemesCSS/g }
];

appChecks.forEach(c => {
  const matches = [...appContent.matchAll(c.re)];
  console.log(`Check [${c.name}]: ${matches.length} matches`);
});

// Check 3: Check for Hardcoded test outputs / Mock bypasses across src and app.js
console.log('\n--- Checking for prohibited hardcoded strings / facade patterns ---');
const filesToCheck = [
  'app.js',
  'src/tasks/controller.js',
  'src/tasks/view.js',
  'src/tasks/virtual.js',
  'src/vault/store.js',
  'src/vault/view.js',
  'src/vault/views.js',
  'src/lib/helpers.js',
  'src/lib/constants.js',
  'src/lib/globals.js'
];

const suspiciousPatterns = [
  { name: 'Hardcoded test bypass return "PASS"', re: /return\s+['"`](?:PASS|OK|SUCCESS)['"`]/gi },
  { name: 'Hardcoded smoke pass', re: /smoke.*pass|test.*mock.*return/gi },
  { name: 'Hardcoded console error silence / noop override', re: /console\.error\s*=\s*(?:\(\)\s*=>\s*\{\}|function\s*\(\)\s*\{\})/g },
  { name: 'Pre-populated test dummy result', re: /__test_result__|__audit_bypass__/gi }
];

filesToCheck.forEach(relPath => {
  const fullPath = path.join(root, relPath);
  if (!fs.existsSync(fullPath)) {
    console.log(`File missing: ${relPath}`);
    return;
  }
  const content = fs.readFileSync(fullPath, 'utf8');
  suspiciousPatterns.forEach(p => {
    const matches = [...content.matchAll(p.re)];
    if (matches.length > 0) {
      console.log(`[ALERT] ${relPath} matched ${p.name}: ${matches.length} occurrences`);
      matches.forEach(m => console.log(`  Line around match: ${content.substring(Math.max(0, m.index - 50), Math.min(content.length, m.index + 50))}`));
    }
  });
});

console.log('\nForensic static scan complete.');
