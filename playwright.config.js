import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './testing/specs',
  use: {
    baseURL: 'http://localhost:3456',
    video: 'on',
    launchOptions: { slowMo: 500 },
  },
  webServer: {
    command: 'python3 -m http.server 3456',
    url: 'http://localhost:3456',
    reuseExistingServer: !process.env.CI,
  },
});
