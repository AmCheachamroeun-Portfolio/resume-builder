'use client';

import { LoaderCircle, RefreshCw, ShieldCheck, Check, X, PencilLine } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/field';
import type { AiErrorCode } from '@/lib/ai/schemas';
import { grantConsent, useAiStatus, useConsent } from './client';

/** Shows AI controls only when the service exists and the writer has agreed to send data. */
export function AiGate({ children }: { children: ReactNode }) {
  const t = useTranslations('ai');
  const configured = useAiStatus();
  const consent = useConsent();
  if (configured === null) {
    return <p className="text-muted-foreground text-sm">{t('checking')}</p>;
  }
  if (!configured) {
    return (
      <div role="status" className="bg-warning-soft text-warning rounded-md p-4 text-sm">
        <p className="font-semibold">{t('unavailableTitle')}</p>
        <p className="mt-1">{t('unavailableBody')}</p>
      </div>
    );
  }
  if (!consent) {
    return (
      <div className="border-border bg-surface rounded-lg border p-4 text-sm">
        <p className="flex items-center gap-2 font-semibold">
          <ShieldCheck aria-hidden className="text-primary size-4" />
          {t('consentTitle')}
        </p>
        <p className="mt-2">{t('consentBody')}</p>
        <p className="text-muted-foreground mt-2">{t('consentExcluded')}</p>
        <Button variant="primary" className="mt-3" onClick={grantConsent}>
          {t('consentAllow')}
        </Button>
      </div>
    );
  }
  return <>{children}</>;
}

export function AiStatusLine({
  loading,
  error,
  onRetry,
}: {
  loading: boolean;
  error: AiErrorCode | null;
  onRetry: () => void;
}) {
  const t = useTranslations('ai');
  if (loading) {
    return (
      <div role="status" className="space-y-2 py-2">
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <LoaderCircle aria-hidden className="size-4 animate-spin" />
          {t('working')}
        </p>
        <div className="bg-muted h-3 w-full rounded-sm" />
        <div className="bg-muted h-3 w-4/5 rounded-sm" />
      </div>
    );
  }
  if (!error) return null;
  return (
    <div role="alert" className="bg-danger-soft text-danger rounded-md p-3 text-sm">
      <p>{t(`errors.${error}`)}</p>
      {!['not-configured', 'daily-limit'].includes(error) && (
        <Button size="sm" className="mt-2" onClick={onRetry}>
          <RefreshCw />
          {t('retry')}
        </Button>
      )}
    </div>
  );
}

/**
 * Every proposed change is reviewed here: original beside suggestion, with
 * accept, reject, regenerate and edit-before-applying. Nothing applies itself.
 */
export function Suggestion({
  label,
  original,
  suggested,
  onAccept,
  onReject,
  onRegenerate,
}: {
  label?: string;
  original: string;
  suggested: string;
  onAccept: (text: string) => void;
  onReject: () => void;
  onRegenerate: () => void;
}) {
  const t = useTranslations('ai.suggestion');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(suggested);
  return (
    <article className="border-border bg-surface rounded-lg border" data-testid="suggestion">
      {label && <h4 className="border-border border-b px-3 py-2 text-sm font-semibold">{label}</h4>}
      <div className="space-y-3 p-3 text-sm">
        <div>
          <p className="text-muted-foreground mb-1 text-xs font-semibold">{t('original')}</p>
          <p className="text-muted-foreground whitespace-pre-wrap">{original || t('empty')}</p>
        </div>
        <div>
          <p className="text-primary mb-1 text-xs font-semibold">{t('suggested')}</p>
          {editing ? (
            <Textarea
              aria-label={t('suggested')}
              rows={7}
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
          ) : (
            <p className="bg-primary-soft rounded-sm p-2 whitespace-pre-wrap">{draft}</p>
          )}
        </div>
      </div>
      <div className="border-border flex flex-wrap gap-1.5 border-t p-2">
        <Button
          size="sm"
          variant="primary"
          disabled={!draft.trim()}
          onClick={() => onAccept(draft)}
        >
          <Check />
          {t('accept')}
        </Button>
        <Button size="sm" onClick={() => setEditing(!editing)}>
          <PencilLine />
          {t(editing ? 'doneEditing' : 'edit')}
        </Button>
        <Button size="sm" variant="ghost" onClick={onRegenerate}>
          <RefreshCw />
          {t('regenerate')}
        </Button>
        <Button size="sm" variant="ghost" onClick={onReject}>
          <X />
          {t('reject')}
        </Button>
      </div>
    </article>
  );
}

export function Bullets({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <section>
      <h4 className="text-sm font-semibold">{title}</h4>
      <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
