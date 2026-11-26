export const PRINT_BROWSERS = ['chromium', 'safari', 'firefox', 'ios', 'android'] as const;
export type PrintBrowser = (typeof PRINT_BROWSERS)[number];

/** Only chooses which printing steps to show first; the user can pick another. */
export function detectBrowser(userAgent: string, touchPoints = 0): PrintBrowser {
  // iPadOS identifies itself as a Mac, but has a touch screen.
  const ipad = /Macintosh/.test(userAgent) && touchPoints > 1;
  if (ipad || /iPad|iPhone|iPod/.test(userAgent)) return 'ios';
  if (/Android/.test(userAgent)) return 'android';
  if (/Firefox\//.test(userAgent)) return 'firefox';
  if (/Edg\/|Chrome\/|Chromium\//.test(userAgent)) return 'chromium';
  return /Safari\//.test(userAgent) ? 'safari' : 'chromium';
}
