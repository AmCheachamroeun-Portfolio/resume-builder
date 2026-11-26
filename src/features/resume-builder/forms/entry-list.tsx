'use client';

import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronsDownUp,
  ChevronsUpDown,
  Copy,
  MoreHorizontal,
  Plus,
  Trash2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Collapsible } from 'radix-ui';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { SortableItem, SortableList } from '@/components/shared/sortable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { Menu } from '@/components/ui/overlays';
import { ENTRY_TITLE_FIELDS } from '@/constants/sections';
import { useAssistant } from '@/features/ai-assistant/store';
import { cn } from '@/lib/utils';
import { actions, useEditor } from '@/stores/editor-store';
import { useEditorUi } from '@/stores/editor-ui';
import type { ListSectionKey, Resume } from '@/types/resume';
import { EntryForm } from './entry-form';

/** Collapsible, sortable cards. Shared by list sections and custom sections. */
export function CollapsibleEntries<T extends { id: string }>({
  items,
  describe,
  onMove,
  onRemove,
  onDuplicate,
  openIds,
  setOpen,
  setAll,
  renderBody,
}: {
  items: T[];
  describe: (item: T) => { title: string; subtitle?: string };
  onMove: (from: number, to: number) => void;
  onRemove: (item: T) => void;
  onDuplicate?: (item: T) => void;
  openIds: Set<string>;
  setOpen: (id: string, open: boolean) => void;
  setAll: (ids: string[]) => void;
  renderBody: (item: T) => ReactNode;
}) {
  const t = useTranslations('form');
  const dnd = useTranslations('dnd');
  const focus = useEditorUi((s) => s.focus);
  // Search results open the entry they point at.
  const [seen, setSeen] = useState(0);
  if (focus && focus.at !== seen && items.some((i) => i.id === focus.target)) {
    setSeen(focus.at);
    setOpen(focus.target, true);
  }
  const allOpen = items.every((item) => openIds.has(item.id));

  return (
    <>
      {items.length > 1 && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setAll(allOpen ? [] : items.map((i) => i.id))}
          >
            {allOpen ? <ChevronsDownUp /> : <ChevronsUpDown />}
            {t(allOpen ? 'collapseAll' : 'expandAll')}
          </Button>
        </div>
      )}
      <SortableList ids={items.map((i) => i.id)} onMove={onMove} className="space-y-2">
        {items.map((item, index) => {
          const { title, subtitle } = describe(item);
          const name = title || t('untitledEntry', { number: index + 1 });
          const open = openIds.has(item.id);
          return (
            <SortableItem
              key={item.id}
              id={item.id}
              label={name}
              className="border-border bg-surface rounded-lg border"
            >
              {(handle) => (
                <Collapsible.Root
                  data-entry={item.id}
                  open={open}
                  onOpenChange={(o) => setOpen(item.id, o)}
                >
                  <div className="flex items-center gap-1 py-1.5 pr-1.5 pl-1">
                    {handle}
                    <Collapsible.Trigger className="flex min-w-0 flex-1 items-center gap-2 py-1 text-left">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{name}</span>
                        {subtitle && (
                          <span className="text-muted-foreground block truncate text-xs">
                            {subtitle}
                          </span>
                        )}
                      </span>
                      <ChevronDown
                        aria-hidden
                        className={cn(
                          'text-muted-foreground size-4 shrink-0 transition-transform',
                          open && 'rotate-180',
                        )}
                      />
                    </Collapsible.Trigger>
                    <Menu
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t('entryActions', { name })}
                        >
                          <MoreHorizontal />
                        </Button>
                      }
                      items={[
                        {
                          label: dnd('up', { name }),
                          icon: <ArrowUp />,
                          disabled: index === 0,
                          onSelect: () => onMove(index, index - 1),
                        },
                        {
                          label: dnd('down', { name }),
                          icon: <ArrowDown />,
                          disabled: index === items.length - 1,
                          onSelect: () => onMove(index, index + 1),
                        },
                        ...(onDuplicate
                          ? [
                              {
                                label: t('duplicate'),
                                icon: <Copy />,
                                disabled: items.length >= 60,
                                onSelect: () => onDuplicate(item),
                              },
                            ]
                          : []),
                        {
                          label: t('remove', { name }),
                          icon: <Trash2 />,
                          danger: true,
                          separated: true,
                          onSelect: () => onRemove(item),
                        },
                      ]}
                    />
                  </div>
                  <Collapsible.Content className="border-border border-t p-4">
                    {renderBody(item)}
                  </Collapsible.Content>
                </Collapsible.Root>
              )}
            </SortableItem>
          );
        })}
      </SortableList>
    </>
  );
}

