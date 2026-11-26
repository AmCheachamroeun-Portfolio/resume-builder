'use client';

import {
  Check,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  Copy,
  PencilLine,
  Sparkles,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/field';
import { useRouter } from '@/i18n/navigation';
import {
  applyTailoring,
  describeField,
  readField,
  tailorFields,
  type TailorField,
} from '@/lib/ai/tailor';
import { analyzeResume, unsupportedTerms } from '@/lib/ats/analyze';
import { saveCopy } from '@/lib/storage/db';
import { cn } from '@/lib/utils';
import { useEditor } from '@/stores/editor-store';
import type { Resume } from '@/types/resume';
import { useAiRequest } from './client';
import { resumeContext } from './context';
import { AiGate, AiStatusLine, Bullets } from './parts';

const MIN_JOB = 40;

const REQUIREMENT = {
  yes: { Icon: CircleCheck, className: 'text-primary' },
  partly: { Icon: CircleAlert, className: 'text-warning' },
  no: { Icon: CircleDashed, className: 'text-muted-foreground' },
};

/**
 * Compare a resume with a job advert, then collect accepted rewrites into a copy.
 * The resume being edited is never changed here.
 */
export function TailorTask({
  resume,
  job,
  setJob,
}: {
  resume: Resume;
  job: string;
  setJob: (v: string) => void;
}) {
  const t = useTranslations('ai.tailor');
  const ready = job.trim().length >= MIN_JOB;
  const keywords = ready ? analyzeResume(resume, job).keywords : null;

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">{t('intro')}</p>
      <Field label={t('job')} hint={t('jobHint')}>
        {(p) => (
          <Textarea
            {...p}
            rows={7}
            maxLength={8000}
            value={job}
            onChange={(e) => setJob(e.target.value)}
          />
        )}
      </Field>
      {keywords && (
        <section className="border-border bg-surface rounded-lg border p-3 text-sm">
          <h3 className="font-semibold">{t('keywords')}</h3>
          <p className="text-muted-foreground mt-0.5 text-xs">{t('keywordsNote')}</p>
          {(['matched', 'missing'] as const).map((key) => (
            <div key={key} className="mt-2" data-testid={`keywords-${key}`}>
              <p className="text-xs font-semibold">{t(key)}</p>
              <p className="mt-1 flex flex-wrap gap-1">
                {keywords[key].length === 0 && '—'}
                {keywords[key].map((word) => (
                  <span
                    key={word}
                    className={cn(
                      'rounded-sm px-1.5 py-0.5 text-xs',
                      key === 'matched' ? 'bg-primary-soft' : 'bg-muted',
                    )}
                  >
                    {word}
                  </span>
                ))}
              </p>
            </div>
          ))}
        </section>
      )}
      <AiGate>
        <Suggestions resume={resume} job={job} ready={ready} />
      </AiGate>
    </div>
  );
}

type Choice = { accepted: boolean; text: string };

