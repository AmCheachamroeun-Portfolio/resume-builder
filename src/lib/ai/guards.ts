import type { ImportedContent } from '@/lib/import/types';
import type { AiRequest, AiResponse, Draft } from './schemas';

/*
 * Prompts ask the model not to invent facts. These checks enforce the parts that
 * can be verified mechanically, whatever the model returns.
 */

const KHMER_DIGITS = '០១២៣៤៥៦៧៨៩';

function normaliseDigits(text: string) {
  return text.replace(/[០-៩]/g, (d) => String(KHMER_DIGITS.indexOf(d)));
}

export function numbersIn(text: string): string[] {
  return (normaliseDigits(text).match(/\d+(?:[.,]\d+)*/g) ?? []).map((n) => n.replace(/,/g, ''));
}

/** Numbers present in the output that the writer never provided. */
export function inventedNumbers(source: string, output: string) {
  const known = new Set(numbersIn(source));
  return [...new Set(numbersIn(output).filter((n) => !known.has(n)))];
}

const squash = (text: string) =>
  normaliseDigits(text)
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}+#]+/gu, '');

/** Whether a name was actually mentioned in the source (spacing and case ignored). */
export function isGrounded(name: string, source: string) {
  const needle = squash(name);
  return needle.length > 0 && squash(source).includes(needle);
}

export function groundDraft(draft: Draft, request: AiRequest<'generate-draft'>): Draft {
  const source = Object.values(request.answers).join('\n');
  const removed: string[] = [];
  const keep = <T>(items: T[], name: (item: T) => string) =>
    items.filter((item) => {
      const ok = isGrounded(name(item), source);
      if (!ok && name(item).trim()) removed.push(name(item));
      return ok;
    });
  const years = new Set(numbersIn(source));
  const date = (value: string) =>
    /^\d{4}(-(0[1-9]|1[0-2]))?$/.test(value) && years.has(value.slice(0, 4)) ? value : '';
  /** Drops any sentence or bullet that introduces a figure. */
  const clean = (text: string) =>
    text
      .split('\n')
      .flatMap(
        (l) =>
          l
            .split(/(?<=[.!?។]\s)/u)
            .filter((s) => !inventedNumbers(source, s).length)
            .join('') || [],
      )
      .join('\n')
      .trim();
  const optional = (value: string) => (isGrounded(value, source) ? value : '');

  return {
    headline: clean(draft.headline),
    summary: clean(draft.summary),
    experience: keep(draft.experience, (x) => x.company || x.title).map((x) => ({
      ...x,
      location: optional(x.location),
      start: date(x.start),
      end: date(x.end),
      description: clean(x.description),
    })),
    education: keep(draft.education, (x) => x.institution).map((x) => ({
      ...x,
      start: date(x.start),
      end: date(x.end),
      description: clean(x.description),
    })),
    skills: keep(draft.skills, (x) => x.name),
    projects: keep(draft.projects, (x) => x.name).map((x) => ({
      ...x,
      description: clean(x.description),
    })),
    certifications: keep(draft.certifications, (x) => x.name).map((x) => ({
      ...x,
      issuer: optional(x.issuer),
    })),
    languages: keep(draft.languages, (x) => x.name),
    removed,
  };
}

/**
 * Importing must only move text around, so every value the model returns has to
 * be found in the document. Anything else is dropped and reported.
 */
export function groundImport(
  content: ImportedContent,
  source: string,
): ImportedContent & { removed: string[] } {
  const removed: string[] = [];
  const years = new Set(numbersIn(source));
  const found = (value: string) => {
    if (!value.trim() || value.includes('[')) return '';
    if (isGrounded(value, source)) return value.trim();
    removed.push(value.trim().slice(0, 80));
    return '';
  };
  const lines = (value: string) =>
    value
      .split('\n')
      .map((l) => {
        const bullet = /^\s*-\s+/.exec(l)?.[0] ?? '';
        const kept = found(l.slice(bullet.length));
        return kept && (bullet ? `- ${kept}` : kept);
      })
      .filter(Boolean)
      .join('\n');
  const date = (value: string) =>
    /^\d{4}(-(0[1-9]|1[0-2]))?$/.test(value) && years.has(value.slice(0, 4)) ? value : '';
  const some = (item: object) => Object.values(item).some((v) => typeof v === 'string' && v);

  return {
    headline: found(content.headline),
    summary: lines(content.summary),
    experience: content.experience
      .map((x) => ({
        title: found(x.title),
        company: found(x.company),
        location: found(x.location),
        start: date(x.start),
        end: date(x.end),
        current: x.current,
        description: lines(x.description),
      }))
      .filter(some),
    education: content.education
      .map((x) => ({
        degree: found(x.degree),
        field: found(x.field),
        institution: found(x.institution),
        start: date(x.start),
        end: date(x.end),
        description: lines(x.description),
      }))
      .filter(some),
    skills: content.skills
      .map((x) => ({ name: found(x.name), category: found(x.category) }))
      .filter((x) => x.name),
    projects: content.projects
      .map((x) => ({
        name: found(x.name),
        technologies: found(x.technologies),
        description: lines(x.description),
      }))
      .filter(some),
    certifications: content.certifications
      .map((x) => ({ name: found(x.name), issuer: found(x.issuer), date: date(x.date) }))
      .filter((x) => x.name),
    languages: content.languages
      .map((x) => ({ name: found(x.name), level: x.level }))
      .filter((x) => x.name),
    other: content.other
      .map((x) => ({ heading: found(x.heading), text: lines(x.text) }))
      .filter((x) => x.text),
    removed,
  };
}

/**
 * A quotation offered as proof must really be in the resume, and a rewrite may
 * only target a field that was sent, once, without adding figures to it.
 */
export function checkTailoring(
  result: AiResponse<'tailor-resume'>,
  request: AiRequest<'tailor-resume'>,
): AiResponse<'tailor-resume'> & { removed: string[] } {
  const removed: string[] = [];
  const used = new Set<string>();
  const suggestions = result.suggestions.filter((suggestion) => {
    const field = request.fields.find((f) => f.id === suggestion.field);
    if (!field || used.has(field.id) || suggestion.text.trim() === field.text.trim()) return false;
    const invented =
      inventedNumbers(`${field.label}\n${field.text}`, suggestion.text).length > 0 ||
      /\[[^\]\n]{1,60}\](?!\()/.test(suggestion.text);
    if (invented) {
      removed.push(field.label);
      return false;
    }
    used.add(field.id);
    return true;
  });
  const requirements = result.requirements.map((item) => {
    const evidence = isGrounded(item.evidence, request.context) ? item.evidence.trim() : '';
    const met = item.met === 'yes' && !evidence ? ('partly' as const) : item.met;
    return { requirement: item.requirement, met, evidence };
  });
  return { requirements, suggestions, emphasise: result.emphasise, removed };
}
