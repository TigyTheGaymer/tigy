import { workspaceRoot } from '@nx/devkit';
import { nxE2EPreset } from '@nx/playwright/preset';
import { defineConfig, devices } from '@playwright/test';

const PORT = process.env['E2E_PORT'] ?? '4300';
const baseURL = `http://localhost:${PORT}`;

// A short summary cache, so tests see their own edits. Production never sets it.
process.env['SUMMARY_MAX_AGE_MS'] ??= '1000';

export default defineConfig({
  ...nxE2EPreset(import.meta.dirname, { testDir: './src' }),
  // The tests share and change the emulators.
  fullyParallel: false,
  workers: 1,
  globalSetup: './src/support/global-setup.ts',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'node dist/apps/public/server/server.mjs',
    // Not a page, which would cache the summaries before the seed runs.
    url: `${baseURL}/robots.txt`,
    reuseExistingServer: false,
    cwd: workspaceRoot,
    env: {
      PORT,
      SUMMARY_MAX_AGE_MS: process.env['SUMMARY_MAX_AGE_MS'],
      GCLOUD_PROJECT: 'demo-tigy',
      FIREBASE_CONFIG: JSON.stringify({
        projectId: 'demo-tigy',
        storageBucket: 'demo-tigy.appspot.com',
      }),
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
