import { useEffect, type ReactNode } from 'react';
import { fontStack } from '@/features/resume-templates/fonts';
import { readableInk } from '@/lib/color';
import { cn } from '@/lib/utils';
import type { CoverLetter, LetterTemplateId } from '@/types/cover-letter';
import { letterParts } from './letter-parts';
import { letterFont } from './templates';

type Parts = ReturnType<typeof letterParts>;
type LayoutProps = { parts: Parts; accent: string };

/** Keeps a block on one page, in print and in the preview's page columns. */
const together = 'break-inside-avoid';

function Lines({ lines, className }: { lines: string[]; className?: string }) {
  return (
    <p className={cn(together, className)}>
      {lines.map((line, i) => (
        <span key={i} className="block">
          {line}
        </span>
      ))}
    </p>
  );
}

function Body({ parts, gap, sign }: { parts: Parts; gap: string; sign?: ReactNode }) {
  return (
    <>
      {parts.paragraphs.map((paragraph, i) => (
        <p key={i} className={cn('whitespace-pre-wrap', gap)}>
          {paragraph}
        </p>
      ))}
      {/* The name never starts a page on its own. */}
      {parts.signature && <p className="break-before-avoid">{sign ?? parts.signature}</p>}
    </>
  );
}

const hasHeader = (parts: Parts) => Boolean(parts.name || parts.contact.length);

/** Centred serif letterhead over a single black rule. Black and white only. */
function Classic({ parts }: LayoutProps) {
  return (
    <>
      {hasHeader(parts) && (
        <header className={cn(together, 'mb-8 border-b border-black pb-3.5 text-center')}>
          {parts.name && (
            <p
              className={cn(
                'text-[20pt] leading-tight font-semibold',
                !parts.khmer && 'tracking-[0.07em] uppercase',
              )}
            >
              {parts.name}
            </p>
          )}
          {parts.headline && (
            <p className={cn('mt-1', !parts.khmer && 'italic')}>{parts.headline}</p>
          )}
          {parts.contact.length > 0 && (
            <p className="mt-2 flex flex-wrap justify-center text-[9.5pt]">
              {parts.contact.map((item, i) => (
                <span key={i}>
                  {i > 0 && (
                    <span aria-hidden className="px-2.5">
                      |
                    </span>
                  )}
                  {item}
                </span>
              ))}
            </p>
          )}
        </header>
      )}
      {parts.date && <p className="mb-5 text-right">{parts.date}</p>}
      {parts.recipient.length > 0 && <Lines lines={parts.recipient} className="mb-5" />}
      <Body parts={parts} gap="mb-3.5" />
    </>
  );
}

/** Name and contact details in two columns, an accent rule, then a recipient row. */
function Modern({ parts, accent }: LayoutProps) {
  const ink = readableInk(accent);
  return (
    <>
      {hasHeader(parts) && (
        <header
          className={cn(together, 'flex items-end justify-between gap-8 border-b-[3px] pb-4')}
          style={{ borderColor: accent }}
        >
          <div className="min-w-0 flex-1">
            {parts.name && (
              <p
                className={cn(
                  'text-[24pt] leading-[1.15] font-semibold',
                  !parts.khmer && 'tracking-[-0.01em]',
                )}
              >
                {parts.name}
              </p>
            )}
            {parts.headline && (
              <p className="mt-1 text-[11pt] font-medium" style={{ color: ink }}>
                {parts.headline}
              </p>
            )}
          </div>
          {parts.contact.length > 0 && (
            <Lines
              lines={parts.contact}
              className="max-w-[45%] text-right text-[9pt] leading-[1.7] text-[#4a515c]"
            />
          )}
        </header>
      )}
      {(parts.date || parts.recipient.length > 0) && (
        <div
          className={cn(
            together,
            'mb-6 flex items-start justify-between gap-6 border-b border-[#dfe2e7] py-4',
          )}
        >
          <div className="min-w-0">
            {parts.recipient.map((line, i) => (
              <p key={i} className={i === 0 ? 'font-semibold' : 'text-[#4a515c]'}>
                {line}
              </p>
            ))}
          </div>
          {parts.date && (
            <p className="ml-auto shrink-0 font-medium" style={{ color: ink }}>
              {parts.date}
            </p>
          )}
        </div>
      )}
      <Body
        parts={parts}
        gap="mb-3"
        sign={<span className="font-semibold">{parts.signature}</span>}
      />
    </>
  );
}

/** Quiet left-aligned sender over a hairline: the original cover letter design. */
function Minimal({ parts }: LayoutProps) {
  return (
    <>
      {hasHeader(parts) && (
        <header className={cn(together, 'mb-6 border-b border-[#d5d8dd] pb-3')}>
          {parts.name && <p className="text-[18pt] leading-tight font-semibold">{parts.name}</p>}
          {parts.headline && <p className="text-[#4a515c]">{parts.headline}</p>}
          {parts.contact.length > 0 && (
            <p className="mt-1 flex flex-wrap gap-x-4 text-[9.5pt] text-[#4a515c]">
              {parts.contact.map((item, i) => (
                <span key={i}>{item}</span>
              ))}
            </p>
          )}
        </header>
      )}
      {parts.date && <p className="mb-4">{parts.date}</p>}
      {parts.recipient.length > 0 && <Lines lines={parts.recipient} className="mb-4" />}
      <Body parts={parts} gap="mb-3" />
    </>
  );
}

const LAYOUTS: Record<
  LetterTemplateId,
  {
    Layout: (props: LayoutProps) => ReactNode;
    size: string;
    /** Line height for Latin and for Khmer, which stacks marks above and below. */
    leading: [number, number];
    ink: string;
  }
> = {
  classic: { Layout: Classic, size: '11.5pt', leading: [1.5, 1.85], ink: 'text-[#111111]' },
  modern: { Layout: Modern, size: '10.5pt', leading: [1.6, 1.9], ink: 'text-[#1c2027]' },
  minimal: { Layout: Minimal, size: '11pt', leading: [1.55, 1.85], ink: 'text-[#1f2328]' },
};

/** The letter as it is printed. Content only: the page and margins come from outside. */
export function LetterDocument({
  letter,
  onReady,
  primary = true,
}: {
  letter: CoverLetter;
  onReady?: () => void;
  /** False for miniatures and repeated pages, so only one copy is "the letter". */
  primary?: boolean;
}) {
  const parts = letterParts(letter);
  const { Layout, size, leading, ink } = LAYOUTS[letter.template];
  useEffect(() => onReady?.(), [onReady]);

  return (
    <article
      lang={letter.language}
      data-testid={primary ? 'letter-paper' : undefined}
      data-letter-template={letter.template}
      className={cn('[overflow-wrap:anywhere] [orphans:2] [widows:2]', ink)}
      style={{
        fontFamily: fontStack(letterFont(letter)),
        fontSize: size,
        lineHeight: leading[parts.khmer ? 1 : 0],
        // Rules and accent text print as designed even without "Background graphics".
        printColorAdjust: 'exact',
      }}
    >
      <Layout parts={parts} accent={letter.accent} />
    </article>
  );
}
