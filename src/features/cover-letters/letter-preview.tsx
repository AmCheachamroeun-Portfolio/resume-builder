'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { PAGE_DIMENSIONS } from '@/features/resume-templates/resume-document';
import { useWidth } from '@/features/resume-templates/scaled-pages';
import type { CoverLetter } from '@/types/cover-letter';
import { LetterDocument } from './letter-document';

/** 20 mm at CSS resolution. */
const MARGIN = (20 / 25.4) * 96;

/** One sheet at the width of its container, with a note when the text runs longer. */
export function LetterPreview({ letter }: { letter: CoverLetter }) {
  const t = useTranslations('letters.editor');
  const [outer, width] = useWidth<HTMLDivElement>();
  const content = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  const page = PAGE_DIMENSIONS[letter.pageSize];
  const scale = Math.min(1, width / page.width);
  const sheet = Math.max(page.height, height + MARGIN * 2);
  const pages = Math.max(1, Math.ceil((height - 1) / (page.height - MARGIN * 2)));

  useEffect(() => {
    if (!content.current) return;
    const observer = new ResizeObserver(([entry]) => setHeight(entry!.contentRect.height));
    observer.observe(content.current);
    return () => observer.disconnect();
  }, [width]);

  return (
    <div ref={outer} className="w-full">
      {width > 0 && (
        <div
          className="paper mx-auto overflow-hidden"
          style={{ width: page.width * scale, height: sheet * scale }}
        >
          <div
            className="origin-top-left bg-white"
            style={{
              width: page.width,
              height: sheet,
              padding: MARGIN,
              transform: `scale(${scale})`,
            }}
          >
            <div ref={content} className="flow-root">
              <LetterDocument letter={letter} />
            </div>
          </div>
        </div>
      )}
      {pages > 1 && (
        <p role="status" className="text-warning mt-3 text-center text-xs">
          {t('long', { count: pages })}
        </p>
      )}
    </div>
  );
}
