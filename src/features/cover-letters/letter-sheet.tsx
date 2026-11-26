'use client';

import type { Ref } from 'react';
import { PAGE_DIMENSIONS } from '@/features/resume-templates/resume-document';
import { useWidth } from '@/features/resume-templates/scaled-pages';
import type { CoverLetter } from '@/types/cover-letter';
import { LetterDocument } from './letter-document';
import { LETTER_TEMPLATES } from './templates';

/** Space between the hidden page columns. Any value works; it is never seen. */
export const COLUMN_GAP = 40;

/** The page and its text area in CSS pixels. */
export function letterGeometry({ pageSize, template }: CoverLetter) {
  const page = PAGE_DIMENSIONS[pageSize];
  const margin = (LETTER_TEMPLATES[template].margin / 25.4) * 96;
  return { page, margin, width: page.width - margin * 2, height: page.height - margin * 2 };
}

/**
 * One real-size page of a letter. The text flows through page-sized columns, so
 * the browser breaks it as it does when printing, and `index` picks the column.
 */
export function LetterSheet({
  letter,
  index = 0,
  primary = false,
  columnsRef,
}: {
  letter: CoverLetter;
  index?: number;
  primary?: boolean;
  /** Its scroll width tells how many columns, and so pages, the text needs. */
  columnsRef?: Ref<HTMLDivElement>;
}) {
  const { page, margin, width, height } = letterGeometry(letter);
  return (
    <div className="bg-white" style={{ ...page, padding: margin }}>
      <div ref={columnsRef} className="overflow-hidden" style={{ width, height }}>
        <div
          style={{
            width,
            height,
            columnWidth: width,
            columnGap: COLUMN_GAP,
            columnFill: 'auto',
            transform: index ? `translateX(${-index * (width + COLUMN_GAP)}px)` : undefined,
          }}
        >
          <LetterDocument letter={letter} primary={primary} />
        </div>
      </div>
    </div>
  );
}

/** The first page, scaled to the width of its container. */
export function LetterThumbnail({ letter }: { letter: CoverLetter }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const { page } = letterGeometry(letter);
  return (
    <div
      ref={ref}
      aria-hidden
      inert
      className="shadow-paper relative w-full overflow-hidden bg-white"
      style={{ aspectRatio: `${page.width} / ${page.height}` }}
    >
      {width > 0 && (
        <div
          className="absolute top-0 left-0 origin-top-left"
          style={{ transform: `scale(${width / page.width})` }}
        >
          <LetterSheet letter={letter} />
        </div>
      )}
    </div>
  );
}
