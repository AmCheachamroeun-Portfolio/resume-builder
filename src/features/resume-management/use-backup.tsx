'use client';

import { useTranslations } from 'next-intl';
import { useRef, type ReactNode } from 'react';
import { toast } from 'sonner';
import {
  backupWithHistory,
  MAX_BACKUP_BYTES,
  parseBackup,
  restoreBackup,
} from '@/lib/storage/backup';
import { reminderState } from '@/lib/storage/backup-reminder';
import { listResumes } from '@/lib/storage/db';
import { listLetters } from '@/lib/storage/letters';
import { downloadTextFile, safeFileName } from '@/lib/utils';
import type { CoverLetter } from '@/types/cover-letter';
import type { Resume } from '@/types/resume';

/** Downloads a backup, saved versions included, and says so if they had to be left out. */
export function useDownloadBackup() {
  const t = useTranslations('backup');
  return async (fileName: string, resumes: Resume[], letters: CoverLetter[] = []) => {
    const { text, historyIncluded } = await backupWithHistory(resumes, letters);
    downloadTextFile(fileName, text);
    if (!historyIncluded) toast.warning(t('historySkipped'));
  };
}

/** One resume's backup, as offered in the library. */
export function useExportResume() {
  const t = useTranslations('backup');
  const download = useDownloadBackup();
  return (resume: Resume) =>
    void download(`${safeFileName(resume.title)}.resumecraft.json`, [resume]).catch(() =>
      toast.error(t('exportFailed')),
    );
}

/** Import and "export all", shared by the library and settings pages. */
export function useBackup() {
  const t = useTranslations('backup');
  const input = useRef<HTMLInputElement>(null);
  const download = useDownloadBackup();

  const importFile = async (file: File) => {
    if (file.size > MAX_BACKUP_BYTES) return toast.error(t('errors.too-large'));
    try {
      const parsed = parseBackup(await file.text());
      if (!parsed.ok) return toast.error(t(`errors.${parsed.error}`));
      const { added, unchanged, versions, versionsLeftOut } = await restoreBackup(
        parsed.resumes,
        parsed.letters,
        parsed.versions,
      );
      toast.success(t('imported', { added, unchanged }), {
        description: versions ? t('versionsImported', { count: versions }) : undefined,
      });
      if (versionsLeftOut) toast.warning(t('versionsLeftOut', { count: versionsLeftOut }));
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
      await download(`resumecraft-backup-${day}.json`, resumes, letters);
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
