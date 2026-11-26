'use client';

import { useTranslations } from 'next-intl';
import { Dialog } from '@/components/ui/overlays';

const SHORTCUTS = [
  ['undo', 'Z'],
  ['redo', 'Shift Z'],
  ['save', 'S'],
  ['export', 'P'],
  ['search', 'K'],
] as const;

export function ShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('editor.shortcuts');
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t('title')} description={t('note')}>
      <dl className="divide-border border-border divide-y border-y text-sm">
        {SHORTCUTS.map(([name, key]) => (
          <div key={name} className="flex items-center justify-between gap-4 py-2.5">
            <dt>{t(name)}</dt>
            <dd>
              <kbd className="bg-muted rounded-sm px-2 py-0.5 font-sans text-xs">Ctrl/⌘ {key}</kbd>
            </dd>
          </div>
        ))}
        <div className="flex items-center justify-between gap-4 py-2.5">
          <dt>{t('help')}</dt>
          <dd>
            <kbd className="bg-muted rounded-sm px-2 py-0.5 font-sans text-xs">?</kbd>
          </dd>
        </div>
      </dl>
      <p className="text-muted-foreground mt-3 text-xs">{t('drag')}</p>
    </Dialog>
  );
}
