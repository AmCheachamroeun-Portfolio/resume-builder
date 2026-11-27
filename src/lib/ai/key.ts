/* Facts about a Gemini API key that the browser and the server must agree on. */

/** The key travels only in this request header, never in a URL or a body. */
export const API_KEY_HEADER = 'x-gemini-api-key';

export const API_KEY_URL = 'https://aistudio.google.com/apikey';

/**
 * A loose shape check, so a new key format from Google is not turned away:
 * printable ASCII without spaces, which is also all a request header can carry.
 * Only Google can say whether a key actually works.
 */
export const isKeyShape = (value: string) => /^[\x21-\x7e]{20,256}$/.test(value);
