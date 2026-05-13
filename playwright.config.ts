import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  globalSetup: './tools/qa/global-setup.ts',
  testDir: './tools/qa',
  timeout: 120_000,
  reporter: 'html',
  use: {
    headless: true,
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 2200 },
      },
    },
    {
      name: 'mobile',
      use: {
        ...devices['iPhone 13'],
      },
    },
  ],
});
