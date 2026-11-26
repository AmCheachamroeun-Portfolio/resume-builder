'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import {
  Copy,
  Download,
  FileDown,
  FileUp,
  HardDriveDownload,
  Mail,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Target,
  TextCursorInput,
  Trash2,
  Upload,
} from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useState, useSyncExternalStore } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/field';
import { ConfirmDialog, Dialog, Menu, type MenuItem } from '@/components/ui/overlays';
import { useAssistant } from '@/features/ai-assistant/store';
import { useExport } from '@/features/pdf-export/use-export';
import { getTemplate } from '@/features/resume-templates/registry';
import { ResumeThumbnail } from '@/features/resume-templates/scaled-pages';
import { Link, useRouter } from '@/i18n/navigation';
import { backupDue, reminderState } from '@/lib/storage/backup-reminder';
import { deleteResume, duplicateResume, listResumes, renameResume } from '@/lib/storage/db';
import { newLetter, saveLetter } from '@/lib/storage/letters';
import type { Resume } from '@/types/resume';
import { filterResumes, SORT_KEYS, type SortKey } from './filter-resumes';
import { useBackup, useExportResume } from './use-backup';

function BackupReminder({ resumes, onBackup }: { resumes: Resume[]; onBackup: () => void }) {
  const t = useTranslations('library.reminder');
  const state = useSyncExternalStore(reminderState.subscribe, reminderState.snapshot, () => '');
  // Read once: the reminder does not need to appear while the page sits open.
  const [now] = useState(() => Date.now());
  const [lastBackup = 0, snoozedUntil = 0] = state.split(':').map(Number);
  if (!state || !backupDue({ documents: resumes, lastBackup, snoozedUntil, now })) return null;
  return (
    <aside
      aria-label={t('label')}
      className="border-border bg-surface mt-6 flex flex-wrap items-center gap-3 rounded-lg border p-4 text-sm"
    >
      <HardDriveDownload aria-hidden className="text-primary size-5 shrink-0" />
      <p className="min-w-56 flex-1">{t(lastBackup ? 'changed' : 'never')}</p>
      <div className="flex gap-2">
        <Button size="sm" variant="primary" onClick={onBackup}>
          {t('now')}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => reminderState.snooze()}>
          {t('later')}
        </Button>
      </div>
    </aside>
  );
}

