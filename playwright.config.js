const { defineConfig, devices } = require('@playwright/test');
require('dotenv').config();

module.exports = defineConfig({
  testDir: './tests',          // covers tests/specs/ AND tests/omnicare/specs/
  testMatch: '**/*.spec.js',
  timeout: 120000,
  expect: { timeout: 15000 },
  use: {
    baseURL: 'https://stg-hts.kapiva.tech/',
    viewport: { width: 1536, height: 960 }, // macbook-16 equivalent
    headless: false,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 30000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
