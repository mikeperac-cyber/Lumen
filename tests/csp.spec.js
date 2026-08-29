// @ts-check
const { test, expect } = require('@playwright/test');

test('CSP headers are configured in vercel.json', async () => {
  const fs = require('fs');
  const path = require('path');
  const vercelJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../vercel.json'), 'utf-8'));
  
  const headers = vercelJson.headers.find(h => h.source === '/(.*)').headers;
  const csp = headers.find(h => h.key === 'Content-Security-Policy').value;
  
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("script-src 'self' 'unsafe-inline'");
  expect(csp).toContain("connect-src 'self' https://generativelanguage.googleapis.com wss://*.peerjs.com https://*.peerjs.com");
});
