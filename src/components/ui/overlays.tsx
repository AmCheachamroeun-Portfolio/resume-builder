'use client';

import { Check, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Dialog as DialogPrimitive, DropdownMenu } from 'radix-ui';
import { Fragment, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  trigger,
  children,
  footer,
  className,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  trigger?: ReactNode;
  children: ReactNode;
  /** Actions that stay in view while the body scrolls. */
  footer?: ReactNode;
  className?: string;
}) {
  const t = useTranslations('common');
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <DialogPrimitive.Content
          {...(description ? {} : { 'aria-describedby': undefined })}
          className={cn(
            'bg-surface shadow-overlay fixed top-1/2 left-1/2 z-50 flex max-h-[min(92dvh,60rem)] w-[calc(100vw-1.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl',
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3">
            <div className="min-w-0">
              <DialogPrimitive.Title className="title-panel">{title}</DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="text-muted-foreground mt-1 text-sm">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon-sm" aria-label={t('close')}>
                <X />
              </Button>
            </DialogPrimitive.Close>
          </div>
          <div className="min-h-0 overflow-y-auto px-5 pb-5">{children}</div>
          {footer && (
            <div className="border-border flex flex-wrap items-center justify-end gap-2 border-t px-5 py-3">
              {footer}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  const t = useTranslations('common');
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title} description={description}>
      <div className="flex justify-end gap-2 pt-2">
        <Button onClick={() => onOpenChange(false)}>{t('cancel')}</Button>
        <Button
          variant="danger"
          onClick={() => {
            onConfirm();
            onOpenChange(false);
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}

export type MenuItem = {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  danger?: boolean;
  checked?: boolean;
  disabled?: boolean;
  /** Draws a divider above this item. */
  separated?: boolean;
  /** Keyboard shortcut shown at the trailing edge. */
  shortcut?: string;
};

export function Menu({
  trigger,
  items,
  align = 'end',
}: {
  trigger: ReactNode;
  items: MenuItem[];
  align?: 'start' | 'end';
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          sideOffset={6}
          collisionPadding={8}
          className="bg-raised shadow-overlay z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-48 overflow-y-auto rounded-lg p-1"
        >
          {items.map((item) => (
            <Fragment key={item.label}>
              {item.separated && <DropdownMenu.Separator className="bg-border mx-2 my-1 h-px" />}
              <DropdownMenu.Item
                onSelect={item.onSelect}
                disabled={item.disabled}
                aria-current={item.checked || undefined}
                className={cn(
                  'data-highlighted:bg-muted flex cursor-pointer items-center gap-2.5 rounded-sm px-2.5 py-1.5 text-sm outline-none data-disabled:opacity-40 pointer-coarse:py-2.5 [&_svg]:size-4',
                  item.danger && 'text-danger',
                )}
              >
                {item.icon}
                <span className="flex-1">{item.label}</span>
                {item.checked && <Check aria-hidden className="text-primary" />}
                {item.shortcut && (
                  <span aria-hidden className="text-muted-foreground text-xs">
                    {item.shortcut}
                  </span>
                )}
              </DropdownMenu.Item>
            </Fragment>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
