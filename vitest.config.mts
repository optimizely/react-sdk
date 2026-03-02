import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    setupFiles: ['./vitest.setup.ts'],
    typecheck: {
      tsconfig: './tsconfig.spec.json',
    },
    include: [
      'src/client/**/*.spec.{ts,tsx}',
      'src/provider/**/*.spec.{ts,tsx}',
      'src/utils/**/*.spec.{ts,tsx}',
      // Add more paths as migration progresses
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/client/**', 'src/provider/**', 'src/utils/**'],
    },
  },
});
