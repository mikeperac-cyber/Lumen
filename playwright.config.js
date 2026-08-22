// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: 'http://127.0.0.1:8092',
    headless: true,
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npx serve . -l 8092 --no-clipboard',
    port: 8092,
    reuseExistingServer: true,
  },
});
