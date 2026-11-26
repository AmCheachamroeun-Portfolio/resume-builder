'use client';

import { motion, MotionConfig } from 'motion/react';
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

/** Two real template pages laid on the desk, one slightly behind the other. */
export function HeroSheets() {
  const t = useTranslations('landing.hero');
  return (
    <MotionConfig reducedMotion="user">
      <figure className="bg-desk relative m-0 overflow-hidden rounded-lg px-6 pt-8 pb-4 sm:px-10">
        <div className="relative mx-auto max-w-md pr-[14%] pb-6">
          <motion.div
            className="absolute top-8 right-0 w-[74%]"
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <SampleThumbnail templateId="executive-classic" className="shadow-paper" />
          </motion.div>
          <motion.div
            className="relative"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <SampleThumbnail templateId="navy-professional" className="shadow-paper" />
          </motion.div>
        </div>
        <figcaption className="text-muted-foreground text-center text-xs">
          {t('caption')}
        </figcaption>
      </figure>
    </MotionConfig>
  );
}

const SWATCHES = ['#17694e', '#1d3557', '#8a2e2e', '#6b4e3d', '#5b3f8c'];

/** A working slice of the design panel, so the claim can be tried on the page. */
export function CustomiseDemo() {
  const t = useTranslations('landing.customise');
  const [accent, setAccent] = useState(SWATCHES[0]!);
  const [font, setFont] = useState<'inter' | 'lora' | 'plex'>('inter');
  const [templateId, setTemplate] = useState('clean-timeline');
  const resume = useMemo(() => {
    const base = sampleResume(templateId);
    return { ...base, design: { ...base.design, accent, font } };
  }, [accent, font, templateId]);

  return (
    <div className="bg-desk grid gap-6 rounded-lg p-5 sm:grid-cols-[1fr_minmax(0,17rem)] sm:p-8">
      <div className="flex flex-col gap-5 self-center">
        <fieldset>
          <legend className="mb-2 text-[13px] font-semibold">{t('colour')}</legend>
          <div className="flex gap-2.5">
            {SWATCHES.map((swatch) => (
              <button
                key={swatch}
                type="button"
                aria-label={swatch}
                aria-pressed={swatch === accent}
                onClick={() => setAccent(swatch)}
                className="aria-pressed:ring-foreground aria-pressed:ring-offset-desk size-7 rounded-sm aria-pressed:ring-2 aria-pressed:ring-offset-2"
                style={{ background: swatch }}
              />
            ))}
          </div>
        </fieldset>
        <div>
          <p className="mb-2 text-[13px] font-semibold">{t('font')}</p>
          <Segmented
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
          <p className="mb-2 text-[13px] font-semibold">{t('template')}</p>
          <Segmented
            label={t('template')}
            value={templateId}
            onChange={setTemplate}
            options={['clean-timeline', 'corporate-edge', 'modern-slate'].map((id) => ({
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
