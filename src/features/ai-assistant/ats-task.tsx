'use client';

import { ArrowRight, CircleAlert, CircleCheck, CircleX } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Textarea } from '@/components/ui/field';
import { analyzeResume, type AtsCheck } from '@/lib/ats/analyze';
import { useEditorUi } from '@/stores/editor-ui';
import type { Resume } from '@/types/resume';
import { AiGate } from './parts';
import { ReviewResult } from './tasks';

const ICONS = {
  pass: { Icon: CircleCheck, className: 'text-primary' },
  warn: { Icon: CircleAlert, className: 'text-warning' },
  fail: { Icon: CircleX, className: 'text-danger' },
};
const LIMITS = ['guess', 'systems', 'words', 'files'] as const;

function Findings({ checks }: { checks: AtsCheck[] }) {
  const t = useTranslations('ats');
  return (
    <ul className="divide-border border-border bg-surface divide-y rounded-lg border">
      {checks.map((check) => {
        const { Icon, className } = ICONS[check.status];
        const title = t(`checks.${check.id}.title`);
        return (
          <li
            key={check.id}
            className="flex gap-3 p-3 text-sm"
            data-check={check.id}
            data-status={check.status}
          >
            <Icon aria-hidden className={`mt-0.5 size-4 shrink-0 ${className}`} />
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                <span className="sr-only">{t(`status.${check.status}`)}: </span>
                {title}
              </p>
              <p className="text-muted-foreground">
                {t(`checks.${check.id}.${check.detail}`, check.values)}
              </p>
              {check.status !== 'pass' && check.target && (
                <Button
                  variant="link"
                  size="sm"
                  aria-label={`${t('goTo')}: ${title}`}
                  onClick={() => useEditorUi.getState().jumpTo(check.target!)}
                >
                  {t('goTo')}
                  <ArrowRight />
                </Button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Rule-based checks that work without AI, with optional Gemini feedback below. */
export function AtsTask({
  resume,
  job,
  setJob,
}: {
  resume: Resume;
  job: string;
  setJob: (v: string) => void;
}) {
  const t = useTranslations('ats');
  const report = useMemo(() => analyzeResume(resume, job), [resume, job]);
  // Most weighty first, so the top of each list is the best use of time.
  const group = (status: AtsCheck['status']) =>
    report.checks.filter((c) => c.status === status).sort((a, b) => b.weight - a.weight);
  const fail = group('fail');
  const warn = group('warn');
  const pass = group('pass');

  return (
    <div className="space-y-4">
      <div className="border-border bg-surface rounded-lg border p-4">
        <p className="font-semibold" role="status">
          {t('summary', { fail: fail.length, warn: warn.length, pass: pass.length })}
        </p>
        <p className="text-muted-foreground mt-1 text-sm" data-testid="ats-score">
          {t('score')}: {report.score} / 100
        </p>
        <meter
          className="mt-1 h-2 w-full"
          min={0}
          max={100}
          low={50}
          high={80}
          optimum={100}
          value={report.score}
          aria-label={t('score')}
        />
        <details className="mt-2 text-xs">
          <summary className="cursor-pointer font-medium">{t('limitsTitle')}</summary>
          <ul className="text-muted-foreground mt-1.5 list-disc space-y-1 pl-4">
            {LIMITS.map((key) => (
              <li key={key}>{t(`limits.${key}`)}</li>
            ))}
          </ul>
        </details>
      </div>
      {(['fail', 'warn'] as const).map((status) => {
        const checks = status === 'fail' ? fail : warn;
        return checks.length ? (
          <section key={status}>
            <h3 className="mb-1.5 text-sm font-semibold">{t(`status.${status}`)}</h3>
            <Findings checks={checks} />
          </section>
        ) : null;
      })}
      <Field label={t('job')} hint={t('jobHint')}>
        {(p) => (
          <Textarea
            {...p}
            rows={4}
            maxLength={8000}
            value={job}
            onChange={(e) => setJob(e.target.value)}
          />
        )}
      </Field>
      {report.keywords && (
        <div className="space-y-2 text-sm">
          {(['matched', 'missing'] as const).map((key) => (
            <p key={key}>
              <span className="font-semibold">{t(key)}: </span>
              {report.keywords![key].join(', ') || '—'}
            </p>
          ))}
          <p className="text-muted-foreground text-xs">{t('keywordNote')}</p>
        </div>
      )}
      {pass.length > 0 && (
        <details>
          <summary className="mb-1.5 cursor-pointer text-sm font-semibold">
            {t('passed', { count: pass.length })}
          </summary>
          <Findings checks={pass} />
        </details>
      )}
      <div className="border-border border-t pt-4">
        <h3 className="mb-2 text-sm font-semibold">{t('aiTitle')}</h3>
        <AiGate>
          <ReviewResult resume={resume} />
        </AiGate>
      </div>
    </div>
  );
}
