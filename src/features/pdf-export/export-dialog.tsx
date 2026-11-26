'use client';

import { Download, LoaderCircle, Printer } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, Input, Segmented, Select } from '@/components/ui/field';
import { Dialog } from '@/components/ui/overlays';
import { FittedPages } from '@/features/resume-templates/scaled-pages';
import { createBackup } from '@/lib/storage/backup';
import { cn, downloadFile, downloadTextFile, safeFileName } from '@/lib/utils';
import type { PageSize, Resume } from '@/types/resume';
import { detectBrowser, PRINT_BROWSERS, type PrintBrowser } from './browser';

type Format = 'pdf' | 'docx' | 'json';
const PAPER: Record<PageSize, string> = { a4: 'A4', letter: 'US Letter' };

export default function ExportDialog({ resume, onClose }: { resume: Resume; onClose: () => void }) {
  const t = useTranslations('export');
  const [format, setFormat] = useState<Format>('pdf');
  const [name, setName] = useState(() =>
    safeFileName(resume.title || resume.data.personal.fullName),
  );
  const [size, setSize] = useState(resume.design.pageSize);
  const [browser, setBrowser] = useState<PrintBrowser>(() =>
    detectBrowser(navigator.userAgent, navigator.maxTouchPoints),
  );
  const [busy, setBusy] = useState(false);
  // The chosen paper applies to this download; the stored design is left alone.
  const output = useMemo(
    () => ({ ...resume, design: { ...resume.design, pageSize: size } }),
    [resume, size],
  );

  const run = async () => {
    const fileName = safeFileName(name);
    setBusy(true);
    try {
      if (format === 'json') {
        downloadTextFile(`${fileName}.json`, createBackup([resume]));
        onClose();
        return;
      }
      if (format === 'docx') {
        const { docxBlob } = await import('@/lib/docx/build');
        downloadFile(`${fileName}.docx`, await docxBlob(output));
        onClose();
        return;
      }
      // The export engine is loaded only when someone actually downloads.
      const { printResume } = await import('./print');
      // The dialog must be gone before the page is handed to the printer.
      onClose();
      await printResume(output, fileName);
    } catch {
      toast.error(t('failed'));
      setBusy(false);
    }
  };

  const steps = ['one', 'two', 'three'] as const;

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={t('title')}
      className={format === 'pdf' ? 'max-w-4xl' : 'max-w-md'}
      footer={
        <Button variant="primary" disabled={busy || !name.trim()} onClick={() => void run()}>
          {busy ? (
            <LoaderCircle className="animate-spin" />
          ) : format === 'pdf' ? (
            <Printer />
          ) : (
            <Download />
          )}
          {t(format === 'pdf' ? 'openPrint' : 'downloadFile')}
        </Button>
      }
    >
      <div className={cn('grid gap-5', format === 'pdf' && 'md:grid-cols-[minmax(0,1fr)_20rem]')}>
        <div className="flex min-w-0 flex-col gap-4 md:order-2">
          <Segmented
            stretch
            label={t('format')}
            value={format}
            onChange={setFormat}
            options={[
              { value: 'pdf', label: t('formats.pdf') },
              { value: 'docx', label: t('formats.docx') },
              { value: 'json', label: t('formats.json') },
            ]}
          />
          <p className="text-muted-foreground text-sm">{t(`about.${format}`)}</p>
          <Field label={t('fileName')}>
            {(props) => (
              <div className="flex items-center gap-2">
                <Input {...props} value={name} onChange={(e) => setName(e.target.value)} />
                <span className="text-muted-foreground text-sm">.{format}</span>
              </div>
            )}
          </Field>
          {format !== 'json' && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium" aria-hidden>
                {t('paper')}
              </span>
              <Segmented
                stretch
                label={t('paper')}
                value={size}
                onChange={setSize}
                options={[
                  { value: 'a4', label: PAPER.a4 },
                  { value: 'letter', label: PAPER.letter },
                ]}
              />
              {size !== resume.design.pageSize && (
                <p className="text-muted-foreground text-xs">{t('paperOnce')}</p>
              )}
            </div>
          )}
          {format === 'pdf' && (
            <div className="border-border flex flex-col gap-2.5 border-t pt-3">
              <Field label={t('stepsFor')}>
                {(props) => (
                  <Select
                    {...props}
                    value={browser}
                    onChange={(e) => setBrowser(e.target.value as PrintBrowser)}
                  >
                    {PRINT_BROWSERS.map((key) => (
                      <option key={key} value={key}>
                        {t(`browsers.${key}`)}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <ol className="list-decimal space-y-1.5 pl-5 text-sm">
                {steps.map((step) => (
                  <li key={step}>{t(`steps.${browser}.${step}`, { size: PAPER[size] })}</li>
                ))}
              </ol>
              <p className="text-muted-foreground text-xs">{t('browserNote')}</p>
            </div>
          )}
        </div>
        {format === 'pdf' && (
          <div className="bg-desk max-h-72 min-w-0 overflow-y-auto rounded-lg p-4 md:order-1 md:max-h-[62dvh]">
            <FittedPages resume={output} />
          </div>
        )}
      </div>
    </Dialog>
  );
}
