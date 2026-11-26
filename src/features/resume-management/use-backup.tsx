'use client';

import { useTranslations } from 'next-intl';
import { useRef, type ReactNode } from 'react';
import { toast } from 'sonner';
import { createBackup, MAX_BACKUP_BYTES, parseBackup, restoreBackup } from '@/lib/storage/backup';
import { reminderState } from '@/lib/storage/backup-reminder';
import { listResumes } from '@/lib/storage/db';
import { listLetters } from '@/lib/storage/letters';
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
      const { added, unchanged } = await restoreBackup(parsed.resumes, parsed.letters);
      toast.success(t('imported', { added, unchanged }));
      if (parsed.skipped) toast.warning(t('skipped', { count: parsed.skipped }));
    } catch {
      toast.error(t('errors.failed'));
    }
  };

  const exportAll = async () => {
    try {
      const [{ resumes }, { letters }] = await Promise.all([listResumes(), listLetters()]);
      if (!resumes.length && !letters.length) return toast.info(t('nothing'));
      const day = new Date().toISOString().slice(0, 10);
      downloadTextFile(`resumecraft-backup-${day}.json`, createBackup(resumes, letters));
      reminderState.backedUp();
    } catch {
      toast.error(t('exportFailed'));
    }
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

  return { fileInput, openImport: () => input.current?.click(), importFile, exportAll };
}
