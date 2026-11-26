import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'km'],
  defaultLocale: 'en',
  // Remembers the chosen interface language on this device for a year.
  localeCookie: { maxAge: 60 * 60 * 24 * 365 },
});

export type Locale = (typeof routing.locales)[number];
