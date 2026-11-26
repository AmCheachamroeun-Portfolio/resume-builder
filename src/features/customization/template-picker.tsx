'use client';

import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Dialog } from '@/components/ui/overlays';
import { TEMPLATES } from '@/features/resume-templates/registry';
import { ResumeThumbnail } from '@/features/resume-templates/scaled-pages';
import { cn } from '@/lib/utils';
import { switchTemplate } from '@/lib/resume-factory';
import { actions } from '@/stores/editor-store';
import type { Resume } from '@/types/resume';

/** Every template shown with the writer's own content. */
export function TemplatePicker({
  resume,
  open,
  onOpenChange,
}: {
  resume: Resume;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('editor');
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('changeTemplate')}
      description={t('changeTemplateNote')}
      className="max-w-4xl"
    >
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {TEMPLATES.map((template) => {
          const active = template.id === resume.templateId;
          return (
            <li key={template.id}>
              <button
                type="button"
                aria-pressed={active}
                data-pick={template.id}
                onClick={() => {
                  actions.setTemplate(template.id);
                  onOpenChange(false);
                }}
                className="block w-full text-left"
              >
                <span
                  className={cn(
                    'bg-desk relative block rounded-md border-2 border-transparent p-2.5',
                    active && 'border-primary',
                  )}
                >
                  <ResumeThumbnail
                    resume={switchTemplate(resume, template.id)}
                    className="shadow-paper"
                  />
                  {active && (
                    <span className="bg-primary text-primary-foreground absolute top-1 right-1 grid size-6 place-items-center rounded-sm">
                      <Check aria-hidden className="size-4" />
                    </span>
                  )}
                </span>
                <span className="mt-1.5 block text-sm font-medium">{template.name}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </Dialog>
  );
}
