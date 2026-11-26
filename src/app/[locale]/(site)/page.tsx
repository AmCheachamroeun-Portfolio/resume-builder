import { ArrowRight, Check, ChevronDown, PenLine, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { use, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { CustomiseDemo, HeroSheets, SampleThumbnail } from '@/features/landing/previews';
import { getTemplate } from '@/features/resume-templates/registry';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

const FEATURED = ['modern-slate', 'elegant-serif', 'corporate-edge', 'designer-profile'];

function Section({
  title,
  intro,
  children,
  className,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('border-border border-t py-16', className)}>
      <div className="container-page">
        <h2 className="display text-3xl">{title}</h2>
        {intro && <p className="text-muted-foreground mt-2 max-w-2xl">{intro}</p>}
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}

function Checklist({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <Check aria-hidden className="text-primary mt-1 size-4 shrink-0" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function HomePage({ params }: PageProps<'/[locale]'>) {
  setRequestLocale(use(params).locale);
  const t = useTranslations('landing');
  const keys = (...names: string[]) => names;

  return (
    <>
      <section className="py-10 lg:py-14">
        <div className="container-page grid items-center gap-10 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <p className="text-primary text-sm font-semibold">{t('hero.eyebrow')}</p>
            <h1 className="display mt-3 text-4xl leading-[1.12] sm:text-5xl">{t('hero.title')}</h1>
            <p className="text-muted-foreground mt-5 max-w-lg text-lg">{t('hero.body')}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild variant="primary" size="lg">
                <Link href="/builder">
                  {t('hero.primary')}
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg">
                <Link href="/templates">{t('hero.secondary')}</Link>
              </Button>
            </div>
            <ul className="text-muted-foreground mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {keys('noAccount', 'onDevice', 'noWatermark').map((key) => (
                <li key={key} className="flex items-center gap-1.5">
                  <Check aria-hidden className="text-primary size-4" />
                  {t(`hero.${key}`)}
                </li>
              ))}
            </ul>
          </div>
          <HeroSheets />
        </div>
      </section>

      <Section title={t('featured.title')} intro={t('featured.intro')}>
        <ul className="grid grid-cols-2 gap-x-5 gap-y-8 lg:grid-cols-4">
          {FEATURED.map((id) => (
            <li key={id}>
              <Link
                href={{ pathname: '/builder', query: { template: id } }}
                className="group block"
              >
                <span className="bg-desk block rounded-md p-3 sm:p-4">
                  <SampleThumbnail
                    templateId={id}
                    className="shadow-paper transition-transform group-hover:-translate-y-1"
                  />
                </span>
                <span className="mt-3 block text-sm font-semibold">{getTemplate(id).name}</span>
                <span className="text-primary text-sm group-hover:underline">
                  {t('featured.use')}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <Button asChild className="mt-8">
          <Link href="/templates">
            {t('featured.all')}
            <ArrowRight />
          </Link>
        </Button>
      </Section>

      <Section title={t('how.title')} className="bg-surface">
        <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {keys('choose', 'write', 'design', 'download').map((key, i) => (
            <li key={key} className="border-foreground border-t-2 pt-4">
              <span className="text-primary text-sm font-bold tabular-nums">{i + 1}</span>
              <h3 className="mt-1 font-semibold">{t(`how.${key}.title`)}</h3>
              <p className="text-muted-foreground mt-1.5 text-sm">{t(`how.${key}.body`)}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section title={t('methods.title')} intro={t('methods.intro')}>
        <div className="border-border bg-surface divide-border grid divide-y rounded-lg border md:grid-cols-2 md:divide-x md:divide-y-0">
          {(
            [
              ['manual', '/templates', PenLine],
              ['guided', '/builder/ai', Sparkles],
            ] as const
          ).map(([key, href, Icon]) => (
            <div key={key} className="flex flex-col p-6 sm:p-8">
              <Icon aria-hidden className="text-primary size-5" />
              <h3 className="display mt-3 text-xl">{t(`methods.${key}.title`)}</h3>
              <p className="text-muted-foreground mt-2 flex-1">{t(`methods.${key}.body`)}</p>
              <Button asChild variant="link" className="mt-4 self-start">
                <Link href={href}>
                  {t(`methods.${key}.action`)}
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </Section>

      <Section title={t('customise.title')} intro={t('customise.intro')}>
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.3fr]">
          <Checklist
            items={keys('type', 'layout', 'order', 'history').map((k) => t(`customise.${k}`))}
          />
          <CustomiseDemo />
        </div>
      </Section>

      <Section title={t('assistant.title')} intro={t('assistant.intro')} className="bg-surface">
        <div className="grid gap-10 md:grid-cols-2">
          <dl className="divide-border border-border divide-y border-y">
            {keys('summary', 'bullets', 'tailor', 'review').map((key) => (
              <div key={key} className="py-4">
                <dt className="font-semibold">{t(`assistant.${key}.title`)}</dt>
                <dd className="text-muted-foreground mt-1 text-sm">{t(`assistant.${key}.body`)}</dd>
              </div>
            ))}
          </dl>
          <div className="bg-primary-soft self-start rounded-lg p-6 sm:p-8">
            <h3 className="display text-xl">{t('assistant.rulesTitle')}</h3>
            <div className="mt-4 text-sm">
              <Checklist
                items={keys('invent', 'approve', 'consent', 'optional').map((k) =>
                  t(`assistant.rules.${k}`),
                )}
              />
            </div>
          </div>
        </div>
      </Section>

      <Section title={t('ats.title')} intro={t('ats.intro')}>
        <div className="grid items-center gap-10 md:grid-cols-[minmax(0,20rem)_1fr]">
          <div className="bg-desk rounded-lg p-5">
            <SampleThumbnail templateId="ats-essential" className="shadow-paper" />
          </div>
          <div>
            <Checklist
              items={keys('column', 'headings', 'text', 'check').map((k) => t(`ats.${k}`))}
            />
            <p className="border-warning bg-warning-soft mt-6 border-l-2 px-4 py-3 text-sm">
              {t('ats.disclaimer')}
            </p>
          </div>
        </div>
      </Section>

      <Section title={t('faq.title')} className="bg-surface">
        <div className="border-border divide-border max-w-3xl divide-y border-y">
          {keys('free', 'storage', 'devices', 'pdf', 'ai', 'khmer').map((key) => (
            <details key={key} className="group">
              <summary className="flex items-center justify-between gap-4 py-4 font-medium [&::-webkit-details-marker]:hidden">
                {t(`faq.${key}.q`)}
                <ChevronDown
                  aria-hidden
                  className="text-muted-foreground size-4 shrink-0 transition-transform group-open:rotate-180"
                />
              </summary>
              <p className="text-muted-foreground pb-5">{t(`faq.${key}.a`)}</p>
            </details>
          ))}
        </div>
      </Section>

      <section className="bg-primary text-primary-foreground py-14">
        <div className="container-page flex flex-wrap items-center justify-between gap-6">
          <div>
            <h2 className="display text-3xl">{t('final.title')}</h2>
            <p className="mt-2 opacity-90">{t('final.body')}</p>
          </div>
          <Button asChild size="lg">
            <Link href="/builder">
              {t('hero.primary')}
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
