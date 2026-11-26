import { z } from 'zod';

/** Current on-disk schema. Bump together with a migration in lib/storage/migrations.ts */
export const SCHEMA_VERSION = 1;

const short = z.string().max(300).default('');
const long = z.string().max(8000).default('');
const id = z.string().min(1).max(64);
/** "YYYY" or "YYYY-MM", empty when unknown. */
const date = z
  .string()
  .regex(/^(\d{4}(-(0[1-9]|1[0-2]))?)?$/)
  .default('');
const list = <T extends z.ZodType>(item: T) => z.array(item).max(60).default([]);

/** Photos are stored inline so a JSON backup is self contained. Raster data URLs only. */
export const photoSchema = z
  .string()
  .max(1_500_000)
  .regex(/^(data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+)?$/)
  .default('');

export const personalSchema = z.object({
  fullName: short,
  headline: short,
  email: short,
  phone: short,
  location: short,
  linkedin: short,
  github: short,
  website: short,
  links: list(z.object({ id, label: short, url: short })),
  photo: photoSchema,
});

export const summarySchema = z.object({ professional: long, about: long, objective: long });

export const experienceSchema = z.object({
  id,
  company: short,
  title: short,
  employmentType: z
    .enum(['', 'full-time', 'part-time', 'contract', 'internship', 'freelance'])
    .default(''),
  location: short,
  start: date,
  end: date,
  current: z.boolean().default(false),
  description: long,
  achievements: long,
});

export const educationSchema = z.object({
  id,
  institution: short,
  degree: short,
  field: short,
  start: date,
  end: date,
  gpa: short,
  description: long,
});

export const skillSchema = z.object({
  id,
  name: short,
  category: short,
  /** 0 means "do not show a level". */
  level: z.number().int().min(0).max(5).default(0),
});

export const projectSchema = z.object({
  id,
  name: short,
  description: long,
  technologies: short,
  url: short,
  repo: short,
  date,
});

export const certificationSchema = z.object({
  id,
  name: short,
  issuer: short,
  issued: date,
  expires: date,
  credentialId: short,
  url: short,
});

export const languageSchema = z.object({
  id,
  name: short,
  level: z.enum(['', 'basic', 'conversational', 'professional', 'fluent', 'native']).default(''),
});

export const awardSchema = z.object({ id, title: short, issuer: short, date, description: long });

export const volunteerSchema = z.object({
  id,
  organization: short,
  role: short,
  start: date,
  end: date,
  current: z.boolean().default(false),
  description: long,
});

export const publicationSchema = z.object({
  id,
  title: short,
  publisher: short,
  date,
  url: short,
  description: long,
});

export const referenceSchema = z.object({
  id,
  name: short,
  relationship: short,
  company: short,
  email: short,
  phone: short,
});

export const interestSchema = z.object({ id, name: short });

export const customItemSchema = z.object({
  id,
  title: short,
  subtitle: short,
  date,
  description: long,
});

export const customSectionSchema = z.object({ id, title: short, items: list(customItemSchema) });

export const resumeDataSchema = z.object({
  personal: personalSchema.prefault({}),
  summary: summarySchema.prefault({}),
  experience: list(experienceSchema),
  education: list(educationSchema),
  skills: list(skillSchema),
  projects: list(projectSchema),
  certifications: list(certificationSchema),
  languages: list(languageSchema),
  awards: list(awardSchema),
  achievements: list(awardSchema),
  volunteer: list(volunteerSchema),
  publications: list(publicationSchema),
  references: list(referenceSchema),
  interests: list(interestSchema),
  custom: list(customSectionSchema),
});

export const FONT_IDS = [
  'inter',
  'source-sans',
  'source-serif',
  'lora',
  'plex',
  'manrope',
] as const;

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

/** Ranges are deliberately narrow so no combination produces an unreadable page. */
export const DESIGN_LIMITS = {
  bodySize: { min: 8.5, max: 12, step: 0.5 },
  headingSize: { min: 10, max: 16, step: 0.5 },
  nameSize: { min: 20, max: 40, step: 1 },
  lineHeight: { min: 1.25, max: 1.8, step: 0.05 },
  sectionSpacing: { min: 8, max: 28, step: 1 },
  margin: { min: 28, max: 64, step: 2 },
  photoSize: { min: 56, max: 132, step: 4 },
} as const;

const ranged = (key: keyof typeof DESIGN_LIMITS) =>
  z.number().min(DESIGN_LIMITS[key].min).max(DESIGN_LIMITS[key].max);

export const designSchema = z.object({
  accent: hex,
  secondary: hex,
  font: z.enum(FONT_IDS),
  bodySize: ranged('bodySize'),
  headingSize: ranged('headingSize'),
  nameSize: ranged('nameSize'),
  bodyWeight: z.union([z.literal(400), z.literal(500)]),
  headingWeight: z.union([z.literal(500), z.literal(600), z.literal(700)]),
  lineHeight: ranged('lineHeight'),
  sectionSpacing: ranged('sectionSpacing'),
  margin: ranged('margin'),
  headerAlign: z.enum(['left', 'center', 'right']),
  photoVisible: z.boolean(),
  photoSize: ranged('photoSize'),
  photoShape: z.enum(['circle', 'rounded', 'square']),
  pageSize: z.enum(['a4', 'letter']),
});

export const sectionStateSchema = z.object({ key: z.string().max(80), visible: z.boolean() });

export const resumeSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  id,
  title: z.string().max(120),
  templateId: z.string().max(60),
  /** Language of the document headings and dates, independent of the interface. */
  language: z.enum(['en', 'km']).default('en'),
  targetRole: short,
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
  data: resumeDataSchema,
  design: designSchema,
  sections: z.array(sectionStateSchema).max(80),
});

export type Resume = z.infer<typeof resumeSchema>;
export type ResumeData = z.infer<typeof resumeDataSchema>;
export type Design = z.infer<typeof designSchema>;
export type SectionState = z.infer<typeof sectionStateSchema>;
export type FontId = (typeof FONT_IDS)[number];
export type PageSize = Design['pageSize'];
export type ContentLanguage = Resume['language'];
export type Personal = ResumeData['personal'];
export type CustomSection = ResumeData['custom'][number];

export const LIST_SECTIONS = [
  'experience',
  'education',
  'skills',
  'projects',
  'certifications',
  'languages',
  'awards',
  'achievements',
  'volunteer',
  'publications',
  'references',
  'interests',
] as const;
export type ListSectionKey = (typeof LIST_SECTIONS)[number];
export type ListEntry<K extends ListSectionKey = ListSectionKey> = ResumeData[K][number];

export const ENTRY_SCHEMAS = {
  experience: experienceSchema,
  education: educationSchema,
  skills: skillSchema,
  projects: projectSchema,
  certifications: certificationSchema,
  languages: languageSchema,
  awards: awardSchema,
  achievements: awardSchema,
  volunteer: volunteerSchema,
  publications: publicationSchema,
  references: referenceSchema,
  interests: interestSchema,
} satisfies Record<ListSectionKey, z.ZodType>;
