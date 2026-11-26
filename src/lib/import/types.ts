import { z } from 'zod';

/* What an imported document is turned into before the writer reviews it. */

const text = z.string();

export const importedContentSchema = z.object({
  headline: text,
  summary: text,
  experience: z
    .array(
      z.object({
        title: text,
        company: text,
        location: text,
        start: text,
        end: text,
        current: z.boolean(),
        description: text,
      }),
    )
    .max(30),
  education: z
    .array(
      z.object({
        degree: text,
        field: text,
        institution: text,
        start: text,
        end: text,
        description: text,
      }),
    )
    .max(15),
  skills: z.array(z.object({ name: text, category: text })).max(60),
  projects: z.array(z.object({ name: text, technologies: text, description: text })).max(30),
  certifications: z.array(z.object({ name: text, issuer: text, date: text })).max(30),
  languages: z
    .array(
      z.object({
        name: text,
        level: z.enum(['', 'basic', 'conversational', 'professional', 'fluent', 'native']),
      }),
    )
    .max(20),
  /** Anything that has no matching section, kept under its original heading. */
  other: z.array(z.object({ heading: text, text })).max(20),
});
export type ImportedContent = z.infer<typeof importedContentSchema>;

export type ImportedContact = {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  website: string;
};

export type Imported = ImportedContent & { contact: ImportedContact };

export const emptyContent = (): ImportedContent => ({
  headline: '',
  summary: '',
  experience: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
  languages: [],
  other: [],
});
