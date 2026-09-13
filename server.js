const { spawn } = require('child_process');
const path = require('path');

// Determine port to run on, default to 3000 if not specified
const port = process.env.PORT || 3000;

console.log(`Starting server to serve 'dist' on port ${port}...`);

// Use npx to execute serve from local node_modules
const child = spawn('npx', ['serve', '-s', 'dist', '-l', port.toString()], {
  stdio: 'inherit',
  shell: true
});

child.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  console.log(`Server process exited with code ${code} and signal ${signal}`);
  process.exit(code || 0);
});

// Handle termination signals to cleanly exit the child process
process.on('SIGINT', () => {
  child.kill('SIGINT');
});

process.on('SIGTERM', () => {
  child.kill('SIGTERM');
});
