'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, Check, Download, LoaderCircle, TriangleAlert } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, Input, Segmented, Select, Textarea } from '@/components/ui/field';
import { Link, useRouter } from '@/i18n/navigation';
import { listResumes } from '@/lib/storage/db';
import { copyLetter, getLetter, letterWriter, senderFrom } from '@/lib/storage/letters';
import { cn } from '@/lib/utils';
import { startAutosave, useSaveStatus } from '@/stores/autosave';
import { letterSource, useLetter } from '@/stores/letter-store';
import { LETTER_LIMITS, LETTER_TONES, type CoverLetter } from '@/types/cover-letter';
import { DraftPanel } from './draft-panel';
import { LetterPreview } from './letter-preview';

const LetterExport = dynamic(() => import('./letter-export'), { ssr: false });

const words = (text: string) => {
  if (!text.trim()) return 0;
  const parts = new Intl.Segmenter(undefined, { granularity: 'word' }).segment(text);
  return Array.from(parts).filter((p) => p.isWordLike).length;
};

function SaveState() {
  const t = useTranslations('editor.save');
  const status = useSaveStatus((s) => s.status);
  const busy = status === 'pending' || status === 'saving';
  const failed = status === 'error' || status === 'conflict' || status === 'deleted';
  return (
    <span
      role="status"
      data-testid="save-status"
      data-status={failed ? status : busy ? 'saving' : 'saved'}
      className={cn(
        'flex items-center gap-1.5 text-xs whitespace-nowrap',
        failed ? 'text-danger font-medium' : 'text-muted-foreground',
      )}
    >
      {failed ? (
        <TriangleAlert aria-hidden className="size-3.5" />
      ) : busy ? (
        <LoaderCircle aria-hidden className="size-3.5 animate-spin" />
      ) : (
        <Check aria-hidden className="size-3.5" />
      )}
      <span className={cn(!failed && 'max-sm:sr-only')}>
        {t(failed ? 'blocked' : busy ? 'saving' : 'saved')}
      </span>
    </span>
  );
}

