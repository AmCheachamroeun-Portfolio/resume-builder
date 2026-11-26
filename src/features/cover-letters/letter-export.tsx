'use client';

import { Printer } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, Input, Segmented, Select } from '@/components/ui/field';
import { Dialog } from '@/components/ui/overlays';
import { detectBrowser, PRINT_BROWSERS, type PrintBrowser } from '@/features/pdf-export/browser';
import { safeFileName } from '@/lib/utils';
import type { CoverLetter } from '@/types/cover-letter';
import { LETTER_MARGIN, LetterDocument } from './letter-document';

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
  const size = letter.pageSize === 'a4' ? 'A4' : 'US Letter';

  const run = async () => {
    try {
      const { printFlow } = await import('@/features/pdf-export/print');
      // The dialog must be gone before the page is handed to the printer.
      onClose();
      await printFlow((ready) => <LetterDocument letter={letter} onReady={ready} />, {
        pageSize: letter.pageSize,
        margin: LETTER_MARGIN,
        fileName: safeFileName(name),
      });
    } catch {
      toast.error(t('failed'));
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={t('title')}
      description={t('about.pdf')}
      footer={
        <Button variant="primary" disabled={!name.trim()} onClick={() => void run()}>
          <Printer />
          {t('openPrint')}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label={t('fileName')}>
          {(props) => (
            <div className="flex items-center gap-2">
              <Input {...props} value={name} onChange={(e) => setName(e.target.value)} />
              <span className="text-muted-foreground text-sm">.pdf</span>
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
      </div>
    </Dialog>
  );
}
