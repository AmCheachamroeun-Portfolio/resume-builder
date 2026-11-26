import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ThemeScript } from '@/components/layout/theme-script';
import { AppToaster } from '@/components/shared/toaster';
import { routing } from '@/i18n/routing';
import '../fonts.css';
import '../globals.css';

type Props = LayoutProps<'/[locale]'>;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: hasLocale(routing.locales, locale) ? locale : routing.defaultLocale,
    namespace: 'meta',
  });
  return {
    title: { default: t('title'), template: '%s · ResumeCraft AI' },
    description: t('description'),
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f5f1' },
    { media: '(prefers-color-scheme: dark)', color: '#121416' },
  ],
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        {/* Not in a hand-written <head>: with one, React can lose its place while hydrating. */}
        <ThemeScript />
        <NextIntlClientProvider>
          {children}
          <AppToaster />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
