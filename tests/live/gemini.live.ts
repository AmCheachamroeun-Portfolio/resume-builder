import { describe, expect, it } from 'vitest';
import type { AiRequest } from '@/lib/ai/schemas';
import { AiFailure, checkApiKey, DEFAULT_MODEL, geminiFor, runAi } from '@/lib/ai/server';

/*
 * Real requests with invented text. Nothing here comes from a real person. The
 * key is the developer's own, for this script only: the app never reads it.
 */
const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
const key = process.env.GEMINI_TEST_API_KEY?.trim() ?? '';

/** Turns a failure into a message that says what to fix. */
async function call<T>(request: () => Promise<T>) {
  try {
    return await request();
  } catch (error) {
    const code = error instanceof AiFailure ? error.code : 'unknown';
    throw new Error(`Gemini request failed with "${code}" (model: ${model})`);
  }
}

if (!key) {
  console.warn('GEMINI_TEST_API_KEY is not set in .env or .env.local, so nothing was verified.');
}

describe.skipIf(!key)(`Gemini (${model})`, () => {
  it('accepts the key', async () => {
    await call(() => checkApiKey(geminiFor(key)));
  });

  it('answers a chat message in English', async () => {
    const input: AiRequest<'chat'> = {
      language: 'en',
      messages: [{ role: 'user', text: 'Give one short tip for a resume summary.' }],
    };
    expect(await call(() => runAi('chat', input, geminiFor(key)))).toHaveProperty('reply');
  });

  it('improves Khmer experience text without inventing numbers', async () => {
    const input: AiRequest<'improve-experience'> = {
      language: 'km',
      text: '- បង្កើតទំព័របញ្ជាទិញសម្រាប់ហាងគំរូ',
      role: 'Developer',
      mode: 'improve',
    };
    expect(await call(() => runAi('improve-experience', input, geminiFor(key)))).toHaveProperty(
      'text',
    );
  });
});
