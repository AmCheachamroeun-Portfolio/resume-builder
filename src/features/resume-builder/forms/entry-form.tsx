'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo } from 'react';
import { Controller, useForm, useWatch, type Resolver } from 'react-hook-form';
import { Field, Input, Select } from '@/components/ui/field';
import { SECTION_FIELDS } from '@/constants/sections';
import { useAssistant } from '@/features/ai-assistant/store';
import { actions } from '@/stores/editor-store';
import type { ListEntry, ListSectionKey } from '@/types/resume';
import { entryFormSchema } from './form-schemas';
import { DateInput, RichInput } from './inputs';

type Values = Record<string, string | number | boolean>;

const AI_FIELDS: Partial<Record<ListSectionKey, string[]>> = {
  experience: ['description', 'achievements'],
  projects: ['description'],
  volunteer: ['description'],
};

export function EntryForm({ section, entry }: { section: ListSectionKey; entry: ListEntry }) {
  const t = useTranslations('form');
  const labels = useTranslations('fields');
  const options = useTranslations('options');
  const openAssistant = useAssistant((s) => s.openFor);
  const resolver = useMemo(
    () => zodResolver(entryFormSchema(section)) as unknown as Resolver<Values>,
    [section],
  );
  const form = useForm<Values>({
    defaultValues: entry as unknown as Values,
    resolver,
    mode: 'onTouched',
  });
  const current = useWatch({ control: form.control, name: 'current' });

  // The store is the source of truth: pick up undo, redo and accepted AI edits.
  useEffect(() => {
    const values = form.getValues();
    const changed = Object.entries(entry).some(([key, value]) => values[key] !== value);
    if (changed) form.reset(entry as unknown as Values, { keepTouched: true });
  }, [entry, form]);

  const commit = (name: string, value: string | number | boolean) =>
    actions.updateEntry(section, entry.id, { [name]: value } as Partial<ListEntry>);

  return (
    <form className="grid gap-4 sm:grid-cols-2" noValidate onSubmit={(e) => e.preventDefault()}>
      {SECTION_FIELDS[section].map((field) => {
        const label = labels(`${section}.${field.name}`);
        const message = form.formState.errors[field.name]?.message;
        const error = typeof message === 'string' ? t(`errors.${message}`) : undefined;
        const wide = field.wide ? 'sm:col-span-2' : '';

        return (
          <Controller
            key={field.name}
            control={form.control}
            name={field.name}
            render={({ field: bound }) => {
              const update = (value: string | number | boolean) => {
                bound.onChange(value);
                commit(field.name, value);
              };
              const text = String(bound.value ?? '');

              if (field.type === 'check') {
                return (
                  <label className={`flex items-center gap-2 text-sm ${wide}`}>
                    <input
                      type="checkbox"
                      className="accent-primary size-4"
                      checked={Boolean(bound.value)}
                      onChange={(e) => update(e.target.checked)}
                    />
                    {label}
                  </label>
                );
              }
              if (field.type === 'date') {
                return (
                  <div className={wide}>
                    <DateInput
                      label={label}
                      value={text}
                      error={error}
                      disabled={field.name === 'end' && Boolean(current)}
                      onChange={(value) => {
                        update(value);
                        bound.onBlur();
                      }}
                    />
                  </div>
                );
              }
              if (field.type === 'rich') {
                const assist = AI_FIELDS[section]?.includes(field.name);
                return (
                  <div className={wide}>
                    <RichInput
                      label={label}
                      value={text}
                      onChange={update}
                      assistLabel={t('improve')}
                      onAssist={
                        assist
                          ? () =>
                              openAssistant('improve', { section, id: entry.id, field: field.name })
                          : undefined
                      }
                    />
                  </div>
                );
              }
              return (
                <Field label={label} error={error} className={wide}>
                  {(props) =>
                    field.type === 'select' ? (
                      <Select
                        {...props}
                        value={text === '0' ? '' : text}
                        onChange={(e) =>
                          update(
                            field.name === 'level' && section === 'skills'
                              ? Number(e.target.value)
                              : e.target.value,
                          )
                        }
                      >
                        <option value="">{t('notSet')}</option>
                        {field.options?.map((option) => (
                          <option key={option} value={option}>
                            {options(`${section}.${option}`)}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <Input
                        {...props}
                        type={field.type === 'url' ? 'url' : field.type}
                        inputMode={field.type === 'url' ? 'url' : undefined}
                        maxLength={300}
                        value={text}
                        ref={bound.ref}
                        onBlur={bound.onBlur}
                        onChange={(e) => update(e.target.value)}
                      />
                    )
                  }
                </Field>
              );
            }}
          />
        );
      })}
    </form>
  );
}
