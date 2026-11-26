'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import {
  Copy,
  FileDown,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  Download,
  TextCursorInput,
} from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/field';
import { ConfirmDialog, Dialog, Menu } from '@/components/ui/overlays';
import { usePdfExport } from '@/features/pdf-export/export-button';
import { getTemplate } from '@/features/resume-templates/registry';
import { ResumeThumbnail } from '@/features/resume-templates/scaled-pages';
import { Link } from '@/i18n/navigation';
import { deleteResume, duplicateResume, listResumes, renameResume } from '@/lib/storage/db';
import type { Resume } from '@/types/resume';
import { exportResume, useBackup } from './use-backup';

export type SortKey = 'updatedAt' | 'createdAt';

export function filterResumes(resumes: Resume[], query: string, sort: SortKey) {
  const needle = query.trim().toLocaleLowerCase();
  return resumes
    .filter((r) =>
      [r.title, r.data.personal.fullName, r.data.personal.headline, r.targetRole]
        .join(' ')
        .toLocaleLowerCase()
        .includes(needle),
    )
    .sort((a, b) => b[sort] - a[sort]);
}

export function ResumeLibrary() {
  const t = useTranslations('library');
  const format = useFormatter();
  const state = useLiveQuery(() =>
    listResumes().then(
      (result) => ({ ...result, failed: false }),
      () => ({ resumes: [] as Resume[], unreadable: 0, failed: true }),
    ),
  );
  const backup = useBackup();
  const pdf = usePdfExport();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('updatedAt');
  const [renaming, setRenaming] = useState<Resume | null>(null);
  const [name, setName] = useState('');
  const [deleting, setDeleting] = useState<Resume | null>(null);

  const visible = state ? filterResumes(state.resumes, query, sort) : [];
  const guard = (task: Promise<unknown>) => void task.catch(() => toast.error(t('storageError')));

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-3xl sm:text-4xl">{t('title')}</h1>
          <p className="text-muted-foreground mt-2 max-w-xl text-sm">{t('storageNote')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={backup.openImport}>
            <Upload />
            {t('import')}
          </Button>
          <Button onClick={() => void backup.exportAll()}>
            <FileDown />
            {t('exportAll')}
          </Button>
          <Button asChild variant="primary">
            <Link href="/builder">
              <Plus />
              {t('create')}
            </Link>
          </Button>
        </div>
      </div>
      {backup.fileInput}

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
        <ul className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4" aria-busy>
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="skeleton aspect-[1/1.414] rounded-md opacity-60" />
          ))}
        </ul>
      ) : state.resumes.length === 0 ? (
        <div className="border-border-strong/50 bg-surface mt-8 rounded-lg border border-dashed px-6 py-16 text-center">
          <h2 className="display text-xl">{t('emptyTitle')}</h2>
          <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm">{t('emptyBody')}</p>
          <div className="mt-5 flex justify-center gap-2">
            <Button asChild variant="primary">
              <Link href="/builder">{t('create')}</Link>
            </Button>
            <Button asChild>
              <Link href="/templates">{t('browse')}</Link>
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="border-border mt-8 flex flex-wrap items-center gap-3 border-b pb-4">
            <div className="relative min-w-48 flex-1">
              <Search
                aria-hidden
                className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
              />
              <Input
                type="search"
                className="pl-9"
                aria-label={t('search')}
                placeholder={t('search')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Select
              aria-label={t('sort')}
              className="w-auto"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
            >
              <option value="updatedAt">{t('sortModified')}</option>
              <option value="createdAt">{t('sortCreated')}</option>
            </Select>
          </div>
          {visible.length === 0 && (
            <p role="status" className="text-muted-foreground py-12 text-center">
              {t('noMatches')}
            </p>
          )}
          <ul className="mt-6 grid grid-cols-1 gap-x-6 gap-y-8 min-[480px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {visible.map((resume) => (
              <li key={resume.id} data-testid="resume-card">
                <Link
                  href={`/builder/${resume.id}`}
                  aria-label={`${t('edit')}: ${resume.title}`}
                  className="bg-desk block rounded-md p-4"
                >
                  <ResumeThumbnail resume={resume} className="shadow-paper" />
                </Link>
                <div className="mt-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold">{resume.title}</h2>
                    <p className="text-muted-foreground truncate text-xs">
                      {getTemplate(resume.templateId).name}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {t(sort === 'createdAt' ? 'createdOn' : 'updatedOn', {
                        date: format.dateTime(new Date(resume[sort]), {
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
                        aria-label={t('actionsFor', { title: resume.title })}
                      >
                        <MoreHorizontal />
                      </Button>
                    }
                    items={[
                      {
                        label: t('rename'),
                        icon: <TextCursorInput />,
                        onSelect: () => {
                          setName(resume.title);
                          setRenaming(resume);
                        },
                      },
                      {
                        label: t('duplicate'),
                        icon: <Copy />,
                        onSelect: () =>
                          guard(duplicateResume(resume.id, t('copyOf', { title: resume.title }))),
                      },
                      {
                        label: t('download'),
                        icon: <Download />,
                        onSelect: () => pdf.request(resume),
                      },
                      {
                        label: t('exportJson'),
                        icon: <FileDown />,
                        onSelect: () => exportResume(resume),
                      },
                      {
                        label: t('delete'),
                        icon: <Trash2 />,
                        danger: true,
                        onSelect: () => setDeleting(resume),
                      },
                    ]}
                  />
                </div>
                <div className="mt-2 flex gap-2">
                  <Button asChild size="sm" className="flex-1">
                    <Link href={`/builder/${resume.id}`}>
                      <Pencil />
                      {t('edit')}
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    disabled={pdf.busy}
                    aria-label={`${t('download')}: ${resume.title}`}
                    onClick={() => pdf.request(resume)}
                  >
                    <Download />
                    PDF
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {pdf.dialog}
      <Dialog open={renaming !== null} onOpenChange={() => setRenaming(null)} title={t('rename')}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (renaming && name.trim()) guard(renameResume(renaming.id, name));
            setRenaming(null);
          }}
        >
          <Field label={t('name')}>
            {(props) => (
              <Input
                {...props}
                autoFocus
                required
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}
          </Field>
          <div className="mt-4 flex justify-end">
            <Button type="submit" variant="primary">
              {t('saveName')}
            </Button>
          </div>
        </form>
      </Dialog>
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={() => setDeleting(null)}
        title={t('deleteTitle')}
        description={t('deleteBody', { title: deleting?.title ?? '' })}
        confirmLabel={t('delete')}
        onConfirm={() => deleting && guard(deleteResume(deleting.id))}
      />
    </div>
  );
}
