'use client';

import { ChevronLeft, ChevronRight, Expand, Minus, MoveHorizontal, Plus, Scan } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { useCallback, useDeferredValue, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { PAGE_DIMENSIONS } from '@/features/resume-templates/resume-document';
import { FittedPages, ScaledPages } from '@/features/resume-templates/scaled-pages';
import type { Resume } from '@/types/resume';

export type Zoom = 'width' | 'page' | number;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2;

export function FullPreview({
  resume,
  open,
  onOpenChange,
}: {
  resume: Resume;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('editor.preview');
  const common = useTranslations('common');
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="bg-desk fixed inset-0 z-50 flex flex-col"
        >
          <div className="border-border bg-surface flex items-center justify-between border-b px-4 py-2">
            <DialogPrimitive.Title className="text-sm font-semibold">
              {t('fullTitle', { title: resume.title })}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <Button size="sm">{common('close')}</Button>
            </DialogPrimitive.Close>
          </div>
          <div className="flex-1 overflow-auto p-4 sm:p-8">
            <div className="mx-auto max-w-[52rem]">
              <FittedPages resume={resume} />
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function PreviewPane({
  resume,
  onFullScreen,
}: {
  resume: Resume;
  onFullScreen: () => void;
}) {
  const t = useTranslations('editor');
  // Typing stays responsive: the preview renders at a lower priority.
  const deferred = useDeferredValue(resume);
  const viewport = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState<Zoom>('width');
  const [pages, setPages] = useState(1);
  const [current, setCurrent] = useState(1);

  useEffect(() => {
    if (!viewport.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({ width: entry!.contentRect.width, height: entry!.contentRect.height }),
    );
    observer.observe(viewport.current);
    return () => observer.disconnect();
  }, []);

  const page = PAGE_DIMENSIONS[deferred.design.pageSize];
  const fitWidth = Math.min(MAX_ZOOM, size.width / page.width);
  const scale =
    zoom === 'width'
      ? fitWidth
      : zoom === 'page'
        ? Math.min(fitWidth, size.height / page.height)
        : zoom;
  const step = (delta: number) =>
    setZoom(Math.round(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale + delta)) * 10) / 10);

  const sheets = () =>
    Array.from(viewport.current?.querySelectorAll<HTMLElement>('[data-preview-page]') ?? []);
  const goTo = (number: number) => {
    const target = sheets()[number - 1];
    if (!target || !viewport.current) return;
    const delta = target.getBoundingClientRect().top - viewport.current.getBoundingClientRect().top;
    viewport.current.scrollBy({ top: delta - 16, behavior: 'smooth' });
    setCurrent(number);
  };
  const onScroll = () => {
    const box = viewport.current!.getBoundingClientRect();
    const middle = box.top + box.height / 2;
    const index = sheets().filter((s) => s.getBoundingClientRect().top < middle).length;
    setCurrent(Math.max(1, index));
  };
  const onLayout = useCallback((count: number) => setPages(count), []);
  const shown = Math.min(current, pages);

  const divider = <span aria-hidden className="bg-border mx-1 h-4 w-px" />;

  return (
    <section
      aria-label={t('preview.label')}
      className="bg-desk relative flex h-full min-h-0 flex-col"
    >
      <div
        ref={viewport}
        onScroll={onScroll}
        tabIndex={0}
        aria-label={t('preview.label')}
        className="min-h-0 flex-1 overflow-auto px-5 pt-5 pb-20 sm:px-8 sm:pt-6"
      >
        {size.width > 0 && (
          <div className="w-max min-w-full">
            <ScaledPages
              resume={deferred}
              scale={scale}
              onLayout={onLayout}
              pageLabel={(number, total) => t('preview.pageOf', { page: number, total })}
            />
          </div>
        )}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-2">
        <div
          role="toolbar"
          aria-label={t('preview.controls')}
          className="bg-raised/95 shadow-overlay pointer-events-auto flex max-w-full items-center rounded-lg p-1"
        >
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('preview.previousPage')}
            disabled={shown <= 1}
            onClick={() => goTo(shown - 1)}
          >
            <ChevronLeft />
          </Button>
          <span
            className="px-1 text-xs whitespace-nowrap tabular-nums"
            role="status"
            data-testid="page-status"
          >
            {t('preview.pageOf', { page: shown, total: pages })}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('preview.nextPage')}
            disabled={shown >= pages}
            onClick={() => goTo(shown + 1)}
          >
            <ChevronRight />
          </Button>
          {divider}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('preview.zoomOut')}
            disabled={scale <= MIN_ZOOM}
            onClick={() => step(-0.1)}
          >
            <Minus />
          </Button>
          <output className="w-11 text-center text-xs tabular-nums max-sm:hidden">
            {Math.round(scale * 100)}%
          </output>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('preview.zoomIn')}
            disabled={scale >= MAX_ZOOM}
            onClick={() => step(0.1)}
          >
            <Plus />
          </Button>
          {divider}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('preview.fitWidth')}
            title={t('preview.fitWidth')}
            aria-pressed={zoom === 'width'}
            className="aria-pressed:bg-muted"
            onClick={() => setZoom('width')}
          >
            <MoveHorizontal />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('preview.fitPage')}
            title={t('preview.fitPage')}
            aria-pressed={zoom === 'page'}
            className="aria-pressed:bg-muted"
            onClick={() => setZoom('page')}
          >
            <Scan />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('preview.fullScreen')}
            title={t('preview.fullScreen')}
            onClick={onFullScreen}
          >
            <Expand />
          </Button>
        </div>
      </div>
    </section>
  );
}
