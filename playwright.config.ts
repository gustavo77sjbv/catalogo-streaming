import { defineConfig, devices } from '@playwright/test';

const MOCK_PORT = 4010;
const APP_PORT = 3100;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: `http://localhost:${APP_PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'celular', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      command: 'node e2e/mock-tmdb.mjs',
      port: MOCK_PORT,
      env: { MOCK_PORT: String(MOCK_PORT) },
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `npm run build && npx next start -p ${APP_PORT}`,
      port: APP_PORT,
      timeout: 180_000,
      env: { TMDB_API_BASE_URL: `http://localhost:${MOCK_PORT}/3`, TMDB_READ_TOKEN: 'e2e-token' },
      reuseExistingServer: !process.env.CI,
    },
  ],
});
