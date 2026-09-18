import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import server from '../../server.js';

describe('Production Static Server (server.js)', () => {
  let baseUrl;
  let listeningServer;

  beforeAll(async () => {
    await new Promise((resolve) => {
      listeningServer = server.listen(0, '127.0.0.1', () => {
        const port = listeningServer.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (listeningServer) {
      await new Promise((resolve) => listeningServer.close(resolve));
    }
  });

  function fetchHeaders(path) {
    return new Promise((resolve, reject) => {
      http.get(`${baseUrl}${path}`, (res) => {
        res.resume(); // Consume stream
        resolve(res.headers);
      }).on('error', reject);
    });
  }

  it('serves sw.js with no-cache and Service-Worker-Allowed headers', async () => {
    const headers = await fetchHeaders('/sw.js');
    expect(headers['cache-control']).toBe('public, max-age=0, must-revalidate');
    expect(headers['service-worker-allowed']).toBe('/');
    expect(headers['x-content-type-options']).toBe('nosniff');
  });

  it('serves manifest.webmanifest with no-cache header', async () => {
    const headers = await fetchHeaders('/manifest.webmanifest');
    expect(headers['cache-control']).toBe('public, max-age=0, must-revalidate');
    expect(headers['content-type']).toContain('application/manifest+json');
  });

  it('serves index.html with no-cache header', async () => {
    const headers = await fetchHeaders('/index.html');
    expect(headers['cache-control']).toBe('public, max-age=0, must-revalidate');
    expect(headers['x-frame-options']).toBe('SAMEORIGIN');
  });

  it('serves hashed assets with long-term immutable caching', async () => {
    const headers = await fetchHeaders('/assets/core-CDb2MHtL.js');
    expect(headers['cache-control']).toBe('public, max-age=31536000, immutable');
  });
});
