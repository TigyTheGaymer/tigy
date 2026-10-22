import { workspaceRoot } from '@nx/devkit';
import { nxE2EPreset } from '@nx/playwright/preset';
import { defineConfig, devices } from '@playwright/test';

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
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'phone',
      grep: /@phone/,
      use: { ...devices['Pixel 7'] },
    },
  ],
});
