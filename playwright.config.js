// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  // Playwright's default testMatch also picks up *.test.js, which would pull in
  // tests/unit/** — those are Vitest's. E2E specs are *.spec.js, unit are *.test.js.
  testMatch: '**/*.spec.js',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: 'http://127.0.0.1:8092',
    headless: true,
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npx serve . -l 8092 --no-clipboard',
    port: 8092,
    reuseExistingServer: true,
  },
});
