import { useEffect } from 'react';
import { DOCUMENT_LABELS } from '@/constants/document-labels';
import { fontStack } from '@/features/resume-templates/fonts';
import type { CoverLetter } from '@/types/cover-letter';

/** Page margin in CSS pixels, matched by the print rule (20 mm). */
export const LETTER_MARGIN = '20mm';

export function letterDate(date: string, language: CoverLetter['language']) {
  const [year, month, day] = date.split('-').map(Number);
  if (!year || !month || !day || month > 12) return '';
  if (language === 'km') return `${day} ${DOCUMENT_LABELS.km.months[month - 1]} ${year}`;
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'UTC' }).format(
    Date.UTC(year, month - 1, day),
  );
}

/** The letter as it is printed. Content only: the page and margins come from outside. */
export function LetterDocument({ letter, onReady }: { letter: CoverLetter; onReady?: () => void }) {
  const { sender } = letter;
  const khmer = /[ក-៿]/.test(
    [letter.body, letter.recipient, letter.company, ...Object.values(sender)].join(''),
  );
  const contact = [sender.email, sender.phone, sender.location].filter(Boolean);
  useEffect(() => onReady?.(), [onReady]);

  return (
    <article
      lang={letter.language}
      data-testid="letter-paper"
      className="text-[#1f2328] [overflow-wrap:anywhere]"
      style={{
        fontFamily: fontStack('source-sans'),
        fontSize: '11pt',
        // Khmer stacks marks above and below the line and needs the room.
        lineHeight: khmer ? 1.85 : 1.55,
      }}
    >
      {(sender.fullName || contact.length > 0) && (
        <header className="mb-6 border-b border-[#d5d8dd] pb-3">
          {sender.fullName && (
            <p className="text-[18pt] leading-tight font-semibold">{sender.fullName}</p>
          )}
          {sender.headline && <p className="text-[#4a515c]">{sender.headline}</p>}
          {contact.length > 0 && (
            <p className="mt-1 flex flex-wrap gap-x-4 text-[9.5pt] text-[#4a515c]">
              {contact.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </p>
          )}
        </header>
      )}
      {letter.date && <p className="mb-4">{letterDate(letter.date, letter.language)}</p>}
      {(letter.recipient || letter.company) && (
        <p className="mb-4">
          {[letter.recipient, letter.company].filter(Boolean).map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </p>
      )}
      {letter.body
        .split(/\n{2,}/)
        .filter((paragraph) => paragraph.trim())
        .map((paragraph, index) => (
          <p key={index} className="mb-3 whitespace-pre-wrap">
            {paragraph.trim()}
          </p>
        ))}
      {/* Added for the writer unless they already typed their name at the end. */}
      {sender.fullName && !letter.body.trim().endsWith(sender.fullName.trim()) && (
        <p>{sender.fullName}</p>
      )}
    </article>
  );
}
