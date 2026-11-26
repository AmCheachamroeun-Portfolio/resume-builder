'use client';

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ChevronDown,
  LayoutTemplate,
  RotateCcw,
  Undo2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useState, type CSSProperties, type ReactNode } from 'react';
import { Swatches } from '@/components/shared/swatches';
import { Button } from '@/components/ui/button';
import { Field, Input, Segmented, Select, Switch } from '@/components/ui/field';
import { ACCENT_COLOURS } from '@/constants/design';
import { RESUME_FONTS } from '@/features/resume-templates/fonts';
import { getTemplate } from '@/features/resume-templates/registry';
import { useSectionTitle } from '@/features/resume-builder/use-section-title';
import { contrastRatio } from '@/lib/color';
import { actions } from '@/stores/editor-store';
import {
  DESIGN_LIMITS,
  FONT_IDS,
  type ContentLanguage,
  type Design,
  type FontId,
  type Resume,
} from '@/types/resume';

const SECONDARIES = ['#1d2f4a', '#2b3441', '#1f332c', '#f3f4f6', '#f4eee8', '#eee9e1', '#e8eef3'];

/** One collapsible group of the inspector. Open to begin with. */
function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details open className="group border-border border-b">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-[13px] font-semibold sm:px-5 [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown
          aria-hidden
          className="text-muted-foreground size-4 transition-transform group-open:rotate-180"
        />
      </summary>
      <div role="group" aria-label={title} className="space-y-4 px-4 pb-5 sm:px-5">
        {children}
      </div>
    </details>
  );
}

function Slider({
  name,
  design,
  unit,
}: {
  name: keyof typeof DESIGN_LIMITS;
  design: Design;
  unit: string;
}) {
  const t = useTranslations('design');
  const id = useId();
  const { min, max, step } = DESIGN_LIMITS[name];
  return (
    <div>
      <div className="flex justify-between text-[13px]">
        <label htmlFor={id} className="font-medium">
          {t(name)}
        </label>
        <output htmlFor={id} className="text-muted-foreground tabular-nums">
          {design[name]}
          {unit}
        </output>
      </div>
      <input
        id={id}
        type="range"
        className="w-full"
        style={{ '--fill': `${((design[name] - min) / (max - min)) * 100}%` } as CSSProperties}
        min={min}
        max={max}
        step={step}
        value={design[name]}
        onChange={(e) => actions.setDesign({ [name]: Number(Number(e.target.value).toFixed(2)) })}
      />
    </div>
  );
}

