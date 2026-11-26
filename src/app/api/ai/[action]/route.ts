import { isAllowed } from '@/lib/ai/rate-limit';
import { AI_REQUESTS, type AiAction, type AiErrorCode } from '@/lib/ai/schemas';
import { AiFailure, isConfigured, runAi } from '@/lib/ai/server';

export const maxDuration = 60;

const MAX_BODY = 80_000;

const STATUS: Record<AiErrorCode, number> = {
  'not-configured': 503,
  'invalid-request': 400,
  forbidden: 403,
  'rate-limited': 429,
  quota: 429,
  timeout: 504,
  'bad-response': 502,
  unverified: 422,
  upstream: 502,
  network: 502,
  'daily-limit': 429,
};

const fail = (code: AiErrorCode) =>
  Response.json(
    { error: code },
    { status: STATUS[code], headers: { 'Cache-Control': 'no-store' } },
  );

/** Browsers always send Origin on cross-site POSTs, so other sites cannot spend the quota. */
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

/** Handles POST /api/ai/{chat, recommend-template, generate-summary, ...} */
export async function POST(request: Request, context: RouteContext<'/api/ai/[action]'>) {
  const { action } = await context.params;
  if (!Object.hasOwn(AI_REQUESTS, action)) return new Response(null, { status: 404 });
  const name = action as AiAction;

  if (!sameOrigin(request) || !request.headers.get('content-type')?.includes('application/json')) {
    return fail('forbidden');
  }
  if (!isConfigured()) return fail('not-configured');
  if (!(await isAllowed(request))) return fail('rate-limited');

  const raw = await request.text();
  if (raw.length > MAX_BODY) return fail('invalid-request');
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return fail('invalid-request');
  }
  const input = AI_REQUESTS[name].safeParse(body);
  if (!input.success) return fail('invalid-request');

  try {
    const data = await runAi(name, input.data);
    return Response.json({ data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const code = error instanceof AiFailure ? error.code : 'upstream';
    // The code only: request bodies contain personal data and are never logged.
    console.error(`[ai] ${name} failed: ${code}`);
    return fail(code);
  }
}
