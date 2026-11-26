'use client';

import {
  Eye,
  EyeOff,
  MoreVertical,
  ArrowDown,
  ArrowUp,
  Palette,
  Plus,
  UserRound,
  RotateCcw,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { SortableItem, SortableList } from '@/components/shared/sortable';
import { Button } from '@/components/ui/button';
import { Menu } from '@/components/ui/overlays';
import { cn } from '@/lib/utils';
import { actions } from '@/stores/editor-store';
import type { Resume } from '@/types/resume';
import { sectionCount, useSectionTitle } from './use-section-title';

const row = 'flex items-center rounded-md hover:bg-muted';
const active = 'bg-primary-soft hover:bg-primary-soft font-semibold';

export function SectionNav({
  resume,
  selected,
  onSelect,
}: {
  resume: Resume;
  selected: string;
  onSelect: (key: string) => void;
}) {
  const t = useTranslations('editor');
  const title = useSectionTitle(resume);
  const keys = resume.sections.map((s) => s.key);

  const fixed = (key: string, label: string, Icon: typeof UserRound) => (
    <button
      type="button"
      aria-current={selected === key || undefined}
      onClick={() => onSelect(key)}
      className={cn(row, 'w-full gap-2 px-2 py-2 text-sm', selected === key && active)}
    >
      <span className="grid w-6 place-items-center">
        <Icon aria-hidden className="size-4" />
      </span>
      {label}
    </button>
  );

  return (
    <nav aria-label={t('sectionsLabel')} className="flex flex-col gap-1 p-2">
      {fixed('personal', t('personal'), UserRound)}
      <SortableList ids={keys} onMove={actions.moveSection} className="space-y-0.5">
        {resume.sections.map(({ key, visible }, index) => {
          const name = title(key);
          const count = sectionCount(resume, key);
          return (
            <SortableItem key={key} id={key} label={name}>
              {(handle) => (
                <div
                  data-section-row={key}
                  className={cn(row, 'bg-surface pl-2', selected === key && active)}
                >
                  {handle}
                  <button
                    type="button"
                    aria-current={selected === key || undefined}
                    onClick={() => onSelect(key)}
                    className={cn(
                      'flex min-w-0 flex-1 items-center justify-between gap-2 py-2 pl-2 text-left text-sm',
                      !visible && 'text-muted-foreground line-through',
                    )}
                  >
                    <span className="truncate">{name}</span>
                    {count > 0 && (
                      <span className="text-muted-foreground text-xs font-normal tabular-nums">
                        {count}
                      </span>
                    )}
                  </button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-pressed={!visible}
                    aria-label={t(visible ? 'hide' : 'show', { name })}
                    onClick={() => actions.toggleSection(key)}
                  >
                    {visible ? <Eye /> : <EyeOff />}
                  </Button>
                  <Menu
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="w-6"
                        aria-label={t('moveSection', { name })}
                      >
                        <MoreVertical />
                      </Button>
                    }
                    items={[
                      {
                        label: t('moveUp'),
                        icon: <ArrowUp />,
                        onSelect: () => actions.moveSection(index, index - 1),
                      },
                      {
                        label: t('moveDown'),
                        icon: <ArrowDown />,
                        onSelect: () => actions.moveSection(index, index + 1),
                      },
                    ]}
                  />
                </div>
              )}
            </SortableItem>
          );
        })}
      </SortableList>
      <Button
        variant="ghost"
        size="sm"
        className="justify-start"
        onClick={() => onSelect(actions.addCustomSection(t('newSection')))}
      >
        <Plus />
        {t('addSection')}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground justify-start"
        onClick={actions.resetSectionOrder}
      >
        <RotateCcw />
        {t('resetOrder')}
      </Button>
      <div className="border-border mt-1 border-t pt-2">
        {fixed('design', t('design'), Palette)}
      </div>
    </nav>
  );
}
