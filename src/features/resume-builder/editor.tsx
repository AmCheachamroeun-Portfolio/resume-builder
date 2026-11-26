'use client';

import { Eye, ListTree, Palette, PanelLeftClose, PanelLeftOpen, PenLine } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/field';
import { useAssistant } from '@/features/ai-assistant/store';
import { DesignPanel } from '@/features/customization/design-panel';
import { TemplatePicker } from '@/features/customization/template-picker';
import { usePdfExport } from '@/features/pdf-export/export-button';
import { useMediaQuery } from '@/hooks/use-media-query';
import { Link } from '@/i18n/navigation';
import { getResume } from '@/lib/storage/db';
import { startAutosave } from '@/stores/autosave';
import { useEditor } from '@/stores/editor-store';
import type { Resume } from '@/types/resume';
import { SectionEditor } from './forms/section-editor';
import { FullPreview, PreviewPane } from './preview-pane';
import { SectionNav } from './section-nav';
import { Toolbar } from './toolbar';
import { useSectionTitle } from './use-section-title';

// The assistant is only downloaded when someone opens it.
const AssistantDrawer = dynamic(
  () => import('@/features/ai-assistant/drawer').then((m) => m.AssistantDrawer),
  { ssr: false },
);

const PANEL = { min: 320, max: 720, initial: 440, key: 'resumecraft:panel-width' };
type Tab = 'sections' | 'edit' | 'design' | 'preview';

function readWidth() {
  try {
    const stored = Number(localStorage.getItem(PANEL.key));
    return stored >= PANEL.min && stored <= PANEL.max ? stored : PANEL.initial;
  } catch {
    return PANEL.initial;
  }
}

