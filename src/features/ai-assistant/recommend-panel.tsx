'use client';

import { Sparkles } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { SampleThumbnail } from '@/features/landing/previews';
import { getTemplate } from '@/features/resume-templates/registry';
import type { AiRequest, AiResponse } from '@/lib/ai/schemas';
import type { ContentLanguage } from '@/types/resume';
import { useAiRequest } from './client';
import { AiGate, AiStatusLine } from './parts';

type Query = AiRequest<'recommend-template'>;

export function Recommendations({
  result,
  selected,
  useLabel,
  onUse,
}: {
  result: AiResponse<'recommend-template'>;
  selected?: string;
  useLabel: string;
  onUse: (templateId: string) => void;
}) {
  const t = useTranslations('ai.recommend');
  return (
    <ol className="space-y-4">
      {result.recommendations.map((item, index) => (
        <li
          key={item.templateId}
          data-testid="recommendation"
          className={`border-border bg-surface grid gap-4 rounded-lg border p-3 ${index === 0 ? 'grid-cols-[minmax(6rem,11rem)_1fr]' : 'grid-cols-[6rem_1fr]'}`}
        >
          <div className="bg-desk self-start rounded-md p-2">
            <SampleThumbnail templateId={item.templateId} className="shadow-paper" />
          </div>
          <div className="min-w-0">
            <p className="text-primary text-xs font-semibold">
              {t(index === 0 ? 'best' : 'alternative')}
            </p>
            <h4 className="font-semibold">{getTemplate(item.templateId).name}</h4>
            <p className="text-muted-foreground mt-1 text-sm">{item.reason}</p>
            <Button
              size="sm"
              className="mt-2"
              variant={
                (selected ? selected === item.templateId : index === 0) ? 'primary' : 'secondary'
              }
              aria-pressed={selected ? selected === item.templateId : undefined}
              onClick={() => onUse(item.templateId)}
            >
              {useLabel}
            </Button>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function RecommendPanel({
  useLabel,
  onUse,
  onResult,
}: {
  useLabel: string;
  onUse: (templateId: string, targetRole: string) => void;
  onResult?: (result: AiResponse<'recommend-template'>, targetRole: string) => void;
}) {
  const t = useTranslations('ai.recommend');
  const locale = useLocale() as ContentLanguage;
  const request = useAiRequest('recommend-template');
  const [query, setQuery] = useState<Query>({
    language: locale,
    targetRole: '',
    industry: '',
    level: 'junior',
    style: 'any',
    ats: true,
    photo: false,
  });
  const set = (patch: Partial<Query>) => setQuery((q) => ({ ...q, ...patch }));

  return (
    <AiGate prompt>
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          void request.run(query).then((result) => {
            if (result) onResult?.(result, query.targetRole);
          });
        }}
      >
        <Field label={t('role')}>
          {(p) => (
            <Input
              {...p}
              required
              maxLength={300}
              value={query.targetRole}
              onChange={(e) => set({ targetRole: e.target.value })}
            />
          )}
        </Field>
        <Field label={t('industry')}>
          {(p) => (
            <Input
              {...p}
              maxLength={300}
              value={query.industry}
              onChange={(e) => set({ industry: e.target.value })}
            />
          )}
        </Field>
        <Field label={t('level')}>
          {(p) => (
            <Select
              {...p}
              value={query.level}
              onChange={(e) => set({ level: e.target.value as Query['level'] })}
            >
              {(['student', 'junior', 'mid', 'senior', 'lead'] as const).map((v) => (
                <option key={v} value={v}>
                  {t(`levels.${v}`)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={t('style')}>
          {(p) => (
            <Select
              {...p}
              value={query.style}
              onChange={(e) => set({ style: e.target.value as Query['style'] })}
            >
              {(['any', 'professional', 'modern', 'minimalist', 'creative'] as const).map((v) => (
                <option key={v} value={v}>
                  {t(`styles.${v}`)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={t('requirements')} className="sm:col-span-2">
          {(p) => (
            <Textarea
              {...p}
              rows={3}
              maxLength={4000}
              value={query.requirements ?? ''}
              onChange={(e) => set({ requirements: e.target.value })}
            />
          )}
        </Field>
        {(['ats', 'photo'] as const).map((key) => (
          <label key={key} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="accent-primary size-4"
              checked={query[key]}
              onChange={(e) => set({ [key]: e.target.checked })}
            />
            {t(key)}
          </label>
        ))}
        <Button
          type="submit"
          variant="primary"
          className="sm:col-span-2"
          disabled={request.loading || !query.targetRole.trim()}
        >
          <Sparkles />
          {t('submit')}
        </Button>
      </form>
      <div className="mt-4 space-y-3">
        <AiStatusLine
          loading={request.loading}
          error={request.error}
          onRetry={() =>
            void request.retry()?.then((result) => {
              if (result) onResult?.(result, query.targetRole);
            })
          }
          onCancel={request.reset}
        />
        {request.data && (
          <Recommendations
            result={request.data}
            useLabel={useLabel}
            onUse={(id) => onUse(id, query.targetRole)}
          />
        )}
      </div>
    </AiGate>
  );
}
