import { setRequestLocale } from 'next-intl/server';
import { useTranslations } from 'next-intl';
import { use } from 'react';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';

function SkipLink() {
  const t = useTranslations('nav');
  return (
    <a
      href="#content"
      className="bg-primary text-primary-foreground sr-only z-50 rounded-md px-3 py-2 text-sm focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
    >
      {t('skip')}
    </a>
  );
}

export default function SiteLayout({ children, params }: LayoutProps<'/[locale]'>) {
  const { locale } = use(params);
  setRequestLocale(locale);
  return (
    <div className="flex min-h-dvh flex-col">
      <SkipLink />
      <SiteHeader />
      <main id="content" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
