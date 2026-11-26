import { createTranslator } from 'next-intl';
import { describe, expect, it } from 'vitest';
import { sampleResume } from '@/constants/sample-resume';
import { SECTION_FIELDS } from '@/constants/sections';
import { analyzeResume, extractKeywords } from '@/lib/ats/analyze';
import { createResume } from '@/lib/resume-factory';
import { ASSISTANT_TASKS } from '@/features/ai-assistant/store';
import { TEMPLATE_CATEGORIES } from '@/features/resume-templates/types';
import en from '@/messages/en.json';
import km from '@/messages/km.json';

describe('compatibility check', () => {
  it('scores a complete single-column resume above an empty one', () => {
    const full = analyzeResume(sampleResume('ats-essential', ''));
    const empty = analyzeResume(createResume({ templateId: 'ats-essential', title: 'x' }));
    expect(full.score).toBeGreaterThanOrEqual(85);
    expect(empty.score).toBeLessThan(50);
    expect(full.keywords).toBeNull();
  });

  it('flags decorative layouts', () => {
    const report = analyzeResume(sampleResume('creative-portfolio'));
    expect(report.checks.find((c) => c.id === 'columns')!.status).toBe('fail');
  });

  it('matches job keywords without inventing matches', () => {
    const report = analyzeResume(
      sampleResume('ats-essential'),
      'We need React, TypeScript and Kubernetes experience. Kubernetes clusters daily.',
    );
    expect(report.keywords!.matched).toEqual(expect.arrayContaining(['react', 'typescript']));
    expect(report.keywords!.missing).toContain('kubernetes');
    expect(extractKeywords('The and of with C++ and C# and Node.js')).toEqual(
      expect.arrayContaining(['c++', 'c#', 'node.js']),
    );
  });
});

type Tree = { [key: string]: string | Tree };
function leaves(tree: Tree, prefix = ''): [string, string][] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'string' ? [[prefix + key, value]] : leaves(value, `${prefix}${key}.`),
  );
}
/** Argument names in an ICU message: {name} or {name, plural, ...}. */
const args = (message: string) =>
  [...new Set([...message.matchAll(/\{(\w+)[,}]/g)].map((m) => m[1]))].sort();

describe('interface languages', () => {
  const english = new Map(leaves(en as Tree));
  const khmer = new Map(leaves(km as Tree));

  it('define the same keys and placeholders', () => {
    expect([...khmer.keys()]).toEqual([...english.keys()]);
    for (const [key, message] of english) {
      expect(args(khmer.get(key)!), key).toEqual(args(message));
    }
  });

  it('have no empty strings and format every message', () => {
    for (const [locale, messages] of [
      ['en', en],
      ['km', km],
    ] as const) {
      const errors: string[] = [];
      const t = createTranslator({
        locale,
        messages: messages as Tree,
        onError: (error) => errors.push(error.message),
      });
      for (const [key, message] of leaves(messages as Tree)) {
        expect(message.trim(), key).not.toBe('');
        const values = Object.fromEntries(args(message).map((a) => [a!, 2]));
        (t as unknown as (k: string, v: object) => string)(key, values);
      }
      expect(errors).toEqual([]);
    }
  });

  it('label every form field, check, task and category', () => {
    const wanted = [
      ...Object.entries(SECTION_FIELDS).flatMap(([section, fields]) => [
        `sections.${section}`,
        ...fields.map((f) => `fields.${section}.${f.name}`),
        ...fields.flatMap((f) => (f.options ?? []).map((o) => `options.${section}.${o}`)),
      ]),
      ...analyzeResume(sampleResume('ats-essential'), 'react typescript figma playwright')
        .checks.map((c) => c.id)
        .flatMap((id) => ['title', 'pass', 'warn', 'fail'].map((s) => `ats.checks.${id}.${s}`)),
      ...ASSISTANT_TASKS.map((task) => `ai.tasks.${task}`),
      ...TEMPLATE_CATEGORIES.map((c) => `templates.categories.${c}`),
    ];
    expect(wanted.filter((key) => !english.has(key))).toEqual([]);
  });
});
