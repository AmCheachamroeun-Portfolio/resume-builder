'use client';

import {
  Download,
  Eye,
  History,
  Keyboard,
  LayoutTemplate,
  ListTree,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  PenLine,
  Plus,
  Sparkles,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Segmented, Select } from '@/components/ui/field';
import { useAssistant } from '@/features/ai-assistant/store';
import { DesignPanel } from '@/features/customization/design-panel';
import { TemplatePicker } from '@/features/customization/template-picker';
import { useExport } from '@/features/pdf-export/use-export';
import { useMediaQuery } from '@/hooks/use-media-query';
import { Link, useRouter } from '@/i18n/navigation';
import { getResume, resumeWriter, saveCopy } from '@/lib/storage/db';
import { recordVersion, snapshotIfDue } from '@/lib/storage/versions';
import { cn } from '@/lib/utils';
import { startAutosave, useSaveStatus } from '@/stores/autosave';
import { actions, useEditor } from '@/stores/editor-store';
import { useEditorUi } from '@/stores/editor-ui';
import type { Resume } from '@/types/resume';
import { SaveBanner, type SaveActions } from './save-banner';
import { SectionEditor } from './forms/section-editor';
import { FullPreview, PreviewPane } from './preview-pane';
import { EditorSearch } from './search';
import { SectionNav, SectionRail } from './section-nav';
import { ShortcutsDialog } from './shortcuts';
import { Toolbar } from './toolbar';
import { useSectionTitle } from './use-section-title';

const VersionDialog = dynamic(() => import('./version-dialog').then((m) => m.VersionDialog), {
  ssr: false,
});

// The assistant is only downloaded when someone opens it.
const AssistantPanel = dynamic(
  () => import('@/features/ai-assistant/drawer').then((m) => m.AssistantPanel),
  { ssr: false },
);

const PANEL = { min: 320, max: 640, initial: 420, key: 'resumecraft:panel-width' };
const RAIL_KEY = 'resumecraft:section-list';
/** The narrowest the preview may become while the editing panel is resized. */
const PREVIEW_MIN = 380;
type Tab = 'sections' | 'edit' | 'design' | 'preview';
type Panel = 'content' | 'design';

function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* the preference just will not persist */
  }
}
function readWidth() {
  const stored = Number(read(PANEL.key));
  return stored >= PANEL.min && stored <= PANEL.max ? stored : PANEL.initial;
}

/** Fields that have their own undo, which the editor must leave alone. */
function keepsNativeUndo(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const textual =
    target instanceof HTMLTextAreaElement ||
    target.isContentEditable ||
    (target instanceof HTMLInputElement &&
      !['checkbox', 'radio', 'range', 'color', 'button', 'file'].includes(target.type));
  if (!textual) return false;
  return Boolean(target.closest('[data-native-undo]')) || !target.closest('[data-resume-history]');
}

