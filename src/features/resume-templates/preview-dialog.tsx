'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useMemo, type ReactNode } from 'react';
import { Dialog } from '@/components/ui/overlays';
import { sampleResume } from '@/constants/sample-resume';
import type { ContentLanguage, Resume } from '@/types/resume';
import { PAGE_DIMENSIONS } from './resume-document';
import { ScaledPages, useWidth } from './scaled-pages';
import { useTraits } from './template-meta';
import type { TemplateDefinition } from './types';

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

export function TemplatePreviewDialog({
  template,
  onClose,
  action,
}: {
  template: TemplateDefinition | null;
  onClose: () => void;
  action?: (template: TemplateDefinition) => ReactNode;
}) {
  const t = useTranslations('templates');
  const locale = useLocale() as ContentLanguage;
  const traits = useTraits();
  const resume = useMemo(() => (template ? sampleResume(template.id) : null), [template]);
  return (
    <Dialog
      open={template !== null}
      onOpenChange={(open) => !open && onClose()}
      title={template?.name ?? ''}
      description={template?.description[locale]}
      className="max-w-5xl"
    >
      {template && resume && (
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_15rem]">
          <div className="bg-desk rounded-md p-4">
            <FittedPages resume={resume} />
          </div>
          <div className="self-start md:sticky md:top-0">
            <h3 className="text-sm font-semibold">{t('characteristics')}</h3>
            <ul className="divide-border border-border mt-2 divide-y border-y text-sm">
              {traits(template).map((trait) => (
                <li key={trait} className="py-2">
                  {trait}
                </li>
              ))}
            </ul>
            <p className="text-muted-foreground mt-3 text-xs">{t('fictional')}</p>
            <div className="mt-4">{action?.(template)}</div>
          </div>
        </div>
      )}
    </Dialog>
  );
}
