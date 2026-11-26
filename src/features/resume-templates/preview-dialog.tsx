'use client';

import { Check } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState, type ReactNode } from 'react';
import { Dialog } from '@/components/ui/overlays';
import { ACCENT_COLOURS } from '@/constants/design';
import { sampleResume } from '@/constants/sample-resume';
import type { ContentLanguage, Design } from '@/types/resume';
import { RESUME_FONTS } from './fonts';
import { FittedPages } from './scaled-pages';
import { useTraits } from './template-meta';
import type { TemplateDefinition } from './types';

type Action = (template: TemplateDefinition, design: Partial<Design>) => ReactNode;

function Details({ template, action }: { template: TemplateDefinition; action?: Action }) {
  const t = useTranslations('templates');
  const locale = useLocale() as ContentLanguage;
  const traits = useTraits();
  const [accent, setAccent] = useState(template.design.accent);
  const resume = useMemo(() => {
    const base = sampleResume(template.id);
    return { ...base, design: { ...base.design, accent } };
  }, [template.id, accent]);
  const colours = [...new Set([template.design.accent, ...ACCENT_COLOURS])];
  const options = [
    t('options.colour'),
    template.usesSecondary && t('options.secondary'),
    t('options.font', { font: RESUME_FONTS[template.design.font].name }),
    t('options.spacing'),
    template.supportsHeaderAlign && t('options.align'),
    template.photo && t('options.photo'),
    t('options.paper'),
    t('options.sections'),
  ].filter((value): value is string => Boolean(value));

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_17rem]">
      <div className="bg-desk rounded-lg p-4 sm:p-6">
        <FittedPages resume={resume} />
        <p className="text-muted-foreground mt-3 text-center text-xs">{t('fictional')}</p>
      </div>
      <div className="flex flex-col gap-5 self-start md:sticky md:top-0">
        <p className="text-sm">{template.description[locale]}</p>
        <p className="text-muted-foreground text-xs">{traits(template).slice(0, 3).join(' · ')}</p>
        <fieldset>
          <legend className="label-small mb-2">{t('accentOptions')}</legend>
          <div className="flex flex-wrap gap-2">
            {colours.map((colour) => (
              <button
                key={colour}
                type="button"
                aria-label={`${t('accentOptions')} ${colour}`}
                aria-pressed={colour === accent}
                onClick={() => setAccent(colour)}
                className="grid size-7 place-items-center rounded-full border border-black/10 text-white"
                style={{ background: colour }}
              >
                {colour === accent && <Check aria-hidden className="size-4" />}
              </button>
            ))}
          </div>
        </fieldset>
        <div>
          <h3 className="label-small">{t('customisable')}</h3>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
            {options.map((option) => (
              <li key={option}>{option}</li>
            ))}
          </ul>
        </div>
        {action?.(template, accent === template.design.accent ? {} : { accent })}
      </div>
    </div>
  );
}

export function TemplatePreviewDialog({
  template,
  onClose,
  action,
}: {
  template: TemplateDefinition | null;
  onClose: () => void;
  action?: Action;
}) {
  return (
    <Dialog
      open={template !== null}
      onOpenChange={(open) => !open && onClose()}
      title={template?.name ?? ''}
      className="max-w-5xl"
    >
      {template && <Details key={template.id} template={template} action={action} />}
    </Dialog>
  );
}