function Workspace({ resume, save }: { resume: Resume; save: SaveActions }) {
  const t = useTranslations('editor');
  const title = useSectionTitle(resume);
  const desktop = useMediaQuery('(min-width: 1024px)');
  const roomyRail = useMediaQuery('(min-width: 1280px)');
  const roomyAssistant = useMediaQuery('(min-width: 1600px)');
  const [selected, setSelected] = useState('personal');
  const [panel, setPanel] = useState<Panel>('content');
  const [tab, setTab] = useState<Tab>('edit');
  const [railChoice, setRailChoice] = useState(() => read(RAIL_KEY));
  const [width, setWidth] = useState(readWidth);
  const [previewShown, setPreviewShown] = useState(true);
  const [picking, setPicking] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [help, setHelp] = useState(false);
  const [history, setHistory] = useState(false);
  const exporter = useExport();
  const assistantOpen = useAssistant((s) => s.open);
  const toggleAssistant = useAssistant((s) => s.toggle);
  const focus = useEditorUi((s) => s.focus);
  const dragStart = useRef<{ x: number; width: number } | null>(null);

  const listOpen = railChoice ? railChoice === 'open' : roomyRail;
  const setListOpen = (open: boolean) => {
    const value = open ? 'open' : 'closed';
    setRailChoice(value);
    write(RAIL_KEY, value);
  };
  // Narrower screens swap the editing panel for the assistant instead of covering the page.
  const assistantReplaces = assistantOpen && !roomyAssistant;

  const resize = (next: number) => {
    const clamped = Math.min(PANEL.max, Math.max(PANEL.min, next));
    setWidth(clamped);
    write(PANEL.key, String(clamped));
  };
  const select = (key: string) => {
    setSelected(key);
    setPanel('content');
    setTab('edit');
    if (assistantReplaces) useAssistant.getState().close();
  };
  const showDesign = () => {
    setPanel('design');
    setTab('design');
    if (assistantReplaces) useAssistant.getState().close();
  };
  const exportPdf = () => {
    const current = useEditor.getState().resume;
    if (current) exporter.request(current);
  };

  // After a jump from search, bring the target into view once it has rendered.
  useEffect(() => {
    if (!focus) return;
    const timer = setTimeout(() => {
      const element = document.querySelector<HTMLElement>(
        `[data-entry="${CSS.escape(focus.target)}"]`,
      );
      element?.scrollIntoView({ block: 'center' });
      const field = element?.matches('input')
        ? element
        : element?.querySelector<HTMLElement>('input, textarea, button');
      field?.focus({ preventScroll: true });
    }, 80);
    return () => clearTimeout(timer);
  }, [focus]);
  useEffect(() => () => useEditorUi.getState().clearFocus(), []);
  const goTo = (section: string, target?: string) => {
    select(section);
    useEditorUi.getState().focusOn(target ?? `section:${section}`);
  };
  useEffect(() =>
    useEditorUi.subscribe((state, previous) => {
      if (!state.jump || state.jump === previous.jump) return;
      const { to } = state.jump;
      if (to === 'design') showDesign();
      else if (to === 'template') setPicking(true);
      else goTo(to.section, to.focus);
    }),
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey) return;
      if (!(event.metaKey || event.ctrlKey)) {
        const typing = (event.target as HTMLElement).closest?.('input, textarea, select');
        if (event.key === '?' && !typing) setHelp(true);
        return;
      }
      const key = event.key.toLowerCase();
      if (key === 'z' || key === 'y') {
        if (keepsNativeUndo(event.target)) return;
        event.preventDefault();
        const { undo, redo } = useEditor.getState();
        if (key === 'y' || event.shiftKey) redo();
        else undo();
      } else if (key === 's' && !event.shiftKey) {
        event.preventDefault();
        void Promise.resolve(save.retry()).then(() => {
          // The banner already explains a failure; only confirm a real save.
          if (useSaveStatus.getState().status === 'saved') {
            toast.success(t('save.saved'), { id: 'saved' });
          }
        });
      } else if (key === 'p' && !event.shiftKey) {
        event.preventDefault();
        exportPdf();
      } else if (key === 'k' && !event.shiftKey) {
        event.preventDefault();
        setSearching(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const order = ['personal', ...resume.sections.map((s) => s.key)];
  const position = order.indexOf(selected);
  const content = <SectionEditor resume={resume} selected={selected} onSelect={select} />;
  const design = <DesignPanel resume={resume} onChangeTemplate={() => setPicking(true)} />;
  const preview = <PreviewPane resume={resume} onFullScreen={() => setFullScreen(true)} />;
  const stepper = (
    <div className="mx-auto flex w-full max-w-2xl justify-between gap-2 px-4 pb-8 sm:px-5">
      <Button disabled={position <= 0} onClick={() => select(order[position - 1]!)}>
        {t('previousStep')}
      </Button>
      {position < order.length - 1 ? (
        <Button onClick={() => select(order[position + 1]!)}>{t('nextStep')}</Button>
      ) : (
        <Button
          variant="primary"
          onClick={() => (desktop ? setFullScreen(true) : setTab('preview'))}
        >
          {t('review')}
        </Button>
      )}
    </div>
  );

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Toolbar
        resume={resume}
        desktop={desktop}
        previewShown={previewShown}
        onTogglePreview={() => setPreviewShown(!previewShown)}
        onRetrySave={save.retry}
        onChangeTemplate={() => setPicking(true)}
        onFullPreview={() => setFullScreen(true)}
        onSearch={() => setSearching(true)}
        onShortcuts={() => setHelp(true)}
        onHistory={() => setHistory(true)}
        onExport={exportPdf}
      />
      <SaveBanner actions={save} />

      {desktop ? (
        <main className="flex min-h-0 flex-1">
          <aside
            aria-label={t('sectionsLabel')}
            className={cn(
              'border-border bg-panel flex shrink-0 flex-col border-r',
              listOpen ? 'w-60' : 'w-13',
            )}
          >
            <div className="min-h-0 flex-1 overflow-y-auto">
              {listOpen ? (
                <SectionNav resume={resume} selected={selected} onSelect={select} />
              ) : (
                <SectionRail resume={resume} selected={selected} onSelect={select} />
              )}
            </div>
            <div className={cn('border-border flex border-t p-1.5', !listOpen && 'justify-center')}>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-expanded={listOpen}
                aria-label={t(listOpen ? 'collapseSections' : 'expandSections')}
                title={t(listOpen ? 'collapseSections' : 'expandSections')}
                onClick={() => setListOpen(!listOpen)}
              >
                {listOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
              </Button>
            </div>
          </aside>

          <div
            className={cn('bg-surface flex min-h-0 flex-col', previewShown ? 'shrink-0' : 'flex-1')}
            style={
              previewShown
                ? {
                    width: `clamp(${PANEL.min}px, ${width}px, calc(100vw - ${
                      (listOpen ? 240 : 52) +
                      PREVIEW_MIN +
                      (assistantOpen && roomyAssistant ? 384 : 0)
                    }px))`,
                  }
                : undefined
            }
          >
            {assistantReplaces ? (
              <AssistantPanel resume={resume} />
            ) : (
              <>
                <div className="border-border shrink-0 border-b px-3 py-2">
                  <Segmented
                    stretch
                    label={t('panelLabel')}
                    value={panel}
                    onChange={setPanel}
                    options={[
                      {
                        value: 'content',
                        label: (
                          <>
                            <PenLine aria-hidden />
                            {t('content')}
                          </>
                        ),
                      },
                      {
                        value: 'design',
                        label: (
                          <>
                            <Palette aria-hidden />
                            {t('design')}
                          </>
                        ),
                      },
                    ]}
                  />
                </div>
                <div key={`${panel}:${selected}`} className="min-h-0 flex-1 overflow-y-auto">
                  {panel === 'design' ? (
                    design
                  ) : (
                    <>
                      {content}
                      {stepper}
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {previewShown && (
            <>
              <div
                role="separator"
                aria-orientation="vertical"
                aria-label={t('resize')}
                aria-valuemin={PANEL.min}
                aria-valuemax={PANEL.max}
                aria-valuenow={width}
                tabIndex={0}
                className="bg-border hover:bg-primary focus-visible:bg-primary relative z-10 w-px shrink-0 cursor-col-resize touch-none after:absolute after:inset-y-0 after:-left-1.5 after:w-3"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  dragStart.current = { x: e.clientX, width };
                }}
                onPointerMove={(e) => {
                  const start = dragStart.current;
                  if (start) resize(start.width + e.clientX - start.x);
                }}
                onPointerUp={() => (dragStart.current = null)}
                onDoubleClick={() => resize(PANEL.initial)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowLeft') resize(width - 24);
                  if (e.key === 'ArrowRight') resize(width + 24);
                }}
              />
              <div className="min-w-0 flex-1">{preview}</div>
            </>
          )}

          {assistantOpen && roomyAssistant && (
            <div className="border-border bg-surface flex w-96 shrink-0 flex-col border-l">
              <AssistantPanel resume={resume} />
            </div>
          )}
        </main>
      ) : (
        <>
          {tab === 'edit' && (
            <nav
              aria-label={t('sectionsLabel')}
              className="border-border bg-surface border-b px-3 py-2"
            >
              <Select
                aria-label={t('sectionsLabel')}
                value={selected}
                onChange={(e) => select(e.target.value)}
              >
                {order.map((key) => (
                  <option key={key} value={key}>
                    {key === 'personal' ? t('personal') : title(key)}
                  </option>
                ))}
              </Select>
            </nav>
          )}
          <main
            key={`${tab}:${tab === 'edit' ? selected : ''}`}
            className="bg-surface min-h-0 flex-1 overflow-y-auto"
          >
            {tab === 'sections' && (
              <SectionNav resume={resume} selected={selected} onSelect={select} />
            )}
            {tab === 'edit' && (
              <>
                {content}
                {stepper}
              </>
            )}
            {tab === 'design' && design}
            {tab === 'preview' && preview}
          </main>
          <nav
            aria-label={t('modes')}
            className="border-border bg-surface grid grid-cols-4 border-t pb-[env(safe-area-inset-bottom)]"
          >
            {(
              [
                ['sections', ListTree],
                ['edit', PenLine],
                ['design', Palette],
                ['preview', Eye],
              ] as const
            ).map(([id, Icon]) => (
              <button
                key={id}
                type="button"
                aria-current={tab === id ? 'page' : undefined}
                onClick={() => setTab(id)}
                className="text-muted-foreground aria-[current=page]:text-primary flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium"
              >
                <Icon aria-hidden className="size-5" />
                {t(`tabs.${id}`)}
              </button>
            ))}
          </nav>
          {assistantOpen && (
            <div className="bg-surface fixed inset-0 z-40 flex flex-col">
              <AssistantPanel resume={resume} />
            </div>
          )}
        </>
      )}

      <TemplatePicker resume={resume} open={picking} onOpenChange={setPicking} />
      <FullPreview resume={resume} open={fullScreen} onOpenChange={setFullScreen} />
      <EditorSearch
        resume={resume}
        open={searching}
        onOpenChange={setSearching}
        onGo={goTo}
        commands={[
          {
            id: 'export',
            label: t('search.export'),
            icon: <Download aria-hidden />,
            run: exportPdf,
          },
          {
            id: 'template',
            label: t('changeTemplate'),
            icon: <LayoutTemplate aria-hidden />,
            run: () => setPicking(true),
          },
          {
            id: 'design',
            label: t('search.design'),
            icon: <Palette aria-hidden />,
            run: showDesign,
          },
          {
            id: 'assistant',
            label: t('search.assistant'),
            icon: <Sparkles aria-hidden />,
            run: toggleAssistant,
          },
          {
            id: 'add-section',
            label: t('addSection'),
            icon: <Plus aria-hidden />,
            run: () => select(actions.addCustomSection(t('newSection'))),
          },
          {
            id: 'history',
            label: t('search.history'),
            icon: <History aria-hidden />,
            run: () => setHistory(true),
          },
          {
            id: 'shortcuts',
            label: t('shortcuts.title'),
            icon: <Keyboard aria-hidden />,
            run: () => setHelp(true),
          },
        ]}
      />
      <ShortcutsDialog open={help} onOpenChange={setHelp} />
      {history && <VersionDialog resume={resume} open onOpenChange={setHistory} />}
      {exporter.dialog}
    </div>
  );
}

function Skeleton({ label }: { label: string }) {
  return (
    <div className="flex h-dvh flex-col" aria-busy role="status" aria-label={label}>
      <div className="border-border bg-surface h-12 border-b" />
      <div className="flex flex-1 gap-4 p-4">
        <div className="bg-muted hidden w-60 rounded-md lg:block" />
        <div className="bg-muted flex-1 rounded-md" />
        <div className="bg-desk hidden flex-1 rounded-md lg:block" />
      </div>
    </div>
  );
}

export function Editor({ id }: { id: string }) {
  const t = useTranslations('editor');
  const router = useRouter();
  const resume = useEditor((s) => s.resume);
  const [problem, setProblem] = useState<{ id: string; kind: 'missing' | 'storage' } | null>(null);
  const autosave = useRef<ReturnType<typeof startAutosave> | null>(null);

  /** Shows a stored version and starts saving on top of it. */
  const open = useCallback((stored: Resume) => {
    autosave.current?.discard();
    useEditor.getState().load(stored);
    const write = resumeWriter(stored);
    autosave.current = startAutosave(async (resume, options) => {
      await write(resume, options);
      // History is a convenience: failing to keep it must not fail the save.
      void snapshotIfDue(resume).catch(() => undefined);
    });
    void recordVersion(stored, 'auto').catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getResume(id).then(
      (found) => {
        if (cancelled) return;
        if (!found) return setProblem({ id, kind: 'missing' });
        open(found);
      },
      () => !cancelled && setProblem({ id, kind: 'storage' }),
    );

    // Flush as the page is hidden, so closing a tab does not lose the last keystrokes.
    const flush = () => void autosave.current?.flush();
    // Coming back to an idle tab: show what another tab saved in the meantime.
    const refresh = async () => {
      const shown = useEditor.getState().resume;
      if (!shown || useSaveStatus.getState().status !== 'saved') return;
      const stored = await getResume(id).catch(() => null);
      const unchanged = useEditor.getState().resume === shown && !autosave.current?.hasPending();
      if (cancelled || !stored || !unchanged || stored.updatedAt === shown.updatedAt) return;
      open(stored);
      toast.info(t('saveProblem.refreshed'), { id: 'refreshed' });
    };
    const onVisibility = () => (document.visibilityState === 'hidden' ? flush() : void refresh());
    const onLeave = (event: BeforeUnloadEvent) => {
      if (!autosave.current?.hasPending()) return;
      flush();
      event.preventDefault();
    };
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', onLeave);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', onLeave);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisibility);
      void autosave.current?.stop();
      autosave.current = null;
      useEditor.getState().close();
      useAssistant.getState().reset();
    };
  }, [id, open, t]);

  const save = useMemo<SaveActions>(
    () => ({
      retry: () => autosave.current?.flush(),
      restore: () => void autosave.current?.overwrite(),
      loadStored: () => {
        void getResume(id).then(
          (stored) => (stored ? open(stored) : void autosave.current?.overwrite()),
          () => toast.error(t('storage.title')),
        );
      },
      keepCopy: () => {
        const current = useEditor.getState().resume;
        if (!current) return;
        saveCopy(current, t('copyName', { title: current.title })).then(
          (copy) => {
            // The other version stays exactly as it is.
            autosave.current?.discard();
            router.push(`/builder/${copy.id}`);
          },
          () => toast.error(t('duplicateFailed')),
        );
      },
    }),
    [id, open, router, t],
  );

  if (problem?.id === id) {
    return (
      <div className="container-page py-24 text-center">
        <h1 className="title-section">{t(`${problem.kind}.title`)}</h1>
        <p className="text-muted-foreground mx-auto mt-2 max-w-md">{t(`${problem.kind}.body`)}</p>
        <Button asChild variant="primary" className="mt-6">
          <Link href="/resumes">{t('back')}</Link>
        </Button>
      </div>
    );
  }
  if (resume?.id !== id) return <Skeleton label={t('loading')} />;
  return <Workspace resume={resume} save={save} />;
}
