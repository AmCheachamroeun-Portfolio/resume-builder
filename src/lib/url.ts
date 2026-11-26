/**
 * Turns user text into a safe href, or null. Only web, mail and phone links are
 * ever rendered, so imported "javascript:" or "data:" values stay inert text.
 */
export function safeHref(value: string): string | null {
  const raw = value.trim();
  if (!raw || /\s/.test(raw)) return null;
  if (/^(mailto:|tel:)/i.test(raw)) return raw;
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.hostname.includes('.') || url.hostname === 'localhost' ? url.href : null;
  } catch {
    return null;
  }
}

export function displayUrl(value: string) {
  return value
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/$/, '');
}
