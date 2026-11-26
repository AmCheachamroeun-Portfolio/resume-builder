import { z } from 'zod';
import { safeHref } from '@/lib/url';
import { ENTRY_SCHEMAS, personalSchema, type ListSectionKey } from '@/types/resume';

/*
 * Inline validation. These rules guide the writer but never block saving, so a
 * half-typed address is still kept. Messages are translation keys.
 */
const email = z.union([z.literal(''), z.email()]);
export const isUrl = (value: string) => !value.trim() || safeHref(value) !== null;
const isPhone = (value: string) => !value.trim() || /^\+?[\d\s().-]{6,}$/.test(value.trim());

type Values = Record<string, unknown>;

function check(values: Values, context: z.RefinementCtx) {
  const issue = (path: string, message: string) =>
    context.addIssue({ code: 'custom', path: [path], message });
  for (const key of ['url', 'repo', 'linkedin', 'github', 'website']) {
    if (typeof values[key] === 'string' && !isUrl(values[key])) issue(key, 'url');
  }
  if (typeof values.email === 'string' && !email.safeParse(values.email.trim()).success) {
    issue('email', 'email');
  }
  if (typeof values.phone === 'string' && !isPhone(values.phone)) issue('phone', 'phone');
  const before = (a: unknown, b: unknown) =>
    typeof a === 'string' && typeof b === 'string' && a && b && b.localeCompare(a) < 0;
  // "2024" and "2024-05" compare sensibly only on their shared precision.
  const trim = (a: unknown, b: unknown) => {
    const length = Math.min(String(a ?? '').length, String(b ?? '').length);
    return [String(a ?? '').slice(0, length), String(b ?? '').slice(0, length)] as const;
  };
  if (!values.current && before(...trim(values.start, values.end))) issue('end', 'dateOrder');
  if (before(...trim(values.issued, values.expires))) issue('expires', 'dateOrder');
}

export const personalFormSchema = personalSchema.superRefine(check);

export function entryFormSchema(section: ListSectionKey) {
  return (ENTRY_SCHEMAS[section] as z.ZodType<Values, Values>).superRefine(check);
}
