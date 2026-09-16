import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createServer, startServer, MIME_TYPES } from '../../server.js';

describe('server.js static HTTP server', () => {
  it('exports MIME_TYPES mapping with essential web types', () => {
    assert.equal(MIME_TYPES['.html'], 'text/html; charset=UTF-8');
    assert.equal(MIME_TYPES['.js'], 'text/javascript; charset=UTF-8');
    assert.equal(MIME_TYPES['.css'], 'text/css; charset=UTF-8');
    assert.equal(MIME_TYPES['.webmanifest'], 'application/manifest+json; charset=UTF-8');
  });

  it('serves static dist files and handles SPA fallback', async () => {
    const testDist = path.resolve(__dirname, 'fixtures_server_test');
    if (!fs.existsSync(testDist)) {
      fs.mkdirSync(testDist, { recursive: true });
    }
    const indexPath = path.join(testDist, 'index.html');
    const assetPath = path.join(testDist, 'test.js');
    fs.writeFileSync(indexPath, '<!DOCTYPE html><html><body>Test SPA Index</body></html>');
    fs.writeFileSync(assetPath, 'console.log("hello");');

    try {
      const server = createServer(testDist);
      await new Promise((resolve) => server.listen(0, resolve));
      const port = server.address().port;

      // 1. Request static JS asset
      const jsRes = await new Promise((resolve) => {
        http.get(`http://127.0.0.1:${port}/test.js`, (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, data }));
        });
      });
      assert.equal(jsRes.status, 200);
      assert.ok(jsRes.headers['content-type'].includes('javascript'));
      assert.equal(jsRes.data, 'console.log("hello");');

      // 2. Request non-existent route (SPA fallback to index.html)
      const fallbackRes = await new Promise((resolve) => {
        http.get(`http://127.0.0.1:${port}/tasks/123`, (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, data }));
        });
      });
      assert.equal(fallbackRes.status, 200);
      assert.ok(fallbackRes.headers['content-type'].includes('html'));
      assert.ok(fallbackRes.data.includes('Test SPA Index'));

      await new Promise((resolve) => server.close(resolve));
    } finally {
      if (fs.existsSync(indexPath)) fs.unlinkSync(indexPath);
      if (fs.existsSync(assetPath)) fs.unlinkSync(assetPath);
      if (fs.existsSync(testDist)) fs.rmdirSync(testDist);
    }
  });
});