function Form({ letter }: { letter: CoverLetter }) {
  const t = useTranslations('letters.editor');
  const tones = useTranslations('letters.tones');
  const { update } = useLetter.getState();
  const resumes = useLiveQuery(() =>
    listResumes().then(
      (r) => r.resumes.sort((a, b) => b.updatedAt - a.updatedAt),
      () => [],
    ),
  );
  const resume = resumes?.find((r) => r.id === letter.resumeId);
  const count = words(letter.body);

  const text = (
    key: 'company' | 'jobTitle' | 'recipient',
    options?: { hint?: string; placeholder?: string },
  ) => (
    <Field label={t(key)} hint={options?.hint}>
      {(props) => (
        <Input
          {...props}
          maxLength={300}
          placeholder={options?.placeholder}
          value={letter[key]}
          onChange={(e) => update({ [key]: e.target.value })}
        />
      )}
    </Field>
  );

  return (
    <div className="space-y-6">
      <section aria-labelledby="job-title" className="space-y-4">
        <h2 id="job-title" className="title-panel">
          {t('about')}
        </h2>
        <Field label={t('resume')} hint={t('resumeHint')}>
          {(props) => (
            <Select
              {...props}
              value={letter.resumeId}
              onChange={(e) => {
                const next = resumes?.find((r) => r.id === e.target.value);
                update(
                  next
                    ? {
                        resumeId: next.id,
                        sender: senderFrom(next),
                        language: next.language,
                        pageSize: next.design.pageSize,
                      }
                    : { resumeId: '' },
                );
              }}
            >
              <option value="">{t('noResume')}</option>
              {letter.resumeId && resumes && !resume && (
                <option value={letter.resumeId}>{t('resumeGone')}</option>
              )}
              {resumes?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          {text('company')}
          {text('jobTitle')}
        </div>
        <Field label={t('job')} hint={t('jobHint')}>
          {(props) => (
            <Textarea
              {...props}
              rows={5}
              maxLength={LETTER_LIMITS.jobDescription}
              value={letter.jobDescription}
              onChange={(e) => update({ jobDescription: e.target.value })}
            />
          )}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('tone')}>
            {(props) => (
              <Select
                {...props}
                value={letter.tone}
                onChange={(e) => update({ tone: e.target.value as CoverLetter['tone'] })}
              >
                {LETTER_TONES.map((tone) => (
                  <option key={tone} value={tone}>
                    {tones(tone)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t('language')}>
            {(props) => (
              <Select
                {...props}
                value={letter.language}
                onChange={(e) => update({ language: e.target.value as CoverLetter['language'] })}
              >
                <option value="en">English</option>
                <option value="km">ខ្មែរ</option>
              </Select>
            )}
          </Field>
        </div>
      </section>

      <DraftPanel letter={letter} resume={resume} />

      <section className="space-y-2">
        <Field label={t('body')} hint={t('bodyHint')}>
          {(props) => (
            <Textarea
              {...props}
              rows={16}
              maxLength={LETTER_LIMITS.body}
              placeholder={t(`placeholder.${letter.language}`)}
              value={letter.body}
              onChange={(e) => update({ body: e.target.value })}
            />
          )}
        </Field>
        <p className="text-muted-foreground text-xs">{t('words', { count })}</p>
      </section>

      <details className="border-border rounded-lg border">
        <summary className="cursor-pointer px-4 py-3 font-semibold">{t('details')}</summary>
        <div className="grid gap-4 px-4 pb-4 sm:grid-cols-2">
          {(['fullName', 'headline', 'email', 'phone', 'location'] as const).map((key) => (
            <Field key={key} label={t(`sender.${key}`)}>
              {(props) => (
                <Input
                  {...props}
                  maxLength={300}
                  value={letter.sender[key]}
                  onChange={(e) => update({ sender: { ...letter.sender, [key]: e.target.value } })}
                />
              )}
            </Field>
          ))}
          <Field label={t('date')}>
            {(props) => (
              <Input
                {...props}
                type="date"
                value={letter.date}
                onChange={(e) => update({ date: e.target.value })}
              />
            )}
          </Field>
          {text('recipient', { hint: t('recipientHint') })}
        </div>
      </details>
    </div>
  );
}

export function LetterEditor({ id }: { id: string }) {
  const t = useTranslations('letters.editor');
  const problems = useTranslations('letters.saveProblem');
  const router = useRouter();
  const letter = useLetter((s) => s.letter);
  const status = useSaveStatus((s) => s.status);
  const [missing, setMissing] = useState<{ id: string; storage: boolean } | null>(null);
  const [view, setView] = useState<'write' | 'preview'>('write');
  const [exporting, setExporting] = useState(false);
  const autosave = useRef<ReturnType<typeof startAutosave<CoverLetter>> | null>(null);

  const open = useCallback((stored: CoverLetter) => {
    autosave.current?.discard();
    useLetter.getState().load(stored);
    autosave.current = startAutosave(letterWriter(stored), 600, letterSource);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getLetter(id).then(
      (found) => {
        if (cancelled) return;
        if (found) open(found);
        else setMissing({ id, storage: false });
      },
      () => !cancelled && setMissing({ id, storage: true }),
    );
    const flush = () => void autosave.current?.flush();
    const onVisibility = () => document.visibilityState === 'hidden' && flush();
    const onLeave = (event: BeforeUnloadEvent) => {
      if (!autosave.current?.hasPending()) return;
      flush();
      event.preventDefault();
    };
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', onLeave);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      void autosave.current?.stop();
      autosave.current = null;
      useLetter.getState().close();
    };
  }, [id, open]);

  if (missing?.id === id) {
    return (
      <div className="container-page max-w-xl py-16 text-center">
        <h1 className="title-panel">{t(missing.storage ? 'storageTitle' : 'missingTitle')}</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {t(missing.storage ? 'storageBody' : 'missingBody')}
        </p>
        <Button asChild variant="primary" className="mt-5">
          <Link href="/letters">{t('back')}</Link>
        </Button>
      </div>
    );
  }
  if (letter?.id !== id) {
    return (
      <div className="container-page py-8" aria-busy role="status" aria-label={t('loading')}>
        <div className="skeleton h-96 rounded-lg" />
      </div>
    );
  }

  const keepCopy = async () => {
    const copy = await copyLetter(letter, t('copyName', { title: letter.title })).catch(() => null);
    if (!copy) return toast.error(t('storageTitle'));
    autosave.current?.discard();
    router.replace(`/letters/${copy.id}`);
  };
  const loadStored = () =>
    void getLetter(id).then(
      (stored) => (stored ? open(stored) : void autosave.current?.overwrite()),
      () => toast.error(t('storageTitle')),
    );

  return (
    <div className="container-page py-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="icon-sm">
          <Link href="/letters" aria-label={t('back')}>
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="sr-only">{t('heading', { title: letter.title })}</h1>
        <input
          aria-label={t('titleLabel')}
          maxLength={120}
          value={letter.title}
          onChange={(e) => useLetter.getState().update({ title: e.target.value })}
          className="hover:border-border focus:border-primary h-9 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 text-lg font-semibold sm:max-w-md"
        />
        <SaveState />
        <Button variant="primary" className="ml-auto" onClick={() => setExporting(true)}>
          <Download />
          {t('export')}
        </Button>
      </div>

      {(status === 'error' || status === 'conflict' || status === 'deleted') && (
        <div
          role="alert"
          className="bg-warning-soft mt-4 flex flex-wrap items-center gap-3 rounded-md p-3 text-sm"
        >
          <p className="min-w-60 flex-1">{problems(status)}</p>
          {status === 'error' && (
            <Button size="sm" variant="primary" onClick={() => void autosave.current?.flush()}>
              {problems('retry')}
            </Button>
          )}
          {status === 'conflict' && (
            <>
              <Button size="sm" variant="primary" onClick={() => void keepCopy()}>
                {problems('keepCopy')}
              </Button>
              <Button size="sm" onClick={loadStored}>
                {problems('loadStored')}
              </Button>
            </>
          )}
          {status === 'deleted' && (
            <Button size="sm" variant="primary" onClick={() => void autosave.current?.overwrite()}>
              {problems('restore')}
            </Button>
          )}
        </div>
      )}

      <Segmented
        stretch
        className="mt-4 lg:hidden"
        label={t('view')}
        value={view}
        onChange={setView}
        options={[
          { value: 'write', label: t('write') },
          { value: 'preview', label: t('preview') },
        ]}
      />

      <div className="mt-5 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className={cn(view !== 'write' && 'max-lg:hidden')}>
          <Form letter={letter} />
        </div>
        <div
          className={cn(
            'bg-desk rounded-lg p-4 sm:p-6 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto',
            view !== 'preview' && 'max-lg:hidden',
          )}
        >
          <LetterPreview letter={letter} />
        </div>
      </div>
      {exporting && (
        <LetterExport
          letter={letter}
          onClose={() => setExporting(false)}
          onPaperChange={(pageSize) => useLetter.getState().update({ pageSize })}
        />
      )}
    </div>
  );
}
