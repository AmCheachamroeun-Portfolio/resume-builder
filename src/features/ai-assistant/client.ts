'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  AI_RESPONSES,
  type AiAction,
  type AiErrorCode,
  type AiRequest,
  type AiResponse,
} from '@/lib/ai/schemas';

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

// ---------- Availability ----------
let status: Promise<boolean> | null = null;
export function useAiStatus() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  useEffect(() => {
    status ??= fetch('/api/ai/status', { cache: 'no-store' })
      .then((r) => r.json())
      .then((body) => Boolean(body.configured))
      .catch(() => {
        status = null;
        return false;
      });
    let live = true;
    void status.then((value) => live && setConfigured(value));
    return () => {
      live = false;
    };
  }, []);
  return configured;
}

// ---------- Requests ----------
export class AiError extends Error {
  constructor(public code: AiErrorCode) {
    super(code);
  }
}

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

export async function callAi<A extends AiAction>(
  action: A,
  body: AiRequest<A>,
  signal?: AbortSignal,
): Promise<AiResponse<A> & { removed?: string[] }> {
  if (!readConsent()) throw new AiError('forbidden');
  countUsage();
  let response: Response;
  try {
    response = await fetch(`/api/ai/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new AiError('network');
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new AiError((payload?.error as AiErrorCode) ?? 'upstream');
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
      setLoading(true);
      setError(null);
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
