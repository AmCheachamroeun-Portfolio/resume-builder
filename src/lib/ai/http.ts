/* Server only: the checks and error replies shared by the AI route handlers. */
import { API_KEY_HEADER, isKeyShape } from './key';
import { isAllowed } from './rate-limit';
import type { AiErrorCode } from './schemas';
import { AiFailure } from './server';

const STATUS: Record<AiErrorCode, number> = {
  'missing-key': 401,
  'invalid-key': 401,
  'model-unavailable': 503,
  cancelled: 408,
  'invalid-request': 400,
  forbidden: 403,
  'rate-limited': 429,
  quota: 429,
  timeout: 504,
  'bad-response': 502,
  blocked: 422,
  'too-long': 422,
  unverified: 422,
  upstream: 502,
  network: 502,
  'daily-limit': 429,
};

export const NO_STORE = { 'Cache-Control': 'no-store' };

export const fail = (code: AiErrorCode) =>
  Response.json({ error: code }, { status: STATUS[code], headers: NO_STORE });

/** Browsers always send Origin on cross-site POSTs, so other sites cannot use these routes. */
function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * Admits a request that comes from this app and carries the visitor's own key.
 * There is no shared key to fall back on.
 */
export async function admit(request: Request): Promise<{ key: string } | { refused: Response }> {
  const type = request.headers.get('content-type') ?? '';
  if (!sameOrigin(request) || !type.startsWith('application/json')) {
    return { refused: fail('forbidden') };
  }
  const key = request.headers.get(API_KEY_HEADER)?.trim() ?? '';
  if (!key) return { refused: fail('missing-key') };
  if (!isKeyShape(key)) return { refused: fail('invalid-key') };
  if (!(await isAllowed(request))) return { refused: fail('rate-limited') };
  return { key };
}

/**
 * Replies with a failure code. Only the code and Gemini's status are logged:
 * never the key, never any request or response text.
 */
export function report(label: string, error: unknown) {
  const code = error instanceof AiFailure ? error.code : 'upstream';
  const status = error instanceof AiFailure && error.status ? ` (Gemini ${error.status})` : '';
  console.error(`[ai] ${label} failed: ${code}${status}`);
  return fail(code);
}
