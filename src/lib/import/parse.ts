/*
 * A deliberately simple reader that works without any service. It only moves
 * text that is in the document into fields; whatever it cannot place is kept
 * under "other" for the writer to sort out.
 */
import { DOCUMENT_LABELS } from '@/constants/document-labels';
import { EMAIL, isPhone, PHONE, URL_LIKE } from './redact';
import { emptyContent, type Imported, type ImportedContact } from './types';

type Key =
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'projects'
  | 'certifications'
  | 'languages'
  | 'contact'
  | 'other';

const ALIASES: Record<Exclude<Key, 'other'>, string[]> = {
  summary: [
    'summary',
    'professional summary',
    'profile',
    'about',
    'about me',
    'objective',
    'career objective',
  ],
  experience: [
    'experience',
    'work experience',
    'employment',
    'employment history',
    'professional experience',
    'work history',
  ],
  education: ['education', 'academic background', 'qualifications'],
  skills: ['skills', 'technical skills', 'core skills', 'key skills', 'competencies'],
  projects: ['projects', 'personal projects', 'selected projects'],
  certifications: ['certifications', 'certificates', 'licenses and certifications', 'training'],
  languages: ['languages'],
  contact: ['contact', 'contact details', 'contact information'],
};
const OTHER = [
  'awards',
  'achievements',
  'volunteer experience',
  'volunteering',
  'publications',
  'references',
  'interests',
  'hobbies',
  'activities',
];

const norm = (line: string) =>
  line
    .toLocaleLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^\p{L}\p{M}\p{N} ]/gu, '')
    .replace(/^\d{1,2} /, '')
    .replace(/\s+/g, ' ')
    .trim();

const HEADINGS = new Map<string, Key>();
for (const [key, names] of Object.entries(ALIASES)) {
  for (const name of names) HEADINGS.set(name, key as Key);
}
for (const name of OTHER) HEADINGS.set(name, 'other');
for (const [key, label] of Object.entries(DOCUMENT_LABELS.km.sections)) {
  const target: Key =
    key === 'about' || key === 'objective' ? 'summary' : key in ALIASES ? (key as Key) : 'other';
  HEADINGS.set(norm(label), target);
}

export const headingKey = (line: string) =>
  line.length > 48 ? undefined : HEADINGS.get(norm(line));

const BULLET = /^\s*[-•*▪◦‣●·]\s*/;
const KM_MONTHS = DOCUMENT_LABELS.km.months;
const MONTH = `(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\.?|${KM_MONTHS.join('|')}`;
const POINT = `(?:(?:${MONTH})\\s+|(?:0?[1-9]|1[0-2])[/.])?(?:19|20)\\d{2}(?:-(?:0[1-9]|1[0-2]))?`;
const NOW = 'present|current|now|ongoing|បច្ចុប្បន្ន';
const RANGE = new RegExp(`(${POINT})(?:\\s*(?:-|–|—|\\bto\\b|ដល់)\\s*(${POINT}|${NOW}))?`, 'iu');

/** "Mar 2024" or "03/2024" as "2024-03"; a bare year stays a year. */
export function toDate(value: string) {
  const year = /(?:19|20)\d{2}/.exec(value)?.[0];
  if (!year) return '';
  const iso = /(?:19|20)\d{2}-(0[1-9]|1[0-2])/.exec(value)?.[1];
  const numeric = /\b(0?[1-9]|1[0-2])[/.](?:19|20)/.exec(value)?.[1];
  const english = DOCUMENT_LABELS.en.months.findIndex((m) =>
    value.toLowerCase().startsWith(m.toLowerCase()),
  );
  const khmer = KM_MONTHS.findIndex((m) => value.startsWith(m));
  const index = english >= 0 ? english : khmer;
  const month = iso ?? numeric ?? (index >= 0 ? String(index + 1) : '');
  return month ? `${year}-${month.padStart(2, '0')}` : year;
}

export function readRange(line: string) {
  const match = RANGE.exec(line);
  if (!match) return null;
  const end = match[2] ?? '';
  const current = new RegExp(`^(?:${NOW})$`, 'iu').test(end);
  return {
    start: end ? toDate(match[1]!) : '',
    end: current ? '' : toDate(end || match[1]!),
    current,
    rest: (line.slice(0, match.index) + line.slice(match.index + match[0].length))
      .replace(/^[\s|·,()–—-]+|[\s|·,()–—-]+$/g, '')
      .trim(),
  };
}

