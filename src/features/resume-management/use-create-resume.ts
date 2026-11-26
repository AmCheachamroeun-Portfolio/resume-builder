'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from '@/i18n/navigation';
import { createResume } from '@/lib/resume-factory';
import { saveResume } from '@/lib/storage/db';
import type { ContentLanguage, ResumeData } from '@/types/resume';

export function useCreateResume() {
  const t = useTranslations('library');
  const locale = useLocale() as ContentLanguage;
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  const create = async (options: {
    templateId: string;
    title?: string;
    language?: ContentLanguage;
    data?: ResumeData;
    targetRole?: string;
  }) => {
    setCreating(true);
    try {
      const resume = createResume({
        ...options,
        title: options.title?.trim() || t('untitled'),
        language: options.language ?? locale,
      });
      await saveResume(resume);
      router.push(`/builder/${resume.id}`);
    } catch {
      toast.error(t('storageError'));
      setCreating(false);
    }
  };

  return { create, creating };
}
