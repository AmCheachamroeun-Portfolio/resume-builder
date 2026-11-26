import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { LetterEditor } from '@/features/cover-letters/letter-editor';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/letters/[id]'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as 'en' | 'km', namespace: 'nav' });
  // Letters exist only in this browser, so there is nothing for search engines.
  return { title: t('letters'), robots: { index: false } };
}

export default async function LetterPage({ params }: PageProps<'/[locale]/letters/[id]'>) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <LetterEditor id={id} />;
}
