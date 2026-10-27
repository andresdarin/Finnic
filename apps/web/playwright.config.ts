import { defineConfig, devices } from '@playwright/test'
import { apiEnv, WEB_URL, WEB_PORT, API_URL, webEnv } from './e2e/support/stack'
import { AUTH_STATE } from './e2e/support/users'

/**
 * Suite e2e contra el stack local (ver .10x/adrs/001-local-supabase-e2e.md).
 * Requiere `supabase start`, la API compilada y la web compilada en `.next-e2e`
 * (`pnpm e2e:build`). Playwright levanta API y web si no están corriendo.
 */
const isCI = Boolean(process.env.CI)

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  retries: isCI ? 1 : 0,
  forbidOnly: isCI,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: WEB_URL,
    locale: 'es-UY',
    timezoneId: 'America/Montevideo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'], storageState: AUTH_STATE } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, storageState: AUTH_STATE } },
  ],
  webServer: [
    {
      command: 'node ../api/dist/main.js',
      url: `${API_URL}/api/health`,
      env: apiEnv(),
      reuseExistingServer: !isCI,
      timeout: 60_000,
    },
    {
      command: `npx next start -p ${WEB_PORT}`,
      url: `${WEB_URL}/login`,
      env: webEnv(),
      reuseExistingServer: !isCI,
      timeout: 60_000,
    },
  ],
})
