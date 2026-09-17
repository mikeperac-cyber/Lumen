const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8092;
const DIST_DIR = path.join(__dirname, 'dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.wasm': 'application/wasm'
};

const server = http.createServer((req, res) => {
  if (!fs.existsSync(DIST_DIR)) {
    res.statusCode = 503;
    return res.end('Build output directory (dist) not found. Run npm run build first.');
  }

  let reqPath = (req.url || '/').split('?')[0];
  try {
    reqPath = decodeURIComponent(reqPath);
  } catch (_) {}

  let filePath = path.join(DIST_DIR, reqPath);

  // Prevent directory traversal
  if (!filePath.startsWith(DIST_DIR + path.sep) && filePath !== DIST_DIR) {
    res.statusCode = 403;
    return res.end('Forbidden');
  }

  // Fallback to index.html for SPA routing or directories
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  const baseName = path.basename(filePath);

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.statusCode = 500;
      return res.end('Server Error');
    }
    const isNoCache = ext === '.html' || baseName === 'sw.js' || ext === '.webmanifest';
    const headers = {
      'Content-Type': contentType,
      'Cache-Control': isNoCache ? 'public, max-age=0, must-revalidate' : 'public, max-age=31536000, immutable'
    };
    if (baseName === 'sw.js') {
      headers['Service-Worker-Allowed'] = '/';
    }

    res.writeHead(200, headers);
    if (req.method === 'HEAD') {
      res.end();
    } else {
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Lumen static server running on port ${PORT}`);
});
