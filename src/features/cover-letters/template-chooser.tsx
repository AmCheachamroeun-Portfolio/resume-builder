'use client';

import { useTranslations } from 'next-intl';
import { Swatches } from '@/components/shared/swatches';
import { Field, Select } from '@/components/ui/field';
import { ACCENT_COLOURS } from '@/constants/design';
import { SAMPLE_DATA } from '@/constants/sample-resume';
import { RESUME_FONTS } from '@/features/resume-templates/fonts';
import { TemplateTile } from '@/features/resume-templates/template-tile';
import { useLetter } from '@/stores/letter-store';
import { LETTER_TEMPLATE_IDS, type CoverLetter } from '@/types/cover-letter';
import type { FontId } from '@/types/resume';
import { LetterThumbnail } from './letter-sheet';
import { letterFont, LETTER_TEMPLATES } from './templates';

/** The three layouts, each drawn with the writer's own letter, and its options. */
export function TemplateChooser({ letter }: { letter: CoverLetter }) {
  const t = useTranslations('letters.design');
  const placeholder = useTranslations('letters.editor.placeholder');
  const { update } = useLetter.getState();
  const current = LETTER_TEMPLATES[letter.template];
  const { fullName, headline, email, phone, location } = SAMPLE_DATA.personal;
  // An empty letter would make three nearly blank pictures, so gaps are filled.
  const pictured: CoverLetter = {
    ...letter,
    sender: Object.values(letter.sender).some(Boolean)
      ? letter.sender
      : { fullName, headline, email, phone, location },
    body: letter.body.trim() ? letter.body : placeholder(letter.language),
  };

  return (
    <section aria-labelledby="letter-template" className="border-border space-y-3 border-b pb-6">
      <h2 id="letter-template" className="title-panel">
        {t('title')}
      </h2>
      <fieldset>
        <legend className="sr-only">{t('title')}</legend>
        <div className="grid max-w-md grid-cols-3 gap-3">
          {LETTER_TEMPLATE_IDS.map((id) => (
            <label key={id} className="group flex cursor-pointer flex-col">
              <input
                type="radio"
                name="letter-template"
                className="peer sr-only"
                checked={letter.template === id}
                onChange={() => update({ template: id })}
              />
              <TemplateTile name={LETTER_TEMPLATES[id].name} selected={letter.template === id}>
                <LetterThumbnail letter={{ ...pictured, template: id }} />
              </TemplateTile>
            </label>
          ))}
        </div>
      </fieldset>
      <p className="text-muted-foreground max-w-md text-[13px]">{t(`about.${letter.template}`)}</p>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
        <Field label={t('typeface')}>
          {(props) => (
            <Select
              {...props}
              className="w-52"
              value={letterFont(letter)}
              onChange={(e) =>
                update({ fonts: { ...letter.fonts, [letter.template]: e.target.value as FontId } })
              }
            >
              {current.fonts.map((id) => (
                <option key={id} value={id}>
                  {RESUME_FONTS[id].name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        {current.accent && (
          <Swatches
            label={t('accent')}
            value={letter.accent}
            options={ACCENT_COLOURS}
            onChange={(accent) => update({ accent })}
          />
        )}
      </div>
    </section>
  );
}
