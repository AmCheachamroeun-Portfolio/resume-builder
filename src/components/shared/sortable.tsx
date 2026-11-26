'use client';

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDown, ArrowUp, GripVertical } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function SortableList({
  ids,
  onMove,
  children,
  className,
}: {
  ids: string[];
  onMove: (from: number, to: number) => void;
  children: ReactNode;
  className?: string;
}) {
  const t = useTranslations('dnd');
  const contextId = useId();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const position = (id: string | number) => ids.indexOf(String(id)) + 1;
  return (
    <DndContext
      id={contextId}
      sensors={sensors}
      collisionDetection={closestCenter}
      accessibility={{
        screenReaderInstructions: { draggable: t('instructions') },
        announcements: {
          onDragStart: ({ active }) => t('picked', { position: position(active.id) }),
          onDragOver: ({ over }) => (over ? t('over', { position: position(over.id) }) : undefined),
          onDragEnd: ({ over }) =>
            over ? t('dropped', { position: position(over.id) }) : t('cancelled'),
          onDragCancel: () => t('cancelled'),
        },
      }}
      onDragEnd={({ active, over }) => {
        if (over && active.id !== over.id) {
          onMove(ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
        }
      }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul className={className}>{children}</ul>
      </SortableContext>
    </DndContext>
  );
}

export function SortableItem({
  id,
  label,
  className,
  children,
}: {
  id: string;
  label: string;
  className?: string;
  children: (handle: ReactNode) => ReactNode;
}) {
  const t = useTranslations('dnd');
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      className="text-muted-foreground hover:text-foreground grid h-8 w-6 shrink-0 cursor-grab touch-none place-items-center rounded-sm active:cursor-grabbing"
      aria-label={t('handle', { name: label })}
      {...attributes}
      {...listeners}
    >
      <GripVertical aria-hidden className="size-4" />
    </button>
  );
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(isDragging && 'shadow-overlay relative z-10', className)}
    >
      {children(handle)}
    </li>
  );
}

/** Button alternative to dragging. */
export function MoveButtons({
  index,
  count,
  name,
  onMove,
}: {
  index: number;
  count: number;
  name: string;
  onMove: (from: number, to: number) => void;
}) {
  const t = useTranslations('dnd');
  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={index === 0}
        aria-label={t('up', { name })}
        onClick={() => onMove(index, index - 1)}
      >
        <ArrowUp />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={index === count - 1}
        aria-label={t('down', { name })}
        onClick={() => onMove(index, index + 1)}
      >
        <ArrowDown />
      </Button>
    </>
  );
}
