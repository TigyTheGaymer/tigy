import { defineConfig } from 'vitest/config';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

// Tests for the Express server's data endpoints in src/server, which run in
// Node. The Angular app's own tests run through `@angular/build:unit-test`,
// which excludes src/server; `npx nx test public` runs both.
export default defineConfig({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/public-server',
  plugins: [nxViteTsPaths()],
  test: {
    name: 'public-server',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['src/server/**/*.spec.ts'],
  },
});
