'use client';

import { Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAiRequest } from '@/features/ai-assistant/client';
import { resumeContext } from '@/features/ai-assistant/context';
import { AiGate, AiStatusLine, Suggestion } from '@/features/ai-assistant/parts';
import { unsupportedTerms } from '@/lib/ats/analyze';
import { useLetter } from '@/stores/letter-store';
import { LETTER_LIMITS, type CoverLetter } from '@/types/cover-letter';
import type { Resume } from '@/types/resume';

/** Asks Gemini for a draft. Nothing reaches the letter until it is accepted. */
export function DraftPanel({ letter, resume }: { letter: CoverLetter; resume?: Resume }) {
  const t = useTranslations('letters.draft');
  return (
    <section aria-labelledby="draft-title" className="border-border rounded-lg border p-4">
      <h3 id="draft-title" className="font-semibold">
        {t('title')}
      </h3>
      <p className="text-muted-foreground mt-1 mb-3 text-sm">{t('intro')}</p>
      <AiGate>
        <Draft letter={letter} resume={resume} />
      </AiGate>
    </section>
  );
}

function Draft({ letter, resume }: { letter: CoverLetter; resume?: Resume }) {
  const t = useTranslations('letters.draft');
  const request = useAiRequest('cover-letter');
  const context = resume ? resumeContext(resume) : '';
  const missing = !context
    ? t('needResume')
    : !letter.company.trim() || !letter.jobTitle.trim()
      ? t('needJob')
      : '';

  const run = () =>
    void request.run({
      language: letter.language,
      context,
      tone: letter.tone,
      company: letter.company.trim().slice(0, 300),
      jobTitle: letter.jobTitle.trim().slice(0, 300),
      jobDescription: letter.jobDescription,
    });

  const accept = (text: string) => {
    const before = letter.body;
    useLetter.getState().update({ body: text.slice(0, LETTER_LIMITS.body) });
    request.reset();
    toast.success(t('applied'), {
      action: before.trim()
        ? { label: t('undo'), onClick: () => useLetter.getState().update({ body: before }) }
        : undefined,
    });
  };

  const suggested = request.data?.body;
  const check = suggested
    ? unsupportedTerms(
        suggested,
        context,
        letter.jobDescription,
        `${letter.company} ${letter.jobTitle}`,
      )
    : [];

  return (
    <div className="space-y-3">
      {missing && <p className="text-muted-foreground text-sm">{missing}</p>}
      <Button disabled={request.loading || Boolean(missing)} onClick={run}>
        <Sparkles />
        {t(letter.body.trim() ? 'again' : 'run')}
      </Button>
      <AiStatusLine
        loading={request.loading}
        error={request.error}
        onRetry={() => void request.retry()}
        onCancel={request.reset}
      />
      {suggested && (
        <Suggestion
          key={suggested}
          original={letter.body}
          suggested={suggested}
          note={
            check.length ? t('check', { terms: check.slice(0, 8).join(', ') }) : t('checkClaims')
          }
          onAccept={accept}
          onReject={request.reset}
          onRegenerate={run}
        />
      )}
    </div>
  );
}
