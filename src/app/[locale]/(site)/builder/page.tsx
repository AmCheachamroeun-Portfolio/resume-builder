import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';
import { StartPanel } from '@/features/resume-management/start-panel';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/builder'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as 'en' | 'km', namespace: 'nav' });
  return { title: t('builder') };
}

export default async function BuilderStartPage({ params }: PageProps<'/[locale]/builder'>) {
  setRequestLocale((await params).locale);
  return (
    // useSearchParams needs a boundary for static rendering.
    <Suspense>
      <StartPanel />
    </Suspense>
  );
}
