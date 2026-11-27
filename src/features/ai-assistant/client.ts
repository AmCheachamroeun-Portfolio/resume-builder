'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  AI_ERROR_CODES,
  AI_RESPONSES,
  type AiAction,
  type AiErrorCode,
  type AiRequest,
  type AiResponse,
} from '@/lib/ai/schemas';
import { API_KEY_HEADER } from '@/lib/ai/key';
import { ensureApiKey, readApiKey } from './api-key';

const CONSENT_KEY = 'resumecraft:ai-consent';
const USAGE_KEY = 'resumecraft:ai-usage';
export const CLIENT_DAILY_LIMIT = 60;

// ---------- Consent ----------
const listeners = new Set<() => void>();
const readConsent = () => {
  try {
    return localStorage.getItem(CONSENT_KEY) === '1';
  } catch {
    return false;
  }
};
function writeConsent(value: boolean) {
  try {
    if (value) localStorage.setItem(CONSENT_KEY, '1');
    else localStorage.removeItem(CONSENT_KEY);
  } catch {
    /* consent cannot persist, so it will be asked again */
  }
  listeners.forEach((l) => l());
}
export const grantConsent = () => writeConsent(true);
export const revokeConsent = () => writeConsent(false);
export const useConsent = () =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    readConsent,
    () => false,
  );

// ---------- Requests ----------
export class AiError extends Error {
  constructor(public code: AiErrorCode) {
    super(code);
  }
}

/** A little longer than the server's own limit, so its answer normally wins. */
export const CLIENT_TIMEOUT = 65_000;

/** For replies without our error body, such as a hosting platform's own error page. */
const BY_STATUS: Record<number, AiErrorCode> = {
  403: 'forbidden',
  408: 'timeout',
  413: 'invalid-request',
  429: 'rate-limited',
  504: 'timeout',
};

/** A courtesy cap on this device. The server enforces its own limits. */
function countUsage() {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const stored = JSON.parse(localStorage.getItem(USAGE_KEY) ?? '{}');
    const used = stored.day === today ? Number(stored.used) || 0 : 0;
    if (used >= CLIENT_DAILY_LIMIT) throw new AiError('daily-limit');
    localStorage.setItem(USAGE_KEY, JSON.stringify({ day: today, used: used + 1 }));
  } catch (error) {
    if (error instanceof AiError) throw error;
  }
}

/** Posts to one of our AI routes with the visitor's key in a header, never in the URL. */
async function post(path: string, key: string, body: unknown, signal?: AbortSignal) {
  // Ends the wait if the visitor cancels, or if no answer ever arrives.
  const request = new AbortController();
  const cancel = () => request.abort(signal?.reason);
  signal?.addEventListener('abort', cancel);
  if (signal?.aborted) cancel();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    request.abort();
  }, CLIENT_TIMEOUT);
  let response: Response;
  let payload;
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', [API_KEY_HEADER]: key },
      body: JSON.stringify(body),
      signal: request.signal,
    });
    payload = await response.json().catch(() => null);
    if (request.signal.aborted) throw new Error('aborted');
  } catch (error) {
    if (signal?.aborted) throw error;
    // The original error is dropped on purpose: it can quote request headers.
    throw new AiError(timedOut ? 'timeout' : 'network');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
  if (!response.ok) {
    const known = AI_ERROR_CODES.find((code) => code === payload?.error);
    throw new AiError(known ?? BY_STATUS[response.status] ?? 'upstream');
  }
  return payload;
}

/** Asks Gemini whether a key works, before it is saved. */
export async function verifyApiKey(key: string, signal?: AbortSignal) {
  await post('/api/ai/key', key, {}, signal);
}

export async function callAi<A extends AiAction>(
  action: A,
  body: AiRequest<A>,
  signal?: AbortSignal,
): Promise<AiResponse<A> & { removed?: string[] }> {
  if (!readConsent()) throw new AiError('forbidden');
  const key = readApiKey();
  if (!key) throw new AiError('missing-key');
  countUsage();
  const payload = await post(`/api/ai/${action}`, key, body, signal);
  const parsed = AI_RESPONSES[action].safeParse(payload?.data);
  if (!parsed.success) throw new AiError('bad-response');
  const removed = Array.isArray(payload.data.removed) ? payload.data.removed : undefined;
  return { ...(parsed.data as AiResponse<A>), removed };
}

/** Loading, error and retry state for one kind of request. */
export function useAiRequest<A extends AiAction>(action: A) {
  const [data, setData] = useState<(AiResponse<A> & { removed?: string[] }) | null>(null);
  const [error, setError] = useState<AiErrorCode | null>(null);
  const [loading, setLoading] = useState(false);
  const last = useRef<AiRequest<A> | null>(null);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  const run = useCallback(
    async (body: AiRequest<A>) => {
      controller.current?.abort();
      const current = new AbortController();
      controller.current = current;
      last.current = body;
      setError(null);
      // Without a key, setup opens first and this same request continues afterwards.
      const ready = await ensureApiKey();
      if (controller.current !== current || current.signal.aborted) return null;
      if (!ready) {
        setLoading(false);
        return null;
      }
      setLoading(true);
      setData(null);
      try {
        const result = await callAi(action, body, current.signal);
        if (controller.current !== current) return null;
        setData(result);
        return result;
      } catch (cause) {
        if (controller.current === current && !current.signal.aborted) {
          setError(cause instanceof AiError ? cause.code : 'upstream');
        }
        return null;
      } finally {
        if (controller.current === current) setLoading(false);
      }
    },
    [action],
  );

  const retry = useCallback(() => (last.current ? run(last.current) : undefined), [run]);
  const reset = useCallback(() => {
    controller.current?.abort();
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, error, loading, run, retry, reset };
}
