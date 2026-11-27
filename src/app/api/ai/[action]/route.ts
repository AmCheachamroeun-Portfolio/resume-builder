import { admit, fail, NO_STORE, report } from '@/lib/ai/http';
import { AI_REQUESTS, type AiAction } from '@/lib/ai/schemas';
import { AiFailure, geminiFor, runAi } from '@/lib/ai/server';

export const maxDuration = 60;

const MAX_BODY = 80_000;

/** Handles POST /api/ai/{chat, recommend-template, generate-summary, ...} */
export async function POST(request: Request, context: RouteContext<'/api/ai/[action]'>) {
  const { action } = await context.params;
  if (!Object.hasOwn(AI_REQUESTS, action)) return new Response(null, { status: 404 });
  const name = action as AiAction;

  const admitted = await admit(request);
  if ('refused' in admitted) return admitted.refused;

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
    const data = await runAi(name, input.data, geminiFor(admitted.key), request.signal);
    return Response.json({ data }, { headers: NO_STORE });
  } catch (error) {
    // Nobody is listening after a cancellation, so there is nothing to record.
    if (error instanceof AiFailure && error.code === 'cancelled') return fail('cancelled');
    return report(name, error);
  }
}
