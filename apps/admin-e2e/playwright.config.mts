import { workspaceRoot } from '@nx/devkit';
import { nxE2EPreset } from '@nx/playwright/preset';
import { defineConfig, devices } from '@playwright/test';
import { OWNER_STATE } from './src/support/sign-in';

const PORT = process.env['E2E_PORT'] ?? '4201';
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  ...nxE2EPreset(import.meta.dirname, { testDir: './src' }),
  // The tests share and change the emulators.
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  globalSetup: './src/support/global-setup.ts',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  // The development build, which talks to the emulators.
  webServer: {
    command: `npx nx serve admin --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 180_000,
    cwd: workspaceRoot,
  },
  projects: [
    // Signs in once for the run. The popup sometimes hangs, so it gets retries.
    {
      name: 'setup',
      testMatch: /owner\.setup\.ts/,
      retries: 2,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'desktop',
      dependencies: ['setup'],
      // Filtered here rather than skipped in the test, which would still run its reset.
      grepInvert: /@phone-only/,
      use: { ...devices['Desktop Chrome'], storageState: OWNER_STATE },
    },
    {
      name: 'phone',
      dependencies: ['setup'],
      grep: /@phone/,
      use: { ...devices['Pixel 7'], storageState: OWNER_STATE },
    },
  ],
});
