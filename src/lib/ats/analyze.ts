import { stripRich } from '@/features/resume-templates/rich-text';
import { getTemplate } from '@/features/resume-templates/registry';
import { safeHref } from '@/lib/url';
import type { Resume } from '@/types/resume';
import { extractKeywords, termMatcher } from './keywords';

export { extractKeywords };

export type CheckStatus = 'pass' | 'warn' | 'fail';
/** Where the writer can act on a finding. */
export type CheckTarget = { section: string; focus?: string } | 'design' | 'template';
export type AtsCheck = {
  id: string;
  group: 'contact' | 'content' | 'structure' | 'readability' | 'layout' | 'keywords' | 'extraction';
  status: CheckStatus;
  weight: number;
  /** Selects the explanation: messages ats.checks.<id>.<detail> */
  detail: CheckStatus;
  values?: Record<string, string | number>;
  target?: CheckTarget;
};
export type AtsReport = {
  score: number;
  checks: AtsCheck[];
  keywords: { matched: string[]; missing: string[] } | null;
};

/**
 * Terms from a job advert that a piece of writing uses although the resume does
 * not, so the writer can confirm each one is true.
 */
export function unsupportedTerms(
  draft: string,
  resumeText: string,
  jobDescription: string,
  ignore = '',
) {
  const written = termMatcher(draft);
  const known = termMatcher(`${resumeText} \n ${ignore}`);
  return extractKeywords(jobDescription, 40).filter((term) => written(term) && !known(term));
}

const isStandardHeading = (title: string) =>
  /experience|education|skill|project|certif|language|award|achievement|volunteer|publication|reference|interest|summary|training|leadership|activities|course|បទពិសោធន៍|ការអប់រំ|ជំនាញ/i.test(
    title,
  );

/** Counts words in any script, including ones written without spaces. */
function countWords(text: string) {
  const segments = new Intl.Segmenter(undefined, { granularity: 'word' }).segment(text);
  return Array.from(segments).filter((s) => s.isWordLike).length;
}

