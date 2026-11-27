import { admit, NO_STORE, report } from '@/lib/ai/http';
import { checkApiKey, geminiFor } from '@/lib/ai/server';

export const maxDuration = 30;

/** Handles POST /api/ai/key: asks Gemini whether the visitor's key works. Stores nothing. */
export async function POST(request: Request) {
  const admitted = await admit(request);
  if ('refused' in admitted) return admitted.refused;
  try {
    await checkApiKey(geminiFor(admitted.key), request.signal);
    return Response.json({ ok: true }, { headers: NO_STORE });
  } catch (error) {
    return report('key check', error);
  }
}
