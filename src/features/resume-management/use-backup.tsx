'use client';

import { useTranslations } from 'next-intl';
import { useRef, type ReactNode } from 'react';
import { toast } from 'sonner';
import { createBackup, MAX_BACKUP_BYTES, parseBackup, restoreResumes } from '@/lib/storage/backup';
import { listResumes } from '@/lib/storage/db';
import { downloadTextFile, safeFileName } from '@/lib/utils';
import type { Resume } from '@/types/resume';

export function exportResume(resume: Resume) {
  downloadTextFile(`${safeFileName(resume.title)}.resumecraft.json`, createBackup([resume]));
}

/** Import and "export all", shared by the library and settings pages. */
export function useBackup() {
  const t = useTranslations('backup');
  const input = useRef<HTMLInputElement>(null);

  const importFile = async (file: File) => {
    if (file.size > MAX_BACKUP_BYTES) return toast.error(t('errors.too-large'));
    try {
      const parsed = parseBackup(await file.text());
      if (!parsed.ok) return toast.error(t(`errors.${parsed.error}`));
      const { added, unchanged } = await restoreResumes(parsed.resumes);
      toast.success(t('imported', { added, unchanged }));
      if (parsed.skipped) toast.warning(t('skipped', { count: parsed.skipped }));
    } catch {
      toast.error(t('errors.failed'));
    }
  };

  const exportAll = async () => {
    const { resumes } = await listResumes();
    if (!resumes.length) return toast.info(t('nothing'));
    const day = new Date().toISOString().slice(0, 10);
    downloadTextFile(`resumecraft-backup-${day}.json`, createBackup(resumes));
  };

  const fileInput: ReactNode = (
    <input
      ref={input}
      type="file"
      accept="application/json,.json"
      className="hidden"
      data-testid="import-input"
      onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (file) void importFile(file);
      }}
    />
  );

  return { fileInput, openImport: () => input.current?.click(), exportAll };
}
