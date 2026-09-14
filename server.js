const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8092;
const DIST_DIR = path.join(__dirname, 'dist');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  // Strip query parameters and decode URL
  let urlPath = req.url.split('?')[0];
  try {
    urlPath = decodeURIComponent(urlPath);
  } catch (err) {
    console.error(`[Server] Decode error for url ${urlPath}`);
  }
  let filePath = path.join(DIST_DIR, urlPath === '/' ? 'index.html' : urlPath);

  // Security: prevent directory traversal
  const normalizedPath = path.normalize(filePath);
  if (!normalizedPath.startsWith(DIST_DIR)) {
    res.writeHead(403);
    return res.end('403 Forbidden');
  }

  let fileExists = false;
  try {
    const stats = fs.statSync(filePath);
    fileExists = stats.isFile();
  } catch (err) {
    fileExists = false;
  }

  // SPA Fallback: if file doesn't exist or is a directory, serve index.html
  if (!fileExists) {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  const extname = path.extname(filePath);
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      console.error(`[Server Error] ${err.message}`);
      res.writeHead(500);
      res.end(`Server Error: ${err.code}`);
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        // Caching optimization: 1 year for immutable assets, no-cache for sw.js and index.html
        'Cache-Control': urlPath.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : (urlPath === '/sw.js' ? 'public, max-age=0, must-revalidate' : 'no-cache')
      });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`Serving static files from: ${DIST_DIR}`);
});
