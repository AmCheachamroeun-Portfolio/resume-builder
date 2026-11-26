'use client';

import {
  ChevronLeft,
  ChevronRight,
  Columns3,
  GalleryHorizontal,
  LayoutGrid,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input, Segmented, Select } from '@/components/ui/field';
import { Dialog } from '@/components/ui/overlays';
import { RecommendPanel } from '@/features/ai-assistant/recommend-panel';
import { SampleThumbnail } from '@/features/landing/previews';
import { useCreateResume } from '@/features/resume-management/use-create-resume';
import { cn } from '@/lib/utils';
import type { ContentLanguage, Design } from '@/types/resume';
import { CompareDialog } from './compare-dialog';
import { filterTemplates, NO_FILTERS, type TemplateFilters } from './filter';
import { TemplatePreviewDialog } from './preview-dialog';
import { getTemplate, TEMPLATES } from './registry';
import { TEMPLATE_CATEGORIES, type TemplateCategory, type TemplateDefinition } from './types';

export const COMPARE_LIMIT = 3;

const FILTERS = {
  columns: ['any', 'one', 'two'],
  photo: ['any', 'yes', 'no'],
  ats: ['any', 'high'],
} as const;

type Picks = { role: string; items: { templateId: string; reason: string }[] };

export function TemplateGallery() {
  const t = useTranslations('templates');
  const locale = useLocale() as ContentLanguage;
  const { create, creating } = useCreateResume();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<TemplateCategory | 'all'>('all');
  const [filters, setFilters] = useState<TemplateFilters>(NO_FILTERS);
  const [view, setView] = useState<'grid' | 'carousel'>('grid');
  const [preview, setPreview] = useState<TemplateDefinition | null>(null);
  const [recommending, setRecommending] = useState(false);
  const [picks, setPicks] = useState<Picks | null>(null);
  const [compare, setCompare] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);
  const track = useRef<HTMLUListElement>(null);
  const results = filterTemplates(query, category, filters);
  const filtered = Boolean(query) || category !== 'all' || filters !== NO_FILTERS;

  const clear = () => {
    setQuery('');
    setCategory('all');
    setFilters(NO_FILTERS);
  };
  const scroll = (direction: 1 | -1) =>
    track.current?.scrollBy({
      left: direction * track.current.clientWidth * 0.8,
      behavior: 'smooth',
    });
  const toggleCompare = (id: string) =>
    setCompare((list) =>
      list.includes(id) ? list.filter((x) => x !== id) : [...list, id].slice(0, COMPARE_LIMIT),
    );
  const applyButton = (id: string, variant: 'primary' | 'secondary', design?: Partial<Design>) => (
    <Button
      variant={variant}
      size={variant === 'primary' ? 'md' : 'sm'}
      className={variant === 'primary' ? 'w-full' : undefined}
      disabled={creating}
      onClick={() => void create({ templateId: id, design, targetRole: picks?.role })}
    >
      {t('use')}
    </Button>
  );

  const card = (template: TemplateDefinition, reason?: string) => {
    const selected = compare.includes(template.id);
    return (
      <>
        {/* The button lies over the picture, so the sample text is not part of its name. */}
        <div
          className={cn(
            'bg-desk group relative rounded-lg p-4 sm:p-6',
            selected && 'ring-primary ring-2',
          )}
        >
          <SampleThumbnail
            templateId={template.id}
            className="shadow-paper transition-transform duration-200 group-hover:-translate-y-1"
          />
          <button
            type="button"
            onClick={() => setPreview(template)}
            aria-label={t('previewNamed', { name: template.name })}
            className="absolute inset-0 rounded-lg"
          />
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <h3 className="min-w-0 truncate text-sm font-semibold">{template.name}</h3>
          {applyButton(template.id, 'secondary')}
        </div>
        <p className="text-muted-foreground mt-1 text-xs">
          {[
            t(template.layout.columns === 'single' ? 'traits.single' : 'traits.two'),
            t(template.photo ? 'traits.photo' : 'traits.noPhoto'),
            t(`traits.ats.${template.ats}`),
          ].join(' · ')}
        </p>
        <p className="text-muted-foreground mt-1.5 flex-1 text-[13px]">
          {reason ?? template.description[locale]}
        </p>
        <label className="text-muted-foreground mt-2 flex w-fit cursor-pointer items-center gap-2 text-xs pointer-coarse:py-1">
          <input
            type="checkbox"
            className="accent-primary size-3.5"
            checked={selected}
            disabled={!selected && compare.length >= COMPARE_LIMIT}
            onChange={() => toggleCompare(template.id)}
          />
          {t('compare')}
          <span className="sr-only">{template.name}</span>
        </label>
      </>
    );
  };

  return (
    <div className="container-page py-8 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="title-page">{t('title')}</h1>
          <p className="text-muted-foreground mt-1.5 max-w-xl">{t('intro')}</p>
        </div>
        <Button onClick={() => setRecommending(true)}>
          <Sparkles />
          {t('recommend')}
        </Button>
      </div>

      {picks && (
        <section
          aria-labelledby="picks-title"
          className="bg-surface border-border mt-8 rounded-xl border p-4 sm:p-5"
        >
          <div className="flex items-start justify-between gap-3">
            <h2 id="picks-title" className="title-panel">
              {t('picks', { role: picks.role })}
            </h2>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t('clearPicks')}
              onClick={() => setPicks(null)}
            >
              <X />
            </Button>
          </div>
          <ul className="mt-4 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {picks.items.map((item) => (
              <li key={item.templateId} data-pick-card={item.templateId} className="flex flex-col">
                {card(getTemplate(item.templateId), item.reason)}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-x-8 gap-y-5 lg:grid-cols-[11rem_minmax(0,1fr)]">
        <nav aria-label={t('categoriesLabel')} className="lg:sticky lg:top-18 lg:self-start">
          <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:gap-0.5 lg:overflow-visible">
            {(['all', ...TEMPLATE_CATEGORIES] as const).map((id) => (
              <li key={id} className="shrink-0">
                <button
                  type="button"
                  aria-pressed={category === id}
                  onClick={() => setCategory(id)}
                  className="hover:bg-muted aria-pressed:bg-primary-soft flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-left text-[13px] aria-pressed:font-semibold"
                >
                  <span>{t(`categories.${id}`)}</span>
                  <span className="text-muted-foreground text-xs font-normal tabular-nums">
                    {filterTemplates('', id).length}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0">
          <div className="border-border space-y-3 border-b pb-4">
            <div className="flex flex-wrap items-center gap-2">
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
            <div className="flex flex-wrap items-center gap-2">
              {(Object.keys(FILTERS) as (keyof typeof FILTERS)[]).map((key) => (
                <Select
                  key={key}
                  aria-label={t(`filters.${key}`)}
                  className="h-8 w-auto text-[13px]"
                  value={filters[key]}
                  onChange={(e) => {
                    const next = { ...filters, [key]: e.target.value } as TemplateFilters;
                    const none = Object.values(next).every((v) => v === 'any');
                    setFilters(none ? NO_FILTERS : next);
                  }}
                >
                  {FILTERS[key].map((value) => (
                    <option key={value} value={value}>
                      {t(`filterValues.${key}.${value}`)}
                    </option>
                  ))}
                </Select>
              ))}
              {filtered && (
                <Button variant="link" size="sm" onClick={clear}>
                  {t('clear')}
                </Button>
              )}
              <p role="status" className="text-muted-foreground ml-auto text-[13px]">
                {t('count', { count: results.length })}
              </p>
            </div>
          </div>

          {results.length === 0 ? (
            <div className="py-16 text-center">
              <p className="font-medium">{t('empty')}</p>
              <Button className="mt-4" onClick={clear}>
                {t('clear')}
              </Button>
            </div>
          ) : (
            <>
              <h2 className="sr-only">{t('listTitle')}</h2>
              <ul
                ref={track}
                tabIndex={view === 'carousel' ? 0 : undefined}
                aria-label={t('title')}
                className={cn(
                  'mt-6',
                  view === 'grid'
                    ? 'grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3'
                    : 'flex snap-x snap-mandatory gap-6 overflow-x-auto p-1 pb-4',
                )}
              >
                {results.map((template) => (
                  <li
                    key={template.id}
                    data-template-card={template.id}
                    className={cn(
                      'flex flex-col',
                      view === 'carousel' && 'w-[min(26rem,82vw)] shrink-0 snap-start',
                    )}
                  >
                    {card(template)}
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="text-muted-foreground mt-8 text-xs">
            {t('fictional')} {t('atsNote')}
          </p>
        </div>
      </div>

      {compare.length > 0 && (
        <div className="pointer-events-none sticky bottom-4 z-30 mt-6 flex justify-center">
          <div
            role="region"
            aria-label={t('compareTitle')}
            className="bg-raised shadow-overlay pointer-events-auto flex flex-wrap items-center gap-2 rounded-lg py-2 pr-2 pl-4"
          >
            <p className="text-[13px]">{compare.map((id) => getTemplate(id).name).join(', ')}</p>
            <Button
              variant="primary"
              size="sm"
              disabled={compare.length < 2}
              onClick={() => setComparing(true)}
            >
              <Columns3 />
              {t('compareNow', { count: compare.length })}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setCompare([])}>
              {t('clear')}
            </Button>
          </div>
        </div>
      )}

      <TemplatePreviewDialog
        template={preview}
        onClose={() => setPreview(null)}
        action={(template, design) => applyButton(template.id, 'primary', design)}
      />
      <CompareDialog
        templates={TEMPLATES.filter((x) => compare.includes(x.id))}
        open={comparing}
        onOpenChange={setComparing}
        action={(template) => applyButton(template.id, 'primary')}
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
          onResult={(result, role) => setPicks({ role, items: result.recommendations })}
        />
      </Dialog>
    </div>
  );
}
