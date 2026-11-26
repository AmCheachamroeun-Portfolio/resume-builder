import { cn } from '@/lib/utils';

/** A draft sheet with one turned corner: the last line, in the accent, is yours to write. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('size-6', className)} aria-hidden>
      <rect width="24" height="24" rx="6" fill="var(--foreground)" />
      <path d="M6.5 5h7.2L17.5 8.8V19h-11z" fill="var(--background)" />
      <path d="M13.7 5v3.8h3.8z" fill="var(--muted-foreground)" />
      <path d="M9 11.2h6M9 13.8h6" stroke="var(--foreground)" strokeWidth="1.3" />
      <path d="M9 16.4h3.5" stroke="var(--primary)" strokeWidth="1.6" />
    </svg>
  );
}

export function Logo({ compact }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark />
      <span className={cn('text-[15px] font-semibold tracking-[-0.015em]', compact && 'sr-only')}>
        ResumeCraft
      </span>
    </span>
  );
}
