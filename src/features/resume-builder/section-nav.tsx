'use client';

import { ArrowDown, ArrowUp, Eye, EyeOff, MoreHorizontal, Plus, RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { SortableItem, SortableList } from '@/components/shared/sortable';
import { Button } from '@/components/ui/button';
import { Menu } from '@/components/ui/overlays';
import { cn } from '@/lib/utils';
import { actions } from '@/stores/editor-store';
import type { Resume } from '@/types/resume';
import { SectionIcon, sectionStatus, type SectionStatus } from './section-meta';
import { sectionCount, useSectionTitle } from './use-section-title';

const row = 'group relative flex items-center rounded-md transition-colors hover:bg-muted';
const active = 'bg-primary-soft hover:bg-primary-soft';
/** Row controls stay out of the way until the row is hovered or focused. Always shown on touch. */
const quiet =
  'opacity-0 group-hover:opacity-100 group-has-focus-visible:opacity-100 pointer-coarse:opacity-100';

function StatusDot({ status }: { status: SectionStatus }) {
  const t = useTranslations('editor.status');
  return (
    <span className="grid size-4 shrink-0 place-items-center" title={t(status)}>
      <span
        aria-hidden
        className={cn(
          'size-1.5 rounded-full',
          status === 'complete' && 'bg-success',
          status === 'partial' && 'bg-warning',
          status === 'empty' && 'border-border-strong border',
        )}
      />
      <span className="sr-only">{t(status)}</span>
    </span>
  );
}

/** Icon-only rail for narrow desktop screens. */
export function SectionRail({
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
  return (
    <nav aria-label={t('sectionsLabel')} className="flex flex-col items-center gap-1 py-2">
      {['personal', ...resume.sections.map((s) => s.key)].map((key) => {
        const name = key === 'personal' ? t('personal') : title(key);
        const hidden = resume.sections.find((s) => s.key === key)?.visible === false;
        return (
          <button
            key={key}
            type="button"
            title={name}
            aria-label={name}
            aria-current={selected === key || undefined}
            onClick={() => onSelect(key)}
            className={cn(
              'text-muted-foreground hover:bg-muted hover:text-foreground aria-[current]:bg-primary-soft aria-[current]:text-primary relative grid size-9 shrink-0 place-items-center rounded-md',
              hidden && 'opacity-45',
            )}
          >
            <SectionIcon section={key} className="size-4" />
            {sectionStatus(resume, key) === 'complete' && (
              <span
                aria-hidden
                className="bg-success absolute top-1 right-1 size-1.5 rounded-full"
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}

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

  return (
    <nav aria-label={t('sectionsLabel')} className="flex flex-col gap-0.5 p-2">
      <div className={cn(row, selected === 'personal' && active)}>
        <span aria-hidden className="w-6 shrink-0" />
        <button
          type="button"
          aria-current={selected === 'personal' || undefined}
          onClick={() => onSelect('personal')}
          className="flex min-h-9 min-w-0 flex-1 items-center gap-2.5 pr-2 text-left text-[13px] font-medium"
        >
          <SectionIcon section="personal" className="text-muted-foreground size-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">{t('personal')}</span>
          <StatusDot status={sectionStatus(resume, 'personal')} />
        </button>
      </div>
      <SortableList ids={keys} onMove={actions.moveSection} className="space-y-0.5">
        {resume.sections.map(({ key, visible }, index) => {
          const name = title(key);
          const count = sectionCount(resume, key);
          return (
            <SortableItem key={key} id={key} label={name}>
              {(handle) => (
                <div data-section-row={key} className={cn(row, selected === key && active)}>
                  <span className={cn('flex w-6 shrink-0', quiet)}>{handle}</span>
                  <button
                    type="button"
                    aria-current={selected === key || undefined}
                    onClick={() => onSelect(key)}
                    className={cn(
                      'flex min-h-9 min-w-0 flex-1 items-center gap-2.5 text-left text-[13px] font-medium',
                      !visible && 'text-muted-foreground',
                    )}
                  >
                    <SectionIcon section={key} className="text-muted-foreground size-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{name}</span>
                    {count > 0 && key !== 'summary' && (
                      <span className="text-muted-foreground text-xs font-normal tabular-nums group-has-focus-visible:hidden group-hover:hidden pointer-coarse:inline">
                        {count}
                      </span>
                    )}
                  </button>
                  {/* Out of the layout until needed, so long names keep their room. */}
                  <span
                    className={cn(
                      'flex shrink-0 items-center',
                      'w-0 overflow-hidden group-has-focus-visible:w-auto group-hover:w-auto pointer-coarse:w-auto',
                    )}
                  >
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
                          aria-label={t('moveSection', { name })}
                        >
                          <MoreHorizontal />
                        </Button>
                      }
                      items={[
                        {
                          label: t('moveUp'),
                          icon: <ArrowUp />,
                          disabled: index === 0,
                          onSelect: () => actions.moveSection(index, index - 1),
                        },
                        {
                          label: t('moveDown'),
                          icon: <ArrowDown />,
                          disabled: index === keys.length - 1,
                          onSelect: () => actions.moveSection(index, index + 1),
                        },
                      ]}
                    />
                  </span>
                  <span className="grid w-5 shrink-0 place-items-center pr-1">
                    {visible ? (
                      <StatusDot status={sectionStatus(resume, key)} />
                    ) : (
                      <EyeOff aria-hidden className="text-muted-foreground size-3.5" />
                    )}
                  </span>
                </div>
              )}
            </SortableItem>
          );
        })}
      </SortableList>
      <div className="border-border mt-2 flex flex-col border-t pt-2">
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
      </div>
    </nav>
  );
}
