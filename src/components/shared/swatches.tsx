'use client';

import { useTranslations } from 'next-intl';

/** A row of preset colours with a picker for any other. */
export function Swatches({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const t = useTranslations('design');
  return (
    <div>
      <p className="mb-2 text-[13px] font-medium">{label}</p>
      <div className="flex flex-wrap items-center gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            aria-label={`${label} ${option}`}
            aria-pressed={option === value}
            onClick={() => onChange(option)}
            className="aria-pressed:ring-foreground aria-pressed:ring-offset-background size-7 rounded-sm border border-black/15 aria-pressed:ring-2 aria-pressed:ring-offset-2"
            style={{ background: option }}
          />
        ))}
        <input
          type="color"
          aria-label={t('customColour', { label })}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="border-border h-8 w-10 cursor-pointer rounded-sm border bg-transparent p-0.5"
        />
      </div>
    </div>
  );
}
