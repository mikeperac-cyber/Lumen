const { execSync } = require('child_process');

const port = process.env.PORT || 3000;
console.log(`Starting server on port ${port}...`);

try {
  execSync(`npx serve -s dist -l ${port}`, { stdio: 'inherit' });
} catch (error) {
  console.error('Failed to start server:', error.message);
  process.exit(1);
}
