import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

/*
 * `pnpm verify:ai` calls the real Gemini API with fictional data, using the key
 * in .env or .env.local. It spends quota, so it is never part of `pnpm check`.
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