const SPLIT = /\s+(?:at|@|\||·|—|–|-)\s+|\s*[|·]\s*|,\s+/;
const parts = (line: string) =>
  line
    .split(SPLIT)
    .map((p) => p.trim())
    .filter(Boolean);
const heading = (line: string) => !BULLET.test(line) && line.length <= 90 && !/[.។]$/.test(line);

type Dated = { head: string[]; range: ReturnType<typeof readRange>; body: string[] };

/** Splits a section into entries, using date ranges as the anchors. */
function datedEntries(lines: string[]): Dated[] {
  const anchors = lines.flatMap((line, i) =>
    !BULLET.test(line) && line.length <= 120 && readRange(line) ? [i] : [],
  );
  if (!anchors.length) {
    return lines.length ? [{ head: [lines[0]!], range: null, body: lines.slice(1) }] : [];
  }
  // Each entry begins up to two heading-like lines above its dates.
  let floor = 0;
  const starts = anchors.map((anchor) => {
    let start = anchor;
    const alone = !readRange(lines[anchor]!)!.rest;
    const reach = alone ? 2 : 0;
    while (anchor - start < reach && start - 1 >= floor && heading(lines[start - 1]!)) start--;
    floor = anchor + 1;
    return start;
  });
  return anchors.map((anchor, i) => {
    const range = readRange(lines[anchor]!)!;
    const head = [...lines.slice(starts[i], anchor), range.rest].filter(Boolean);
    let next = anchor + 1;
    const stop = starts[i + 1] ?? lines.length;
    // "Company · City" often sits under a title that carries the dates.
    if (head.length < 2 && next < stop && heading(lines[next]!)) head.push(lines[next++]!);
    return { head, range, body: lines.slice(next, stop) };
  });
}

/** Joins lines that a page layout broke in the middle of a sentence. */
export function unwrap(lines: string[]) {
  return lines.reduce<string[]>((out, line) => {
    const previous = out.at(-1);
    if (previous && /^\p{Ll}/u.test(line) && !/[.!?:។]$/.test(previous)) {
      out[out.length - 1] = `${previous} ${line}`;
    } else out.push(line);
    return out;
  }, []);
}

const bodyText = (lines: string[]) =>
  unwrap(lines)
    .map((l) => (BULLET.test(l) ? `- ${l.replace(BULLET, '')}` : l))
    .join('\n');

const first = (text: string, pattern: RegExp) => text.match(pattern)?.[0] ?? '';

function readContact(text: string, preamble: string[]): ImportedContact {
  const links = (text.replace(EMAIL, ' ').match(URL_LIKE) ?? []).map((l) => l.replace(/[.]$/, ''));
  const phone = (text.match(PHONE) ?? []).find(isPhone) ?? '';
  const location =
    preamble
      .flatMap((l) => l.split(/\s*[|·•]\s*/))
      .find((s) => /^\p{Lu}[\p{L} .'-]{1,40}, \p{Lu}[\p{L} .'-]{1,40}$/u.test(s.trim())) ?? '';
  return {
    fullName: '',
    email: first(text, new RegExp(EMAIL.source, 'u')),
    phone: phone.trim(),
    location: location.trim(),
    linkedin: links.find((l) => /linkedin\.com/i.test(l)) ?? '',
    github: links.find((l) => /github\.com/i.test(l)) ?? '',
    website: links.find((l) => !/linkedin\.com|github\.com/i.test(l)) ?? '',
  };
}

const plain = (line: string) =>
  !new RegExp(EMAIL.source, 'u').test(line) &&
  !new RegExp(URL_LIKE.source, 'iu').test(line) &&
  !(line.match(PHONE) ?? []).some(isPhone) &&
  line.length <= 70;

const LEVELS = [
  ['native', /native|mother tongue|ភាសាកំណើត/i],
  ['fluent', /fluent|ស្ទាត់/i],
  ['professional', /professional|advanced|proficient|working/i],
  ['conversational', /conversational|intermediate/i],
  ['basic', /basic|beginner|elementary|មូលដ្ឋាន/i],
] as const;

