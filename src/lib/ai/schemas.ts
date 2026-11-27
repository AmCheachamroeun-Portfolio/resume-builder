import { z } from 'zod';
import { TEMPLATES } from '@/features/resume-templates/registry';
import { importedContentSchema } from '@/lib/import/types';
import { LETTER_LIMITS, LETTER_TONES } from '@/types/cover-letter';

/* Shared contract between the browser and the route handlers. */

const language = z.enum(['en', 'km']);
const line = z.string().trim().max(300);
const block = z.string().trim().max(6000);
const context = z.string().trim().min(1).max(14000);

export const IMPROVE_MODES = [
  'improve',
  'professional',
  'concise',
  'grammar',
  'verbs',
  'clarity',
  'repetition',
  'bullets',
] as const;
export type ImproveMode = (typeof IMPROVE_MODES)[number];

export const REVIEW_AREAS = [
  'completeness',
  'clarity',
  'readability',
  'tone',
  'organisation',
  'keywords',
  'missing',
  'repetition',
] as const;

const templateIds = TEMPLATES.map((t) => t.id) as [string, ...string[]];

export const draftAnswersSchema = z.object({
  targetRole: line.min(1),
  industry: line,
  level: z.enum(['student', 'junior', 'mid', 'senior', 'lead']),
  work: block,
  education: block,
  skills: block,
  extras: block,
  goals: block,
});

export const AI_REQUESTS = {
  chat: z.object({
    language,
    messages: z
      .array(
        z.object({ role: z.enum(['user', 'model']), text: z.string().trim().min(1).max(4000) }),
      )
      .min(1)
      .max(20),
    context: z.string().max(14000).optional(),
  }),
  'recommend-template': z.object({
    language,
    targetRole: line.min(1),
    industry: line,
    level: z.enum(['student', 'junior', 'mid', 'senior', 'lead']),
    style: z.enum(['any', 'professional', 'modern', 'minimalist', 'creative']),
    ats: z.boolean(),
    photo: z.boolean(),
    requirements: z.string().trim().max(4000).optional(),
  }),
  'generate-summary': z.object({ language, context, targetRole: line, goals: block }),
  'improve-experience': z.object({
    language,
    text: block.min(1),
    role: line,
    mode: z.enum(IMPROVE_MODES),
  }),
  'suggest-skills': z.object({
    language,
    context,
    targetRole: line.min(1),
    existing: z.array(line).max(60),
  }),
  'review-resume': z.object({ language, context, targetRole: line }),
  'tailor-resume': z.object({
    language,
    context,
    jobDescription: z.string().trim().min(40).max(8000),
    /** The pieces of writing a rewrite may be proposed for. */
    fields: z
      .array(
        z.object({
          id: z.string().min(1).max(8),
          label: line,
          text: z.string().trim().min(1).max(4000),
        }),
      )
      .max(20),
  }),
  'generate-draft': z.object({ language, answers: draftAnswersSchema }),
  'cover-letter': z.object({
    language,
    context,
    tone: z.enum(LETTER_TONES),
    company: line.min(1),
    jobTitle: line.min(1),
    jobDescription: z.string().trim().max(LETTER_LIMITS.jobDescription),
  }),
  'parse-resume': z.object({ language, text: z.string().trim().min(40).max(24_000) }),
};

export type AiAction = keyof typeof AI_REQUESTS;
export type AiRequest<A extends AiAction> = z.infer<(typeof AI_REQUESTS)[A]>;

const text = z.string();
const texts = z.array(z.string()).max(25);

export const AI_RESPONSES = {
  chat: z.object({ reply: text.min(1) }),
  'recommend-template': z.object({
    recommendations: z
      .array(z.object({ templateId: z.enum(templateIds), reason: text }))
      .min(1)
      .max(3),
  }),
  'generate-summary': z.object({
    options: z
      .array(
        z.object({ style: z.enum(['concise', 'achievement', 'narrative']), text: text.min(1) }),
      )
      .min(1)
      .max(3),
  }),
  'improve-experience': z.object({ text: text.min(1), changes: texts }),
  'suggest-skills': z.object({
    skills: z.array(z.object({ name: text.min(1), category: text, reason: text })).max(15),
  }),
  'review-resume': z.object({
    overall: text,
    items: z
      .array(
        z.object({
          area: z.enum(REVIEW_AREAS),
          priority: z.enum(['high', 'medium', 'low']),
          finding: text,
          recommendation: text,
        }),
      )
      .max(14),
  }),
  'tailor-resume': z.object({
    requirements: z
      .array(
        z.object({
          requirement: text.min(1),
          met: z.enum(['yes', 'partly', 'no']),
          evidence: text,
        }),
      )
      .max(15),
    suggestions: z.array(z.object({ field: text, text: text.min(1), reason: text })).max(8),
    emphasise: texts,
  }),
  'generate-draft': z.object({
    headline: text,
    summary: text,
    experience: z
      .array(
        z.object({
          company: text,
          title: text,
          location: text,
          start: text,
          end: text,
          current: z.boolean(),
          description: text,
        }),
      )
      .max(12),
    education: z
      .array(
        z.object({
          institution: text,
          degree: text,
          field: text,
          start: text,
          end: text,
          description: text,
        }),
      )
      .max(8),
    skills: z.array(z.object({ name: text, category: text })).max(30),
    projects: z.array(z.object({ name: text, technologies: text, description: text })).max(10),
    certifications: z.array(z.object({ name: text, issuer: text })).max(10),
    languages: z
      .array(
        z.object({
          name: text,
          level: z.enum(['', 'basic', 'conversational', 'professional', 'fluent', 'native']),
        }),
      )
      .max(10),
  }),
  'cover-letter': z.object({ body: text.min(1) }),
  'parse-resume': importedContentSchema,
};

export type AiResponse<A extends AiAction> = z.infer<(typeof AI_RESPONSES)[A]>;
export type Draft = AiResponse<'generate-draft'> & { removed?: string[] };

export const AI_ERROR_CODES = [
  'missing-key',
  'invalid-key',
  'model-unavailable',
  'cancelled',
  'invalid-request',
  'forbidden',
  'rate-limited',
  'quota',
  'timeout',
  'bad-response',
  'blocked',
  'too-long',
  'unverified',
  'upstream',
  'network',
  'daily-limit',
] as const;
export type AiErrorCode = (typeof AI_ERROR_CODES)[number];
