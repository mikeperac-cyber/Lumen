const fs = require('fs');

const appContent = fs.readFileSync('app.js', 'utf8');

// Find all function declarations in app.js
const functionRegex = /(?:function\s+([A-Za-z0-9_$]+)\s*\(|const\s+([A-Za-z0-9_$]+)\s*=\s*(?:function|\([^)]*\)\s*=>|[A-Za-z0-9_$]+\s*=>))/g;
let match;
const appSymbols = [];
while ((match = functionRegex.exec(appContent)) !== null) {
  const name = match[1] || match[2];
  appSymbols.push({ name, index: match.index });
}

console.log('Total function/arrow symbols in app.js:', appSymbols.length);

// Group by domain keywords
const tasksSymbols = appSymbols.filter(s => /task|kanban|matrix/i.test(s.name));
const vaultSymbols = appSymbols.filter(s => /vault/i.test(s.name));
const financeSymbols = appSymbols.filter(s => /finance|income|expense|transaction|subscription|budget|invoice/i.test(s.name));

console.log('\n--- Vault functions in app.js ---');
vaultSymbols.forEach(s => {
  const line = appContent.slice(0, s.index).split('\n').length;
  console.log(`Line ${line}: ${s.name}`);
});

console.log('\n--- Finance functions in app.js ---');
financeSymbols.forEach(s => {
  const line = appContent.slice(0, s.index).split('\n').length;
  console.log(`Line ${line}: ${s.name}`);
});

console.log('\n--- Tasks functions remaining in app.js ---');
tasksSymbols.forEach(s => {
  const line = appContent.slice(0, s.index).split('\n').length;
  console.log(`Line ${line}: ${s.name}`);
});
