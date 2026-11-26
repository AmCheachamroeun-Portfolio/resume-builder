import { LIST_SECTIONS, type ListSectionKey } from '@/types/resume';

export type BuiltInSection = 'summary' | ListSectionKey;
export const BUILT_IN_SECTIONS: BuiltInSection[] = ['summary', ...LIST_SECTIONS];

export type FieldType = 'text' | 'email' | 'tel' | 'url' | 'date' | 'rich' | 'check' | 'select';

export type FieldDef = {
  name: string;
  type: FieldType;
  /** Spans both form columns. */
  wide?: boolean;
  options?: string[];
};

const f = (name: string, type: FieldType = 'text', extra: Partial<FieldDef> = {}): FieldDef => ({
  name,
  type,
  ...extra,
});
const rich = (name: string) => f(name, 'rich', { wide: true });

/** The single description of every list form. Labels live in messages/*.json under "fields". */
export const SECTION_FIELDS: Record<ListSectionKey, FieldDef[]> = {
  experience: [
    f('title'),
    f('company'),
    f('employmentType', 'select', {
      options: ['full-time', 'part-time', 'contract', 'internship', 'freelance'],
    }),
    f('location'),
    f('start', 'date'),
    f('end', 'date'),
    f('current', 'check', { wide: true }),
    rich('description'),
    rich('achievements'),
  ],
  education: [
    f('institution', 'text', { wide: true }),
    f('degree'),
    f('field'),
    f('start', 'date'),
    f('end', 'date'),
    f('gpa'),
    rich('description'),
  ],
  skills: [f('name'), f('category'), f('level', 'select', { options: ['1', '2', '3', '4', '5'] })],
  projects: [
    f('name'),
    f('date', 'date'),
    f('technologies', 'text', { wide: true }),
    f('url', 'url'),
    f('repo', 'url'),
    rich('description'),
  ],
  certifications: [
    f('name', 'text', { wide: true }),
    f('issuer'),
    f('credentialId'),
    f('issued', 'date'),
    f('expires', 'date'),
    f('url', 'url', { wide: true }),
  ],
  languages: [
    f('name'),
    f('level', 'select', {
      options: ['basic', 'conversational', 'professional', 'fluent', 'native'],
    }),
  ],
  awards: [f('title'), f('issuer'), f('date', 'date'), rich('description')],
  achievements: [f('title'), f('issuer'), f('date', 'date'), rich('description')],
  volunteer: [
    f('role'),
    f('organization'),
    f('start', 'date'),
    f('end', 'date'),
    f('current', 'check', { wide: true }),
    rich('description'),
  ],
  publications: [
    f('title', 'text', { wide: true }),
    f('publisher'),
    f('date', 'date'),
    f('url', 'url', { wide: true }),
    rich('description'),
  ],
  references: [f('name'), f('relationship'), f('company'), f('email', 'email'), f('phone', 'tel')],
  interests: [f('name', 'text', { wide: true })],
};

/** Which fields name an entry in collapsed form headers. */
export const ENTRY_TITLE_FIELDS: Record<ListSectionKey, [string, string?]> = {
  experience: ['title', 'company'],
  education: ['institution', 'degree'],
  skills: ['name', 'category'],
  projects: ['name'],
  certifications: ['name', 'issuer'],
  languages: ['name'],
  awards: ['title', 'issuer'],
  achievements: ['title', 'issuer'],
  volunteer: ['role', 'organization'],
  publications: ['title', 'publisher'],
  references: ['name', 'company'],
  interests: ['name'],
};
