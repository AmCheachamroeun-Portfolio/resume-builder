import { cn } from '@/lib/utils';

/** A sheet framed by crop marks, with one line of type set in the accent. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-7', className)} aria-hidden fill="none">
      <path
        d="M2 8V2h6M24 2h6v6M30 24v6h-6M8 30H2v-6"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.45"
      />
      <path d="M8 6h11l5 5v15H8z" fill="var(--primary)" />
      <path d="M19 6v5h5z" fill="var(--primary-foreground)" opacity="0.55" />
      <path d="M12 15h8M12 19h8M12 23h4.5" stroke="var(--primary-foreground)" strokeWidth="2" />
    </svg>
  );
}

export function Logo({ compact }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark />
      <span className={cn('text-[17px] font-semibold tracking-tight', compact && 'sr-only')}>
        Resume<span className="display">Craft</span>
        <span className="text-primary ml-1 text-xs font-bold">AI</span>
      </span>
    </span>
  );
}
