import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

export default function NotFound() {
  const t = useTranslations('notFound');
  return (
    <div className="container-page py-24 text-center">
      <h1 className="display text-3xl">{t('title')}</h1>
      <p className="text-muted-foreground mt-2">{t('body')}</p>
      <Button asChild variant="primary" className="mt-6">
        <Link href="/">{t('home')}</Link>
      </Button>
    </div>
  );
}
