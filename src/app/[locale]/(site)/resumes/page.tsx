import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ResumeLibrary } from '@/features/resume-management/resume-library';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/resumes'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as 'en' | 'km', namespace: 'nav' });
  return { title: t('resumes') };
}

export default async function ResumesPage({ params }: PageProps<'/[locale]/resumes'>) {
  setRequestLocale((await params).locale);
  return <ResumeLibrary />;
}
