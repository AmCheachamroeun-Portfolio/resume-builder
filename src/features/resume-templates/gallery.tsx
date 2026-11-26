'use client';

import {
  ChevronLeft,
  ChevronRight,
  Eye,
  GalleryHorizontal,
  LayoutGrid,
  Search,
  Sparkles,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input, Segmented } from '@/components/ui/field';
import { Dialog } from '@/components/ui/overlays';
import { RecommendPanel } from '@/features/ai-assistant/recommend-panel';
import { SampleThumbnail } from '@/features/landing/previews';
import { useCreateResume } from '@/features/resume-management/use-create-resume';
import { cn } from '@/lib/utils';
import type { ContentLanguage } from '@/types/resume';
import { TemplatePreviewDialog } from './preview-dialog';
import { TEMPLATES } from './registry';
import { useTraits } from './template-meta';
import { TEMPLATE_CATEGORIES, type TemplateCategory, type TemplateDefinition } from './types';

export function filterTemplates(query: string, category: TemplateCategory | 'all') {
  const needle = query.trim().toLocaleLowerCase();
  return TEMPLATES.filter(
    (template) =>
      (category === 'all' || template.categories.includes(category)) &&
      (!needle ||
        [template.name, ...Object.values(template.description), ...template.categories]
          .join(' ')
          .toLocaleLowerCase()
          .includes(needle)),
  );
}

export function TemplateGallery() {
  const t = useTranslations('templates');
  const locale = useLocale() as ContentLanguage;
  const traits = useTraits();
  const { create, creating } = useCreateResume();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<TemplateCategory | 'all'>('all');
  const [view, setView] = useState<'grid' | 'carousel'>('grid');
  const [preview, setPreview] = useState<TemplateDefinition | null>(null);
  const [recommending, setRecommending] = useState(false);
  const track = useRef<HTMLUListElement>(null);
  const results = filterTemplates(query, category);

  const scroll = (direction: 1 | -1) =>
    track.current?.scrollBy({
      left: direction * track.current.clientWidth * 0.8,
      behavior: 'smooth',
    });

  const use = (id: string, className?: string) => (
    <Button
      variant="primary"
      className={className}
      disabled={creating}
      onClick={() => void create({ templateId: id })}
    >
      {t('use')}
    </Button>
  );

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-3xl sm:text-4xl">{t('title')}</h1>
          <p className="text-muted-foreground mt-2 max-w-xl">{t('intro')}</p>
        </div>
        <Button onClick={() => setRecommending(true)}>
          <Sparkles />
          {t('recommend')}
        </Button>
      </div>

      <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-x-10 gap-y-6 lg:grid-cols-[12rem_minmax(0,1fr)]">
        <nav aria-label={t('categoriesLabel')} className="lg:sticky lg:top-20 lg:self-start">
          <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
            {(['all', ...TEMPLATE_CATEGORIES] as const).map((id) => (
              <li key={id} className="shrink-0">
                <button
                  type="button"
                  aria-pressed={category === id}
                  onClick={() => setCategory(id)}
                  className="hover:bg-muted aria-pressed:bg-foreground aria-pressed:text-background flex w-full items-center justify-between gap-3 rounded-md px-3 py-1.5 text-left text-sm"
                >
                  <span>{t(`categories.${id}`)}</span>
                  <span className="text-xs tabular-nums opacity-70">
                    {filterTemplates('', id).length}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0">
          <div className="border-border flex flex-wrap items-center gap-3 border-b pb-4">
            <div className="relative min-w-48 flex-1">
              <Search
                aria-hidden
                className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
              />
              <Input
                type="search"
                className="pl-9"
                placeholder={t('search')}
                aria-label={t('search')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <p role="status" className="text-muted-foreground text-sm">
              {t('count', { count: results.length })}
            </p>
            <Segmented
              label={t('view')}
              value={view}
              onChange={setView}
              options={[
                { value: 'grid', title: t('grid'), label: <LayoutGrid aria-hidden /> },
                {
                  value: 'carousel',
                  title: t('carousel'),
                  label: <GalleryHorizontal aria-hidden />,
                },
              ]}
            />
            {view === 'carousel' && (
              <div className="flex gap-1">
                <Button size="icon" aria-label={t('previous')} onClick={() => scroll(-1)}>
                  <ChevronLeft />
                </Button>
                <Button size="icon" aria-label={t('next')} onClick={() => scroll(1)}>
                  <ChevronRight />
                </Button>
              </div>
            )}
          </div>

          {results.length === 0 ? (
            <div className="py-16 text-center">
              <p className="font-medium">{t('empty')}</p>
              <Button
                className="mt-4"
                onClick={() => {
                  setQuery('');
                  setCategory('all');
                }}
              >
                {t('clear')}
              </Button>
            </div>
          ) : (
            <ul
              ref={track}
              tabIndex={view === 'carousel' ? 0 : undefined}
              aria-label={t('title')}
              className={cn(
                'mt-6',
                view === 'grid'
                  ? 'grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3'
                  : 'flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4',
              )}
            >
              {results.map((template) => (
                <li
                  key={template.id}
                  data-template-card={template.id}
                  className={cn(
                    'flex flex-col',
                    view === 'carousel' && 'w-[min(24rem,82vw)] shrink-0 snap-start',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setPreview(template)}
                    aria-label={t('previewNamed', { name: template.name })}
                    className="bg-desk group relative block rounded-md p-4 sm:p-5"
                  >
                    <SampleThumbnail templateId={template.id} className="shadow-paper" />
                    <span className="bg-foreground text-background absolute bottom-7 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100">
                      <Eye aria-hidden className="size-4" />
                      {t('preview')}
                    </span>
                  </button>
                  <div className="mt-3 flex items-baseline justify-between gap-3">
                    <h2 className="font-semibold">{template.name}</h2>
                    <span className="text-primary text-xs font-medium">
                      {t(`categories.${template.categories[0]!}`)}
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-1 flex-1 text-sm">
                    {template.description[locale]}
                  </p>
                  <p className="text-muted-foreground mt-2 text-xs">
                    {traits(template).slice(0, 3).join(' · ')}
                  </p>
                  <div className="mt-3 flex gap-2">
                    {use(template.id, 'flex-1')}
                    <Button onClick={() => setPreview(template)}>{t('preview')}</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="text-muted-foreground mt-8 text-xs">{t('fictional')}</p>
        </div>
      </div>

      <TemplatePreviewDialog
        template={preview}
        onClose={() => setPreview(null)}
        action={(template) => use(template.id, 'w-full')}
      />
      <Dialog
        open={recommending}
        onOpenChange={setRecommending}
        title={t('recommend')}
        className="max-w-2xl"
      >
        <RecommendPanel
          useLabel={t('use')}
          onUse={(templateId, targetRole) => void create({ templateId, targetRole })}
        />
      </Dialog>
    </div>
  );
}
