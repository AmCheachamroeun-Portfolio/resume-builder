import { BUILT_IN_SECTIONS } from '@/constants/sections';
import { getTemplate } from '@/features/resume-templates/registry';
import { createId } from '@/lib/utils';
import {
  resumeDataSchema,
  SCHEMA_VERSION,
  type ContentLanguage,
  type Design,
  type Resume,
  type ResumeData,
  type SectionState,
} from '@/types/resume';

export function defaultSections(templateId: string): SectionState[] {
  const preferred = getTemplate(templateId).sectionOrder ?? [];
  return [...new Set([...preferred, ...BUILT_IN_SECTIONS])].map((key) => ({ key, visible: true }));
}

export function createResume(options: {
  templateId: string;
  title: string;
  language?: ContentLanguage;
  data?: ResumeData;
  targetRole?: string;
  /** Choices made before creation, such as an accent colour picked in the gallery. */
  design?: Partial<Design>;
  id?: string;
}): Resume {
  const template = getTemplate(options.templateId);
  const now = Date.now();
  const data = options.data ?? resumeDataSchema.parse({});
  return {
    schemaVersion: SCHEMA_VERSION,
    id: options.id ?? createId(),
    title: options.title,
    templateId: template.id,
    language: options.language ?? 'en',
    targetRole: options.targetRole ?? '',
    createdAt: now,
    updatedAt: now,
    data,
    design: { ...template.design, ...options.design },
    sections: [
      ...defaultSections(template.id),
      ...data.custom.map((c) => ({ key: `custom:${c.id}`, visible: true })),
    ],
  };
}

/**
 * Switching templates only swaps the look. Content and section order are untouched;
 * design values reset to the new template, keeping choices that are about the
 * document itself (paper size, photo visibility).
 */
export function switchTemplate(resume: Resume, templateId: string): Resume {
  const template = getTemplate(templateId);
  if (template.id === resume.templateId) return resume;
  return {
    ...resume,
    templateId: template.id,
    design: {
      ...template.design,
      pageSize: resume.design.pageSize,
      photoVisible: resume.design.photoVisible,
    },
  };
}

/** Guarantees every built-in and custom section appears exactly once. */
export function normaliseSections(resume: Resume): Resume {
  const valid = new Set<string>([
    ...BUILT_IN_SECTIONS,
    ...resume.data.custom.map((c) => `custom:${c.id}`),
  ]);
  const seen = new Set<string>();
  const sections = resume.sections.filter((s) => {
    if (!valid.has(s.key) || seen.has(s.key)) return false;
    seen.add(s.key);
    return true;
  });
  for (const key of valid) if (!seen.has(key)) sections.push({ key, visible: true });
  return { ...resume, sections };
}
