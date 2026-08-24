// @ts-check
// Config WITHOUT webServer — used for real-offline probes where we control the server.
const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests',
  timeout: 90_000,
  retries: 0,
  use: {
    baseURL: 'http://127.0.0.1:8093',
    headless: true,
  },
});
