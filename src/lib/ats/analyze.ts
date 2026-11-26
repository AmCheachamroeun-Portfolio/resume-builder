import { stripRich } from '@/features/resume-templates/rich-text';
import { getTemplate } from '@/features/resume-templates/registry';
import { safeHref } from '@/lib/url';
import type { Resume } from '@/types/resume';

export type CheckStatus = 'pass' | 'warn' | 'fail';
export type AtsCheck = {
  id: string;
  group: 'contact' | 'content' | 'structure' | 'readability' | 'layout' | 'keywords';
  status: CheckStatus;
  weight: number;
  /** Selects the explanation: messages ats.checks.<id>.<detail> */
  detail: CheckStatus;
  values?: Record<string, string | number>;
};
export type AtsReport = {
  score: number;
  checks: AtsCheck[];
  keywords: { matched: string[]; missing: string[] } | null;
};

const STOPWORDS = new Set(
  `a able about across after all also an and any are as at be been being both but by can candidate company
  could day do does each etc experience for from good great has have having help how if in including into is
  it its job join just knowledge like looking may more most must need new not of on one or other our out over
  per plus preferred required requirements responsibilities role should skills so some strong such team than
  that the their them then there these they this those through to under understanding up us use using very we
  well what when where which while who will with within work working would years you your`.split(
    /\s+/,
  ),
);

/** Distinctive terms from a job description, most frequent first. English and Latin-script terms. */
export function extractKeywords(text: string, limit = 25) {
  const counts = new Map<string, number>();
  for (const match of text.toLowerCase().match(/[a-z][a-z0-9+#.\-/]*[a-z0-9+#]|\b[cr]\b/g) ?? []) {
    for (const word of match.split('/')) {
      if (word.length < 2 && word !== 'c' && word !== 'r') continue;
      if (!STOPWORDS.has(word)) counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }
  return [...counts]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

function containsTerm(haystack: string, term: string) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Tolerate simple plurals on either side.
  const stem = escaped.replace(/s$/, '');
  return new RegExp(`(^|[^a-z0-9+#])${stem}(s|es)?($|[^a-z0-9+#])`).test(haystack);
}

const isStandardHeading = (title: string) =>
  /experience|education|skill|project|certif|language|award|achievement|volunteer|publication|reference|interest|summary|training|leadership|activities|course|បទពិសោធន៍|ការអប់រំ|ជំនាញ/i.test(
    title,
  );

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
    values?: AtsCheck['values'],
  ) => checks.push({ id, group, weight, status, detail: status, values });

  const p = data.personal;
  add('name', 'contact', 8, p.fullName.trim() ? 'pass' : 'fail');
  add(
    'email',
    'contact',
    8,
    safeHref(`mailto:${p.email.trim()}`) && /\S+@\S+\.\S+/.test(p.email) ? 'pass' : 'fail',
  );
  add('phone', 'contact', 5, p.phone.trim() ? 'pass' : 'fail');
  add('location', 'contact', 2, p.location.trim() ? 'pass' : 'warn');

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
  );
  add('education', 'content', 5, education.length ? 'pass' : 'warn');
  add('skills', 'content', 8, skills.length >= 5 ? 'pass' : skills.length ? 'warn' : 'fail', {
    count: skills.length,
  });

  const undated = experience.filter((x) => !x.start || (!x.end && !x.current)).length;
  add('dates', 'structure', 5, undated ? 'warn' : 'pass', { count: undated });
  const thin = experience.filter(
    (x) => stripRich(`${x.description}\n${x.achievements}`).length < 40,
  ).length;
  add('detail', 'structure', 7, thin ? (thin === experience.length ? 'fail' : 'warn') : 'pass', {
    count: thin,
  });
  const unusual = data.custom.filter(
    (c) => visible.has(`custom:${c.id}`) && c.items.length && !isStandardHeading(c.title),
  );
  add('headings', 'structure', 3, unusual.length ? 'warn' : 'pass', {
    names: unusual.map((c) => c.title).join(', '),
  });

  const bodies = [
    ...experience.flatMap((x) => [x.description, x.achievements]),
    ...shown('projects', data.projects).map((x) => x.description),
    summaryText,
  ];
  const long = bodies.flatMap((b) => stripRich(b).split('\n')).filter((l) => l.length > 320).length;
  add('sentences', 'readability', 5, long ? 'warn' : 'pass', { count: long });
  add('fontSize', 'readability', 3, design.bodySize >= 9 ? 'pass' : 'warn', {
    size: design.bodySize,
  });
  const words = stripRich(bodies.join('\n')).split(/\s+/).filter(Boolean).length;
  add('length', 'readability', 3, words > 900 ? 'warn' : 'pass', { count: words });

  add(
    'columns',
    'layout',
    10,
    template.ats === 'high' ? 'pass' : template.ats === 'medium' ? 'warn' : 'fail',
  );
  const hasPhoto = template.photo && design.photoVisible && Boolean(p.photo);
  const bars =
    [template.layout.skills, template.layout.sidebarSkills].some(
      (v) => v === 'bars' || v === 'dots',
    ) && skills.some((s) => s.level > 0);
  add('graphics', 'layout', 5, hasPhoto && bars ? 'fail' : hasPhoto || bars ? 'warn' : 'pass');

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
    ]
      .join(' \n ')
      .toLowerCase();
    const matched = terms.filter((term) => containsTerm(haystack, term));
    keywords = { matched, missing: terms.filter((term) => !matched.includes(term)) };
    const ratio = matched.length / terms.length;
    add('keywords', 'keywords', 20, ratio >= 0.6 ? 'pass' : ratio >= 0.3 ? 'warn' : 'fail', {
      matched: matched.length,
      total: terms.length,
    });
  }

  const total = checks.reduce((sum, c) => sum + c.weight, 0);
  const earned = checks.reduce(
    (sum, c) => sum + c.weight * (c.status === 'pass' ? 1 : c.status === 'warn' ? 0.5 : 0),
    0,
  );
  return { score: Math.round((earned / total) * 100), checks, keywords };
}
