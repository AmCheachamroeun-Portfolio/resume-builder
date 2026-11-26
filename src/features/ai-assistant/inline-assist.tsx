'use client';

import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { ImproveMode } from '@/lib/ai/schemas';
import type { ContentLanguage } from '@/types/resume';
import { useAiRequest } from './client';
import { AiGate, AiStatusLine, Bullets, Suggestion } from './parts';

type Props = {
  mode: ImproveMode;
  role: string;
  language: ContentLanguage;
  value: string;
  onApply: (text: string) => void;
  onClose: () => void;
};

function Request({ mode, role, language, value, onApply, onClose }: Props) {
  const t = useTranslations('ai');
  const request = useAiRequest('improve-experience');
  // The text the suggestion is based on.
  const [source, setSource] = useState(value);
  const { run, reset } = request;

  const start = () => {
    setSource(value);
    void run({ language, text: value.slice(0, 6000), role: role.slice(0, 300), mode });
  };

  useEffect(() => {
    // Deferred, so a double-mounted effect sends one request.
    const timer = setTimeout(() => {
      void run({ language, text: source.slice(0, 6000), role: role.slice(0, 300), mode });
    });
    return () => clearTimeout(timer);
    // The request is made once for the choice that opened this panel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-3">
      <AiStatusLine
        loading={request.loading}
        error={request.error}
        onRetry={() => void request.retry()}
        onCancel={() => {
          reset();
          onClose();
        }}
      />
      {request.data && (
        <>
          <Suggestion
            key={request.data.text}
            label={t(`improve.modes.${mode}`)}
            original={source}
            suggested={request.data.text}
            note={source !== value ? t('suggestion.stale') : undefined}
            onAccept={(text) => {
              onApply(text);
              toast.success(t('summary.applied'));
              onClose();
            }}
            onReject={onClose}
            onRegenerate={start}
          />
          <Bullets title={t('improve.changes')} items={request.data.changes} />
        </>
      )}
    </div>
  );
}

/** Writing help shown directly under the field it concerns. Nothing applies itself. */
export function InlineAssist(props: Props) {
  const t = useTranslations('ai');
  return (
    <section data-native-undo className="border-border bg-panel mt-2 rounded-lg border p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="text-[13px] font-semibold">{t('assistTitle')}</h4>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t('assistClose')}
          onClick={props.onClose}
        >
          <X />
        </Button>
      </div>
      <AiGate>
        <Request {...props} />
      </AiGate>
    </section>
  );
}
