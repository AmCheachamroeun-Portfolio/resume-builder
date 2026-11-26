'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { Segmented } from '@/components/ui/field';
import { sampleResume } from '@/constants/sample-resume';
import { getTemplate } from '@/features/resume-templates/registry';
import { ResumeThumbnail } from '@/features/resume-templates/scaled-pages';

export function SampleThumbnail({
  templateId,
  className,
}: {
  templateId: string;
  className?: string;
}) {
  const resume = useMemo(() => sampleResume(templateId), [templateId]);
  return <ResumeThumbnail resume={resume} className={className} />;
}

const SWATCHES = [
  ['#1f2937', 'ink'],
  ['#1d4e89', 'blue'],
  ['#8a2e2e', 'red'],
  ['#6b4e3d', 'brown'],
  ['#0f6b5c', 'teal'],
] as const;

const DEMO_TEMPLATES = ['clean-timeline', 'corporate-edge', 'modern-slate'];

/** A working slice of the design panel, so the claim can be tried on the page. */
export function CustomiseDemo() {
  const t = useTranslations('landing.customise');
  const [accent, setAccent] = useState<string>(SWATCHES[1][0]);
  const [font, setFont] = useState<'inter' | 'lora' | 'plex'>('inter');
  const [templateId, setTemplate] = useState(DEMO_TEMPLATES[0]!);
  const resume = useMemo(() => {
    const base = sampleResume(templateId);
    return { ...base, design: { ...base.design, accent, font } };
  }, [accent, font, templateId]);

  return (
    <div className="bg-desk grid gap-6 rounded-xl p-5 sm:grid-cols-[1fr_minmax(0,19rem)] sm:p-8">
      <div className="bg-surface shadow-xs flex flex-col gap-5 self-center rounded-lg p-4">
        <fieldset>
          <legend className="label-small mb-2">{t('colour')}</legend>
          <div className="flex gap-2.5">
            {SWATCHES.map(([swatch, name]) => (
              <button
                key={swatch}
                type="button"
                aria-label={t(`colours.${name}`)}
                aria-pressed={swatch === accent}
                onClick={() => setAccent(swatch)}
                className="aria-pressed:ring-primary aria-pressed:ring-offset-surface size-7 rounded-full border border-black/10 aria-pressed:ring-2 aria-pressed:ring-offset-2"
                style={{ background: swatch }}
              />
            ))}
          </div>
        </fieldset>
        <div>
          <p className="label-small mb-2">{t('font')}</p>
          <Segmented
            stretch
            label={t('font')}
            value={font}
            onChange={setFont}
            options={[
              { value: 'inter', label: 'Inter' },
              { value: 'lora', label: 'Lora' },
              { value: 'plex', label: 'Plex' },
            ]}
          />
        </div>
        <div>
          <p className="label-small mb-2">{t('template')}</p>
          <Segmented
            stretch
            label={t('template')}
            value={templateId}
            onChange={setTemplate}
            options={DEMO_TEMPLATES.map((id) => ({
              value: id,
              label: getTemplate(id).name.split(' ')[1],
              title: getTemplate(id).name,
            }))}
          />
        </div>
      </div>
      <ResumeThumbnail key={templateId} resume={resume} className="shadow-paper" />
    </div>
  );
}
