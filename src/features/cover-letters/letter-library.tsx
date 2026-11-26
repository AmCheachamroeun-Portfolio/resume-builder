'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { Copy, FileText, MoreHorizontal, Plus, Trash2 } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog, Menu } from '@/components/ui/overlays';
import { Link, useRouter } from '@/i18n/navigation';
import { listResumes } from '@/lib/storage/db';
import {
  copyLetter,
  deleteLetter,
  listLetters,
  newLetter,
  saveLetter,
} from '@/lib/storage/letters';
import type { CoverLetter } from '@/types/cover-letter';

export function LetterLibrary() {
  const t = useTranslations('letters');
  const format = useFormatter();
  const router = useRouter();
  const state = useLiveQuery(() =>
    listLetters().then(
      (result) => ({ ...result, failed: false }),
      () => ({ letters: [] as CoverLetter[], unreadable: 0, failed: true }),
    ),
  );
  const [deleting, setDeleting] = useState<CoverLetter | null>(null);
  const [creating, setCreating] = useState(false);
  const guard = (task: Promise<unknown>) => void task.catch(() => toast.error(t('storageError')));

  const create = async () => {
    setCreating(true);
    try {
      // Start from the resume worked on most recently; it can be changed.
      const { resumes } = await listResumes();
      const latest = resumes.sort((a, b) => b.updatedAt - a.updatedAt)[0];
      const letter = newLetter(t('untitled'), latest);
      await saveLetter(letter);
      router.push(`/letters/${letter.id}`);
    } catch {
      toast.error(t('storageError'));
      setCreating(false);
    }
  };

  const newButton = (
    <Button variant="primary" disabled={creating} onClick={() => void create()}>
      <Plus />
      {t('create')}
    </Button>
  );

  return (
    <div className="container-page max-w-4xl py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="title-page">{t('title')}</h1>
          <p className="text-muted-foreground mt-2 max-w-xl text-sm">{t('intro')}</p>
        </div>
        {Boolean(state?.letters.length) && newButton}
      </div>

      {state?.failed && (
        <p role="alert" className="bg-danger-soft text-danger mt-6 rounded-md p-4 text-sm">
          {t('storageError')}
        </p>
      )}
      {!!state?.unreadable && (
        <p role="alert" className="bg-warning-soft text-warning mt-6 rounded-md p-4 text-sm">
          {t('unreadable', { count: state.unreadable })}
        </p>
      )}

      {!state ? (
        <div className="skeleton mt-8 h-40 rounded-lg" aria-busy />
      ) : state.letters.length === 0 ? (
        !state.failed && (
          <div className="border-border-strong/50 bg-surface mt-8 rounded-lg border border-dashed px-6 py-16 text-center">
            <h2 className="title-panel">{t('emptyTitle')}</h2>
            <p className="text-muted-foreground mx-auto mt-2 mb-5 max-w-md text-sm">
              {t('emptyBody')}
            </p>
            {newButton}
          </div>
        )
      ) : (
        <ul className="border-border divide-border bg-surface mt-8 divide-y rounded-lg border">
          {state.letters.map((letter) => {
            const about = [letter.jobTitle, letter.company].filter(Boolean).join(' · ');
            return (
              <li key={letter.id} data-testid="letter-row" className="flex items-center gap-3 p-4">
                <FileText aria-hidden className="text-muted-foreground size-5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-semibold">
                    <Link href={`/letters/${letter.id}`} className="hover:underline">
                      {letter.title || t('untitled')}
                    </Link>
                  </h2>
                  <p className="text-muted-foreground truncate text-sm">{about || t('noJob')}</p>
                  <p className="text-muted-foreground text-xs">
                    {t('updatedOn', {
                      date: format.dateTime(new Date(letter.updatedAt), {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      }),
                    })}
                  </p>
                </div>
                <Menu
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t('actionsFor', { title: letter.title })}
                    >
                      <MoreHorizontal />
                    </Button>
                  }
                  items={[
                    {
                      label: t('duplicate'),
                      icon: <Copy />,
                      onSelect: () =>
                        guard(copyLetter(letter, t('copyOf', { title: letter.title }))),
                    },
                    {
                      label: t('delete'),
                      icon: <Trash2 />,
                      danger: true,
                      onSelect: () => setDeleting(letter),
                    },
                  ]}
                />
              </li>
            );
          })}
        </ul>
      )}
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={() => setDeleting(null)}
        title={t('deleteTitle')}
        description={t('deleteBody', { title: deleting?.title ?? '' })}
        confirmLabel={t('delete')}
        onConfirm={() => deleting && guard(deleteLetter(deleting.id))}
      />
    </div>
  );
}
