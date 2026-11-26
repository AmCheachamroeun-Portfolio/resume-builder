'use client';

import { Bold, Italic, List, Sparkles } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Select, Textarea } from '@/components/ui/field';
import { DOCUMENT_LABELS } from '@/constants/document-labels';
import type { ContentLanguage } from '@/types/resume';

const FIRST_YEAR = 1970;
const LAST_YEAR = new Date().getFullYear() + 10;
const YEARS = Array.from({ length: LAST_YEAR - FIRST_YEAR + 1 }, (_, i) => String(LAST_YEAR - i));

/** Month and year selects: works identically in every browser, unlike type="month". */
export function DateInput({
  label,
  value,
  onChange,
  disabled,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
}) {
  const t = useTranslations('form');
  const months = DOCUMENT_LABELS[useLocale() as ContentLanguage].months;
  const [year = '', month = ''] = value.split('-');
  const set = (y: string, m: string) => onChange(y ? (m ? `${y}-${m}` : y) : '');
  return (
    <Field label={label} error={error}>
      {(props) => (
        <div className="grid grid-cols-2 gap-2">
          <Select
            aria-label={`${label}: ${t('month')}`}
            value={month}
            disabled={disabled || !year}
            onChange={(e) => set(year, e.target.value)}
          >
            <option value="">{t('month')}</option>
            {months.map((name, i) => (
              <option key={name} value={String(i + 1).padStart(2, '0')}>
                {name}
              </option>
            ))}
          </Select>
          <Select
            {...props}
            aria-label={`${label}: ${t('year')}`}
            value={year}
            disabled={disabled}
            onChange={(e) => set(e.target.value, month)}
          >
            <option value="">{t('year')}</option>
            {year && !YEARS.includes(year) && <option value={year}>{year}</option>}
            {YEARS.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </Select>
        </div>
      )}
    </Field>
  );
}

/** Plain textarea plus three formatting helpers that write the lightweight markup. */
export function RichInput({
  label,
  value,
  onChange,
  onAssist,
  assistLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onAssist?: () => void;
  assistLabel?: string;
}) {
  const t = useTranslations('form');
  const area = useRef<HTMLTextAreaElement>(null);

  const edit = (transform: (selected: string) => string, wholeLines: boolean) => {
    const element = area.current;
    if (!element) return;
    let { selectionStart: from, selectionEnd: to } = element;
    if (wholeLines) {
      from = value.lastIndexOf('\n', from - 1) + 1;
      const end = value.indexOf('\n', to);
      to = end === -1 ? value.length : end;
    }
    const replaced = transform(value.slice(from, to));
    onChange((value.slice(0, from) + replaced + value.slice(to)).slice(0, 8000));
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(from, from + replaced.length);
    });
  };
  const wrap = (mark: string) => () =>
    edit((s) => `${mark}${s || t('formatSample')}${mark}`, false);
  const bullets = () =>
    edit((s) => {
      const lines = s.split('\n');
      const all = lines.every((line) => /^[-•]\s/.test(line));
      return lines.map((line) => (all ? line.replace(/^[-•]\s/, '') : `- ${line}`)).join('\n');
    }, true);

  return (
    <Field label={label} hint={t('richHint')}>
      {(props) => (
        <div>
          <div className="mb-1 flex items-center gap-0.5">
            <Button variant="ghost" size="icon-sm" aria-label={t('bold')} onClick={wrap('**')}>
              <Bold />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label={t('italic')} onClick={wrap('*')}>
              <Italic />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label={t('bullets')} onClick={bullets}>
              <List />
            </Button>
            {onAssist && (
              <Button variant="ghost" size="sm" className="text-primary ml-auto" onClick={onAssist}>
                <Sparkles />
                {assistLabel}
              </Button>
            )}
          </div>
          <Textarea
            {...props}
            ref={area}
            maxLength={8000}
            rows={5}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      )}
    </Field>
  );
}
