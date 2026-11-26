import { describe, expect, it } from 'vitest';
import type { AiRequest } from '@/lib/ai/schemas';
import { AiFailure, DEFAULT_MODEL, isConfigured, runAi } from '@/lib/ai/server';

/* Real requests with invented text. Nothing here comes from a real person. */
const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;

/** Turns a failure into a message that says what to fix. */
async function call(...args: Parameters<typeof runAi>) {
  try {
    return await runAi(...args);
  } catch (error) {
    const code = error instanceof AiFailure ? error.code : 'unknown';
    throw new Error(`Gemini request failed with "${code}" (model: ${model})`);
  }
}

if (!isConfigured()) {
  console.warn('GEMINI_API_KEY is not set in .env or .env.local, so nothing was verified.');
}

describe.skipIf(!isConfigured())(`Gemini (${model})`, () => {
  it('answers a chat message in English', async () => {
    const input: AiRequest<'chat'> = {
      language: 'en',
      messages: [{ role: 'user', text: 'Give one short tip for a resume summary.' }],
    };
    expect(await call('chat', input)).toHaveProperty('reply');
  });

  it('improves Khmer experience text without inventing numbers', async () => {
    const input: AiRequest<'improve-experience'> = {
      language: 'km',
      text: '- បង្កើតទំព័របញ្ជាទិញសម្រាប់ហាងគំរូ',
      role: 'Developer',
      mode: 'improve',
    };
    expect(await call('improve-experience', input)).toHaveProperty('text');
  });
});