export function DesignPanel({
  resume,
  onChangeTemplate,
}: {
  resume: Resume;
  onChangeTemplate: () => void;
}) {
  const t = useTranslations('design');
  const { design } = resume;
  const template = getTemplate(resume.templateId);
  const title = useSectionTitle(resume);
  // The look as it was when this panel first opened for the current template.
  const [opened, setOpened] = useState({ templateId: resume.templateId, design });
  if (opened.templateId !== resume.templateId) setOpened({ templateId: resume.templateId, design });
  const lowContrast = contrastRatio(design.accent, '#ffffff') < 4.5;
  const row = 'flex flex-wrap items-center justify-between gap-2';
  const label = 'text-[13px] font-medium';

  return (
    <div data-resume-history className="mx-auto w-full max-w-2xl">
      <div className="border-border border-b px-4 py-4 sm:px-5">
        <h2 className="title-panel">{t('title')}</h2>
        <p className="text-muted-foreground mt-1 text-sm">{t('intro')}</p>
        <div className="border-border bg-panel mt-3 flex items-center justify-between gap-3 rounded-lg border p-3">
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs">{t('template')}</p>
            <p className="truncate text-sm font-semibold">{template.name}</p>
          </div>
          <Button size="sm" onClick={onChangeTemplate}>
            <LayoutTemplate />
            {t('change')}
          </Button>
        </div>
      </div>

      <Group title={t('colour')}>
        <Swatches
          label={t('accent')}
          value={design.accent}
          options={ACCENT_COLOURS}
          onChange={(accent) => actions.setDesign({ accent })}
        />
        {lowContrast && <p className="text-warning text-xs">{t('contrastNote')}</p>}
        {template.usesSecondary && (
          <Swatches
            label={t('secondary')}
            value={design.secondary}
            options={SECONDARIES}
            onChange={(secondary) => actions.setDesign({ secondary })}
          />
        )}
      </Group>

      <Group title={t('typography')}>
        <Field label={t('font')}>
          {(props) => (
            <Select
              {...props}
              value={design.font}
              onChange={(e) => actions.setDesign({ font: e.target.value as FontId })}
            >
              {FONT_IDS.map((id) => (
                <option key={id} value={id}>
                  {RESUME_FONTS[id].name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Slider name="bodySize" design={design} unit=" pt" />
        <Slider name="headingSize" design={design} unit=" pt" />
        <Slider name="nameSize" design={design} unit=" pt" />
        <div className={row}>
          <span className={label}>{t('bodyWeight')}</span>
          <Segmented
            label={t('bodyWeight')}
            value={design.bodyWeight}
            onChange={(bodyWeight) => actions.setDesign({ bodyWeight })}
            options={[
              { value: 400, label: t('regular') },
              { value: 500, label: t('medium') },
            ]}
          />
        </div>
        <div className={row}>
          <span className={label}>{t('headingWeight')}</span>
          <Segmented
            label={t('headingWeight')}
            value={design.headingWeight}
            onChange={(headingWeight) => actions.setDesign({ headingWeight })}
            options={[
              { value: 500, label: t('medium') },
              { value: 600, label: t('semibold') },
              { value: 700, label: t('bold') },
            ]}
          />
        </div>
      </Group>

      <Group title={t('layout')}>
        <div className={row}>
          <span className={label}>{t('pageSize')}</span>
          <Segmented
            label={t('pageSize')}
            value={design.pageSize}
            onChange={(pageSize) => actions.setDesign({ pageSize })}
            options={[
              { value: 'a4', label: 'A4' },
              { value: 'letter', label: 'US Letter' },
            ]}
          />
        </div>
        <Slider name="margin" design={design} unit=" px" />
        <Slider name="sectionSpacing" design={design} unit=" px" />
        <Slider name="lineHeight" design={design} unit="" />
        {template.supportsHeaderAlign && (
          <div className={row}>
            <span className={label}>{t('headerAlign')}</span>
            <Segmented
              label={t('headerAlign')}
              value={design.headerAlign}
              onChange={(headerAlign) => actions.setDesign({ headerAlign })}
              options={[
                { value: 'left', title: t('left'), label: <AlignLeft aria-hidden /> },
                { value: 'center', title: t('center'), label: <AlignCenter aria-hidden /> },
                { value: 'right', title: t('right'), label: <AlignRight aria-hidden /> },
              ]}
            />
          </div>
        )}
      </Group>

      <Group title={t('photo')}>
        {template.photo ? (
          <>
            <Switch
              label={t('photoVisible')}
              checked={design.photoVisible}
              onCheckedChange={(photoVisible) => actions.setDesign({ photoVisible })}
            />
            {!resume.data.personal.photo && (
              <p className="text-muted-foreground text-xs">{t('noPhotoYet')}</p>
            )}
            <Slider name="photoSize" design={design} unit=" px" />
            <div className={row}>
              <span className={label}>{t('photoShape')}</span>
              <Segmented
                label={t('photoShape')}
                value={design.photoShape}
                onChange={(photoShape) => actions.setDesign({ photoShape })}
                options={(['circle', 'rounded', 'square'] as const).map((v) => ({
                  value: v,
                  label: t(v),
                }))}
              />
            </div>
          </>
        ) : (
          <p className="text-muted-foreground text-sm">{t('photoUnsupported')}</p>
        )}
      </Group>

      <Group title={t('visibility')}>
        {resume.sections.map(({ key, visible }) => (
          <Switch
            key={key}
            label={title(key)}
            checked={visible}
            onCheckedChange={() => actions.toggleSection(key)}
          />
        ))}
      </Group>

      <Group title={t('document')}>
        <Field label={t('language')} hint={t('languageHint')}>
          {(props) => (
            <Select
              {...props}
              value={resume.language}
              onChange={(e) => actions.setMeta({ language: e.target.value as ContentLanguage })}
            >
              <option value="en">English</option>
              <option value="km">ខ្មែរ</option>
            </Select>
          )}
        </Field>
        <Field label={t('targetRole')} hint={t('targetRoleHint')}>
          {(props) => (
            <Input
              {...props}
              maxLength={300}
              value={resume.targetRole}
              onChange={(e) => actions.setMeta({ targetRole: e.target.value })}
            />
          )}
        </Field>
      </Group>

      <div className="flex flex-wrap gap-2 px-4 py-4 sm:px-5">
        <Button
          size="sm"
          disabled={JSON.stringify(opened.design) === JSON.stringify(design)}
          onClick={() => actions.setDesign(opened.design)}
        >
          <Undo2 />
          {t('reset')}
        </Button>
        <Button size="sm" onClick={actions.resetDesign}>
          <RotateCcw />
          {t('restoreDefaults')}
        </Button>
      </div>
    </div>
  );
}
