'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ImagePlus, Plus, Trash2, UserRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { getTemplate } from '@/features/resume-templates/registry';
import { checkPhoto, PHOTO_TYPES, preparePhoto } from '@/lib/image';
import { createId } from '@/lib/utils';
import { actions } from '@/stores/editor-store';
import type { Personal, Resume } from '@/types/resume';
import { isUrl, personalFormSchema } from './form-schemas';

const FIELDS = [
  ['fullName', 'text', 'name'],
  ['headline', 'text', 'organization-title'],
  ['email', 'email', 'email'],
  ['phone', 'tel', 'tel'],
  ['location', 'text', 'off'],
  ['linkedin', 'url', 'off'],
  ['github', 'url', 'off'],
  ['website', 'url', 'url'],
] as const;

export function PersonalForm({ resume }: { resume: Resume }) {
  const t = useTranslations('form');
  const labels = useTranslations('fields.personal');
  const personal = resume.data.personal;
  const [photoError, setPhotoError] = useState('');
  const file = useRef<HTMLInputElement>(null);
  const form = useForm<Personal>({
    defaultValues: personal,
    resolver: zodResolver(personalFormSchema) as unknown as Resolver<Personal>,
    mode: 'onTouched',
  });

  useEffect(() => {
    const values = form.getValues();
    if (FIELDS.some(([name]) => values[name] !== personal[name])) {
      form.reset(personal, { keepTouched: true });
    }
  }, [personal, form]);

  const upload = async (picked: File) => {
    const problem = checkPhoto(picked);
    if (problem) return setPhotoError(t(`photo.${problem}`));
    try {
      actions.setPersonal({ photo: await preparePhoto(picked) });
      setPhotoError('');
    } catch {
      setPhotoError(t('photo.decode'));
    }
  };
  const setLinks = (links: Personal['links']) => actions.setPersonal({ links });
  const supportsPhoto = getTemplate(resume.templateId).photo;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="border-border bg-muted grid size-20 shrink-0 place-items-center overflow-hidden rounded-md border">
          {personal.photo ? (
            // Local data URL, nothing for next/image to optimise.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={personal.photo} alt={t('photo.alt')} className="size-full object-cover" />
          ) : (
            <UserRound aria-hidden className="text-muted-foreground size-7" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => file.current?.click()}>
              <ImagePlus />
              {t(personal.photo ? 'photo.replace' : 'photo.upload')}
            </Button>
            {personal.photo && (
              <Button size="sm" variant="ghost" onClick={() => actions.setPersonal({ photo: '' })}>
                <Trash2 />
                {t('photo.remove')}
              </Button>
            )}
          </div>
          <p
            className={`mt-2 text-xs ${photoError ? 'text-danger' : 'text-muted-foreground'}`}
            role="status"
          >
            {photoError || t(supportsPhoto ? 'photo.hint' : 'photo.unsupported')}
          </p>
          <input
            ref={file}
            type="file"
            accept={PHOTO_TYPES.join(',')}
            className="hidden"
            data-testid="photo-input"
            onChange={(e) => {
              const picked = e.target.files?.[0];
              e.target.value = '';
              if (picked) void upload(picked);
            }}
          />
        </div>
      </div>

      <form className="grid gap-4 sm:grid-cols-2" noValidate onSubmit={(e) => e.preventDefault()}>
        {FIELDS.map(([name, type, autoComplete]) => {
          const message = form.formState.errors[name]?.message;
          return (
            <Field
              key={name}
              label={labels(name)}
              error={message ? t(`errors.${message}`) : undefined}
              className={name === 'fullName' || name === 'headline' ? 'sm:col-span-2' : ''}
            >
              {(props) => (
                <Input
                  {...props}
                  type={type}
                  autoComplete={autoComplete}
                  maxLength={300}
                  {...form.register(name, {
                    onChange: (e) => actions.setPersonal({ [name]: e.target.value }),
                  })}
                />
              )}
            </Field>
          );
        })}
      </form>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">{labels('links')}</legend>
        {personal.links.map((link, index) => {
          const patch = (change: Partial<typeof link>) =>
            setLinks(personal.links.map((l) => (l.id === link.id ? { ...l, ...change } : l)));
          return (
            <div key={link.id} className="flex items-start gap-2">
              <Input
                className="w-1/3"
                aria-label={`${labels('linkLabel')} ${index + 1}`}
                placeholder={labels('linkLabel')}
                value={link.label}
                maxLength={300}
                onChange={(e) => patch({ label: e.target.value })}
              />
              <div className="min-w-0 flex-1">
                <Input
                  type="url"
                  aria-label={`${labels('linkUrl')} ${index + 1}`}
                  aria-invalid={!isUrl(link.url) || undefined}
                  placeholder="https://"
                  value={link.url}
                  maxLength={300}
                  onChange={(e) => patch({ url: e.target.value })}
                />
                {!isUrl(link.url) && <p className="text-danger mt-1 text-xs">{t('errors.url')}</p>}
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('remove', { name: link.label || labels('linkUrl') })}
                onClick={() => setLinks(personal.links.filter((l) => l.id !== link.id))}
              >
                <Trash2 />
              </Button>
            </div>
          );
        })}
        <Button
          size="sm"
          disabled={personal.links.length >= 10}
          onClick={() => setLinks([...personal.links, { id: createId(), label: '', url: '' }])}
        >
          <Plus />
          {labels('addLink')}
        </Button>
      </fieldset>
    </div>
  );
}
