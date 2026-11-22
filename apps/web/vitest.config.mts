import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const alias = { '@': fileURLToPath(new URL('./src', import.meta.url)) };

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: 'api',
          environment: 'node',
          include: ['src/**/*.test.ts'],
          testTimeout: 20000,
          hookTimeout: 30000,
        },
      },
      {
        resolve: { alias },
        oxc: { jsx: { runtime: 'automatic' } },
        test: {
          name: 'ui',
          environment: 'jsdom',
          include: ['src/**/*.test.tsx'],
          setupFiles: ['./vitest.setup.ts'],
        },
      },
    ],
  },
});
