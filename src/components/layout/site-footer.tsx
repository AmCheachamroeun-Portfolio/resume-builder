import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Logo } from './logo';

export function SiteFooter() {
  const t = useTranslations('footer');
  const nav = useTranslations('nav');
  const links = [
    ['/templates', nav('templates')],
    ['/builder', nav('create')],
    ['/resumes', nav('resumes')],
    ['/letters', nav('letters')],
    ['/import', nav('import')],
    ['/settings', nav('settings')],
    ['/settings#privacy', t('privacy')],
  ] as const;
  return (
    <footer className="border-border border-t">
      <div className="container-page flex flex-col gap-5 py-8 md:flex-row md:items-start md:justify-between">
        <div>
          <Logo />
          <p className="text-muted-foreground mt-2 max-w-xs text-[13px]">{t('local')}</p>
        </div>
        <nav aria-label={t('label')}>
          <ul className="flex max-w-xl flex-wrap gap-x-5 gap-y-2 text-[13px] md:justify-end">
            {links.map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="text-muted-foreground hover:text-foreground">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
