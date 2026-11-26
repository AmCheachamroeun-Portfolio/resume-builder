'use client';

import { AlignCenter, AlignLeft, AlignRight, LayoutTemplate, RotateCcw, Undo2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input, Segmented, Select, Switch } from '@/components/ui/field';
import { RESUME_FONTS } from '@/features/resume-templates/fonts';
import { getTemplate } from '@/features/resume-templates/registry';
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
import { TemplatePicker } from './template-picker';

const ACCENTS = [
  '#111111',
  '#1d3557',
  '#2f5da8',
  '#0f766e',
  '#17694e',
  '#8a2e2e',
  '#c2410c',
  '#6b4e3d',
  '#5b3f8c',
];
const SECONDARIES = ['#1d2f4a', '#2b3441', '#1f332c', '#f3f4f6', '#f4eee8', '#eee9e1', '#e8eef3'];

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="border-border space-y-4 border-t pt-4">
      <legend className="float-left w-full text-sm font-semibold">{title}</legend>
      <div className="clear-both space-y-4">{children}</div>
    </fieldset>
  );
}

function Swatches({
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
        className="accent-primary w-full"
        min={min}
        max={max}
        step={step}
        value={design[name]}
        onChange={(e) => actions.setDesign({ [name]: Number(Number(e.target.value).toFixed(2)) })}
      />
    </div>
  );
}

export function DesignPanel({ resume }: { resume: Resume }) {
  const t = useTranslations('design');
  const { design } = resume;
  const template = getTemplate(resume.templateId);
  const [picking, setPicking] = useState(false);
  // The look as it was when this panel first opened for the current template.
  const [opened, setOpened] = useState({ templateId: resume.templateId, design });
  if (opened.templateId !== resume.templateId) setOpened({ templateId: resume.templateId, design });
  const lowContrast = contrastRatio(design.accent, '#ffffff') < 4.5;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 p-4 sm:p-5">
      <div>
        <h2 className="display text-xl">{t('title')}</h2>
        <p className="text-muted-foreground mt-1 text-sm">{t('intro')}</p>
      </div>
      <div className="border-border bg-surface flex items-center justify-between gap-3 rounded-lg border p-3">
        <div>
          <p className="text-muted-foreground text-xs">{t('template')}</p>
          <p className="text-sm font-semibold">{template.name}</p>
        </div>
        <Button size="sm" onClick={() => setPicking(true)}>
          <LayoutTemplate />
          {t('change')}
        </Button>
      </div>

      <Group title={t('colour')}>
        <Swatches
          label={t('accent')}
          value={design.accent}
          options={ACCENTS}
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[13px] font-medium">{t('bodyWeight')}</span>
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[13px] font-medium">{t('headingWeight')}</span>
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
        <Slider name="lineHeight" design={design} unit="" />
      </Group>

      <Group title={t('layout')}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[13px] font-medium">{t('pageSize')}</span>
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
        {template.supportsHeaderAlign && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[13px] font-medium">{t('headerAlign')}</span>
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[13px] font-medium">{t('photoShape')}</span>
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

      <div className="border-border flex flex-wrap gap-2 border-t pt-4">
        <Button
          disabled={JSON.stringify(opened.design) === JSON.stringify(design)}
          onClick={() => actions.setDesign(opened.design)}
        >
          <Undo2 />
          {t('reset')}
        </Button>
        <Button onClick={actions.resetDesign}>
          <RotateCcw />
          {t('restoreDefaults')}
        </Button>
      </div>
      <TemplatePicker resume={resume} open={picking} onOpenChange={setPicking} />
    </div>
  );
}
