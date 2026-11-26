import { isConfigured } from '@/lib/ai/server';

export const dynamic = 'force-dynamic';

/** Tells the interface whether AI features can be offered. Reveals nothing else. */
export function GET() {
  return Response.json(
    { configured: isConfigured() },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
