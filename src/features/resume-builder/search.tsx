'use client';

import { CornerDownLeft, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { useId, useState, type ReactNode } from 'react';
import { ENTRY_TITLE_FIELDS, SECTION_FIELDS } from '@/constants/sections';
import { cn } from '@/lib/utils';
import { LIST_SECTIONS, type Resume } from '@/types/resume';
import { SectionIcon } from './section-meta';
import { useSectionTitle } from './use-section-title';

export type SearchCommand = { id: string; label: string; icon: ReactNode; run: () => void };

type Result = {
  id: string;
  title: string;
  detail: string;
  /** Text that can be matched but is not shown. */
  text: string;
  icon: ReactNode;
  run: () => void;
};

const LIMIT = 40;

/** Finds anything in the open resume, or an editor action, and goes there. */
export function EditorSearch({
  resume,
  open,
  onOpenChange,
  commands,
  onGo,
}: {
  resume: Resume;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commands: SearchCommand[];
  onGo: (section: string, target?: string) => void;
}) {
  const t = useTranslations('editor.search');
  const editor = useTranslations('editor');
  const fields = useTranslations('fields');
  const title = useSectionTitle(resume);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const listId = useId();

  const build = (): Result[] => {
    const icon = (key: string) => <SectionIcon section={key} />;
    const results: Result[] = [];
    const add = (
      section: string,
      id: string,
      name: string,
      detail: string,
      text: string,
      target?: string,
    ) =>
      results.push({
        id,
        title: name,
        detail,
        text,
        icon: icon(section),
        run: () => onGo(section, target),
      });

    add('personal', 'personal', editor('personal'), '', '');
    for (const [key, value] of Object.entries(resume.data.personal)) {
      if (typeof value !== 'string' || key === 'photo') continue;
      const label = fields(`personal.${key}`);
      add('personal', `personal.${key}`, label, editor('personal'), value, `personal.${key}`);
    }
    for (const { key } of resume.sections) add(key, key, title(key), '', '');
    for (const [key, value] of Object.entries(resume.data.summary)) {
      add(
        'summary',
        `summary.${key}`,
        fields(`summary.${key}`),
        title('summary'),
        value,
        `summary.${key}`,
      );
    }
    for (const section of LIST_SECTIONS) {
      const [field] = ENTRY_TITLE_FIELDS[section];
      for (const entry of resume.data[section] as unknown as Record<string, unknown>[]) {
        const text = SECTION_FIELDS[section].map((f) => String(entry[f.name] ?? '')).join(' ');
        add(
          section,
          String(entry.id),
          String(entry[field] || title(section)),
          title(section),
          text,
          String(entry.id),
        );
      }
    }
    for (const custom of resume.data.custom) {
      const key = `custom:${custom.id}`;
      for (const item of custom.items) {
        add(
          key,
          item.id,
          item.title || title(key),
          title(key),
          `${item.subtitle} ${item.description}`,
          item.id,
        );
      }
    }
    return results;
  };

  let matches: Result[] = [];
  if (open) {
    const needle = query.trim().toLocaleLowerCase();
    const actions: Result[] = commands.map((c) => ({
      id: c.id,
      title: c.label,
      detail: t('action'),
      text: '',
      icon: c.icon,
      run: c.run,
    }));
    matches = needle
      ? [...build(), ...actions].filter((r) =>
          `${r.title} ${r.detail} ${r.text}`.toLocaleLowerCase().includes(needle),
        )
      : [...actions, ...build().filter((r) => !r.detail)];
    matches = matches.slice(0, LIMIT);
  }
  const active = Math.min(index, matches.length - 1);

  const change = (next: boolean) => {
    setQuery('');
    setIndex(0);
    onOpenChange(next);
  };
  const choose = (result: Result | undefined) => {
    if (!result) return;
    change(false);
    result.run();
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={change}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          // The target takes focus after the jump, not the button that opened this.
          onCloseAutoFocus={(e) => e.preventDefault()}
          className="bg-surface shadow-overlay fixed top-[12dvh] left-1/2 z-50 flex max-h-[70dvh] w-[calc(100vw-1.5rem)] max-w-lg -translate-x-1/2 flex-col overflow-hidden rounded-xl"
        >
          <DialogPrimitive.Title className="sr-only">{t('open')}</DialogPrimitive.Title>
          <div className="border-border flex items-center gap-2.5 border-b px-4">
            <Search aria-hidden className="text-muted-foreground size-4" />
            <input
              role="combobox"
              aria-expanded
              aria-controls={listId}
              aria-activedescendant={matches[active] ? `${listId}-${active}` : undefined}
              aria-label={t('open')}
              placeholder={t('placeholder')}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIndex(0);
              }}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return;
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                  e.preventDefault();
                  const step = e.key === 'ArrowDown' ? 1 : -1;
                  const next = (active + step + matches.length) % Math.max(1, matches.length);
                  setIndex(next);
                  document
                    .getElementById(`${listId}-${next}`)
                    ?.scrollIntoView({ block: 'nearest' });
                }
                if (e.key === 'Enter') {
                  e.preventDefault();
                  choose(matches[active]);
                }
              }}
              className="h-12 min-w-0 flex-1 bg-transparent text-[15px] outline-none"
            />
          </div>
          <ul
            id={listId}
            role="listbox"
            aria-label={t('results')}
            className="overflow-y-auto p-1.5"
          >
            {matches.map((result, i) => (
              <li
                key={result.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onPointerMove={() => setIndex(i)}
                onClick={() => choose(result)}
                className={cn(
                  '[&_svg]:text-muted-foreground flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 text-sm [&_svg]:size-4 [&_svg]:shrink-0',
                  i === active && 'bg-muted',
                )}
              >
                {result.icon}
                <span className="min-w-0 flex-1 truncate">{result.title}</span>
                {result.detail && (
                  <span className="text-muted-foreground shrink-0 text-xs">{result.detail}</span>
                )}
                {i === active && <CornerDownLeft aria-hidden />}
              </li>
            ))}
          </ul>
          {matches.length === 0 && (
            <p role="status" className="text-muted-foreground px-4 py-6 text-center text-sm">
              {t('none')}
            </p>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
