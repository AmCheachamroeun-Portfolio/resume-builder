import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Editor } from '@/features/resume-builder/editor';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/builder/[id]'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as 'en' | 'km', namespace: 'nav' });
  // Drafts exist only in this browser, so there is nothing for search engines.
  return { title: t('builder'), robots: { index: false } };
}

export default async function EditorPage({ params }: PageProps<'/[locale]/builder/[id]'>) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <Editor id={id} />;
}
