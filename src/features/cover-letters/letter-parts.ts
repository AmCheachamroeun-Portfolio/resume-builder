import { DOCUMENT_LABELS } from '@/constants/document-labels';
import type { CoverLetter } from '@/types/cover-letter';

export function letterDate(date: string, language: CoverLetter['language']) {
  const [year, month, day] = date.split('-').map(Number);
  if (!year || !month || !day || month > 12) return '';
  if (language === 'km') return `${day} ${DOCUMENT_LABELS.km.months[month - 1]} ${year}`;
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'UTC' }).format(
    Date.UTC(year, month - 1, day),
  );
}

/** What goes on the page, in reading order. Every template and Word share it. */
export function letterParts(letter: CoverLetter) {
  const { sender } = letter;
  return {
    name: sender.fullName,
    headline: sender.headline,
    contact: [sender.email, sender.phone, sender.location].filter(Boolean),
    date: letterDate(letter.date, letter.language),
    recipient: [letter.recipient, letter.company].filter(Boolean),
    paragraphs: letter.body
      .replace(/\r\n?/g, '\n')
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean),
    /** Added for the writer unless they already typed their name at the end. */
    signature:
      sender.fullName && !letter.body.trim().endsWith(sender.fullName.trim())
        ? sender.fullName
        : '',
    /** Khmer needs taller lines, and must not be spaced out letter by letter. */
    khmer: /[ក-៿]/.test(
      [letter.body, letter.recipient, letter.company, ...Object.values(sender)].join(''),
    ),
  };
}
