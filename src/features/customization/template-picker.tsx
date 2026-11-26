'use client';

import { useTranslations } from 'next-intl';
import { Dialog } from '@/components/ui/overlays';
import { TEMPLATES } from '@/features/resume-templates/registry';
import { ResumeThumbnail } from '@/features/resume-templates/scaled-pages';
import { TemplateTile } from '@/features/resume-templates/template-tile';
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
      <ul className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-x-4 lg:grid-cols-4">
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
                className="group block w-full rounded-md text-left"
              >
                <TemplateTile name={template.name} selected={active}>
                  <ResumeThumbnail
                    resume={switchTemplate(resume, template.id)}
                    className="shadow-paper"
                  />
                </TemplateTile>
              </button>
            </li>
          );
        })}
      </ul>
    </Dialog>
  );
}
