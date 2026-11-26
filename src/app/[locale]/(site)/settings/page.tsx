import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SettingsPanel } from '@/features/resume-management/settings-panel';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/settings'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as 'en' | 'km', namespace: 'nav' });
  return { title: t('settings') };
}

export default async function SettingsPage({ params }: PageProps<'/[locale]/settings'>) {
  setRequestLocale((await params).locale);
  return <SettingsPanel />;
}
