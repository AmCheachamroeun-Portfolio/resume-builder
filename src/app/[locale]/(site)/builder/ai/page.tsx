import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { GuidedCreation } from '@/features/ai-assistant/guided-creation';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/builder/ai'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as 'en' | 'km', namespace: 'guided' });
  return { title: t('title') };
}

export default async function GuidedPage({ params }: PageProps<'/[locale]/builder/ai'>) {
  setRequestLocale((await params).locale);
  return <GuidedCreation />;
}
