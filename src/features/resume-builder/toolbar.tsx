'use client';

import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  Eye,
  FileDown,
  History,
  Keyboard,
  Languages,
  LayoutTemplate,
  LoaderCircle,
  Monitor,
  Moon,
  MoreHorizontal,
  PanelRight,
  PanelRightClose,
  Redo2,
  Search,
  Sparkles,
  Sun,
  TriangleAlert,
  Undo2,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useDownloadBackup } from '@/features/resume-management/use-backup';
import { LOCALE_NAMES, useSwitchLocale } from '@/components/layout/preferences';
import { Button } from '@/components/ui/button';
import { Menu, type MenuItem } from '@/components/ui/overlays';
import { useAssistant } from '@/features/ai-assistant/store';
import { Link, useRouter } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { saveCopy } from '@/lib/storage/db';
import { setTheme, useTheme } from '@/lib/theme';
import { safeFileName } from '@/lib/utils';
import { useSaveStatus } from '@/stores/autosave';
import { actions, useEditor } from '@/stores/editor-store';
import type { Resume } from '@/types/resume';

function SaveIndicator({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations('editor.save');
  const status = useSaveStatus((s) => s.status);
  if (status === 'conflict' || status === 'deleted') {
    return (
      <span
        data-testid="save-status"
        data-status={status}
        className="text-danger flex items-center gap-1.5 text-xs font-medium"
      >
        <TriangleAlert aria-hidden className="size-3.5" />
        {t('blocked')}
      </span>
    );
  }
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
      <span className="max-md:sr-only">{t(busy ? 'saving' : 'saved')}</span>
    </span>
  );
}

export function Toolbar({
  resume,
  desktop,
  previewShown,
  onTogglePreview,
  onRetrySave,
  onChangeTemplate,
  onFullPreview,
  onSearch,
  onShortcuts,
  onHistory,
  onExport,
}: {
  resume: Resume;
  desktop: boolean;
  previewShown: boolean;
  onTogglePreview: () => void;
  onRetrySave: () => void;
  onChangeTemplate: () => void;
  onFullPreview: () => void;
  onSearch: () => void;
  onShortcuts: () => void;
  onHistory: () => void;
  onExport: () => void;
}) {
  const t = useTranslations('editor');
  const theme = useTranslations('theme');
  const exportText = useTranslations('export');
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const { undo, redo } = useEditor.getState();
  const toggleAssistant = useAssistant((s) => s.toggle);
  const assistantOpen = useAssistant((s) => s.open);
  const currentTheme = useTheme();
  const locale = useLocale();
  const switchLocale = useSwitchLocale();
  const router = useRouter();
  const downloadBackup = useDownloadBackup();

  const duplicate = async () => {
    onRetrySave();
    // Copy what is on screen, which may be newer than what is stored.
    const current = useEditor.getState().resume!;
    const copy = await saveCopy(current, t('copyName', { title: current.title })).catch(() => null);
    if (!copy) return toast.error(t('duplicateFailed'));
    router.push(`/builder/${copy.id}`);
  };

  const menu: MenuItem[] = [
    { label: t('search.open'), icon: <Search />, onSelect: onSearch },
    ...(desktop
      ? []
      : [
          { label: t('changeTemplate'), icon: <LayoutTemplate />, onSelect: onChangeTemplate },
          { label: t('previewAction'), icon: <Eye />, onSelect: onFullPreview },
        ]),
    { label: t('duplicate'), icon: <Copy />, onSelect: () => void duplicate(), separated: true },
    { label: t('history'), icon: <History />, onSelect: onHistory },
    {
      label: t('backup'),
      icon: <FileDown />,
      onSelect: () => void downloadBackup(`${safeFileName(resume.title)}.json`, [resume]),
    },
    ...routing.locales.map((code, index) => ({
      label: LOCALE_NAMES[code],
      icon: <Languages />,
      checked: code === locale,
      separated: index === 0,
      onSelect: () => switchLocale(code),
    })),
    ...(['light', 'dark', 'system'] as const).map((value, index) => ({
      label: theme(value),
      icon: value === 'light' ? <Sun /> : value === 'dark' ? <Moon /> : <Monitor />,
      checked: value === currentTheme,
      separated: index === 0,
      onSelect: () => setTheme(value),
    })),
    ...(desktop
      ? [
          {
            label: t('shortcuts.title'),
            icon: <Keyboard />,
            separated: true,
            shortcut: '?',
            onSelect: onShortcuts,
          },
        ]
      : []),
  ];

  return (
    <header className="border-border bg-surface flex h-13 shrink-0 items-center gap-1 border-b px-2 sm:gap-2 sm:px-3">
      <h1 className="sr-only">{t('heading', { title: resume.title })}</h1>
      <Button asChild variant="ghost" size="icon-sm">
        <Link href="/resumes" aria-label={t('back')}>
          <ArrowLeft />
        </Link>
      </Button>
      <div data-resume-history className="flex min-w-0 flex-1 items-center gap-2">
        <input
          aria-label={t('titleLabel')}
          maxLength={120}
          value={resume.title}
          onChange={(e) => actions.rename(e.target.value)}
          className="hover:border-border focus:border-primary h-8 w-full max-w-64 min-w-0 truncate rounded-md border border-transparent bg-transparent px-2 text-sm font-semibold pointer-coarse:text-base"
        />
        <SaveIndicator onRetry={onRetrySave} />
      </div>
      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={!canUndo}
          aria-label={t('undo')}
          title={`${t('undo')} (Ctrl/⌘ Z)`}
          onClick={undo}
        >
          <Undo2 />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={!canRedo}
          aria-label={t('redo')}
          title={`${t('redo')} (Ctrl/⌘ Shift Z)`}
          onClick={redo}
        >
          <Redo2 />
        </Button>
        {desktop && (
          <>
            <span aria-hidden className="bg-border mx-1 h-5 w-px" />
            <Button
              variant="ghost"
              size="sm"
              className="max-xl:size-8 max-xl:px-0"
              aria-label={t('changeTemplate')}
              title={t('changeTemplate')}
              onClick={onChangeTemplate}
            >
              <LayoutTemplate />
              <span className="max-xl:sr-only">{t('templateShort')}</span>
            </Button>
          </>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="aria-expanded:bg-primary-soft aria-expanded:text-primary max-md:size-8 max-md:px-0"
          aria-expanded={assistantOpen}
          aria-label={t('assistant')}
          onClick={toggleAssistant}
        >
          <Sparkles />
          <span className="max-md:sr-only">{t('assistant')}</span>
        </Button>
        {desktop && (
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t('search.open')}
              title={`${t('search.open')} (Ctrl/⌘ K)`}
              onClick={onSearch}
            >
              <Search />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t(previewShown ? 'preview.hide' : 'preview.show')}
              title={t(previewShown ? 'preview.hide' : 'preview.show')}
              onClick={onTogglePreview}
            >
              {previewShown ? <PanelRightClose /> : <PanelRight />}
            </Button>
          </>
        )}
        <Menu
          trigger={
            <Button variant="ghost" size="icon-sm" aria-label={t('more')}>
              <MoreHorizontal />
            </Button>
          }
          items={menu}
        />
        <Button
          variant="primary"
          size="sm"
          className="ml-1 max-sm:size-8 max-sm:px-0"
          onClick={onExport}
        >
          <Download />
          <span className="max-sm:sr-only">{exportText('export')}</span>
        </Button>
      </div>
    </header>
  );
}
