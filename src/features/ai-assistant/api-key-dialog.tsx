'use client';

import { ExternalLink, Eye, EyeOff, LoaderCircle, Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { Dialog } from '@/components/ui/overlays';
import { API_KEY_URL, isKeyShape } from '@/lib/ai/key';
import type { AiErrorCode } from '@/lib/ai/schemas';
import { closeKeyDialog, saveApiKey, useApiKeyHint } from './api-key';
import { AiError, verifyApiKey } from './client';

type Problem = AiErrorCode | 'format' | 'storage';

/** Adds or replaces the visitor's Gemini key. It is saved only once Google accepts it. */
export function ApiKeyDialog() {
  const t = useTranslations('apiKey');
  const errors = useTranslations('ai.errors');
  const common = useTranslations('common');
  const current = useApiKeyHint();
  const formId = useId();
  const [value, setValue] = useState('');
  const [shown, setShown] = useState(false);
  const [checking, setChecking] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const controller = useRef<AbortController | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Deferred until the dialog has noted where to return focus afterwards.
    const timer = setTimeout(() => input.current?.focus());
    return () => {
      clearTimeout(timer);
      controller.current?.abort();
    };
  }, []);

  const store = (key: string) => {
    if (!saveApiKey(key)) return setProblem('storage');
    toast.success(t('saved'));
    closeKeyDialog(true);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const key = value.trim();
    if (!key || checking) return;
    if (!isKeyShape(key)) return setProblem('format');
    const request = new AbortController();
    controller.current = request;
    setChecking(true);
    setProblem(null);
    try {
      await verifyApiKey(key, request.signal);
      if (!request.signal.aborted) store(key);
    } catch (cause) {
      if (!request.signal.aborted) setProblem(cause instanceof AiError ? cause.code : 'upstream');
    } finally {
      if (!request.signal.aborted) setChecking(false);
    }
  };

  const message =
    problem === 'format' || problem === 'storage'
      ? t(`errors.${problem}`)
      : problem && errors(problem);

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && closeKeyDialog(false)}
      title={t(current ? 'updateTitle' : 'addTitle')}
      description={t('intro')}
      footer={
        <>
          <Button onClick={() => closeKeyDialog(false)}>{common('cancel')}</Button>
          <Button
            type="submit"
            form={formId}
            variant="primary"
            disabled={!value.trim() || checking}
          >
            {checking && <LoaderCircle aria-hidden className="animate-spin" />}
            {t(checking ? 'checking' : 'save')}
          </Button>
        </>
      }
    >
      {/* No field name and a prevented submit: the key can never end up in a URL. */}
      <form id={formId} method="post" onSubmit={(e) => void submit(e)}>
        <Field
          label={t('label')}
          hint={current ? t('current', { key: current }) : undefined}
          error={message ? <span role="alert">{message}</span> : undefined}
        >
          {(props) => (
            <div className="relative">
              <Input
                {...props}
                ref={input}
                type={shown ? 'text' : 'password'}
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  setProblem(null);
                }}
                readOnly={checking}
                placeholder={t('placeholder')}
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                data-1p-ignore
                data-lpignore="true"
                className="h-10 pr-11"
              />
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground absolute top-1 right-1"
                aria-label={t('show')}
                aria-pressed={shown}
                onClick={() => setShown(!shown)}
              >
                {shown ? <EyeOff /> : <Eye />}
              </Button>
            </div>
          )}
        </Field>
        {/* The key reached Google, so it may be kept for when the quota returns. */}
        {problem === 'quota' && (
          <Button size="sm" className="mt-2" onClick={() => store(value.trim())}>
            {t('saveAnyway')}
          </Button>
        )}
      </form>

      <section aria-labelledby={`${formId}-guide`} className="bg-muted mt-4 rounded-lg p-3">
        <h3 id={`${formId}-guide`} className="text-[13px] font-semibold">
          {t('guide.title')}
        </h3>
        <ol className="text-muted-foreground mt-1.5 list-decimal space-y-1 pl-5 text-[13px]">
          <li>
            <a
              href={API_KEY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary font-medium underline-offset-4 hover:underline"
            >
              {t('guide.open')}
              <ExternalLink aria-hidden className="ml-1 inline size-3" />
            </a>{' '}
            {t('guide.signIn')}
          </li>
          <li>{t('guide.create')}</li>
          <li>{t('guide.paste')}</li>
        </ol>
      </section>
      <p className="text-muted-foreground mt-3 flex gap-2 text-xs">
        <Lock aria-hidden className="mt-0.5 size-3.5 shrink-0" />
        <span>{t('privacy')}</span>
      </p>
    </Dialog>
  );
}
