// Universal entry point for Lumen (supports both Node server runner and browser ES module import)
if (typeof process !== 'undefined' && process.versions && process.versions.node && typeof window === 'undefined') {
  const { execSync, spawn } = require('child_process');
  const fs = require('fs');
  const path = require('path');
  const port = process.env.PORT || 8092;
  const distDir = path.resolve(__dirname, 'dist');

  if (!fs.existsSync(distDir) || !fs.existsSync(path.join(distDir, 'index.html'))) {
    console.log('[Lumen] Building production assets...');
    execSync('npm run build', { stdio: 'inherit' });
  }

  console.log(`[Lumen] Starting static server on port ${port}...`);
  const serveProc = spawn('npx', ['serve', '-s', 'dist', '-l', String(port)], { stdio: 'inherit' });
  serveProc.on('exit', (code) => process.exit(code || 0));
} else {
  import('./src/app-client.js');
}
