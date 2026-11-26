import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { TemplateGallery } from '@/features/resume-templates/gallery';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/templates'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as 'en' | 'km', namespace: 'nav' });
  return { title: t('templates') };
}

export default async function TemplatesPage({ params }: PageProps<'/[locale]/templates'>) {
  setRequestLocale((await params).locale);
  return <TemplateGallery />;
}
