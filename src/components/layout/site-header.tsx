'use client';

import { Menu as MenuIcon, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Link, usePathname } from '@/i18n/navigation';
import { Logo } from './logo';
import { LanguageMenu, ThemeMenu } from './preferences';

const LINKS = [
  { href: '/templates', key: 'templates' },
  { href: '/#how-it-works', key: 'how' },
  { href: '/resumes', key: 'resumes' },
  { href: '/letters', key: 'letters' },
] as const;

/** Reached from the phone menu; on wide screens these live in My resumes and the footer. */
const MORE = [
  { href: '/import', key: 'import' },
  { href: '/settings', key: 'settings' },
] as const;

export function SiteHeader() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const current = (href: string) =>
    !href.includes('#') && pathname.startsWith(href) ? ('page' as const) : undefined;

  return (
    <header className="border-border bg-background/95 supports-backdrop-filter:bg-background/80 sticky top-0 z-40 border-b supports-backdrop-filter:backdrop-blur-md">
      <div className="container-page flex h-13 items-center gap-6">
        <Link href="/" aria-label="ResumeCraft" className="shrink-0 rounded-md">
          <Logo />
        </Link>
        <nav aria-label={t('main')} className="hidden gap-1 md:flex">
          {LINKS.map(({ href, key }) => (
            <Link
              key={href}
              href={href}
              aria-current={current(href)}
              className="text-muted-foreground hover:text-foreground aria-[current=page]:text-foreground aria-[current=page]:bg-muted rounded-md px-2.5 py-1 text-[13px] font-medium transition-colors"
            >
              {t(key)}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-0.5">
          <LanguageMenu />
          <ThemeMenu />
          <Button asChild variant="primary" size="sm" className="ml-2 max-sm:hidden">
            <Link href="/builder">{t('create')}</Link>
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={t('menu')}
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <MenuIcon />}
          </Button>
        </div>
      </div>
      {open && (
        <nav
          id="mobile-nav"
          aria-label={t('main')}
          className="container-page border-border max-h-[calc(100dvh-3.25rem)] overflow-y-auto border-t pt-1 pb-4 md:hidden"
        >
          {[...LINKS, ...MORE].map(({ href, key }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              aria-current={current(href)}
              className="border-border aria-[current=page]:text-primary block border-b py-3 text-sm font-medium"
            >
              {t(key)}
            </Link>
          ))}
          <Button asChild variant="primary" size="lg" className="mt-4 w-full">
            <Link href="/builder" onClick={() => setOpen(false)}>
              {t('create')}
            </Link>
          </Button>
        </nav>
      )}
    </header>
  );
}
