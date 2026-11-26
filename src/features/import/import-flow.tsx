'use client';

import { ArrowLeft, FileUp, LoaderCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/field';
import { useAiRequest } from '@/features/ai-assistant/client';
import { AiGate, AiStatusLine } from '@/features/ai-assistant/parts';
import { useBackup } from '@/features/resume-management/use-backup';
import { useCreateResume } from '@/features/resume-management/use-create-resume';
import { SampleThumbnail } from '@/features/landing/previews';
import { getTemplate, TEMPLATES } from '@/features/resume-templates/registry';
import { Link } from '@/i18n/navigation';
import {
  documentKind,
  extractDocx,
  extractPdf,
  ImportFailure,
  MAX_IMPORT_BYTES,
  type ImportProblem,
} from '@/lib/import/extract';
import { parseLocally } from '@/lib/import/parse';
import { redactForAi } from '@/lib/import/redact';
import { importedToData } from '@/lib/import/to-data';
import type { Imported } from '@/lib/import/types';
import { cn } from '@/lib/utils';
import { ImportReview } from './review';

type Source = { fileName: string; text: string; truncated: boolean; local: Imported };

const KHMER = /[ក-៿]/g;
const languageOf = (text: string) =>
  (text.match(KHMER)?.length ?? 0) > text.length * 0.2 ? 'km' : 'en';

export function ImportFlow() {
  const t = useTranslations('import');
  const [source, setSource] = useState<Source | null>(null);
  const [draft, setDraft] = useState<Imported | null>(null);
  const [removed, setRemoved] = useState<string[]>([]);
  const [problem, setProblem] = useState<ImportProblem | null>(null);
  const [reading, setReading] = useState(false);
  const [over, setOver] = useState(false);
  const [name, setName] = useState('');
  const [templateId, setTemplate] = useState('ats-essential');
  const input = useRef<HTMLInputElement>(null);
  const backup = useBackup();
  const ai = useAiRequest('parse-resume');
  const { create, creating } = useCreateResume();
  const heading = useRef<HTMLHeadingElement>(null);
  const step = draft ? 'review' : source ? 'organise' : 'choose';

  // Move focus with the step, so keyboard and screen reader users follow along.
  const shown = useRef(step);
  useEffect(() => {
    if (shown.current !== step) heading.current?.focus();
    shown.current = step;
  }, [step]);

  const reset = () => {
    ai.reset();
    setSource(null);
    setDraft(null);
    setRemoved([]);
    setProblem(null);
  };

  const read = async (file: File) => {
    reset();
    setReading(true);
    try {
      const kind = documentKind(file.name, new Uint8Array(await file.slice(0, 8).arrayBuffer()));
      if (!kind) throw new ImportFailure('unsupported');
      if (kind === 'json') {
        // A ResumeCraft backup is already structured: restore it as it is.
        await backup.importFile(file);
        return;
      }
      if (file.size > MAX_IMPORT_BYTES) throw new ImportFailure('too-large');
      const extract = kind === 'pdf' ? extractPdf : extractDocx;
      const { text, truncated } = await extract(await file.arrayBuffer());
      const fileName = file.name.replace(/\.(pdf|docx)$/i, '');
      setName(fileName.slice(0, 120));
      setSource({ fileName: file.name, text, truncated, local: parseLocally(text) });
    } catch (error) {
      setProblem(error instanceof ImportFailure ? error.code : 'unreadable');
    } finally {
      setReading(false);
    }
  };

  const redacted = source ? redactForAi(source.text, source.local.contact.fullName) : '';

  const organiseWithAi = async () => {
    if (!source) return;
    const result = await ai.run({ language: languageOf(source.text), text: redacted });
    if (!result) return;
    const { removed: dropped, ...content } = result;
    setRemoved(dropped ?? []);
    // Contact details were never sent, so they come from the reading on this device.
    setDraft({ ...content, contact: source.local.contact });
  };

  const save = () => {
    if (!source || !draft) return;
    if (!Object.values(draft.contact).some(Boolean) && !draft.experience.length) {
      toast.info(t('almostEmpty'));
    }
    void create({
      templateId,
      title: name,
      language: languageOf(source.text),
      data: importedToData(draft, t('otherTitle')),
    });
  };

  return (
    <div className="container-page max-w-6xl py-10">
      <h1 ref={heading} tabIndex={-1} className="title-page outline-none">
        {t(`title.${step}`)}
      </h1>
      <p className="text-muted-foreground mt-2 max-w-2xl">{t(`intro.${step}`)}</p>

      {step === 'choose' && (
        <div className="mt-8 max-w-2xl">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setOver(false);
              const file = e.dataTransfer.files[0];
              if (file) void read(file);
            }}
            className={cn(
              'border-border-strong/50 bg-surface flex flex-col items-center rounded-xl border border-dashed px-6 py-12 text-center',
              over && 'border-primary bg-primary-soft',
            )}
          >
            {reading ? (
              <p role="status" className="flex items-center gap-2 text-sm">
                <LoaderCircle aria-hidden className="size-4 animate-spin" />
                {t('reading')}
              </p>
            ) : (
              <>
                <FileUp aria-hidden className="text-muted-foreground size-8" />
                <p className="mt-3 font-medium">{t('drop')}</p>
                <p className="text-muted-foreground mt-1 text-sm">{t('formats')}</p>
                <Button variant="primary" className="mt-5" onClick={() => input.current?.click()}>
                  {t('choose')}
                </Button>
              </>
            )}
            <input
              ref={input}
              type="file"
              accept=".pdf,.docx,.json,application/pdf,application/json,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              data-testid="document-input"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) void read(file);
              }}
            />
          </div>
          {problem && (
            <p role="alert" className="bg-danger-soft text-danger mt-4 rounded-md p-3 text-sm">
              {t(`problems.${problem}`)}
            </p>
          )}
          <p className="text-muted-foreground mt-4 flex items-start gap-2 text-sm">
            <ShieldCheck aria-hidden className="text-primary mt-0.5 size-4 shrink-0" />
            {t('local')}
          </p>
          <p className="mt-3 text-sm">
            <Link href="/resumes" className="text-primary font-medium hover:underline">
              {t('toLibrary')}
            </Link>
          </p>
        </div>
      )}

      {step === 'organise' && source && (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section aria-labelledby="found-title" className="min-w-0">
            <h2 id="found-title" className="title-panel">
              {t('found', { file: source.fileName })}
            </h2>
            {source.truncated && <p className="text-warning mt-2 text-sm">{t('truncated')}</p>}
            <pre
              tabIndex={0}
              aria-labelledby="found-title"
              className="border-border bg-surface mt-3 max-h-[60dvh] overflow-auto rounded-lg border p-4 font-sans text-sm whitespace-pre-wrap"
            >
              {source.text}
            </pre>
          </section>
          <div className="flex min-w-0 flex-col gap-5">
            <section className="border-border bg-surface rounded-lg border p-5">
              <h2 className="title-panel">{t('device.title')}</h2>
              <p className="text-muted-foreground mt-1 text-sm">{t('device.body')}</p>
              <Button variant="primary" className="mt-4" onClick={() => setDraft(source.local)}>
                {t('device.action')}
              </Button>
            </section>
            <section className="border-border bg-surface rounded-lg border p-5">
              <h2 className="title-panel">{t('gemini.title')}</h2>
              <p className="text-muted-foreground mt-1 mb-4 text-sm">{t('gemini.body')}</p>
              <AiGate>
                <details className="mb-4 text-sm">
                  <summary className="cursor-pointer font-medium">{t('gemini.see')}</summary>
                  <pre
                    tabIndex={0}
                    data-testid="redacted-text"
                    className="bg-muted mt-2 max-h-60 overflow-auto rounded-md p-3 font-sans text-xs whitespace-pre-wrap"
                  >
                    {redacted}
                  </pre>
                </details>
                <Button disabled={ai.loading} onClick={() => void organiseWithAi()}>
                  <Sparkles />
                  {t('gemini.action')}
                </Button>
                <div className="mt-3">
                  <AiStatusLine
                    loading={ai.loading}
                    error={ai.error}
                    onRetry={() => void organiseWithAi()}
                    onCancel={ai.reset}
                  />
                </div>
              </AiGate>
            </section>
            <Button variant="ghost" className="self-start" onClick={reset}>
              <ArrowLeft />
              {t('another')}
            </Button>
          </div>
        </div>
      )}

      {step === 'review' && source && draft && (
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0">
            {!!removed.length && (
              <p className="bg-warning-soft text-warning mb-5 rounded-md p-3 text-sm">
                {t('removed', { items: removed.slice(0, 8).join('; ') })}
              </p>
            )}
            <ImportReview value={draft} onChange={setDraft} />
            <details className="border-border mt-6 border-t pt-4 text-sm">
              <summary className="cursor-pointer font-medium">{t('original')}</summary>
              <pre
                tabIndex={0}
                className="bg-surface mt-3 max-h-96 overflow-auto rounded-md p-4 font-sans whitespace-pre-wrap"
              >
                {source.text}
              </pre>
            </details>
          </div>
          <aside className="flex flex-col gap-4 self-start lg:sticky lg:top-20">
            <Field label={t('name')}>
              {(props) => (
                <Input
                  {...props}
                  value={name}
                  maxLength={120}
                  onChange={(e) => setName(e.target.value)}
                />
              )}
            </Field>
            <Field label={t('template')}>
              {(props) => (
                <Select {...props} value={templateId} onChange={(e) => setTemplate(e.target.value)}>
                  {TEMPLATES.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <div className="bg-desk rounded-lg p-4 max-lg:max-w-60">
              <SampleThumbnail templateId={getTemplate(templateId).id} className="shadow-paper" />
              <p className="text-muted-foreground mt-2 text-center text-xs">{t('sample')}</p>
            </div>
            <Button variant="primary" disabled={creating} onClick={save}>
              {t('create')}
            </Button>
            <p className="text-muted-foreground text-xs">{t('newOnly')}</p>
            <Button variant="ghost" onClick={() => setDraft(null)}>
              <ArrowLeft />
              {t('backToText')}
            </Button>
          </aside>
        </div>
      )}
    </div>
  );
}
