'use client';

import { Check, Languages, Monitor, Moon, Sun } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Menu } from '@/components/ui/overlays';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { setTheme, useTheme, type Theme } from '@/lib/theme';

export const LOCALE_NAMES: Record<Locale, string> = { en: 'English', km: 'ខ្មែរ' };

export function useSwitchLocale() {
  const router = useRouter();
  const pathname = usePathname();
  // usePathname returns concrete segments, so resume ids are preserved.
  return (locale: Locale) => router.replace(pathname, { locale, scroll: false });
}

export function LanguageMenu() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const switchLocale = useSwitchLocale();
  return (
    <Menu
      trigger={
        <Button variant="ghost" size="sm" aria-label={t('language')}>
          <Languages />
          <span className="uppercase">{locale}</span>
        </Button>
      }
      items={routing.locales.map((code) => ({
        label: LOCALE_NAMES[code],
        checked: code === locale,
        icon: <Check className={code === locale ? '' : 'invisible'} />,
        onSelect: () => switchLocale(code),
      }))}
    />
  );
}

export const THEME_ICONS = { light: Sun, dark: Moon, system: Monitor };

export function ThemeMenu() {
  const t = useTranslations('theme');
  const theme = useTheme();
  const Icon = THEME_ICONS[theme];
  return (
    <Menu
      trigger={
        <Button variant="ghost" size="icon-sm" aria-label={t('label')}>
          <Icon />
        </Button>
      }
      items={(['light', 'dark', 'system'] as Theme[]).map((value) => {
        const ItemIcon = THEME_ICONS[value];
        return {
          label: t(value),
          icon: <ItemIcon />,
          checked: value === theme,
          onSelect: () => setTheme(value),
        };
      })}
    />
  );
}
