'use client';

import { useTranslations } from 'next-intl';
import { RESUME_FONTS } from './fonts';
import type { TemplateDefinition } from './types';

export function useTraits() {
  const t = useTranslations('templates.traits');
  return (template: TemplateDefinition) => [
    t(template.layout.columns === 'single' ? 'single' : 'two'),
    t(template.photo ? 'photo' : 'noPhoto'),
    t(`ats.${template.ats}`),
    RESUME_FONTS[template.design.font].name,
  ];
}
