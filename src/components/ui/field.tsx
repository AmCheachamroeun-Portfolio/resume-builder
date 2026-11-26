'use client';

import { Switch as SwitchPrimitive } from 'radix-ui';
import { useId, type ComponentProps, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

// text-base on touch screens stops iOS zooming into focused fields.
const control =
  'w-full min-w-0 rounded-md border border-border-strong/60 bg-surface px-3 text-sm text-foreground transition-colors placeholder:text-muted-foreground hover:border-border-strong focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-0 disabled:opacity-50 aria-invalid:border-danger pointer-coarse:text-base';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(control, 'h-9', className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(control, 'min-h-24 resize-y py-2 leading-relaxed', className)}
      {...props}
    />
  );
}

export function Select({ className, ...props }: ComponentProps<'select'>) {
  return <select className={cn(control, 'control h-9 pr-7', className)} {...props} />;
}

/** Label, control and error message wired together for assistive technology. */
export function Field({
  label,
  hint,
  error,
  className,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
  children: (props: {
    id: string;
    'aria-invalid'?: true;
    'aria-describedby'?: string;
  }) => ReactNode;
}) {
  const id = useId();
  const noteId = `${id}-note`;
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-[13px] font-medium">
        {label}
      </label>
      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': error || hint ? noteId : undefined,
      })}
      {(error || hint) && (
        <p id={noteId} className={cn('text-xs', error ? 'text-danger' : 'text-muted-foreground')}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

export function Switch({
  label,
  className,
  ...props
}: ComponentProps<typeof SwitchPrimitive.Root> & { label: ReactNode }) {
  const id = useId();
  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      <label htmlFor={id} className="text-[13px] font-medium">
        {label}
      </label>
      <SwitchPrimitive.Root
        id={id}
        className="border-border-strong/60 bg-muted data-[state=checked]:border-primary data-[state=checked]:bg-primary relative h-5 w-9 shrink-0 rounded-full border transition-colors"
        {...props}
      >
        <SwitchPrimitive.Thumb className="data-[state=checked]:bg-primary-foreground bg-muted-foreground block size-3.5 translate-x-0.5 rounded-full transition-transform data-[state=checked]:translate-x-[18px]" />
      </SwitchPrimitive.Root>
    </div>
  );
}

/** A radio group drawn as a segmented control. */
export function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
  className,
  stretch,
}: {
  /** Share the full width equally between the options. */
  stretch?: boolean;
  label: string;
  value: T;
  options: { value: T; label: ReactNode; title?: string }[];
  onChange: (value: T) => void;
  className?: string;
}) {
  const name = useId();
  return (
    <fieldset className={cn('min-w-0', className)}>
      <legend className="sr-only">{label}</legend>
      <div
        className={cn(
          'bg-muted inline-flex max-w-full gap-0.5 rounded-md p-0.5',
          stretch && 'flex w-full [&>label]:flex-1',
        )}
      >
        {options.map((option) => (
          <label
            key={option.value}
            title={option.title}
            className="has-checked:bg-raised has-focus-visible:outline-primary text-muted-foreground hover:text-foreground has-checked:text-foreground flex min-h-7 cursor-pointer items-center justify-center gap-1.5 rounded-sm px-3 text-[13px] font-medium transition-colors has-checked:shadow-xs has-focus-visible:outline-2 pointer-coarse:min-h-9 [&_svg]:size-4"
          >
            <input
              type="radio"
              className="sr-only"
              name={name}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              aria-label={option.title}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