function Workspace({ resume, retrySave }: { resume: Resume; retrySave: () => void }) {
  const t = useTranslations('editor');
  const title = useSectionTitle(resume);
  const desktop = useMediaQuery('(min-width: 1024px)');
  const [selected, setSelected] = useState('personal');
  const [tab, setTab] = useState<Tab>('edit');
  const [navOpen, setNavOpen] = useState(true);
  const [width, setWidth] = useState(readWidth);
  const [picking, setPicking] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const pdf = usePdfExport();
  const assistantOpen = useAssistant((s) => s.open);
  const dragStart = useRef<{ x: number; width: number } | null>(null);

  const resize = (next: number) => {
    const clamped = Math.min(PANEL.max, Math.max(PANEL.min, next));
    setWidth(clamped);
    try {
      localStorage.setItem(PANEL.key, String(clamped));
    } catch {
      /* width just will not persist */
    }
  };
  const select = (key: string) => {
    setSelected(key);
    setTab(key === 'design' ? 'design' : 'edit');
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      const key = event.key.toLowerCase();
      if (key === 'z' || key === 'y') {
        event.preventDefault();
        const { undo, redo } = useEditor.getState();
        if (key === 'y' || event.shiftKey) redo();
        else undo();
      } else if (key === 's') {
        event.preventDefault();
        retrySave();
      } else if (key === 'p') {
        event.preventDefault();
        const current = useEditor.getState().resume;
        if (current) pdf.request(current);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const editor =
    selected === 'design' ? (
      <DesignPanel resume={resume} />
    ) : (
      <SectionEditor resume={resume} selected={selected} onSelect={select} />
    );
  const preview = (
    <PreviewPane
      resume={resume}
      onChangeTemplate={() => setPicking(true)}
      onFullScreen={() => setFullScreen(true)}
    />
  );
  const order = ['personal', ...resume.sections.map((s) => s.key)];
  const position = order.indexOf(selected);

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <h1 className="sr-only">{t('heading', { title: resume.title })}</h1>
      <Toolbar
        resume={resume}
        onRetrySave={retrySave}
        onChangeTemplate={() => setPicking(true)}
        onPreview={() => setFullScreen(true)}
        onDownload={() => pdf.request(resume)}
        downloading={pdf.busy}
      />

      {desktop ? (
        <div className="flex min-h-0 flex-1">
          <aside className="border-border bg-surface flex shrink-0 flex-col border-r">
            <div className="flex justify-end p-1">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-expanded={navOpen}
                aria-label={t(navOpen ? 'collapseSections' : 'expandSections')}
                onClick={() => setNavOpen(!navOpen)}
              >
                {navOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
              </Button>
            </div>
            {navOpen && (
              <div className="w-64 flex-1 overflow-y-auto">
                <SectionNav resume={resume} selected={selected} onSelect={select} />
              </div>
            )}
          </aside>
          <main
            className="bg-background shrink-0 overflow-y-auto"
            style={{ width: `min(${width}px, 52vw)` }}
          >
            {editor}
          </main>
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label={t('resize')}
            aria-valuemin={PANEL.min}
            aria-valuemax={PANEL.max}
            aria-valuenow={width}
            tabIndex={0}
            className="bg-border hover:bg-primary focus-visible:bg-primary w-1 shrink-0 cursor-col-resize touch-none"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              dragStart.current = { x: e.clientX, width };
            }}
            onPointerMove={(e) => {
              const start = dragStart.current;
              if (start) resize(start.width + e.clientX - start.x);
            }}
            onPointerUp={() => (dragStart.current = null)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') resize(width - 24);
              if (e.key === 'ArrowRight') resize(width + 24);
            }}
          />
          <div className="min-w-0 flex-1">{preview}</div>
        </div>
      ) : (
        <>
          {tab === 'edit' && (
            <div className="border-border bg-surface border-b px-3 py-2">
              <Select
                aria-label={t('sectionsLabel')}
                value={selected === 'design' ? 'personal' : selected}
                onChange={(e) => select(e.target.value)}
              >
                {order.map((key) => (
                  <option key={key} value={key}>
                    {key === 'personal' ? t('personal') : title(key)}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <main className="min-h-0 flex-1 overflow-y-auto">
            {tab === 'sections' && (
              <SectionNav resume={resume} selected={selected} onSelect={select} />
            )}
            {tab === 'edit' && (
              <>
                <SectionEditor
                  resume={resume}
                  selected={selected === 'design' ? 'personal' : selected}
                  onSelect={select}
                />
                <div className="flex justify-between gap-2 px-4 pb-6">
                  <Button disabled={position <= 0} onClick={() => select(order[position - 1]!)}>
                    {t('previousStep')}
                  </Button>
                  {position < order.length - 1 ? (
                    <Button variant="primary" onClick={() => select(order[position + 1]!)}>
                      {t('nextStep')}
                    </Button>
                  ) : (
                    <Button variant="primary" onClick={() => setTab('preview')}>
                      {t('review')}
                    </Button>
                  )}
                </div>
              </>
            )}
            {tab === 'design' && <DesignPanel resume={resume} />}
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
                className="text-muted-foreground aria-[current=page]:text-primary aria-[current=page]:border-primary flex flex-col items-center gap-0.5 border-t-2 border-transparent py-2 text-xs font-medium"
              >
                <Icon aria-hidden className="size-5" />
                {t(`tabs.${id}`)}
              </button>
            ))}
          </nav>
        </>
      )}

      {assistantOpen && <AssistantDrawer resume={resume} />}
      <TemplatePicker resume={resume} open={picking} onOpenChange={setPicking} />
      <FullPreview resume={resume} open={fullScreen} onOpenChange={setFullScreen} />
      {pdf.dialog}
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
  const resume = useEditor((s) => s.resume);
  const [problem, setProblem] = useState<{ id: string; kind: 'missing' | 'storage' } | null>(null);
  const autosave = useRef<ReturnType<typeof startAutosave> | null>(null);

  useEffect(() => {
    let cancelled = false;
    getResume(id).then(
      (found) => {
        if (cancelled) return;
        if (!found) return setProblem({ id, kind: 'missing' });
        useEditor.getState().load(found);
        autosave.current = startAutosave();
      },
      () => !cancelled && setProblem({ id, kind: 'storage' }),
    );

    // Flush as the page is hidden, so closing a tab does not lose the last keystrokes.
    const flush = () => void autosave.current?.flush();
    const onVisibility = () => document.visibilityState === 'hidden' && flush();
    const onLeave = (event: BeforeUnloadEvent) => {
      if (!autosave.current?.hasPending()) return;
      flush();
      event.preventDefault();
    };
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', onLeave);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      void autosave.current?.stop();
      autosave.current = null;
      useEditor.getState().close();
      useAssistant.getState().reset();
    };
  }, [id]);

  const retrySave = useCallback(() => void autosave.current?.flush(), []);

  if (problem?.id === id) {
    return (
      <div className="container-page py-24 text-center">
        <h1 className="display text-2xl">{t(`${problem.kind}.title`)}</h1>
        <p className="text-muted-foreground mx-auto mt-2 max-w-md">{t(`${problem.kind}.body`)}</p>
        <Button asChild variant="primary" className="mt-6">
          <Link href="/resumes">{t('back')}</Link>
        </Button>
      </div>
    );
  }
  if (resume?.id !== id) return <Skeleton label={t('loading')} />;
  return <Workspace resume={resume} retrySave={retrySave} />;
}
