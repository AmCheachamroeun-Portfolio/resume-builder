'use client';

import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { DATE_PATTERN } from '@/lib/import/to-data';
import type { Imported, ImportedContact } from '@/lib/import/types';

const CONTACT_FIELDS = [
  'fullName',
  'email',
  'phone',
  'location',
  'linkedin',
  'github',
  'website',
] as const satisfies readonly (keyof ImportedContact)[];

/** Which inputs each kind of entry shows, in order. */
const SECTIONS = {
  experience: ['title', 'company', 'location', 'start', 'end', 'description'],
  education: ['degree', 'field', 'institution', 'start', 'end', 'description'],
  skills: ['name', 'category'],
  projects: ['name', 'technologies', 'description'],
  certifications: ['name', 'issuer', 'date'],
  languages: ['name', 'level'],
  other: ['heading', 'text'],
} as const;
type Section = keyof typeof SECTIONS;
type Item = Record<string, string | boolean>;

const WIDE = new Set(['description', 'text', 'heading']);
const DATES = new Set(['start', 'end', 'date']);
const LEVELS = ['', 'basic', 'conversational', 'professional', 'fluent', 'native'];

/** Every imported value, editable, before anything is saved. */
export function ImportReview({
  value,
  onChange,
}: {
  value: Imported;
  onChange: (value: Imported) => void;
}) {
  const t = useTranslations('import');
  const sections = useTranslations('sections');
  const levels = useTranslations('options.languages');

  const setItems = (section: Section, items: Item[]) =>
    onChange({ ...value, [section]: items } as Imported);

  return (
    <div className="space-y-6">
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="title-panel mb-3">{t('personal')}</legend>
        {CONTACT_FIELDS.map((key) => (
          <Field key={key} label={t(`fields.${key}`)}>
            {(props) => (
              <Input
                {...props}
                value={value.contact[key]}
                onChange={(e) =>
                  onChange({ ...value, contact: { ...value.contact, [key]: e.target.value } })
                }
              />
            )}
          </Field>
        ))}
        <Field label={t('fields.headline')}>
          {(props) => (
            <Input
              {...props}
              value={value.headline}
              onChange={(e) => onChange({ ...value, headline: e.target.value })}
            />
          )}
        </Field>
        <Field label={sections('summary')} className="sm:col-span-2">
          {(props) => (
            <Textarea
              {...props}
              rows={4}
              value={value.summary}
              onChange={(e) => onChange({ ...value, summary: e.target.value })}
            />
          )}
        </Field>
      </fieldset>

      {(Object.keys(SECTIONS) as Section[]).map((section) => {
        const items = value[section] as unknown as Item[];
        if (!items.length) return null;
        const title = section === 'other' ? t('other') : sections(section);
        return (
          <section key={section} aria-label={title} className="border-border border-t pt-5">
            <h2 className="title-panel">{title}</h2>
            {section === 'other' && (
              <p className="text-muted-foreground mt-1 text-sm">{t('otherNote')}</p>
            )}
            <ul className="mt-3 space-y-5">
              {items.map((item, index) => {
                const name = `${title} ${index + 1}`;
                const set = (patch: Item) =>
                  setItems(
                    section,
                    items.map((x, i) => (i === index ? { ...x, ...patch } : x)),
                  );
                return (
                  <li key={index}>
                    <fieldset className="grid gap-3 sm:grid-cols-2">
                      <legend className="sr-only">{name}</legend>
                      {SECTIONS[section].map((key) => {
                        const text = String(item[key] ?? '');
                        const wrongDate = DATES.has(key) && !DATE_PATTERN.test(text.trim());
                        return (
                          <Field
                            key={key}
                            label={t(`fields.${key}`)}
                            className={WIDE.has(key) ? 'sm:col-span-2' : undefined}
                            error={wrongDate ? t('dateError') : undefined}
                          >
                            {(props) =>
                              key === 'description' || key === 'text' ? (
                                <Textarea
                                  {...props}
                                  rows={4}
                                  value={text}
                                  onChange={(e) => set({ [key]: e.target.value })}
                                />
                              ) : key === 'level' ? (
                                <Select
                                  {...props}
                                  value={text}
                                  onChange={(e) => set({ level: e.target.value })}
                                >
                                  {LEVELS.map((level) => (
                                    <option key={level} value={level}>
                                      {level ? levels(level) : t('noLevel')}
                                    </option>
                                  ))}
                                </Select>
                              ) : (
                                <Input
                                  {...props}
                                  value={text}
                                  placeholder={DATES.has(key) ? t('datePlaceholder') : undefined}
                                  onChange={(e) => set({ [key]: e.target.value })}
                                />
                              )
                            }
                          </Field>
                        );
                      })}
                      {section === 'experience' && (
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            className="accent-primary size-4"
                            checked={Boolean(item.current)}
                            onChange={(e) => set({ current: e.target.checked })}
                          />
                          {t('fields.current')}
                        </label>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="justify-self-end sm:col-start-2"
                        aria-label={`${t('remove')}: ${name}`}
                        onClick={() =>
                          setItems(
                            section,
                            items.filter((_, i) => i !== index),
                          )
                        }
                      >
                        <Trash2 />
                        {t('remove')}
                      </Button>
                    </fieldset>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
