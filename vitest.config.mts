import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: [
      'src/client/**/*.spec.{ts,tsx}',
      'src/provider/**/*.spec.{ts,tsx}',
      // Add more paths as migration progresses
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/client/**', 'src/provider/**'],
    },
  },
});
