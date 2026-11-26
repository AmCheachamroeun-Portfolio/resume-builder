'use client';

import { CircleAlert, CircleCheck, CircleX } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { Field, Textarea } from '@/components/ui/field';
import { analyzeResume } from '@/lib/ats/analyze';
import type { Resume } from '@/types/resume';
import { AiGate } from './parts';
import { ReviewResult } from './tasks';

const ICONS = {
  pass: { Icon: CircleCheck, className: 'text-primary' },
  warn: { Icon: CircleAlert, className: 'text-warning' },
  fail: { Icon: CircleX, className: 'text-danger' },
};

/** Rule-based estimate that works without AI, with optional Gemini feedback below. */
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
  const order = { fail: 0, warn: 1, pass: 2 };
  const checks = [...report.checks].sort((a, b) => order[a.status] - order[b.status]);

  return (
    <div className="space-y-4">
      <div className="border-border bg-surface rounded-lg border p-4">
        <p className="text-muted-foreground text-sm">{t('score')}</p>
        <p className="display text-4xl" data-testid="ats-score">
          {report.score}
          <span className="text-muted-foreground text-base"> / 100</span>
        </p>
        <meter
          className="h-2 w-full"
          min={0}
          max={100}
          low={50}
          high={80}
          optimum={100}
          value={report.score}
          aria-label={t('score')}
        />
        <p className="text-muted-foreground mt-2 text-xs">{t('disclaimer')}</p>
      </div>
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
      <ul className="divide-border border-border bg-surface divide-y rounded-lg border">
        {checks.map((check) => {
          const { Icon, className } = ICONS[check.status];
          return (
            <li
              key={check.id}
              className="flex gap-3 p-3 text-sm"
              data-check={check.id}
              data-status={check.status}
            >
              <Icon aria-hidden className={`mt-0.5 size-4 shrink-0 ${className}`} />
              <div>
                <p className="font-medium">
                  <span className="sr-only">{t(`status.${check.status}`)}: </span>
                  {t(`checks.${check.id}.title`)}
                </p>
                <p className="text-muted-foreground">
                  {t(`checks.${check.id}.${check.detail}`, check.values)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="border-border border-t pt-4">
        <h4 className="mb-2 font-semibold">{t('aiTitle')}</h4>
        <AiGate>
          <ReviewResult resume={resume} />
        </AiGate>
      </div>
    </div>
  );
}
