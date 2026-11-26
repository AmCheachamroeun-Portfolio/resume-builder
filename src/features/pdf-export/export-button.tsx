'use client';

import { Download, LoaderCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type ComponentProps } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/overlays';
import type { Resume } from '@/types/resume';

export const SKIP_HELP_KEY = 'resumecraft:skip-export-help';

/** Download flow: a one-time explanation of "Save as PDF", then the print engine. */
export function usePdfExport() {
  const t = useTranslations('export');
  const [pending, setPending] = useState<Resume | null>(null);
  const [busy, setBusy] = useState(false);
  const [dontShow, setDontShow] = useState(false);

  const run = async (resume: Resume) => {
    setPending(null);
    setBusy(true);
    try {
      // The export engine is loaded only when someone actually downloads.
      const { printResume } = await import('./print');
      await printResume(resume);
    } catch {
      toast.error(t('failed'));
    } finally {
      setBusy(false);
    }
  };

  const request = (resume: Resume) => {
    let skip = false;
    try {
      skip = localStorage.getItem(SKIP_HELP_KEY) === '1';
    } catch {
      /* storage unavailable: show the help */
    }
    if (skip) void run(resume);
    else setPending(resume);
  };

  const dialog = (
    <Dialog
      open={pending !== null}
      onOpenChange={(open) => !open && setPending(null)}
      title={t('title')}
      description={t('description')}
    >
      <ol className="border-border list-decimal space-y-2 border-y py-3 pl-5 text-sm">
        <li>{t('step1')}</li>
        <li>{t('step2', { size: pending?.design.pageSize === 'letter' ? 'US Letter' : 'A4' })}</li>
        <li>{t('step3')}</li>
      </ol>
      <p className="text-muted-foreground mt-3 text-xs">{t('browserNote')}</p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="accent-primary size-4"
            checked={dontShow}
            onChange={(e) => setDontShow(e.target.checked)}
          />
          {t('dontShow')}
        </label>
        <Button
          variant="primary"
          onClick={() => {
            if (dontShow) localStorage.setItem(SKIP_HELP_KEY, '1');
            if (pending) void run(pending);
          }}
        >
          <Download />
          {t('open')}
        </Button>
      </div>
    </Dialog>
  );

  return { request, dialog, busy };
}

export function DownloadButton({
  busy,
  label,
  ...props
}: ComponentProps<typeof Button> & { busy: boolean; label?: string }) {
  const t = useTranslations('export');
  return (
    <Button variant="primary" {...props} disabled={busy || props.disabled}>
      {busy ? <LoaderCircle className="animate-spin" /> : <Download />}
      <span>{label ?? t('download')}</span>
    </Button>
  );
}
