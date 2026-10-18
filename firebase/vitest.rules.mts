import { defineConfig } from 'vitest/config';

// Security rules tests. They need the Firestore and Storage emulators, so run
// them through `npx nx test firebase`, which starts the emulators around them.
// Not named vitest.config.* so the Vitest plugin does not add a target that
// runs them without the emulators.
export default defineConfig({
  root: import.meta.dirname,
  cacheDir: '../node_modules/.vite/firebase',
  test: {
    name: 'firebase',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['tests/**/*.spec.ts'],
    // The files share the emulators and clear them between tests.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
