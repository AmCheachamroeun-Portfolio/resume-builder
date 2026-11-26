import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { LetterLibrary } from '@/features/cover-letters/letter-library';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/letters'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as 'en' | 'km', namespace: 'nav' });
  return { title: t('letters') };
}

export default async function LettersPage({ params }: PageProps<'/[locale]/letters'>) {
  setRequestLocale((await params).locale);
  return <LetterLibrary />;
}
