import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** A template picture with its name, as shown wherever one template is chosen from many. */
export function TemplateTile({
  name,
  selected,
  children,
}: {
  name: string;
  selected: boolean;
  children: ReactNode;
}) {
  return (
    <>
      <span
        className={cn(
          'bg-desk relative block rounded-md border-2 p-2 transition-colors sm:p-2.5',
          'peer-focus-visible:outline-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2',
          selected ? 'border-primary' : 'group-hover:border-border-strong border-transparent',
        )}
      >
        {children}
        {selected && (
          <span className="bg-primary text-primary-foreground shadow-paper absolute top-1 right-1 grid size-5 place-items-center rounded-full">
            <Check aria-hidden className="size-3" strokeWidth={3} />
          </span>
        )}
      </span>
      <span
        className={cn(
          'mt-2 block text-[13px] leading-snug font-medium',
          selected && 'text-primary',
        )}
      >
        {name}
      </span>
    </>
  );
}
