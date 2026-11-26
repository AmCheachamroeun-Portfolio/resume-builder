import { DOCUMENT_LABELS, formatRange } from '@/constants/document-labels';
import { stripRich } from '@/features/resume-templates/rich-text';
import type { Resume } from '@/types/resume';

/**
 * The only resume text that is ever sent to the model. Name, email, phone,
 * address, links, photo and referees are deliberately left out.
 */
export function resumeContext(resume: Resume) {
  const { data, language } = resume;
  const labels = DOCUMENT_LABELS[language].sections;
  const hidden = new Set(resume.sections.filter((s) => !s.visible).map((s) => s.key));
  const out: string[] = [];
  const section = (key: string, title: string, lines: string[]) => {
    const kept = lines.map((l) => l.trim()).filter(Boolean);
    if (kept.length && !hidden.has(key)) out.push(`## ${title}\n${kept.join('\n')}`);
  };
  const head = (parts: (string | undefined)[]) => parts.filter(Boolean).join(' | ');
  const body = (...texts: string[]) => texts.map(stripRich).filter(Boolean).join('\n');

  if (data.personal.headline) out.push(`Headline: ${data.personal.headline}`);
  section(
    'summary',
    labels.summary,
    Object.values(data.summary).map((v) => body(v)),
  );
  section(
    'experience',
    labels.experience,
    data.experience.map(
      (x) =>
        `${head([x.title, x.company, formatRange(x.start, x.end, x.current, language)])}\n${body(x.description, x.achievements)}`,
    ),
  );
  section(
    'education',
    labels.education,
    data.education.map(
      (x) =>
        `${head([x.degree, x.field, x.institution, formatRange(x.start, x.end, false, language)])}\n${body(x.description)}`,
    ),
  );
  section('skills', labels.skills, [
    data.skills
      .map((s) => s.name)
      .filter(Boolean)
      .join(', '),
  ]);
  section(
    'projects',
    labels.projects,
    data.projects.map((p) => `${head([p.name, p.technologies])}\n${body(p.description)}`),
  );
  section(
    'certifications',
    labels.certifications,
    data.certifications.map((c) => head([c.name, c.issuer])),
  );
  section(
    'languages',
    labels.languages,
    data.languages.map((l) => head([l.name, l.level])),
  );
  for (const key of ['awards', 'achievements'] as const) {
    section(
      key,
      labels[key],
      data[key].map((a) => `${head([a.title, a.issuer])}\n${body(a.description)}`),
    );
  }
  section(
    'volunteer',
    labels.volunteer,
    data.volunteer.map((v) => `${head([v.role, v.organization])}\n${body(v.description)}`),
  );
  section(
    'publications',
    labels.publications,
    data.publications.map((p) => `${head([p.title, p.publisher])}\n${body(p.description)}`),
  );
  for (const custom of data.custom) {
    section(
      `custom:${custom.id}`,
      custom.title,
      custom.items.map((i) => `${head([i.title, i.subtitle])}\n${body(i.description)}`),
    );
  }
  return out.join('\n\n').slice(0, 14000);
}
