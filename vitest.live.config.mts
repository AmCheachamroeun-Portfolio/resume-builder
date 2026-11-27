import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

/*
 * `pnpm verify:ai` calls the real Gemini API with fictional data, using your own
 * GEMINI_TEST_API_KEY from .env or .env.local. The app itself never reads that
 * variable. It spends quota, so it is never part of `pnpm check`.
 */
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'node',
    include: ['tests/live/**/*.live.ts'],
    env: loadEnv('development', process.cwd(), 'GEMINI_'),
    testTimeout: 60_000,
    fileParallelism: false,
  },
});
