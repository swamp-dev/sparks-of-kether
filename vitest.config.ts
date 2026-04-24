import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    // No `globals: true`: test files import describe/it/expect explicitly
    // from 'vitest'. Keeping it off avoids the "half-configured" trap
    // (globals flag + explicit imports is confusing for contributors).
    setupFiles: ['./test/setup.ts'],
    // Playwright owns e2e/; that single glob is sufficient. Do NOT add
    // `**/*.spec.ts` here — it would silently swallow any future unit
    // test named `*.spec.ts` under engine/ or lib/.
    exclude: ['**/node_modules/**', '**/.next/**', '**/e2e/**'],
    include: ['**/__tests__/**/*.{test,spec}.{ts,tsx}', '**/*.{test,spec}.{ts,tsx}'],
    css: false,
    coverage: {
      reporter: ['text', 'html'],
      include: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}', 'engine/**/*.ts', 'lib/**/*.ts'],
      exclude: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', '**/__tests__/**'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
});
