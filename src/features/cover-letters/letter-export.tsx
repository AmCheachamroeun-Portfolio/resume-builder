'use client';

import { Download, LoaderCircle, Printer } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, Input, Segmented, Select } from '@/components/ui/field';
import { Dialog } from '@/components/ui/overlays';
import { detectBrowser, PRINT_BROWSERS, type PrintBrowser } from '@/features/pdf-export/browser';
import { downloadFile, safeFileName } from '@/lib/utils';
import type { CoverLetter } from '@/types/cover-letter';
import { LetterDocument } from './letter-document';
import { LETTER_TEMPLATES } from './templates';

export default function LetterExport({
  letter,
  onClose,
  onPaperChange,
}: {
  letter: CoverLetter;
  onClose: () => void;
  onPaperChange: (size: CoverLetter['pageSize']) => void;
}) {
  const t = useTranslations('export');
  const [name, setName] = useState(() => safeFileName(letter.title));
  const [browser, setBrowser] = useState<PrintBrowser>(() =>
    detectBrowser(navigator.userAgent, navigator.maxTouchPoints),
  );
  const [format, setFormat] = useState<'pdf' | 'docx'>('pdf');
  const [busy, setBusy] = useState(false);
  const size = letter.pageSize === 'a4' ? 'A4' : 'US Letter';

  const run = async () => {
    setBusy(true);
    try {
      if (format === 'docx') {
        const { letterDocxBlob } = await import('@/lib/docx/letter');
        downloadFile(`${safeFileName(name)}.docx`, await letterDocxBlob(letter));
        onClose();
        return;
      }
      const { printFlow } = await import('@/features/pdf-export/print');
      // The dialog must be gone before the page is handed to the printer.
      onClose();
      await printFlow((ready) => <LetterDocument letter={letter} onReady={ready} />, {
        pageSize: letter.pageSize,
        margin: `${LETTER_TEMPLATES[letter.template].margin}mm`,
        fileName: safeFileName(name),
      });
    } catch {
      toast.error(t(format === 'pdf' ? 'failed' : 'docxFailed'));
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={t('letterTitle')}
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
      <div className="flex flex-col gap-4">
        <Segmented
          stretch
          label={t('format')}
          value={format}
          onChange={setFormat}
          options={[
            { value: 'pdf', label: t('formats.pdf') },
            { value: 'docx', label: t('formats.docx') },
          ]}
        />
        <p className="text-muted-foreground text-sm">
          {t(format === 'pdf' ? 'about.pdf' : 'about.letterDocx')}
        </p>
        <Field label={t('fileName')}>
          {(props) => (
            <div className="flex items-center gap-2">
              <Input {...props} value={name} onChange={(e) => setName(e.target.value)} />
              <span className="text-muted-foreground text-sm">.{format}</span>
            </div>
          )}
        </Field>
        <Segmented<CoverLetter['pageSize']>
          stretch
          label={t('paper')}
          value={letter.pageSize}
          onChange={onPaperChange}
          options={[
            { value: 'a4', label: 'A4' },
            { value: 'letter', label: 'US Letter' },
          ]}
        />
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
              {(['one', 'two', 'three'] as const).map((step) => (
                <li key={step}>{t(`steps.${browser}.${step}`, { size })}</li>
              ))}
            </ol>
            <p className="text-muted-foreground text-xs">{t('browserNote')}</p>
          </div>
        )}
      </div>
    </Dialog>
  );
}
