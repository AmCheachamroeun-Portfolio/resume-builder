'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { useWidth } from '@/features/resume-templates/scaled-pages';
import type { CoverLetter } from '@/types/cover-letter';
import { COLUMN_GAP, letterGeometry, LetterSheet } from './letter-sheet';

/** Every page of the letter at the width of its container. */
export function LetterPreview({ letter }: { letter: CoverLetter }) {
  const t = useTranslations('letters.editor');
  const pageLabel = useTranslations('editor.preview');
  const [outer, width] = useWidth<HTMLDivElement>();
  const columns = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState(1);
  const geometry = letterGeometry(letter);
  const { page } = geometry;
  const scale = Math.min(1, width / page.width);
  const shown = width > 0;

  // Counts the page columns again whenever the text, the layout or a font changes.
  useEffect(() => {
    const box = columns.current;
    if (!shown || !box) return;
    let frame = 0;
    const count = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const stride = geometry.width + COLUMN_GAP;
        setPages(Math.max(1, Math.round((box.scrollWidth + COLUMN_GAP) / stride)));
      });
    };
    const observer = new MutationObserver(count);
    observer.observe(box, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
    });
    document.fonts.addEventListener('loadingdone', count);
    void document.fonts.ready.then(count);
    count();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.fonts.removeEventListener('loadingdone', count);
    };
  }, [shown, geometry.width, geometry.height]);

  return (
    <div ref={outer} className="w-full">
      {shown && (
        <div className="flex flex-col items-center gap-5">
          {Array.from({ length: pages }, (_, index) => (
            // Later pages repeat the text out of view, so only the first is read aloud.
            <figure key={index} data-letter-page={index + 1} aria-hidden={index > 0 || undefined}>
              <div
                className="paper overflow-hidden"
                style={{ width: page.width * scale, height: page.height * scale }}
              >
                <div className="origin-top-left" style={{ transform: `scale(${scale})` }}>
                  <LetterSheet
                    letter={letter}
                    index={index}
                    primary={index === 0}
                    columnsRef={index === 0 ? columns : undefined}
                  />
                </div>
              </div>
              {pages > 1 && (
                <figcaption className="text-muted-foreground mt-2 text-center text-xs">
                  {pageLabel('pageOf', { page: index + 1, total: pages })}
                </figcaption>
              )}
            </figure>
          ))}
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
