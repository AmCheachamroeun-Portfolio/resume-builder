'use client';

import {
  Award,
  Briefcase,
  Download,
  FolderGit2,
  GraduationCap,
  Languages,
  Redo2,
  TextQuote,
  Undo2,
  UserRound,
  Wrench,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { SAMPLE_DATA } from '@/constants/sample-resume';
import { SampleThumbnail } from './previews';

const SECTIONS = [
  ['personal', UserRound],
  ['summary', TextQuote],
  ['experience', Briefcase],
  ['education', GraduationCap],
  ['skills', Wrench],
  ['projects', FolderGit2],
  ['certifications', Award],
  ['languages', Languages],
] as const;

/**
 * The editor, shown with the real controls and a real template page filled with
 * fictional details. It is a picture of the product, so nothing in it is focusable.
 */
export function HeroWindow() {
  const t = useTranslations('landing.hero');
  const editor = useTranslations('editor');
  const sections = useTranslations('sections');
  const fields = useTranslations('fields.personal');
  const exportText = useTranslations('export');
  const { personal } = SAMPLE_DATA;

  return (
    <figure className="m-0">
      <div
        inert
        aria-hidden
        className="bg-surface shadow-overlay overflow-hidden rounded-xl text-left select-none"
      >
        <div className="border-border flex h-12 items-center gap-2 border-b px-3">
          <span className="truncate text-sm font-semibold">{t('documentName')}</span>
          <span className="text-muted-foreground hidden text-xs sm:inline">
            {editor('save.saved')}
          </span>
          <span className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" className="max-sm:hidden">
              <Undo2 />
            </Button>
            <Button variant="ghost" size="icon-sm" className="max-sm:hidden">
              <Redo2 />
            </Button>
            <Button variant="primary" size="sm">
              <Download />
              {exportText('export')}
            </Button>
          </span>
        </div>
        <div className="flex h-[22rem] sm:h-[30rem] lg:h-[34rem]">
          <div className="border-border bg-panel hidden w-48 shrink-0 border-r p-2 lg:block">
            {SECTIONS.map(([key, Icon]) => (
              <div
                key={key}
                data-active={key === 'personal' || undefined}
                className="data-active:bg-primary-soft text-muted-foreground data-active:text-foreground flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] data-active:font-medium"
              >
                <Icon className="size-4" />
                {key === 'personal' ? editor('personal') : sections(key)}
              </div>
            ))}
          </div>
          <div className="border-border hidden w-72 shrink-0 space-y-3.5 border-r p-4 md:block">
            <p className="title-panel">{editor('personal')}</p>
            {(['fullName', 'headline', 'email', 'phone', 'location', 'website'] as const).map(
              (name) => (
                <label key={name} className="block">
                  <span className="mb-1 block text-xs font-medium">{fields(name)}</span>
                  <Input readOnly tabIndex={-1} value={personal[name]} />
                </label>
              ),
            )}
          </div>
          <div className="bg-desk relative min-w-0 flex-1 overflow-hidden px-5 pt-5 sm:px-8 sm:pt-7">
            <div className="mx-auto max-w-[30rem]">
              <SampleThumbnail templateId="modern-slate" className="shadow-paper" />
            </div>
          </div>
        </div>
      </div>
      <figcaption className="text-muted-foreground mt-3 text-center text-xs">
        {t('caption')}
      </figcaption>
    </figure>
  );
}
