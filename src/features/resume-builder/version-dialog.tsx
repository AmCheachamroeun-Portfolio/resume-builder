'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { Copy, History, Trash2 } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { ConfirmDialog, Dialog } from '@/components/ui/overlays';
import { getTemplate } from '@/features/resume-templates/registry';
import { ResumeThumbnail } from '@/features/resume-templates/scaled-pages';
import { useRouter } from '@/i18n/navigation';
import { saveCopy } from '@/lib/storage/db';
import {
  deleteVersion,
  listVersions,
  MANUAL_LIMIT,
  recordVersion,
  restoredResume,
  VersionLimitError,
} from '@/lib/storage/versions';
import { cn } from '@/lib/utils';
import { useEditor } from '@/stores/editor-store';
import type { Resume } from '@/types/resume';
import type { ResumeVersion } from '@/types/version';

export function VersionDialog({
  resume,
  open,
  onOpenChange,
}: {
  resume: Resume;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('versions');
  const format = useFormatter();
  const router = useRouter();
  const versions = useLiveQuery(() => listVersions(resume.id).catch(() => []), [resume.id]);
  const [chosen, setChosen] = useState('');
  const [name, setName] = useState('');
  const [deleting, setDeleting] = useState<ResumeVersion | null>(null);
  const [busy, setBusy] = useState(false);

  const selected = versions?.find((v) => v.id === chosen) ?? versions?.[0];
  const when = (version: ResumeVersion) =>
    format.dateTime(new Date(version.createdAt), { dateStyle: 'medium', timeStyle: 'short' });

  const save = async () => {
    try {
      const saved = await recordVersion(useEditor.getState().resume!, 'manual', name);
      if (!saved) return toast.error(t('saveFailed'));
      setName('');
      setChosen(saved.id);
      toast.success(t('saved'));
    } catch (error) {
      toast.error(
        error instanceof VersionLimitError ? t('limit', { count: MANUAL_LIMIT }) : t('saveFailed'),
      );
    }
  };

  const restore = async (version: ResumeVersion) => {
    setBusy(true);
    try {
      await recordVersion(useEditor.getState().resume!, 'restore');
      useEditor.getState().apply((current) => restoredResume(current, version));
      toast.success(t('restored'));
      onOpenChange(false);
    } catch {
      toast.error(t('restoreFailed'));
    } finally {
      setBusy(false);
    }
  };

  const openCopy = async (version: ResumeVersion) => {
    const title = t('copyName', { title: resume.title, date: when(version) });
    const copy = await saveCopy(version.resume, title).catch(() => null);
    if (!copy) return toast.error(t('saveFailed'));
    onOpenChange(false);
    router.push(`/builder/${copy.id}`);
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={onOpenChange}
        title={t('title')}
        description={t('description')}
        className="max-w-3xl"
      >
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <Field label={t('nameLabel')} className="min-w-48 flex-1">
            {(props) => (
              <Input
                {...props}
                maxLength={80}
                value={name}
                placeholder={t('namePlaceholder')}
                onChange={(e) => setName(e.target.value)}
              />
            )}
          </Field>
          <Button type="submit">
            <History />
            {t('save')}
          </Button>
        </form>

        {versions && !selected && (
          <p className="text-muted-foreground bg-panel mt-4 rounded-lg px-4 py-8 text-center text-sm">
            {t('empty')}
          </p>
        )}

        {selected && (
          <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_16rem]">
            <ul
              aria-label={t('listLabel')}
              className="border-border divide-border max-h-56 divide-y self-start overflow-y-auto rounded-lg border sm:max-h-[26rem]"
            >
              {versions!.map((version) => (
                <li key={version.id} data-testid="version-row">
                  <button
                    type="button"
                    aria-pressed={version.id === selected.id}
                    onClick={() => setChosen(version.id)}
                    className={cn(
                      'block w-full px-3 py-2.5 text-left',
                      version.id === selected.id ? 'bg-primary-soft' : 'hover:bg-muted',
                    )}
                  >
                    <span className="block truncate text-sm font-medium">
                      {version.name || when(version)}
                    </span>
                    <span className="text-muted-foreground block truncate text-xs">
                      {t(`kinds.${version.kind}`)}
                      {version.name && ` · ${when(version)}`}
                      {` · ${getTemplate(version.resume.templateId).name}`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <div role="group" aria-label={t('preview')} className="flex flex-col gap-2">
              <div className="bg-desk rounded-lg p-3">
                <ResumeThumbnail
                  key={selected.id}
                  resume={selected.resume}
                  className="shadow-paper mx-auto max-w-52"
                />
              </div>
              <Button variant="primary" disabled={busy} onClick={() => void restore(selected)}>
                {t('restore')}
              </Button>
              <Button onClick={() => void openCopy(selected)}>
                <Copy />
                {t('copy')}
              </Button>
              <Button variant="ghost" onClick={() => setDeleting(selected)}>
                <Trash2 />
                {t('delete')}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={() => setDeleting(null)}
        title={t('deleteTitle')}
        description={t('deleteBody', { date: deleting ? when(deleting) : '' })}
        confirmLabel={t('delete')}
        onConfirm={() =>
          deleting && void deleteVersion(deleting.id).catch(() => toast.error(t('saveFailed')))
        }
      />
    </>
  );
}
