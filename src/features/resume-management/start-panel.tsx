'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/field';
import { SAMPLE_DATA } from '@/constants/sample-resume';
import { SampleThumbnail } from '@/features/landing/previews';
import { DEFAULT_TEMPLATE_ID, getTemplate, TEMPLATES } from '@/features/resume-templates/registry';
import { Link } from '@/i18n/navigation';
import { listResumes } from '@/lib/storage/db';
import type { ContentLanguage } from '@/types/resume';
import { filterResumes } from './resume-library';
import { useCreateResume } from './use-create-resume';

export function StartPanel() {
  const t = useTranslations('start');
  const locale = useLocale() as ContentLanguage;
  const requested = useSearchParams().get('template');
  const [templateId, setTemplate] = useState(getTemplate(requested ?? DEFAULT_TEMPLATE_ID).id);
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState<ContentLanguage>(locale);
  const [example, setExample] = useState(false);
  const { create, creating } = useCreateResume();
  const recent = useLiveQuery(() =>
    listResumes().then(
      (r) => filterResumes(r.resumes, '', 'updatedAt').slice(0, 3),
      () => [],
    ),
  );

  return (
    <div className="container-page py-10">
      <h1 className="display text-3xl sm:text-4xl">{t('title')}</h1>
      <p className="text-muted-foreground mt-2 max-w-xl">{t('intro')}</p>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <fieldset className="min-w-0">
          <legend className="mb-4 font-semibold">{t('chooseTemplate')}</legend>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {TEMPLATES.map((template) => (
              <label key={template.id} className="group cursor-pointer">
                <input
                  type="radio"
                  name="template"
                  className="peer sr-only"
                  checked={template.id === templateId}
                  onChange={() => setTemplate(template.id)}
                />
                <span className="bg-desk peer-checked:border-primary peer-focus-visible:outline-primary relative block rounded-md border-2 border-transparent p-2.5 peer-focus-visible:outline-2">
                  <SampleThumbnail templateId={template.id} className="shadow-paper" />
                  {template.id === templateId && (
                    <span className="bg-primary text-primary-foreground absolute top-1 right-1 grid size-6 place-items-center rounded-sm">
                      <Check aria-hidden className="size-4" />
                    </span>
                  )}
                </span>
                <span className="mt-1.5 block text-sm font-medium">{template.name}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="order-first space-y-6 lg:order-none lg:sticky lg:top-20 lg:self-start">
          <form
            className="border-border bg-surface space-y-4 rounded-lg border p-5"
            onSubmit={(e) => {
              e.preventDefault();
              void create({
                templateId,
                title,
                language,
                data: example ? structuredClone(SAMPLE_DATA) : undefined,
              });
            }}
          >
            <h2 className="display text-lg">{t('manual')}</h2>
            <Field label={t('name')}>
              {(props) => (
                <Input
                  {...props}
                  placeholder={t('namePlaceholder')}
                  maxLength={120}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              )}
            </Field>
            <Field label={t('language')} hint={t('languageHint')}>
              {(props) => (
                <Select
                  {...props}
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as ContentLanguage)}
                >
                  <option value="en">English</option>
                  <option value="km">ខ្មែរ</option>
                </Select>
              )}
            </Field>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="accent-primary mt-0.5 size-4"
                checked={example}
                onChange={(e) => setExample(e.target.checked)}
              />
              {t('example')}
            </label>
            <p className="text-muted-foreground text-xs">
              {t('selected', { name: getTemplate(templateId).name })}
            </p>
            <Button type="submit" variant="primary" className="w-full" disabled={creating}>
              {t('create')}
              <ArrowRight />
            </Button>
          </form>

          <div className="border-border bg-primary-soft rounded-lg border p-5">
            <h2 className="display text-lg">{t('guided')}</h2>
            <p className="mt-1 text-sm">{t('guidedBody')}</p>
            <Button asChild className="mt-3">
              <Link href="/builder/ai">
                <Sparkles />
                {t('guidedAction')}
              </Link>
            </Button>
          </div>

          {!!recent?.length && (
            <div>
              <h2 className="text-sm font-semibold">{t('continue')}</h2>
              <ul className="divide-border border-border mt-2 divide-y border-y">
                {recent.map((resume) => (
                  <li key={resume.id}>
                    <Link
                      href={`/builder/${resume.id}`}
                      className="hover:text-primary flex items-center justify-between gap-3 py-2.5 text-sm"
                    >
                      <span className="truncate">{resume.title}</span>
                      <ArrowRight aria-hidden className="size-4 shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
