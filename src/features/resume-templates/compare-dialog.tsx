'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Dialog } from '@/components/ui/overlays';
import { SampleThumbnail } from '@/features/landing/previews';
import { cn } from '@/lib/utils';
import { RESUME_FONTS } from './fonts';
import type { TemplateDefinition } from './types';

/** Up to three templates side by side with the facts that tell them apart. */
export function CompareDialog({
  templates,
  open,
  onOpenChange,
  action,
}: {
  templates: TemplateDefinition[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: (template: TemplateDefinition) => ReactNode;
}) {
  const t = useTranslations('templates');
  const rows: [string, (template: TemplateDefinition) => string][] = [
    [
      t('filters.columns'),
      (x) => t(x.layout.columns === 'single' ? 'traits.single' : 'traits.two'),
    ],
    [t('filters.photo'), (x) => t(x.photo ? 'traits.photo' : 'traits.noPhoto')],
    [t('filters.ats'), (x) => t(`atsLevel.${x.ats}`)],
    [t('font'), (x) => RESUME_FONTS[x.design.font].name],
    [t('categoriesLabel'), (x) => x.categories.map((c) => t(`categories.${c}`)).join(', ')],
  ];
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('compareTitle')}
      description={t('atsNote')}
      className={cn(templates.length > 2 ? 'max-w-5xl' : 'max-w-3xl')}
    >
      <div
        className="grid gap-x-3 sm:gap-x-5"
        style={{ gridTemplateColumns: `repeat(${templates.length}, minmax(0, 1fr))` }}
      >
        {templates.map((template) => (
          <section key={template.id} aria-label={template.name} className="flex flex-col">
            <div className="bg-desk rounded-md p-2 sm:p-3">
              <SampleThumbnail templateId={template.id} className="shadow-paper" />
            </div>
            <h3 className="mt-3 text-sm font-semibold">{template.name}</h3>
            <dl className="divide-border border-border mt-2 flex-1 divide-y border-y text-xs">
              {rows.map(([label, value]) => (
                <div key={label} className="py-2">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="mt-0.5">{value(template)}</dd>
                </div>
              ))}
            </dl>
            {/* Three columns leave little room on a phone, so the label may take two lines. */}
            <div className="mt-3 [&>button]:h-auto [&>button]:min-h-9 [&>button]:px-2 [&>button]:py-1.5 [&>button]:leading-tight [&>button]:whitespace-normal">
              {action(template)}
            </div>
          </section>
        ))}
      </div>
    </Dialog>
  );
}
