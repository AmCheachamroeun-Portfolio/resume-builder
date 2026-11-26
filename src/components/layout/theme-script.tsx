'use client';

import { THEME_SCRIPT } from '@/lib/theme';

/**
 * Applies the saved theme while the page is still being parsed. The type switch
 * is the pattern Next.js documents: the server sends a runnable script, and
 * React sees an inert one if it ever renders it in the browser.
 */
export function ThemeScript() {
  return (
    <script
      suppressHydrationWarning
      type={typeof window === 'undefined' ? 'text/javascript' : 'text/plain'}
      dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
    />
  );
}
