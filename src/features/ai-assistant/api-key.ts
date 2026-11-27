'use client';

import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { isKeyShape } from '@/lib/ai/key';

/*
 * The visitor's own Gemini key. It lives in this browser's localStorage and
 * nowhere else: not in IndexedDB, so backups and exports cannot include it, and
 * not in React or store state. The "resumecraft:" prefix means "Delete all data"
 * removes it too.
 */
export const API_KEY_STORAGE = 'resumecraft:gemini-api-key';

const listeners = new Set<() => void>();
/** Tells every screen that shows the key's status to read it again. */
export const refreshApiKey = () => listeners.forEach((listener) => listener());

export function readApiKey() {
  try {
    const value = localStorage.getItem(API_KEY_STORAGE)?.trim() ?? '';
    return isKeyShape(value) ? value : '';
  } catch {
    return '';
  }
}

/** Returns false when the browser refuses to store it, as some private modes do. */
export function saveApiKey(key: string) {
  try {
    localStorage.setItem(API_KEY_STORAGE, key);
  } catch {
    return false;
  }
  refreshApiKey();
  return true;
}

export function removeApiKey() {
  try {
    localStorage.removeItem(API_KEY_STORAGE);
  } catch {
    /* nothing was stored */
  }
  refreshApiKey();
}

/** Enough to recognise a key by, without revealing it. */
export const maskKey = (key: string) => (key ? `••••••••${key.slice(-4)}` : '');

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Keeps other open tabs in step.
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

/** The masked key, '' when there is none, or null before the browser has been read. */
export const useApiKeyHint = () =>
  useSyncExternalStore(
    subscribe,
    () => maskKey(readApiKey()),
    () => null,
  );

// ---------- Setup dialog ----------
export const useKeyDialog = create(() => ({ open: false }));

let waiting: ((saved: boolean) => void)[] = [];
/** Stops the dialog reappearing by itself after the visitor has closed it. */
let dismissed = false;

/** Opens the dialog. Resolves true once a key is saved, false if it is closed. */
export function requestApiKey() {
  useKeyDialog.setState({ open: true });
  return new Promise<boolean>((resolve) => waiting.push(resolve));
}

/** For AI actions: carries straight on with a saved key, otherwise asks for one first. */
export const ensureApiKey = () => (readApiKey() ? Promise.resolve(true) : requestApiKey());

/** For arriving at an AI feature: offers setup once, without insisting. */
export function promptForApiKey() {
  if (!dismissed && !readApiKey()) void requestApiKey();
}

export function closeKeyDialog(saved: boolean) {
  dismissed = !saved;
  useKeyDialog.setState({ open: false });
  const resolvers = waiting;
  waiting = [];
  resolvers.forEach((resolve) => resolve(saved));
}
