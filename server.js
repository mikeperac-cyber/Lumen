const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8092;
const DIST = path.join(__dirname, 'dist');

if (!fs.existsSync(DIST)) {
  console.error(`[Lumen Server] Error: ${DIST} directory not found. Run "npm run build" first.`);
  process.exit(1);
}

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'text/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.webmanifest': 'application/manifest+json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';
  let filePath = path.normalize(path.join(DIST, reqPath));
  if (!filePath.startsWith(DIST)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST, 'index.html');
  }
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  } catch (_) {
    res.writeHead(500);
    res.end('Server Error');
  }
});

server.listen(PORT, () => {
  console.log(`[Lumen Server] Serving dist/ on port ${PORT}...`);
});
