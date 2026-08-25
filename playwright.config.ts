import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI
    ? [['line'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  outputDir: 'test-results/playwright',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3001',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'attendance-chromium',
      testMatch: /attendance\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], browserName: 'chromium' },
    },
    {
      name: 'p5-administration-chromium',
      testMatch: /p5-administration\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], browserName: 'chromium' },
    },
  ],
});
