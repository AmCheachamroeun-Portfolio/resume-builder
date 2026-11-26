import type { Resume } from '@/types/resume';

/** Where a piece of rewritable text lives in a resume. */
export type FieldRef =
  | { kind: 'headline' }
  | { kind: 'summary'; name: 'professional' | 'about' | 'objective' }
  | { kind: 'entry'; section: 'experience' | 'projects' | 'volunteer'; id: string; name: string };

export type TailorField = { id: string; ref: FieldRef; role: string; text: string };

const MAX_FIELDS = 20;
const MAX_FIELD = 4000;
/** Keeps the request well inside what the server accepts. */
const MAX_TOTAL = 20_000;

/** Links and addresses are never sent, so text containing them is not offered. */
const PRIVATE = /https?:\/\/|www\.|mailto:|\S+@\S+\.\S+/i;

export function readField(resume: Resume, ref: FieldRef): string {
  if (ref.kind === 'headline') return resume.data.personal.headline;
  if (ref.kind === 'summary') return resume.data.summary[ref.name];
  const entry = (resume.data[ref.section] as unknown as Record<string, string>[]).find(
    (e) => e.id === ref.id,
  );
  return entry?.[ref.name] ?? '';
}

/** The visible writing a job-specific rewrite may be offered for. */
export function tailorFields(resume: Resume): TailorField[] {
  const visible = new Set(resume.sections.filter((s) => s.visible).map((s) => s.key));
  const found: { ref: FieldRef; role: string }[] = [{ ref: { kind: 'headline' }, role: '' }];
  if (visible.has('summary')) {
    for (const name of ['professional', 'about', 'objective'] as const) {
      found.push({ ref: { kind: 'summary', name }, role: '' });
    }
  }
  for (const section of ['experience', 'projects', 'volunteer'] as const) {
    if (!visible.has(section)) continue;
    for (const entry of resume.data[section] as unknown as Record<string, string>[]) {
      const role = [entry.title || entry.role || entry.name, entry.company || entry.organization]
        .filter(Boolean)
        .join(', ');
      const names = section === 'experience' ? ['description', 'achievements'] : ['description'];
      for (const name of names) {
        found.push({ ref: { kind: 'entry', section, id: entry.id!, name }, role });
      }
    }
  }
  const fields: TailorField[] = [];
  let total = 0;
  for (const { ref, role } of found) {
    const text = readField(resume, ref);
    if (!text.trim() || text.length > MAX_FIELD || PRIVATE.test(text)) continue;
    if (total + text.length > MAX_TOTAL || fields.length >= MAX_FIELDS) break;
    total += text.length;
    fields.push({ id: `f${fields.length + 1}`, ref, role: role.slice(0, 200), text });
  }
  return fields;
}

/** How a field is described to the model. */
export function describeField({ ref, role }: TailorField) {
  const name =
    ref.kind === 'headline'
      ? 'headline'
      : ref.kind === 'summary'
        ? `${ref.name} summary`
        : `${ref.section} ${ref.name}`;
  return role ? `${name}: ${role}` : name;
}

/** A new resume value with the accepted wording. The given one is not modified. */
export function applyTailoring(resume: Resume, changes: { ref: FieldRef; text: string }[]): Resume {
  const next = structuredClone(resume);
  for (const { ref, text } of changes) {
    if (ref.kind === 'headline') next.data.personal.headline = text.slice(0, 300);
    else if (ref.kind === 'summary') next.data.summary[ref.name] = text.slice(0, 8000);
    else {
      const entry = (next.data[ref.section] as unknown as Record<string, string>[]).find(
        (e) => e.id === ref.id,
      );
      if (entry) entry[ref.name] = text.slice(0, 8000);
    }
  }
  return next;
}
