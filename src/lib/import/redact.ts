export const EMAIL = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.\p{L}{2,}/gu;
export const URL_LIKE =
  /\b(?:https?:\/\/|www\.)[^\s|·,;()<>]+|\b(?:[a-z0-9-]+\.)+(?:com|net|org|io|dev|app|me|co|kh|info|xyz|site|tech)(?:\/[^\s|·,;()<>]*)?(?![\p{L}\p{N}])/giu;
/** Eight or more digits with the separators phone numbers use. */
export const PHONE = /(?<![\p{L}\p{N}])\+?\(?[\d០-៩](?:[\d០-៩() .-]{6,}[\d០-៩])/gu;

const YEARS_ONLY = /^\(?\s*(?:19|20)\d{2}\s*[-–.]\s*(?:19|20)\d{2}\s*\)?$/;

export function isPhone(match: string) {
  const digits = match.replace(/[^\d០-៩]/g, '').length;
  // "2018 - 2022" has eight digits too, and is a date range.
  return digits >= 8 && digits <= 15 && !YEARS_ONLY.test(match.trim());
}

/**
 * Removes contact details and the writer's name before text is offered to the
 * model. They are read on the device and added back afterwards.
 */
export function redactForAi(text: string, fullName: string) {
  let out = text
    .replace(EMAIL, '[email]')
    .replace(URL_LIKE, '[link]')
    .replace(PHONE, (match) => (isPhone(match) ? '[phone]' : match));
  const name = fullName.trim();
  if (name.length > 2) {
    const pattern = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    out = out.replace(new RegExp(pattern, 'giu'), '[name]');
  }
  return out;
}