export function analyzeResume(resume: Resume, jobDescription = ''): AtsReport {
  const { data, design } = resume;
  const template = getTemplate(resume.templateId);
  const visible = new Set(resume.sections.filter((s) => s.visible).map((s) => s.key));
  const shown = <T>(key: string, list: T[]) => (visible.has(key) ? list : []);
  const experience = shown('experience', data.experience).filter((x) => x.title || x.company);
  const education = shown('education', data.education).filter((x) => x.institution || x.degree);
  const skills = shown('skills', data.skills).filter((s) => s.name.trim());
  const checks: AtsCheck[] = [];
  const add = (
    id: string,
    group: AtsCheck['group'],
    weight: number,
    status: CheckStatus,
    target?: CheckTarget,
    values?: AtsCheck['values'],
  ) => checks.push({ id, group, weight, status, detail: status, values, target });
  const personal = (field: string) => ({ section: 'personal', focus: `personal.${field}` });
  const section = (key: string, focus?: string) => ({ section: key, focus });

  const p = data.personal;
  add('name', 'contact', 8, p.fullName.trim() ? 'pass' : 'fail', personal('fullName'));
  add(
    'email',
    'contact',
    8,
    safeHref(`mailto:${p.email.trim()}`) && /\S+@\S+\.\S+/.test(p.email) ? 'pass' : 'fail',
    personal('email'),
  );
  add('phone', 'contact', 5, p.phone.trim() ? 'pass' : 'fail', personal('phone'));
  add('location', 'contact', 2, p.location.trim() ? 'pass' : 'warn', personal('location'));

  const summaryText = visible.has('summary')
    ? stripRich(Object.values(data.summary).join('\n'))
    : '';
  add(
    'summary',
    'content',
    6,
    summaryText.length >= 80
      ? summaryText.length > 900
        ? 'warn'
        : 'pass'
      : summaryText
        ? 'warn'
        : 'fail',
    section('summary'),
  );
  add(
    'history',
    'content',
    12,
    experience.length
      ? 'pass'
      : education.length || shown('projects', data.projects).length
        ? 'warn'
        : 'fail',
    section('experience'),
  );
  add('education', 'content', 5, education.length ? 'pass' : 'warn', section('education'));
  add(
    'skills',
    'content',
    8,
    skills.length >= 5 ? 'pass' : skills.length ? 'warn' : 'fail',
    section('skills'),
    { count: skills.length },
  );

  const undated = experience.filter((x) => !x.start || (!x.end && !x.current));
  add(
    'dates',
    'structure',
    5,
    undated.length ? 'warn' : 'pass',
    section('experience', undated[0]?.id),
    { count: undated.length },
  );
  const thin = experience.filter(
    (x) => stripRich(`${x.description}\n${x.achievements}`).length < 40,
  );
  add(
    'detail',
    'structure',
    7,
    thin.length ? (thin.length === experience.length ? 'fail' : 'warn') : 'pass',
    section('experience', thin[0]?.id),
    { count: thin.length },
  );
  const unusual = data.custom.filter(
    (c) => visible.has(`custom:${c.id}`) && c.items.length && !isStandardHeading(c.title),
  );
  add(
    'headings',
    'structure',
    3,
    unusual.length ? 'warn' : 'pass',
    unusual[0] && section(`custom:${unusual[0].id}`),
    { names: unusual.map((c) => c.title).join(', ') },
  );

  const tooLong = (text: string) =>
    stripRich(text)
      .split('\n')
      .filter((line) => line.length > 320).length;
  const blocks: [CheckTarget, string][] = [
    [section('summary'), summaryText],
    ...experience.flatMap((x): [CheckTarget, string][] => [
      [section('experience', x.id), x.description],
      [section('experience', x.id), x.achievements],
    ]),
    ...shown('projects', data.projects).map((x): [CheckTarget, string] => [
      section('projects', x.id),
      x.description,
    ]),
  ];
  const bodies = blocks.map(([, text]) => text);
  const long = bodies.reduce((sum, text) => sum + tooLong(text), 0);
  add(
    'sentences',
    'readability',
    5,
    long ? 'warn' : 'pass',
    blocks.find(([, text]) => tooLong(text))?.[0],
    { count: long },
  );
  add('fontSize', 'readability', 3, design.bodySize >= 9 ? 'pass' : 'warn', 'design', {
    size: design.bodySize,
  });
  const words = countWords(stripRich(bodies.join('\n')));
  add('length', 'readability', 3, words > 900 ? 'warn' : 'pass', section('experience'), {
    count: words,
  });

  add(
    'columns',
    'layout',
    10,
    template.ats === 'high' ? 'pass' : template.ats === 'medium' ? 'warn' : 'fail',
    'template',
  );
  const hasPhoto = template.photo && design.photoVisible && Boolean(p.photo);
  const bars =
    [template.layout.skills, template.layout.sidebarSkills].some(
      (v) => v === 'bars' || v === 'dots',
    ) && skills.some((s) => s.level > 0);
  add(
    'graphics',
    'layout',
    5,
    hasPhoto && bars ? 'fail' : hasPhoto || bars ? 'warn' : 'pass',
    'design',
  );

  // Only reported when present: both can come out wrong when software reads a PDF.
  const everything = JSON.stringify({ ...data, personal: { ...p, photo: '' } });
  if (/\p{Extended_Pictographic}/u.test(everything.replace(/[©®™]/g, ''))) {
    add('symbols', 'extraction', 3, 'warn');
  }
  if (/[\u1780-\u17ff]/.test(everything)) add('khmer', 'extraction', 0, 'warn');

  let keywords: AtsReport['keywords'] = null;
  const terms = extractKeywords(jobDescription);
  if (terms.length >= 3) {
    const haystack = [
      p.headline,
      summaryText,
      ...bodies,
      ...experience.flatMap((x) => [x.title, x.company]),
      ...education.flatMap((x) => [x.degree, x.field, x.description]),
      ...skills.map((s) => s.name),
      ...shown('projects', data.projects).flatMap((x) => [x.name, x.technologies]),
      ...shown('certifications', data.certifications).map((c) => c.name),
      ...data.custom
        .filter((c) => visible.has(`custom:${c.id}`))
        .flatMap((c) => c.items.flatMap((i) => [i.title, i.description])),
    ].join(' \n ');
    const matched = terms.filter(termMatcher(haystack));
    keywords = { matched, missing: terms.filter((term) => !matched.includes(term)) };
    const ratio = matched.length / terms.length;
    add(
      'keywords',
      'keywords',
      20,
      ratio >= 0.6 ? 'pass' : ratio >= 0.3 ? 'warn' : 'fail',
      undefined,
      { matched: matched.length, total: terms.length },
    );
  }

  const total = checks.reduce((sum, c) => sum + c.weight, 0);
  const earned = checks.reduce(
    (sum, c) => sum + c.weight * (c.status === 'pass' ? 1 : c.status === 'warn' ? 0.5 : 0),
    0,
  );
  return { score: Math.round((earned / total) * 100), checks, keywords };
}
