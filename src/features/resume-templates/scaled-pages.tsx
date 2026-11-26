'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { Resume } from '@/types/resume';
import { PAGE_DIMENSIONS, ResumeDocument } from './resume-document';

/** Observes an element's content width. */
export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry!.contentRect.width));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Renders nothing until the element is near the viewport. */
function useNearViewport<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    if (!ref.current || near) return;
    const observer = new IntersectionObserver(([entry]) => entry?.isIntersecting && setNear(true), {
      rootMargin: '300px',
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [near]);
  return [ref, near] as const;
}

/** First page of a real resume, scaled to the width of its container. */
export function ResumeThumbnail({ resume, className }: { resume: Resume; className?: string }) {
  const [widthRef, width] = useWidth<HTMLDivElement>();
  const [viewRef, near] = useNearViewport<HTMLDivElement>();
  const page = PAGE_DIMENSIONS[resume.design.pageSize];
  const scale = width / page.width;
  return (
    <div
      ref={widthRef}
      aria-hidden
      inert
      className={cn('relative w-full overflow-hidden bg-white', className)}
      style={{ aspectRatio: `${page.width} / ${page.height}` }}
    >
      <div ref={viewRef} className="absolute inset-0">
        {!(near && width > 0) && <div className="skeleton absolute inset-0" />}
        {near && width > 0 && (
          <div
            className="absolute top-0 left-0 origin-top-left"
            style={{ transform: `scale(${scale})`, width: page.width }}
          >
            <ResumeDocument resume={resume} firstPageOnly interactive={false} />
          </div>
        )}
      </div>
    </div>
  );
}

/** All pages stacked, each scaled by the same factor. */
export function ScaledPages({
  resume,
  scale,
  onLayout,
  pageLabel,
}: {
  resume: Resume;
  scale: number;
  onLayout?: (pages: number) => void;
  pageLabel: (page: number, total: number) => string;
}) {
  const page = PAGE_DIMENSIONS[resume.design.pageSize];
  return (
    <div className="flex flex-col items-center gap-6">
      <ResumeDocument
        resume={resume}
        onLayout={onLayout}
        wrapPage={(node, index, total) => (
          <figure key={index} data-preview-page={index + 1} className="m-0">
            <div
              className="paper overflow-hidden"
              style={{ width: page.width * scale, height: page.height * scale }}
            >
              <div className="origin-top-left" style={{ transform: `scale(${scale})` }}>
                {node}
              </div>
            </div>
            {total > 1 && (
              <figcaption className="text-muted-foreground mt-2 text-center text-xs">
                {pageLabel(index + 1, total)}
              </figcaption>
            )}
          </figure>
        )}
      />
    </div>
  );
}

/** All pages at the width of the container, never larger than real size. */
export function FittedPages({ resume }: { resume: Resume }) {
  const t = useTranslations('editor.preview');
  const [ref, width] = useWidth<HTMLDivElement>();
  const scale = Math.min(1, width / PAGE_DIMENSIONS[resume.design.pageSize].width);
  return (
    <div ref={ref} className="w-full">
      {width > 0 && (
        <ScaledPages
          resume={resume}
          scale={scale}
          pageLabel={(page, total) => t('pageOf', { page, total })}
        />
      )}
    </div>
  );
}
