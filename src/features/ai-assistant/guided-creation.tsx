'use client';

import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { useCreateResume } from '@/features/resume-management/use-create-resume';
import { DEFAULT_TEMPLATE_ID, getTemplate } from '@/features/resume-templates/registry';
import { Link } from '@/i18n/navigation';
import type { AiRequest, Draft } from '@/lib/ai/schemas';
import type { ContentLanguage } from '@/types/resume';
import { useAiRequest, useAiStatus } from './client';
import { DRAFT_PARTS, draftToData, type Contact, type DraftPart } from './draft';
import { AiGate, AiStatusLine } from './parts';
import { Recommendations } from './recommend-panel';

type Answers = AiRequest<'generate-draft'>['answers'];
type Preferences = {
  style: AiRequest<'recommend-template'>['style'];
  ats: boolean;
  photo: boolean;
};

const QUESTIONS = [
  'contact',
  'target',
  'work',
  'education',
  'skills',
  'extras',
  'goals',
  'preferences',
] as const;
type Question = (typeof QUESTIONS)[number];
const LONG: Partial<Record<Question, keyof Answers>> = {
  work: 'work',
  education: 'education',
  skills: 'skills',
  extras: 'extras',
  goals: 'goals',
};

function DraftReview({
  draft,
  onChange,
  included,
  setIncluded,
}: {
  draft: Draft;
  onChange: (draft: Draft) => void;
  included: Set<DraftPart>;
  setIncluded: (next: Set<DraftPart>) => void;
}) {
  const t = useTranslations('guided');
  const sections = useTranslations('sections');
  const fields = useTranslations('fields');
  return (
    <div className="space-y-4">
      <Field label={fields('personal.headline')}>
        {(p) => (
          <Input
            {...p}
            value={draft.headline}
            onChange={(e) => onChange({ ...draft, headline: e.target.value })}
          />
        )}
      </Field>
      <Field label={fields('summary.professional')}>
        {(p) => (
          <Textarea
            {...p}
            rows={4}
            value={draft.summary}
            onChange={(e) => onChange({ ...draft, summary: e.target.value })}
          />
        )}
      </Field>
      {DRAFT_PARTS.filter((key) => draft[key].length).map((key) => (
        <fieldset key={key} className="border-border bg-surface rounded-lg border p-3">
          <legend className="sr-only">{sections(key)}</legend>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              className="accent-primary size-4"
              checked={included.has(key)}
              onChange={(e) => {
                const next = new Set(included);
                if (e.target.checked) next.add(key);
                else next.delete(key);
                setIncluded(next);
              }}
            />
            {t('include', { section: sections(key) })}
          </label>
          <ul className="mt-3 space-y-3 text-sm">
            {(draft[key] as Record<string, unknown>[]).map((item, index) => (
              <li key={index}>
                <p className="font-medium">
                  {[item.title, item.name, item.company, item.institution, item.degree, item.issuer]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                <p className="text-muted-foreground text-xs">
                  {[item.start, item.end, item.technologies, item.level]
                    .filter(Boolean)
                    .join(' – ')}
                </p>
                {typeof item.description === 'string' && (
                  <Textarea
                    className="mt-1"
                    rows={3}
                    aria-label={`${sections(key)} ${index + 1}`}
                    value={item.description}
                    onChange={(e) =>
                      onChange({
                        ...draft,
                        [key]: draft[key].map((other, i) =>
                          i === index ? { ...other, description: e.target.value } : other,
                        ),
                      })
                    }
                  />
                )}
              </li>
            ))}
          </ul>
        </fieldset>
      ))}
    </div>
  );
}

export function GuidedCreation() {
  const t = useTranslations('guided');
  const recommendT = useTranslations('ai.recommend');
  const locale = useLocale() as ContentLanguage;
  const configured = useAiStatus();
  const { create, creating } = useCreateResume();
  const draftRequest = useAiRequest('generate-draft');
  const recommendRequest = useAiRequest('recommend-template');
  const [step, setStep] = useState(0);
  const [language, setLanguage] = useState<ContentLanguage>(locale);
  const [contact, setContact] = useState<Contact>({
    fullName: '',
    email: '',
    phone: '',
    location: '',
  });
  const [answers, setAnswers] = useState<Answers>({
    targetRole: '',
    industry: '',
    level: 'junior',
    work: '',
    education: '',
    skills: '',
    extras: '',
    goals: '',
  });
  const [preferences, setPreferences] = useState<Preferences>({
    style: 'any',
    ats: true,
    photo: false,
  });
  const [templateId, setTemplate] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [included, setIncluded] = useState<Set<DraftPart>>(new Set(DRAFT_PARTS));
  const heading = useRef<HTMLHeadingElement>(null);
  const review = step === QUESTIONS.length;
  const question = QUESTIONS[step];
  const answer = (patch: Partial<Answers>) => setAnswers((a) => ({ ...a, ...patch }));

  // Move focus to each new question so keyboard and screen reader users follow along.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) first.current = false;
    else heading.current?.focus();
  }, [step]);

  const generate = async () => {
    setDraft(null);
    setTemplate('');
    void recommendRequest.run({
      language: locale,
      targetRole: answers.targetRole,
      industry: answers.industry,
      level: answers.level,
      ...preferences,
    });
    const result = await draftRequest.run({ language, answers });
    if (result) setDraft(result);
  };
  const finish = () => {
    const chosen =
      templateId || recommendRequest.data?.recommendations[0]?.templateId || DEFAULT_TEMPLATE_ID;
    void create({
      templateId: chosen,
      title: [contact.fullName, answers.targetRole].filter(Boolean).join(' — ').slice(0, 120),
      language,
      targetRole: answers.targetRole,
      data: draftToData(draft, contact, included),
    });
  };
  const canContinue = question !== 'target' || answers.targetRole.trim().length > 0;

  return (
    <div className="container-page max-w-3xl py-10">
      <h1 className="title-page">{t('title')}</h1>
      <p className="text-muted-foreground mt-2">{t('intro')}</p>
      {configured === false && (
        <div role="status" className="bg-warning-soft text-warning mt-4 rounded-md p-4 text-sm">
          {t('unavailable')}{' '}
          <Link href="/builder" className="font-semibold underline">
            {t('manualLink')}
          </Link>
        </div>
      )}

      <div className="mt-6 flex items-center gap-3">
        <div
          role="progressbar"
          aria-label={t('progress')}
          aria-valuemin={0}
          aria-valuemax={QUESTIONS.length}
          aria-valuenow={step}
          className="bg-muted h-1.5 flex-1 overflow-hidden rounded-sm"
        >
          <div
            className="bg-primary h-full"
            style={{ width: `${(step / QUESTIONS.length) * 100}%` }}
          />
        </div>
        <span className="text-muted-foreground text-xs tabular-nums">
          {review ? t('reviewLabel') : t('step', { step: step + 1, total: QUESTIONS.length })}
        </span>
      </div>

      {!review && question ? (
        <form
          className="border-border bg-surface mt-4 rounded-lg border p-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (canContinue) setStep(step + 1);
          }}
        >
          <h2 ref={heading} tabIndex={-1} className="title-panel outline-none">
            {t(`questions.${question}.title`)}
          </h2>
          <p className="text-muted-foreground mt-1 mb-4 text-sm">
            {t(`questions.${question}.help`)}
          </p>

          {question === 'contact' && (
            <div className="grid gap-4 sm:grid-cols-2">
              {(['fullName', 'email', 'phone', 'location'] as const).map((key) => (
                <Field key={key} label={t(`contact.${key}`)}>
                  {(p) => (
                    <Input
                      {...p}
                      maxLength={300}
                      type={key === 'email' ? 'email' : 'text'}
                      value={contact[key]}
                      onChange={(e) => setContact({ ...contact, [key]: e.target.value })}
                    />
                  )}
                </Field>
              ))}
            </div>
          )}
          {question === 'target' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={recommendT('role')}>
                {(p) => (
                  <Input
                    {...p}
                    required
                    maxLength={300}
                    value={answers.targetRole}
                    onChange={(e) => answer({ targetRole: e.target.value })}
                  />
                )}
              </Field>
              <Field label={recommendT('industry')}>
                {(p) => (
                  <Input
                    {...p}
                    maxLength={300}
                    value={answers.industry}
                    onChange={(e) => answer({ industry: e.target.value })}
                  />
                )}
              </Field>
              <Field label={recommendT('level')}>
                {(p) => (
                  <Select
                    {...p}
                    value={answers.level}
                    onChange={(e) => answer({ level: e.target.value as Answers['level'] })}
                  >
                    {(['student', 'junior', 'mid', 'senior', 'lead'] as const).map((v) => (
                      <option key={v} value={v}>
                        {recommendT(`levels.${v}`)}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label={t('language')}>
                {(p) => (
                  <Select
                    {...p}
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as ContentLanguage)}
                  >
                    <option value="en">English</option>
                    <option value="km">ខ្មែរ</option>
                  </Select>
                )}
              </Field>
            </div>
          )}
          {LONG[question] && (
            <Textarea
              aria-label={t(`questions.${question}.title`)}
              rows={8}
              maxLength={6000}
              placeholder={t(`questions.${question}.placeholder`)}
              value={answers[LONG[question]]}
              onChange={(e) => answer({ [LONG[question]!]: e.target.value })}
            />
          )}
          {question === 'preferences' && (
            <div className="space-y-4">
              <Field label={recommendT('style')}>
                {(p) => (
                  <Select
                    {...p}
                    value={preferences.style}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        style: e.target.value as Preferences['style'],
                      })
                    }
                  >
                    {(['any', 'professional', 'modern', 'minimalist', 'creative'] as const).map(
                      (v) => (
                        <option key={v} value={v}>
                          {recommendT(`styles.${v}`)}
                        </option>
                      ),
                    )}
                  </Select>
                )}
              </Field>
              {(['ats', 'photo'] as const).map((key) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="accent-primary size-4"
                    checked={preferences[key]}
                    onChange={(e) => setPreferences({ ...preferences, [key]: e.target.checked })}
                  />
                  {recommendT(key)}
                </label>
              ))}
            </div>
          )}

          <div className="mt-5 flex justify-between">
            <Button disabled={step === 0} onClick={() => setStep(step - 1)}>
              <ArrowLeft />
              {t('back')}
            </Button>
            <Button type="submit" variant="primary" disabled={!canContinue}>
              {t(step === QUESTIONS.length - 1 ? 'toReview' : 'next')}
              <ArrowRight />
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-4 space-y-6">
          <h2 ref={heading} tabIndex={-1} className="title-panel outline-none">
            {t('reviewTitle')}
          </h2>
          <AiGate>
            <Button
              variant="primary"
              disabled={draftRequest.loading}
              onClick={() => void generate()}
            >
              <Sparkles />
              {t(draft ? 'regenerate' : 'generate')}
            </Button>
          </AiGate>
          {(recommendRequest.loading || recommendRequest.error || recommendRequest.data) && (
            <section>
              <h3 className="mb-2 font-semibold">{t('templates')}</h3>
              <AiStatusLine
                loading={recommendRequest.loading}
                error={recommendRequest.error}
                onRetry={() => void recommendRequest.retry()}
                onCancel={recommendRequest.reset}
              />
              {recommendRequest.data && (
                <Recommendations
                  result={recommendRequest.data}
                  selected={templateId || recommendRequest.data.recommendations[0]!.templateId}
                  useLabel={t('choose')}
                  onUse={setTemplate}
                />
              )}
            </section>
          )}
          <section className="space-y-3">
            <AiStatusLine
              loading={draftRequest.loading}
              error={draftRequest.error}
              onRetry={() => void draftRequest.retry()?.then((r) => r && setDraft(r))}
              onCancel={draftRequest.reset}
            />
            {draft && (
              <>
                <h3 className="font-semibold">{t('draft')}</h3>
                <p className="text-muted-foreground text-sm">{t('draftNote')}</p>
                {!!draft.removed?.length && (
                  <p className="bg-warning-soft text-warning rounded-md p-3 text-sm">
                    {t('removed', { names: draft.removed.join(', ') })}
                  </p>
                )}
                <DraftReview
                  draft={draft}
                  onChange={setDraft}
                  included={included}
                  setIncluded={setIncluded}
                />
              </>
            )}
          </section>
          <div className="border-border flex flex-wrap justify-between gap-2 border-t pt-4">
            <Button onClick={() => setStep(QUESTIONS.length - 1)}>
              <ArrowLeft />
              {t('back')}
            </Button>
            <Button
              variant={draft ? 'primary' : 'secondary'}
              disabled={creating || draftRequest.loading}
              onClick={finish}
            >
              {draft
                ? t('create', {
                    template: getTemplate(
                      templateId ||
                        recommendRequest.data?.recommendations[0]?.templateId ||
                        DEFAULT_TEMPLATE_ID,
                    ).name,
                  })
                : t('createBlank')}
              <ArrowRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
