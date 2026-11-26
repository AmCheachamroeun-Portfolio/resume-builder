import type { Draft } from '@/lib/ai/schemas';
import { createId } from '@/lib/utils';
import { resumeDataSchema, type ResumeData } from '@/types/resume';

export const DRAFT_PARTS = [
  'experience',
  'education',
  'skills',
  'projects',
  'certifications',
  'languages',
] as const;
export type DraftPart = (typeof DRAFT_PARTS)[number];

export type Contact = { fullName: string; email: string; phone: string; location: string };

/** Combines the reviewed AI draft with contact details that never left the device. */
export function draftToData(
  draft: Draft | null,
  contact: Contact,
  included: ReadonlySet<DraftPart>,
): ResumeData {
  const clip = (value: unknown) =>
    Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        typeof v === 'string' ? v.slice(0, k === 'description' ? 8000 : 300) : v,
      ]),
    );
  const part = <K extends DraftPart>(key: K) =>
    draft && included.has(key) ? draft[key].map((item) => ({ ...clip(item), id: createId() })) : [];
  return resumeDataSchema.parse({
    personal: { ...contact, headline: draft?.headline.slice(0, 300) ?? '' },
    summary: { professional: draft?.summary.slice(0, 8000) ?? '' },
    ...Object.fromEntries(DRAFT_PARTS.map((key) => [key, part(key)])),
  });
}
