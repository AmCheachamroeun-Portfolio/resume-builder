import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ImportFlow } from '@/features/import/import-flow';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/import'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as 'en' | 'km', namespace: 'nav' });
  return { title: t('import') };
}

export default async function ImportPage({ params }: PageProps<'/[locale]/import'>) {
  setRequestLocale((await params).locale);
  return <ImportFlow />;
}
