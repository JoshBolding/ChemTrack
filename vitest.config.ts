import { defineConfig } from 'vitest/config';

// Keep Vitest config separate from vite.config.ts so the PWA plugin doesn't
// run during tests (it isn't needed and slows things down).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['src/test/setup.ts'],
    globals: false,
  },
});
