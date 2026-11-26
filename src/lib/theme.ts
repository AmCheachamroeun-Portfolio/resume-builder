'use client';

import { useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark' | 'system';
export const THEME_KEY = 'resumecraft:theme';

/** Runs before first paint so there is no flash of the wrong theme. */
export const THEME_SCRIPT = `try{var t=localStorage.getItem('${THEME_KEY}');var d=t==='dark'||((!t||t==='system')&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}`;

const listeners = new Set<() => void>();

function read(): Theme {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

function paint() {
  const theme = read();
  const dark =
    theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
}

export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* preference simply will not persist */
  }
  paint();
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const media = matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', paint);
  // Locale switches re-render <html>, which drops the class: put it back.
  paint();
  return () => {
    listeners.delete(listener);
    media.removeEventListener('change', paint);
  };
}

export function useTheme() {
  return useSyncExternalStore(subscribe, read, () => 'system' as const);
}
