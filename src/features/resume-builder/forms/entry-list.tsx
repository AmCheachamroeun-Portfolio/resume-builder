'use client';

import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Collapsible } from 'radix-ui';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { MoveButtons, SortableItem, SortableList } from '@/components/shared/sortable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { ENTRY_TITLE_FIELDS } from '@/constants/sections';
import { useAssistant } from '@/features/ai-assistant/store';
import { actions, useEditor } from '@/stores/editor-store';
import type { ListSectionKey, Resume } from '@/types/resume';
import { EntryForm } from './entry-form';

/** Collapsible, sortable cards. Shared by list sections and custom sections. */
export function CollapsibleEntries<T extends { id: string }>({
  items,
  describe,
  onMove,
  onRemove,
  openIds,
  setOpen,
  renderBody,
}: {
  items: T[];
  describe: (item: T) => { title: string; subtitle?: string };
  onMove: (from: number, to: number) => void;
  onRemove: (item: T) => void;
  openIds: Set<string>;
  setOpen: (id: string, open: boolean) => void;
  renderBody: (item: T) => ReactNode;
}) {
  const t = useTranslations('form');
  return (
    <SortableList ids={items.map((i) => i.id)} onMove={onMove} className="space-y-3">
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
              <Collapsible.Root open={open} onOpenChange={(o) => setOpen(item.id, o)}>
                <div className="flex items-center gap-1 py-1.5 pr-1.5 pl-1">
                  {handle}
                  <Collapsible.Trigger className="flex min-w-0 flex-1 items-center gap-2 py-1 text-left">
                    <ChevronDown
                      aria-hidden
                      className={`text-muted-foreground size-4 shrink-0 ${open ? '' : '-rotate-90'}`}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{name}</span>
                      {subtitle && (
                        <span className="text-muted-foreground block truncate text-xs">
                          {subtitle}
                        </span>
                      )}
                    </span>
                  </Collapsible.Trigger>
                  <MoveButtons index={index} count={items.length} name={name} onMove={onMove} />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t('remove', { name })}
                    onClick={() => onRemove(item)}
                  >
                    <Trash2 />
                  </Button>
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
  return { openIds, setOpen };
}

export function useRemovedToast() {
  const t = useTranslations('form');
  return () =>
    toast(t('removed'), {
      action: { label: t('undo'), onClick: () => useEditor.getState().undo() },
    });
}

export function EntryList({ section, resume }: { section: ListSectionKey; resume: Resume }) {
  const t = useTranslations('form');
  const sections = useTranslations('sections');
  const openAssistant = useAssistant((s) => s.openFor);
  const items = resume.data[section] as Array<Record<string, unknown> & { id: string }>;
  const { openIds, setOpen } = useOpenIds(items.length === 1 ? items[0]!.id : undefined);
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
        <p className="border-border-strong/50 text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
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
        openIds={openIds}
        setOpen={setOpen}
        renderBody={(item) => <EntryForm section={section} entry={item as never} />}
      />
      {!quickAdd && (
        <Button disabled={full} onClick={() => setOpen(actions.addEntry(section), true)}>
          <Plus />
          {t('addEntry', { section: sections(section) })}
        </Button>
      )}
    </div>
  );
}
