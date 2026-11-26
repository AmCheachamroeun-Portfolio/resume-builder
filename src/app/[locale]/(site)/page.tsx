import { ArrowRight, Check } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import { Button } from '@/components/ui/button';
import { HeroWindow } from '@/features/landing/hero-window';
import { CustomiseDemo, SampleThumbnail } from '@/features/landing/previews';
import { getTemplate } from '@/features/resume-templates/registry';
import { Link } from '@/i18n/navigation';
import type { ContentLanguage } from '@/types/resume';

const FEATURED = ['executive-classic', 'modern-slate', 'navy-professional', 'minimal-white'];

function Showcase() {
  const t = useTranslations('landing.showcase');
  const locale = useLocale() as ContentLanguage;
  return (
    <section className="py-16 sm:py-24" aria-labelledby="showcase-title">
      <div className="container-page">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="showcase-title" className="title-section">
              {t('title')}
            </h2>
            <p className="text-muted-foreground mt-2 max-w-xl">{t('intro')}</p>
          </div>
          <Button asChild variant="link">
            <Link href="/templates">
              {t('all')}
              <ArrowRight />
            </Link>
          </Button>
        </div>
        <ul className="-mx-5 mt-8 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 lg:grid-cols-4">
          {FEATURED.map((id) => {
            const template = getTemplate(id);
            return (
              <li key={id} className="w-[72vw] shrink-0 snap-start sm:w-auto">
                <Link href={`/builder?template=${id}`} className="group block rounded-lg">
                  <span className="bg-desk block rounded-lg p-4 transition-colors">
                    <SampleThumbnail
                      templateId={id}
                      className="shadow-paper transition-transform duration-200 group-hover:-translate-y-1"
                    />
                  </span>
                  <span className="mt-3 block text-sm font-semibold">{template.name}</span>
                  <span className="text-muted-foreground mt-0.5 block text-[13px] leading-snug">
                    {template.description[locale]}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function Points({ items }: { items: string[] }) {
  return (
    <ul className="mt-5 space-y-2.5 text-sm">
      {items.map((item) => (
        <li key={item} className="flex gap-2.5">
          <Check aria-hidden className="text-primary mt-0.5 size-4 shrink-0" />
          {item}
        </li>
      ))}
    </ul>
  );
}

function Editing() {
  const t = useTranslations('landing.editing');
  return (
    <section className="border-border border-t py-16 sm:py-24">
      <div className="container-page grid items-center gap-10 lg:grid-cols-[2fr_3fr] lg:gap-16">
        <div>
          <h2 className="title-section">{t('title')}</h2>
          <p className="text-muted-foreground mt-3">{t('body')}</p>
          <Points items={['preview', 'order', 'undo'].map((key) => t(key))} />
        </div>
        <CustomiseDemo />
      </div>
    </section>
  );
}

function Writing() {
  const t = useTranslations('landing.writing');
  return (
    <section className="bg-surface border-border border-y py-16 sm:py-24">
      <div className="container-page">
        <h2 className="title-section max-w-2xl">{t('title')}</h2>
        <p className="text-muted-foreground mt-3 max-w-2xl">{t('body')}</p>
        <dl className="mt-10 grid gap-x-10 sm:grid-cols-2 lg:grid-cols-4">
          {['rewrite', 'tailor', 'letter', 'import'].map((key) => (
            <div key={key} className="border-foreground border-t py-4">
              <dt className="text-sm font-semibold">{t(`items.${key}.title`)}</dt>
              <dd className="text-muted-foreground mt-1.5 text-sm">{t(`items.${key}.body`)}</dd>
            </div>
          ))}
        </dl>
        <p className="text-muted-foreground mt-4 max-w-2xl text-[13px]">{t('rules')}</p>
      </div>
    </section>
  );
}

function Privacy() {
  const t = useTranslations('landing.privacy');
  const columns = [
    { key: 'device', items: ['drafts', 'files', 'history', 'ats'] },
    { key: 'sent', items: ['ask', 'only', 'excluded'] },
  ];
  return (
    <section className="py-16 sm:py-24">
      <div className="container-page grid gap-10 lg:grid-cols-[2fr_3fr] lg:gap-16">
        <div>
          <h2 className="title-section">{t('title')}</h2>
          <p className="text-muted-foreground mt-3">{t('body')}</p>
          <Button asChild variant="link" className="mt-3">
            <Link href="/settings#privacy">
              {t('more')}
              <ArrowRight />
            </Link>
          </Button>
        </div>
        <div className="bg-surface border-border divide-border grid divide-y rounded-xl border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          {columns.map(({ key, items }) => (
            <div key={key} className="p-5">
              <h3 className="text-sm font-semibold">{t(`${key}.title`)}</h3>
              <ul className="text-muted-foreground mt-3 space-y-3 text-sm">
                {items.map((item) => (
                  <li key={item}>{t(`${key}.${item}`)}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Export() {
  const t = useTranslations('landing.export');
  return (
    <section className="border-border border-t py-16 sm:py-24">
      <div className="container-page grid items-center gap-10 lg:grid-cols-[3fr_2fr] lg:gap-16">
        <div className="bg-desk order-2 flex h-80 justify-center overflow-hidden rounded-xl px-8 pt-8 lg:order-1">
          <div className="w-full max-w-sm">
            <SampleThumbnail templateId="ats-essential" className="shadow-paper" />
          </div>
        </div>
        <div className="order-1 lg:order-2">
          <h2 className="title-section">{t('title')}</h2>
          <p className="text-muted-foreground mt-3">{t('body')}</p>
          <Points items={['pdf', 'word', 'ats'].map((key) => t(key))} />
        </div>
      </div>
    </section>
  );
}

function Steps() {
  const t = useTranslations('landing.steps');
  return (
    <section
      id="how-it-works"
      className="bg-surface border-border scroll-mt-14 border-y py-16 sm:py-20"
    >
      <div className="container-page">
        <h2 className="title-section">{t('title')}</h2>
        <ol className="mt-8 grid gap-8 md:grid-cols-3">
          {['choose', 'add', 'download'].map((key, index) => (
            <li key={key} className="border-border border-t pt-4">
              <span className="text-primary text-sm font-semibold tabular-nums">{index + 1}</span>
              <h3 className="title-panel mt-2">{t(`${key}.title`)}</h3>
              <p className="text-muted-foreground mt-1.5 text-sm">{t(`${key}.body`)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Home() {
  const t = useTranslations('landing');
  return (
    <>
      <section className="pt-14 pb-4 sm:pt-20">
        <div className="container-page text-center">
          <h1 className="title-hero mx-auto max-w-3xl">{t('hero.title')}</h1>
          <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-[17px] leading-relaxed">
            {t('hero.body')}
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button asChild variant="primary" size="lg">
              <Link href="/builder">{t('hero.primary')}</Link>
            </Button>
            <Button asChild size="lg">
              <Link href="/templates">{t('hero.secondary')}</Link>
            </Button>
          </div>
          <p className="text-muted-foreground mt-4 text-[13px]">{t('hero.note')}</p>
          <div className="mx-auto mt-10 max-w-6xl">
            <HeroWindow />
          </div>
        </div>
      </section>
      <Showcase />
      <Editing />
      <Writing />
      <Privacy />
      <Export />
      <Steps />
      <section className="py-20 text-center sm:py-24">
        <div className="container-page">
          <h2 className="title-section">{t('final.title')}</h2>
          <p className="text-muted-foreground mx-auto mt-3 max-w-md">{t('final.body')}</p>
          <Button asChild variant="primary" size="lg" className="mt-6">
            <Link href="/builder">{t('hero.primary')}</Link>
          </Button>
        </div>
      </section>
    </>
  );
}

export default function HomePage({ params }: PageProps<'/[locale]'>) {
  const { locale } = use(params);
  setRequestLocale(locale);
  return <Home />;
}
