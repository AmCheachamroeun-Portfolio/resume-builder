'use client';

import { TriangleAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { createBackup } from '@/lib/storage/backup';
import { downloadTextFile, safeFileName } from '@/lib/utils';
import { useSaveStatus } from '@/stores/autosave';
import { useEditor } from '@/stores/editor-store';

export type SaveActions = {
  retry: () => void;
  keepCopy: () => void;
  loadStored: () => void;
  restore: () => void;
};

/** Explains a save that did not happen and offers a way out that loses nothing silently. */
export function SaveBanner({ actions }: { actions: SaveActions }) {
  const t = useTranslations('editor.saveProblem');
  const status = useSaveStatus((s) => s.status);
  if (status !== 'error' && status !== 'conflict' && status !== 'deleted') return null;

  const download = () => {
    const resume = useEditor.getState().resume;
    if (resume) {
      downloadTextFile(`${safeFileName(resume.title)}.json`, createBackup([resume]));
    }
  };

  return (
    <div
      role="alert"
      className="bg-warning-soft border-border flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-4 py-2.5 text-sm"
    >
      <p className="flex min-w-60 flex-1 items-start gap-2">
        <TriangleAlert aria-hidden className="text-warning mt-0.5 size-4 shrink-0" />
        <span>{t(status)}</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {status === 'error' && (
          <Button size="sm" variant="primary" onClick={actions.retry}>
            {t('retry')}
          </Button>
        )}
        {status === 'conflict' && (
          <>
            <Button size="sm" variant="primary" onClick={actions.keepCopy}>
              {t('keepCopy')}
            </Button>
            <Button size="sm" onClick={actions.loadStored}>
              {t('loadStored')}
            </Button>
          </>
        )}
        {status === 'deleted' && (
          <Button size="sm" variant="primary" onClick={actions.restore}>
            {t('restore')}
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={download}>
          {t('download')}
        </Button>
      </div>
    </div>
  );
}
