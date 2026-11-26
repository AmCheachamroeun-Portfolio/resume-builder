'use client';

import { useTranslations } from 'next-intl';
import type { Resume } from '@/types/resume';

export function useSectionTitle(resume: Resume) {
  const t = useTranslations('sections');
  return (key: string) => {
    if (key.startsWith('custom:')) {
      return resume.data.custom.find((c) => `custom:${c.id}` === key)?.title || t('custom');
    }
    return t(key);
  };
}

export function sectionCount(resume: Resume, key: string) {
  if (key === 'summary') return Object.values(resume.data.summary).filter((v) => v.trim()).length;
  if (key.startsWith('custom:')) {
    return resume.data.custom.find((c) => `custom:${c.id}` === key)?.items.length ?? 0;
  }
  const list = resume.data[key as keyof Resume['data']];
  return Array.isArray(list) ? list.length : 0;
}