function Suggestions({ resume, job, ready }: { resume: Resume; job: string; ready: boolean }) {
  const t = useTranslations('ai.tailor');
  const router = useRouter();
  const request = useAiRequest('tailor-resume');
  const context = resumeContext(resume);
  // The fields the current results were generated from.
  const [sent, setSent] = useState<{ fields: TailorField[]; job: string } | null>(null);
  const [choices, setChoices] = useState<Record<string, Choice | 'rejected'>>({});
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const run = () => {
    const fields = tailorFields(resume);
    setSent({ fields, job });
    setChoices({});
    void request.run({
      language: resume.language,
      context,
      jobDescription: job,
      fields: fields.map((f) => ({ id: f.id, label: describeField(f), text: f.text })),
    });
  };

  const offered = (request.data?.suggestions ?? []).flatMap((suggestion) => {
    const field = sent?.fields.find((f) => f.id === suggestion.field);
    return field ? [{ ...suggestion, source: field }] : [];
  });
  const accepted = offered.flatMap((s) => {
    const choice = choices[s.field];
    const current = readField(resume, s.source.ref) === s.source.text;
    return current && choice && choice !== 'rejected' && choice.accepted && choice.text.trim()
      ? [{ ref: s.source.ref, text: choice.text }]
      : [];
  });

  const createCopy = async () => {
    setSaving(true);
    const current = useEditor.getState().resume ?? resume;
    const title = name.trim() || t('copyName', { title: current.title });
    const copy = await saveCopy(applyTailoring(current, accepted), title).catch(() => null);
    setSaving(false);
    if (!copy) return toast.error(t('copyFailed'));
    toast.success(t('copied'));
    router.push(`/builder/${copy.id}`);
  };

  return (
    <div className="space-y-4">
      <Button variant="primary" disabled={request.loading || !ready || !context} onClick={run}>
        <Sparkles />
        {t('run')}
      </Button>
      <AiStatusLine
        loading={request.loading}
        error={request.error}
        onRetry={() => void request.retry()}
        onCancel={request.reset}
      />
      {request.data && sent && (
        <>
          {sent.job !== job && (
            <p role="status" className="bg-warning-soft text-warning rounded-md p-3 text-xs">
              {t('stale')}
            </p>
          )}
          {request.data.requirements.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold">{t('requirements')}</h3>
              <ul className="divide-border border-border bg-surface mt-1.5 divide-y rounded-lg border">
                {request.data.requirements.map((item, i) => {
                  const { Icon, className } = REQUIREMENT[item.met];
                  return (
                    <li key={i} className="flex gap-2.5 p-3 text-sm" data-testid="requirement">
                      <Icon aria-hidden className={cn('mt-0.5 size-4 shrink-0', className)} />
                      <div className="min-w-0">
                        <p>{item.requirement}</p>
                        <p className="text-muted-foreground text-xs">
                          {t(`met.${item.met}`)}
                          {item.evidence && `: “${item.evidence}”`}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">{t('suggestions')}</h3>
            {offered.length === 0 && (
              <p className="text-muted-foreground text-sm">{t('noSuggestions')}</p>
            )}
            {offered.map((s) => (
              <Rewrite
                key={s.field + s.text}
                original={s.source.text}
                suggested={s.text}
                reason={s.reason}
                place={s.source}
                changed={readField(resume, s.source.ref) !== s.source.text}
                warning={unsupportedTerms(s.text, `${context}\n${s.source.text}`, sent.job)}
                choice={choices[s.field]}
                onChoice={(choice) => setChoices((all) => ({ ...all, [s.field]: choice }))}
              />
            ))}
            {!!request.data.removed?.length && (
              <p className="text-muted-foreground text-xs">
                {t('removed', { count: request.data.removed.length })}
              </p>
            )}
          </section>

          <Bullets title={t('emphasise')} items={request.data.emphasise} />

          {offered.length > 0 && (
            <section className="border-border bg-surface space-y-3 rounded-lg border p-3">
              <Field label={t('copyLabel')} hint={t('originalSafe')}>
                {(p) => (
                  <Input
                    {...p}
                    maxLength={120}
                    placeholder={t('copyName', { title: resume.title })}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                )}
              </Field>
              <Button
                variant="primary"
                className="w-full"
                disabled={!accepted.length || saving}
                onClick={() => void createCopy()}
              >
                <Copy />
                {t('create', { count: accepted.length })}
              </Button>
            </section>
          )}
          <p className="bg-warning-soft text-warning rounded-md p-3 text-xs">{t('honesty')}</p>
        </>
      )}
    </div>
  );
}

function Rewrite({
  original,
  suggested,
  reason,
  place,
  changed,
  warning,
  choice,
  onChoice,
}: {
  original: string;
  suggested: string;
  reason: string;
  place: TailorField;
  /** The resume text was edited after the comparison was made. */
  changed: boolean;
  warning: string[];
  choice: Choice | 'rejected' | undefined;
  onChoice: (choice: Choice | 'rejected') => void;
}) {
  const t = useTranslations('ai.tailor');
  const parts = useTranslations('ai.suggestion');
  const [editing, setEditing] = useState(false);
  const { ref, role } = place;
  const label = t(
    `places.${ref.kind === 'entry' ? ref.section : ref.kind === 'summary' ? 'summary' : 'headline'}`,
  );
  const decided = choice && choice !== 'rejected' ? choice : undefined;
  const text = decided?.text ?? suggested;
  const rejected = choice === 'rejected';

  return (
    <article
      data-testid="tailor-suggestion"
      className={cn(
        'bg-surface rounded-lg border',
        decided?.accepted ? 'border-primary' : 'border-border',
      )}
    >
      <h4 className="border-border border-b px-3 py-2 text-sm font-semibold">
        {role ? `${label} · ${role}` : label}
      </h4>
      {rejected ? (
        <div className="flex items-center justify-between gap-2 p-3 text-sm">
          <span className="text-muted-foreground">{t('rejected')}</span>
          <Button size="sm" onClick={() => onChoice({ accepted: false, text: suggested })}>
            {t('reconsider')}
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-2.5 p-3 text-sm">
            <p className="text-muted-foreground text-xs">{reason}</p>
            <div>
              <p className="text-muted-foreground mb-1 text-xs font-semibold">
                {parts('original')}
              </p>
              <p className="text-muted-foreground whitespace-pre-wrap">{original}</p>
            </div>
            <div>
              <p className="text-primary mb-1 text-xs font-semibold">{parts('suggested')}</p>
              {editing ? (
                <Textarea
                  aria-label={parts('suggested')}
                  rows={6}
                  autoFocus
                  value={text}
                  onChange={(e) =>
                    onChoice({ accepted: decided?.accepted ?? false, text: e.target.value })
                  }
                />
              ) : (
                <p className="bg-primary-soft rounded-sm p-2 whitespace-pre-wrap">{text}</p>
              )}
            </div>
            {warning.length > 0 && (
              <p className="bg-warning-soft text-warning rounded-sm p-2 text-xs">
                {t('check', { terms: warning.slice(0, 8).join(', ') })}
              </p>
            )}
            {changed && (
              <p className="bg-warning-soft text-warning rounded-sm p-2 text-xs">{t('changed')}</p>
            )}
          </div>
          <div className="border-border flex flex-wrap gap-1.5 border-t p-2">
            <Button
              size="sm"
              variant={decided?.accepted ? 'primary' : 'secondary'}
              aria-pressed={decided?.accepted ?? false}
              disabled={changed || !text.trim()}
              onClick={() => onChoice({ accepted: !decided?.accepted, text })}
            >
              <Check />
              {parts('accept')}
            </Button>
            <Button size="sm" onClick={() => setEditing(!editing)}>
              <PencilLine />
              {parts(editing ? 'doneEditing' : 'edit')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onChoice('rejected')}>
              <X />
              {parts('reject')}
            </Button>
          </div>
        </>
      )}
    </article>
  );
}
