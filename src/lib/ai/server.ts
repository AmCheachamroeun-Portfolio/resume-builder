/* Server only: reads GEMINI_API_KEY. Imported exclusively by route handlers and tests. */
import { ApiError, GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { groundDraft, inventedNumbers } from './guards';
import { buildPrompt, SYSTEM_PROMPT } from './prompts';
import {
  AI_RESPONSES,
  type AiAction,
  type AiErrorCode,
  type AiRequest,
  type AiResponse,
} from './schemas';

export const DEFAULT_MODEL = 'gemini-3.8-flash';
export const TIMEOUT_MS = 40_000;

export class AiFailure extends Error {
  constructor(public code: AiErrorCode) {
    super(code);
  }
}

export const isConfigured = () => Boolean(process.env.GEMINI_API_KEY?.trim());

/** Gemini accepts a subset of JSON Schema, so validation-only keywords are removed. */
export function toGeminiSchema(schema: z.ZodType) {
  const drop = new Set(['$schema', 'minLength', 'maxLength', 'default']);
  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(walk);
    if (typeof node !== 'object' || node === null) return node;
    return Object.fromEntries(
      Object.entries(node)
        .filter(([key, value]) => !(drop.has(key) && typeof value !== 'object'))
        .map(([key, value]) => [key, walk(value)]),
    );
  };
  return walk(z.toJSONSchema(schema));
}

function classify(error: unknown): AiErrorCode {
  if (error instanceof AiFailure) return error.code;
  if (error instanceof ApiError) {
    if (error.status === 429) return 'quota';
    // A rejected key or unknown model is a setup problem, not the visitor's.
    if ([400, 401, 403, 404].includes(error.status)) return 'not-configured';
    return 'upstream';
  }
  const name = error instanceof Error ? error.name : '';
  return name === 'AbortError' || name === 'TimeoutError' ? 'timeout' : 'upstream';
}

/** Verifies output against the request. Returns null when it must not be shown. */
function verify<A extends AiAction>(
  action: A,
  input: AiRequest<A>,
  output: AiResponse<A>,
): unknown {
  if (action === 'improve-experience') {
    const request = input as AiRequest<'improve-experience'>;
    const result = output as AiResponse<'improve-experience'>;
    return inventedNumbers(`${request.text}\n${request.role}`, result.text).length ? null : result;
  }
  if (action === 'generate-summary') {
    const request = input as AiRequest<'generate-summary'>;
    const source = `${request.context}\n${request.goals}\n${request.targetRole}`;
    const options = (output as AiResponse<'generate-summary'>).options.filter(
      (o) => !inventedNumbers(source, o.text).length,
    );
    return options.length ? { options } : null;
  }
  if (action === 'suggest-skills') {
    const existing = new Set(
      (input as AiRequest<'suggest-skills'>).existing.map((s) => s.toLocaleLowerCase()),
    );
    const { skills } = output as AiResponse<'suggest-skills'>;
    return { skills: skills.filter((s) => !existing.has(s.name.toLocaleLowerCase())) };
  }
  if (action === 'generate-draft') {
    return groundDraft(
      output as AiResponse<'generate-draft'>,
      input as AiRequest<'generate-draft'>,
    );
  }
  return output;
}

export type Generate = (params: {
  model: string;
  contents: string;
  config: Record<string, unknown>;
}) => Promise<{ text?: string }>;

const gemini: Generate = (params) => {
  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  return client.models.generateContent(params);
};

export async function runAi<A extends AiAction>(
  action: A,
  input: AiRequest<A>,
  generate: Generate = gemini,
): Promise<unknown> {
  const schema = AI_RESPONSES[action] as unknown as z.ZodType<AiResponse<A>>;
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  let failure: AiErrorCode = 'bad-response';

  // One automatic second attempt for malformed or unverifiable output.
  for (let attempt = 0; attempt < 2; attempt++) {
    let text: string | undefined;
    try {
      ({ text } = await generate({
        model: process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL,
        contents: buildPrompt(action, input),
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          responseJsonSchema: toGeminiSchema(schema),
          maxOutputTokens: 8192,
          abortSignal: signal,
        },
      }));
    } catch (error) {
      throw new AiFailure(classify(error));
    }
    let json: unknown;
    try {
      json = JSON.parse(text ?? '');
    } catch {
      failure = 'bad-response';
      continue;
    }
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      failure = 'bad-response';
      continue;
    }
    const verified = verify(action, input, parsed.data);
    if (verified !== null) return verified;
    failure = 'unverified';
  }
  throw new AiFailure(failure);
}