export function useOpenIds(initial?: string) {
  const [openIds, set] = useState<Set<string>>(() => new Set(initial ? [initial] : []));
  const setOpen = (id: string, open: boolean) =>
    set((current) => {
      const next = new Set(current);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
  const setAll = (ids: string[]) => set(new Set(ids));
  return { openIds, setOpen, setAll };
}

export function useRemovedToast() {
  const t = useTranslations('form');
  /** Call straight after removing. */
  return () => {
    const removed = useEditor.getState().resume;
    // The toast's Undo belongs to this removal only, so a later edit withdraws it.
    const stop = useEditor.subscribe((state) => {
      if (state.resume === removed) return;
      stop();
      toast.dismiss(id);
    });
    const id = toast(t('removed'), {
      onAutoClose: stop,
      onDismiss: stop,
      action: { label: t('undo'), onClick: () => useEditor.getState().undo() },
    });
  };
}

export function EntryList({ section, resume }: { section: ListSectionKey; resume: Resume }) {
  const t = useTranslations('form');
  const sections = useTranslations('sections');
  const openAssistant = useAssistant((s) => s.openFor);
  const items = resume.data[section] as Array<Record<string, unknown> & { id: string }>;
  const { openIds, setOpen, setAll } = useOpenIds(items.length === 1 ? items[0]!.id : undefined);
  const removed = useRemovedToast();
  const [quick, setQuick] = useState('');
  const [titleField, subtitleField] = ENTRY_TITLE_FIELDS[section];
  const quickAdd = section === 'skills' || section === 'interests';
  const full = items.length >= 60;

  return (
    <div className="space-y-3">
      {section === 'skills' && (
        <Button size="sm" onClick={() => openAssistant('skills')}>
          {t('suggestSkills')}
        </Button>
      )}
      {quickAdd && (
        <form
          data-native-undo
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            // Commas add several at once.
            for (const name of quick.split(/[,\n]/).map((s) => s.trim())) {
              if (name) actions.addEntry(section, { name: name.slice(0, 300) });
            }
            setQuick('');
          }}
        >
          <Input
            aria-label={t('quickAdd')}
            placeholder={t('quickAdd')}
            value={quick}
            onChange={(e) => setQuick(e.target.value)}
          />
          <Button type="submit" disabled={!quick.trim() || full}>
            <Plus />
            {t('add')}
          </Button>
        </form>
      )}
      {items.length === 0 && (
        <p className="border-border-strong/50 text-muted-foreground rounded-lg border border-dashed px-6 py-8 text-center text-sm">
          {t('empty', { section: sections(section) })}
        </p>
      )}
      <CollapsibleEntries
        items={items}
        describe={(item) => ({
          title: String(item[titleField] ?? ''),
          subtitle: subtitleField ? String(item[subtitleField] ?? '') : undefined,
        })}
        onMove={(from, to) => actions.moveEntry(section, from, to)}
        onRemove={(item) => {
          actions.removeEntry(section, item.id);
          removed();
        }}
        onDuplicate={(item) => setOpen(actions.duplicateEntry(section, item.id), true)}
        openIds={openIds}
        setOpen={setOpen}
        setAll={setAll}
        renderBody={(item) => <EntryForm section={section} entry={item as never} />}
      />
      {!quickAdd && (
        <Button
          className="w-full"
          disabled={full}
          onClick={() => setOpen(actions.addEntry(section), true)}
        >
          <Plus />
          {t('addEntry', { section: sections(section) })}
        </Button>
      )}
    </div>
  );
}
