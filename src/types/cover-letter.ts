import { z } from 'zod';

const short = z.string().max(300).default('');

export const LETTER_TONES = ['professional', 'warm', 'direct'] as const;
export const LETTER_LIMITS = { body: 8000, jobDescription: 8000 } as const;

export const coverLetterSchema = z.object({
  id: z.string().min(1).max(64),
  title: short,
  /** The resume it was written from. It may since have been deleted. */
  resumeId: z.string().max(64).default(''),
  company: short,
  jobTitle: short,
  jobDescription: z.string().max(LETTER_LIMITS.jobDescription).default(''),
  tone: z.enum(LETTER_TONES).default('professional'),
  language: z.enum(['en', 'km']).default('en'),
  /** Copied from the resume so the letter still stands on its own. */
  sender: z
    .object({ fullName: short, headline: short, email: short, phone: short, location: short })
    .prefault({}),
  recipient: short,
  /** "YYYY-MM-DD" */
  date: z
    .string()
    .regex(/^(\d{4}-\d{2}-\d{2})?$/)
    .default(''),
  body: z.string().max(LETTER_LIMITS.body).default(''),
  pageSize: z.enum(['a4', 'letter']).default('a4'),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
});

export type CoverLetter = z.infer<typeof coverLetterSchema>;
