import { checkRateLimit } from '@vercel/firewall';

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
export const DAILY_LIMIT = 100;

const hits = new Map<string, number[]>();

/**
 * Sliding window per client inside one server instance. This only blunts bursts:
 * serverless instances do not share memory, so production also needs the shared
 * Vercel Firewall rule below.
 */
export function allowLocally(key: string, perMinute: number, now = Date.now()) {
  if (hits.size > 5000) hits.clear();
  const recent = (hits.get(key) ?? []).filter((time) => now - time < DAY);
  const lastMinute = recent.filter((time) => now - time < MINUTE).length;
  if (lastMinute >= perMinute || recent.length >= DAILY_LIMIT) {
    hits.set(key, recent);
    return false;
  }
  hits.set(key, [...recent, now]);
  return true;
}

export async function isAllowed(request: Request) {
  const client =
    request.headers.get('x-real-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown';
  const perMinute = Number(process.env.AI_REQUESTS_PER_MINUTE) || 10;
  if (!allowLocally(client, perMinute)) return false;

  const ruleId = process.env.AI_RATE_LIMIT_ID?.trim();
  if (!ruleId || !process.env.VERCEL) return true;
  try {
    const { rateLimited, error } = await checkRateLimit(ruleId, { request, timeout: 2000 });
    if (error === 'not-found') console.warn('[ai] firewall rate-limit rule was not found');
    return !rateLimited;
  } catch {
    // Fail closed: an unreachable limiter must not leave these routes open to abuse.
    return false;
  }
}
