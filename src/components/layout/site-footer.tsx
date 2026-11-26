import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Logo } from './logo';

export function SiteFooter() {
  const t = useTranslations('footer');
  const nav = useTranslations('nav');
  const columns = [
    {
      title: t('product'),
      links: [
        ['/templates', nav('templates')],
        ['/builder', nav('builder')],
        ['/builder/ai', t('guided')],
      ],
    },
    {
      title: t('yourData'),
      links: [
        ['/resumes', nav('resumes')],
        ['/settings', nav('settings')],
        ['/settings#privacy', t('privacy')],
      ],
    },
  ] as const;
  return (
    <footer className="border-border bg-surface border-t">
      <div className="container-page grid gap-8 py-10 sm:grid-cols-[2fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="text-muted-foreground mt-3 max-w-sm text-sm">{t('tagline')}</p>
        </div>
        {columns.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h2 className="text-sm font-semibold">{column.title}</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {column.links.map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="text-muted-foreground hover:text-foreground">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-border border-t">
        <p className="container-page text-muted-foreground py-4 text-xs">
          © {new Date().getFullYear()} ResumeCraft AI · {t('local')}
        </p>
      </div>
    </footer>
  );
}