export function ResumeLibrary() {
  const t = useTranslations('library');
  const letters = useTranslations('letters');
  const format = useFormatter();
  const router = useRouter();
  const state = useLiveQuery(() =>
    listResumes().then(
      (result) => ({ ...result, failed: false }),
      () => ({ resumes: [] as Resume[], unreadable: 0, failed: true }),
    ),
  );
  const backup = useBackup();
  const exportResume = useExportResume();
  const exporter = useExport();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('updatedAt');
  const [renaming, setRenaming] = useState<Resume | null>(null);
  const [name, setName] = useState('');
  const [deleting, setDeleting] = useState<Resume | null>(null);

  const all = state?.resumes ?? [];
  const visible = filterResumes(all, query, sort, (r) => getTemplate(r.templateId).name);
  const recent = filterResumes(all, '', 'updatedAt')[0];
  const guard = (task: Promise<unknown>) => void task.catch(() => toast.error(t('storageError')));

  const writeLetter = async (resume: Resume) => {
    const letter = newLetter(letters('untitled'), resume);
    await saveLetter(letter);
    router.push(`/letters/${letter.id}`);
  };
  const tailor = (resume: Resume) => {
    useAssistant.getState().openFor('tailor');
    router.push(`/builder/${resume.id}`);
  };

  const actions = (resume: Resume): MenuItem[] => [
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
      onSelect: () => guard(duplicateResume(resume.id, t('copyOf', { title: resume.title }))),
    },
    {
      label: t('tailor'),
      icon: <Target />,
      separated: true,
      onSelect: () => tailor(resume),
    },
    { label: t('letter'), icon: <Mail />, onSelect: () => guard(writeLetter(resume)) },
    {
      label: t('download'),
      icon: <Download />,
      separated: true,
      onSelect: () => exporter.request(resume),
    },
    { label: t('exportJson'), icon: <FileDown />, onSelect: () => exportResume(resume) },
    {
      label: t('delete'),
      icon: <Trash2 />,
      danger: true,
      separated: true,
      onSelect: () => setDeleting(resume),
    },
  ];

  const when = (time: number) =>
    format.dateTime(new Date(time), { dateStyle: 'medium', timeStyle: 'short' });
  const importMenu: MenuItem[] = [
    { label: t('importDocument'), icon: <FileUp />, onSelect: () => router.push('/import') },
    { label: t('import'), icon: <Upload />, onSelect: backup.openImport },
  ];

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="title-page">{t('title')}</h1>
          <p className="text-muted-foreground mt-2 max-w-xl text-sm">{t('storageNote')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Menu
            trigger={
              <Button>
                <Upload />
                {t('importMenu')}
              </Button>
            }
            items={importMenu}
          />
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
      {all.length > 0 && <BackupReminder resumes={all} onBackup={() => void backup.exportAll()} />}

      {!state ? (
        <ul className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4" aria-busy>
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="skeleton aspect-[1/1.414] rounded-md opacity-60" />
          ))}
        </ul>
      ) : all.length === 0 ? (
        <div className="border-border-strong/50 bg-surface mt-8 rounded-lg border border-dashed px-6 py-16 text-center">
          <h2 className="title-panel">{t('emptyTitle')}</h2>
          <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm">{t('emptyBody')}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button asChild variant="primary">
              <Link href="/builder">{t('create')}</Link>
            </Button>
            <Button asChild>
              <Link href="/import">{t('importDocument')}</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/templates">{t('browse')}</Link>
            </Button>
          </div>
        </div>
      ) : (
        <>
          {recent && all.length > 1 && !query && (
            <section
              aria-labelledby="recent-title"
              className="border-border bg-surface mt-8 flex items-center gap-4 rounded-lg border p-4 sm:gap-6"
            >
              <div className="bg-desk w-20 shrink-0 rounded-md p-2 sm:w-28">
                <ResumeThumbnail resume={recent} className="shadow-paper" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 id="recent-title" className="text-muted-foreground text-xs font-semibold">
                  {t('recent')}
                </h2>
                <p className="mt-0.5 truncate text-lg font-semibold">{recent.title}</p>
                <p className="text-muted-foreground text-xs">
                  {t('updatedOn', { date: when(recent.updatedAt) })}
                </p>
                <Button asChild size="sm" variant="primary" className="mt-3">
                  <Link href={`/builder/${recent.id}`}>
                    <Pencil />
                    {t('continue')}
                  </Link>
                </Button>
              </div>
            </section>
          )}

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
              {SORT_KEYS.map((key) => (
                <option key={key} value={key}>
                  {t(`sortBy.${key}`)}
                </option>
              ))}
            </Select>
          </div>
          <p role="status" className="sr-only">
            {query ? t('results', { count: visible.length }) : ''}
          </p>
          {visible.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">{t('noMatches')}</p>
              <Button className="mt-3" onClick={() => setQuery('')}>
                {t('clearSearch')}
              </Button>
            </div>
          )}
          <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4">
            {visible.map((resume) => (
              <li key={resume.id} data-testid="resume-card" className="min-w-0">
                <div className="bg-desk group relative rounded-md p-3 sm:p-4">
                  <ResumeThumbnail
                    resume={resume}
                    className="shadow-paper transition-transform group-hover:-translate-y-0.5"
                  />
                  {/* Laid over the page, so the link is not named after the text on it. */}
                  <Link
                    href={`/builder/${resume.id}`}
                    aria-label={`${t('edit')}: ${resume.title}`}
                    className="absolute inset-0 rounded-md"
                  />
                </div>
                <div className="mt-3 flex items-start justify-between gap-1">
                  <div className="min-w-0">
                    <h2
                      className="line-clamp-2 font-semibold break-words sm:line-clamp-1"
                      title={resume.title}
                    >
                      {resume.title}
                    </h2>
                    <p className="text-muted-foreground truncate text-xs">
                      {getTemplate(resume.templateId).name}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {t(sort === 'createdAt' ? 'createdOn' : 'updatedOn', {
                        date: when(resume[sort === 'createdAt' ? 'createdAt' : 'updatedAt']),
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
                    items={actions(resume)}
                  />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {exporter.dialog}
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
