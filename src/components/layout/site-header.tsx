'use client';

import { Menu as MenuIcon, Settings, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { Logo } from './logo';
import { LanguageMenu, ThemeMenu } from './preferences';

const LINKS = [
  { href: '/', key: 'home' },
  { href: '/templates', key: 'templates' },
  { href: '/builder', key: 'builder' },
  { href: '/resumes', key: 'resumes' },
] as const;

export function SiteHeader() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  const links = (mobile: boolean) =>
    LINKS.map(({ href, key }) => (
      <Link
        key={href}
        href={href}
        onClick={() => setOpen(false)}
        aria-current={isActive(href) ? 'page' : undefined}
        className={cn(
          'text-muted-foreground hover:text-foreground aria-[current=page]:text-foreground text-sm font-medium',
          mobile
            ? 'border-border block border-b py-3'
            : 'aria-[current=page]:border-primary flex h-14 items-center border-b-2 border-transparent',
        )}
      >
        {t(key)}
      </Link>
    ));

  return (
    <header className="border-border bg-background sticky top-0 z-40 border-b">
      <div className="container-page flex h-14 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Link href="/" aria-label="ResumeCraft AI">
            <Logo />
          </Link>
          <nav aria-label={t('main')} className="hidden gap-6 md:flex">
            {links(false)}
          </nav>
        </div>
        <div className="flex items-center gap-1">
          <LanguageMenu />
          <ThemeMenu />
          <Button asChild variant="ghost" size="icon-sm">
            <Link href="/settings" aria-label={t('settings')}>
              <Settings />
            </Link>
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
        <nav id="mobile-nav" aria-label={t('main')} className="container-page pb-2 md:hidden">
          {links(true)}
        </nav>
      )}
    </header>
  );
}