export function parseLocally(text: string): Imported {
  const sections: { key: Key | 'preamble'; title: string; lines: string[] }[] = [
    { key: 'preamble', title: '', lines: [] },
  ];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const key = headingKey(line);
    if (key) sections.push({ key, title: line, lines: [] });
    else sections.at(-1)!.lines.push(line);
  }

  const preamble = sections[0]!.lines;
  const contact = readContact(text, [
    ...preamble,
    ...sections.filter((s) => s.key === 'contact').flatMap((s) => s.lines),
  ]);
  const result: Imported = { ...emptyContent(), contact };
  const intro = preamble.filter((l) => plain(l) && l !== contact.location);
  contact.fullName = intro[0] ?? '';
  result.headline = intro[1] ?? '';
  const loose = preamble.filter((l) => plain(l) && !intro.slice(0, 2).includes(l));
  const leftovers = loose.filter((l) => l !== contact.location);
  if (leftovers.length) result.other.push({ heading: '', text: leftovers.join('\n') });

  for (const section of sections.slice(1)) {
    const { lines } = section;
    if (!lines.length) continue;
    switch (section.key) {
      case 'summary':
        result.summary = [result.summary, unwrap(lines).join('\n')].filter(Boolean).join('\n');
        break;
      case 'experience':
        for (const entry of datedEntries(lines)) {
          const [title = '', company = '', location = ''] =
            entry.head.length > 1
              ? [entry.head[0]!, ...parts(entry.head.slice(1).join(' · '))]
              : parts(entry.head[0] ?? '');
          result.experience.push({
            title,
            company,
            location,
            start: entry.range?.start ?? '',
            end: entry.range?.end ?? '',
            current: entry.range?.current ?? false,
            description: bodyText(entry.body),
          });
        }
        break;
      case 'education':
        for (const entry of datedEntries(lines)) {
          result.education.push({
            degree: entry.head[0] ?? '',
            field: '',
            institution: entry.head.slice(1).join(' · '),
            start: entry.range?.start ?? '',
            end: entry.range?.end ?? '',
            description: bodyText(entry.body),
          });
        }
        break;
      case 'skills':
        for (const line of lines) {
          const [, category = '', list = line] = /^([^:,]{2,30}):\s*(.+)$/.exec(line) ?? [];
          for (const name of list.replace(BULLET, '').split(/\s*[,;|·•]\s*/)) {
            if (name.trim() && name.length <= 60) {
              result.skills.push({ name: name.trim(), category });
            }
          }
        }
        break;
      case 'projects':
        lines.forEach((line, i) => {
          const previous = lines[i - 1];
          const starts = i === 0 || (heading(line) && previous !== undefined && !heading(previous));
          const project = result.projects.at(-1);
          if (starts || !project) {
            result.projects.push({ name: line, technologies: '', description: '' });
          } else {
            project.description = [project.description, bodyText([line])]
              .filter(Boolean)
              .join('\n');
          }
        });
        break;
      case 'certifications':
        for (const line of lines) {
          const range = readRange(line);
          const [name = '', ...issuer] = parts((range?.rest ?? line).replace(BULLET, ''));
          if (name) {
            result.certifications.push({ name, issuer: issuer.join(', '), date: range?.end ?? '' });
          } else if (range && result.certifications.length) {
            result.certifications.at(-1)!.date = range.end;
          }
        }
        break;
      case 'languages':
        for (const line of lines.flatMap((l) => l.split(/\s*[,;|]\s*/))) {
          const level = LEVELS.find(([, pattern]) => pattern.test(line));
          const name = (level ? line.replace(level[1], '') : line)
            .replace(BULLET, '')
            .replace(/[()\-–—:]/g, ' ')
            .trim();
          if (name) result.languages.push({ name, level: level?.[0] ?? '' });
          else if (level && result.languages.length) {
            result.languages.at(-1)!.level = level[0];
          }
        }
        break;
      case 'other':
        result.other.push({ heading: section.title, text: bodyText(lines) });
        break;
    }
  }
  return result;
}
