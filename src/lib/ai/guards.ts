import type { AiRequest, Draft } from './schemas';

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
