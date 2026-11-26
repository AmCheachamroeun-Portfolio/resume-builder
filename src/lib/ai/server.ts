/* Server only: reads GEMINI_API_KEY. Imported exclusively by route handlers and tests. */
import { ApiError, GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { checkTailoring, groundDraft, groundImport, inventedNumbers } from './guards';
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
  constructor(
    public code: AiErrorCode,
    /** Gemini's HTTP status, when it sent one. Safe to log: it says nothing about the text. */
    public status?: number,
  ) {
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
    if (error.status === 401 || error.status === 403) return 'invalid-key';
    if (error.status === 404) return 'model-unavailable';
    if (error.status === 408 || error.status === 504) return 'timeout';
    // Gemini reports a malformed key as a bad request rather than as 401.
    if (error.status === 400 && /api[ _-]?key/i.test(error.message)) return 'invalid-key';
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
  if (action === 'tailor-resume') {
    return checkTailoring(
      output as AiResponse<'tailor-resume'>,
      input as AiRequest<'tailor-resume'>,
    );
  }
  if (action === 'cover-letter') {
    const request = input as AiRequest<'cover-letter'>;
    const { body } = output as AiResponse<'cover-letter'>;
    // Figures from the job advert are not the applicant's, so they do not count.
    const source = `${request.context}\n${request.jobTitle}\n${request.company}`;
    const placeholder = /\[[^\]\n]{1,60}\]/.test(body);
    return placeholder || inventedNumbers(source, body).length ? null : output;
  }
  if (action === 'generate-draft') {
    return groundDraft(
      output as AiResponse<'generate-draft'>,
      input as AiRequest<'generate-draft'>,
    );
  }
  if (action === 'parse-resume') {
    return groundImport(
      output as AiResponse<'parse-resume'>,
      (input as AiRequest<'parse-resume'>).text,
    );
  }
  return output;
}

export type Generate = (params: {
  model: string;
  contents: string;
  config: Record<string, unknown>;
}) => Promise<{
  text?: string;
  candidates?: { finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
}>;

/** One more try for Gemini's passing server errors. A used-up quota is never retried. */
export const RETRY = { attempts: 2, initialDelay: 1, httpStatusCodes: [500, 502, 503] };

const gemini: Generate = (params) => {
  const client = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY!,
    httpOptions: { retryOptions: RETRY },
  });
  return client.models.generateContent(params);
};

/** Reasons Gemini gives for withholding an answer. Asking again changes nothing. */
const WITHHELD = new Set(['SAFETY', 'RECITATION', 'BLOCKLIST', 'PROHIBITED_CONTENT', 'SPII']);

export async function runAi<A extends AiAction>(
  action: A,
  input: AiRequest<A>,
  generate: Generate = gemini,
  /** Aborts when the visitor cancels or leaves, so nothing more is asked of Gemini. */
  cancelled?: AbortSignal,
): Promise<unknown> {
  const schema = AI_RESPONSES[action] as unknown as z.ZodType<AiResponse<A>>;
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  const signal = cancelled ? AbortSignal.any([timeout, cancelled]) : timeout;
  let failure: AiErrorCode = 'bad-response';

  // One automatic second attempt for malformed or unverifiable output.
  for (let attempt = 0; attempt < 2; attempt++) {
    if (cancelled?.aborted) throw new AiFailure('cancelled');
    let response: Awaited<ReturnType<Generate>>;
    try {
      response = await generate({
        model: process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL,
        contents: buildPrompt(action, input),
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          responseJsonSchema: toGeminiSchema(schema),
          maxOutputTokens: action === 'parse-resume' ? 32_768 : 8192,
          abortSignal: signal,
        },
      });
    } catch (error) {
      if (cancelled?.aborted) throw new AiFailure('cancelled');
      throw new AiFailure(
        timeout.aborted ? 'timeout' : classify(error),
        error instanceof ApiError ? error.status : undefined,
      );
    }
    const reason = response.candidates?.[0]?.finishReason ?? '';
    if (response.promptFeedback?.blockReason || WITHHELD.has(reason)) {
      throw new AiFailure('blocked');
    }
    let json: unknown;
    try {
      json = JSON.parse(response.text ?? '');
    } catch {
      // Cut off at the length limit: the same request would be cut off again.
      if (reason === 'MAX_TOKENS') throw new AiFailure('too-long');
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
