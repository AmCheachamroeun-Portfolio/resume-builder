import { createId } from '@/lib/utils';
import { resumeDataSchema, type ResumeData } from '@/types/resume';
import type { Imported } from './types';

export const DATE_PATTERN = /^(\d{4}(-(0[1-9]|1[0-2]))?)?$/;

const short = (value: string) => value.trim().slice(0, 300);
const long = (value: string) => value.trim().slice(0, 8000);
const date = (value: string) => (DATE_PATTERN.test(value.trim()) ? value.trim() : '');

/** Turns reviewed import results into resume data, within the stored limits. */
export function importedToData(imported: Imported, otherTitle: string): ResumeData {
  const { contact } = imported;
  const list = <T>(items: T[], keep: (item: T) => boolean) => items.filter(keep).slice(0, 60);
  const filled = (item: object) =>
    Object.values(item).some((v) => typeof v === 'string' && v.trim());

  return resumeDataSchema.parse({
    personal: {
      ...Object.fromEntries(Object.entries(contact).map(([k, v]) => [k, short(v)])),
      headline: short(imported.headline),
    },
    summary: { professional: long(imported.summary) },
    experience: list(imported.experience, filled).map((x) => ({
      id: createId(),
      title: short(x.title),
      company: short(x.company),
      location: short(x.location),
      start: date(x.start),
      end: x.current ? '' : date(x.end),
      current: x.current,
      description: long(x.description),
    })),
    education: list(imported.education, filled).map((x) => ({
      id: createId(),
      degree: short(x.degree),
      field: short(x.field),
      institution: short(x.institution),
      start: date(x.start),
      end: date(x.end),
      description: long(x.description),
    })),
    skills: list(imported.skills, (x) => Boolean(x.name.trim())).map((x) => ({
      id: createId(),
      name: short(x.name),
      category: short(x.category),
    })),
    projects: list(imported.projects, filled).map((x) => ({
      id: createId(),
      name: short(x.name),
      technologies: short(x.technologies),
      description: long(x.description),
    })),
    certifications: list(imported.certifications, filled).map((x) => ({
      id: createId(),
      name: short(x.name),
      issuer: short(x.issuer),
      issued: date(x.date),
    })),
    languages: list(imported.languages, (x) => Boolean(x.name.trim())).map((x) => ({
      id: createId(),
      name: short(x.name),
      level: x.level,
    })),
    custom: imported.other
      .filter((section) => section.text.trim())
      .slice(0, 20)
      .map((section) => ({
        id: createId(),
        title: short(section.heading) || otherTitle,
        items: [{ id: createId(), description: long(section.text) }],
      })),
  });
}
