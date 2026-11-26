'use client';

import {
  ArrowLeft,
  Check,
  Eye,
  LayoutTemplate,
  LoaderCircle,
  Redo2,
  Sparkles,
  TriangleAlert,
  Undo2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { LanguageMenu, ThemeMenu } from '@/components/layout/preferences';
import { Button } from '@/components/ui/button';
import { useAssistant } from '@/features/ai-assistant/store';
import { DownloadButton } from '@/features/pdf-export/export-button';
import { Link } from '@/i18n/navigation';
import { useSaveStatus } from '@/stores/autosave';
import { actions, useEditor } from '@/stores/editor-store';
import type { Resume } from '@/types/resume';

function SaveIndicator({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations('editor.save');
  const status = useSaveStatus((s) => s.status);
  if (status === 'error') {
    return (
      <button
        type="button"
        onClick={onRetry}
        className="text-danger flex items-center gap-1.5 text-xs font-medium"
        role="alert"
      >
        <TriangleAlert aria-hidden className="size-3.5" />
        {t('error')}
      </button>
    );
  }
  const busy = status === 'pending' || status === 'saving';
  return (
    <span
      role="status"
      data-testid="save-status"
      data-status={busy ? 'saving' : 'saved'}
      className="text-muted-foreground flex items-center gap-1.5 text-xs whitespace-nowrap"
    >
      {busy ? (
        <LoaderCircle aria-hidden className="size-3.5 animate-spin" />
      ) : (
        <Check aria-hidden className="size-3.5" />
      )}
      <span className="max-sm:sr-only">{t(busy ? 'saving' : 'saved')}</span>
    </span>
  );
}

export function Toolbar({
  resume,
  onRetrySave,
  onChangeTemplate,
  onPreview,
  onDownload,
  downloading,
}: {
  resume: Resume;
  onRetrySave: () => void;
  onChangeTemplate: () => void;
  onPreview: () => void;
  onDownload: () => void;
  downloading: boolean;
}) {
  const t = useTranslations('editor');
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const { undo, redo } = useEditor.getState();
  const toggleAssistant = useAssistant((s) => s.toggle);
  const assistantOpen = useAssistant((s) => s.open);

  return (
    <header className="border-border bg-surface flex flex-wrap items-center gap-x-2 gap-y-1 border-b px-2 py-1.5 sm:px-3">
      <Button asChild variant="ghost" size="icon">
        <Link href="/resumes" aria-label={t('back')}>
          <ArrowLeft />
        </Link>
      </Button>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <input
          aria-label={t('titleLabel')}
          maxLength={120}
          value={resume.title}
          onChange={(e) => actions.rename(e.target.value)}
          className="hover:border-border focus:border-primary h-8 w-full max-w-72 min-w-0 rounded-md border border-transparent bg-transparent px-2 text-sm font-semibold"
        />
        <SaveIndicator onRetry={onRetrySave} />
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          disabled={!canUndo}
          aria-label={t('undo')}
          title={`${t('undo')} (Ctrl/⌘ Z)`}
          onClick={undo}
        >
          <Undo2 />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          disabled={!canRedo}
          aria-label={t('redo')}
          title={`${t('redo')} (Ctrl/⌘ Shift Z)`}
          onClick={redo}
        >
          <Redo2 />
        </Button>
        <span aria-hidden className="bg-border mx-1 hidden h-5 w-px sm:block" />
        <Button
          variant="ghost"
          className="max-xl:size-9 max-xl:px-0 max-sm:hidden"
          aria-label={t('changeTemplate')}
          onClick={onChangeTemplate}
        >
          <LayoutTemplate />
          <span className="max-xl:sr-only">{t('changeTemplate')}</span>
        </Button>
        <Button
          variant="ghost"
          className="max-md:size-9 max-md:px-0"
          aria-expanded={assistantOpen}
          aria-label={t('assistant')}
          onClick={toggleAssistant}
        >
          <Sparkles />
          <span className="max-md:sr-only">{t('assistant')}</span>
        </Button>
        <Button
          variant="ghost"
          className="max-xl:size-9 max-xl:px-0 max-sm:hidden"
          aria-label={t('previewAction')}
          onClick={onPreview}
        >
          <Eye />
          <span className="max-xl:sr-only">{t('previewAction')}</span>
        </Button>
        <div className="hidden items-center lg:flex">
          <LanguageMenu />
          <ThemeMenu />
        </div>
        <DownloadButton
          busy={downloading}
          onClick={onDownload}
          className="max-sm:size-9 max-sm:px-0 max-sm:[&>span]:sr-only"
        />
      </div>
    </header>
  );
}
