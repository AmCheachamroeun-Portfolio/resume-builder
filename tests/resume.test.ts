import { describe, expect, it } from 'vitest';
import { SAMPLE_DATA } from '@/constants/sample-resume';
import { entryFormSchema, personalFormSchema } from '@/features/resume-builder/forms/form-schemas';
import { paginate } from '@/features/resume-templates/paginate';
import { BLOCK_LIMIT, parseRich, stripRich } from '@/features/resume-templates/rich-text';
import { getTemplate, TEMPLATES } from '@/features/resume-templates/registry';
import { checkPhoto } from '@/lib/image';
import { createResume, normaliseSections, switchTemplate } from '@/lib/resume-factory';
import { migrate, UnsupportedVersionError } from '@/lib/storage/migrations';
import { safeHref } from '@/lib/url';
import { resumeDataSchema, resumeSchema } from '@/types/resume';

const make = (templateId = 'ats-essential') =>
  createResume({ templateId, title: 'Test', data: structuredClone(SAMPLE_DATA) });

describe('creation and validation', () => {
  it('creates a valid empty resume for every template', () => {
    for (const template of TEMPLATES) {
      const resume = createResume({ templateId: template.id, title: 'Empty' });
      expect(resumeSchema.safeParse(resume).success, template.id).toBe(true);
      expect(new Set(resume.sections.map((s) => s.key)).size).toBe(resume.sections.length);
    }
  });

  it('rejects unsafe photos and malformed dates', () => {
    const photo = { personal: { photo: 'data:image/svg+xml;base64,PHN2Zz4=' } };
    expect(resumeDataSchema.safeParse(photo).success).toBe(false);
    const date = { experience: [{ id: 'a', start: 'yesterday' }] };
    expect(resumeDataSchema.safeParse(date).success).toBe(false);
  });

  it('checks uploaded image type and size', () => {
    expect(checkPhoto({ type: 'image/png', size: 1000 } as File)).toBeNull();
    expect(checkPhoto({ type: 'image/svg+xml', size: 10 } as File)).toBe('type');
    expect(checkPhoto({ type: 'image/jpeg', size: 20 * 1024 * 1024 } as File)).toBe('size');
  });

  it('reports form problems without blocking half-typed input', () => {
    const bad = personalFormSchema.safeParse(
      resumeDataSchema.parse({ personal: { email: 'maya@', website: 'javascript:alert(1)' } })
        .personal,
    );
    expect(bad.error?.issues.map((i) => i.message).sort()).toEqual(['email', 'url']);
    const dates = entryFormSchema('experience').safeParse({
      id: 'a',
      start: '2024-05',
      end: '2023-01',
    });
    expect(dates.error?.issues[0]?.message).toBe('dateOrder');
    const samePrecision = entryFormSchema('experience').safeParse({
      id: 'a',
      start: '2024-05',
      end: '2024',
    });
    expect(samePrecision.success).toBe(true);
  });
});

describe('template switching', () => {
  it('keeps content, order and paper size while adopting the new design', () => {
    const resume = make();
    resume.design.pageSize = 'letter';
    resume.sections.reverse();
    const next = switchTemplate(resume, 'navy-professional');
    expect(next.data).toEqual(resume.data);
    expect(next.sections).toEqual(resume.sections);
    expect(next.design.pageSize).toBe('letter');
    expect(next.design.accent).toBe(getTemplate('navy-professional').design.accent);
  });

  it('ships at least twelve distinct templates', () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(12);
    const layouts = new Set(TEMPLATES.map((t) => JSON.stringify(t.layout)));
    expect(layouts.size).toBe(TEMPLATES.length);
  });
});

describe('sections', () => {
  it('repairs duplicated, unknown and missing section keys', () => {
    const resume = make();
    resume.sections = [
      { key: 'skills', visible: false },
      { key: 'skills', visible: true },
      { key: 'custom:gone', visible: true },
    ];
    const fixed = normaliseSections(resume);
    expect(fixed.sections[0]).toEqual({ key: 'skills', visible: false });
    expect(fixed.sections.filter((s) => s.key === 'skills')).toHaveLength(1);
    expect(fixed.sections.some((s) => s.key === 'custom:gone')).toBe(false);
    expect(fixed.sections.some((s) => s.key === 'experience')).toBe(true);
  });
});

describe('migrations', () => {
  it('upgrades unversioned records and refuses newer ones', () => {
    const legacy: Record<string, unknown> = { ...make() };
    delete legacy.schemaVersion;
    expect(resumeSchema.safeParse(migrate(legacy)).success).toBe(true);
    expect(() => migrate({ ...make(), schemaVersion: 99 })).toThrow(UnsupportedVersionError);
  });
});

describe('multi-page layout', () => {
  const block = (height: number, keepWithNext = false) => ({ height, gap: 0, keepWithNext });

  it('fills pages in order without losing blocks', () => {
    const pages = paginate(
      Array.from({ length: 10 }, () => block(30)),
      () => 100,
    );
    expect(pages.flat()).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(pages.map((p) => p.length)).toEqual([3, 3, 3, 1]);
  });

  it('never leaves a heading at the foot of a page', () => {
    const pages = paginate([block(60), block(30, true), block(30)], () => 100);
    expect(pages).toEqual([[0], [1, 2]]);
  });

  it('places an oversized block instead of looping', () => {
    expect(paginate([block(500), block(10)], () => 100)).toEqual([[0], [1]]);
  });
});

describe('very long text', () => {
  const squash = (text: string) => text.replace(/\s+/g, '');

  it.each([
    ['one sentence with spaces', 'word '.repeat(1600)],
    ['a very long bullet', `- ${'word '.repeat(1600)}`],
    ['Khmer without spaces', 'ខ្ញុំអភិវឌ្ឍកម្មវិធីគេហទំព័រ'.repeat(250)],
    ['no break anywhere', 'x'.repeat(8000)],
  ])('splits %s into blocks that fit a page, losing nothing', (_name, text) => {
    const lines = parseRich(text);
    expect(Math.max(...lines.map((l) => l.text.length))).toBeLessThanOrEqual(BLOCK_LIMIT);
    expect(squash(lines.map((l) => l.text).join(''))).toBe(squash(text.replace(/^- /, '')));
  });
});

describe('untrusted text', () => {
  it('only produces safe links', () => {
    expect(safeHref('example.com')).toMatch(/^https:\/\/example\.com/);
    expect(safeHref('mailto:maya@example.com')).toBe('mailto:maya@example.com');
    for (const bad of ['javascript:alert(1)', 'data:text/html,x', 'file:///etc/passwd']) {
      expect(safeHref(bad), bad).toBeNull();
    }
  });

  it('treats markup as plain text', () => {
    const input = '<img src=x onerror=alert(1)>\n- **bold** point';
    expect(JSON.stringify(parseRich(input))).toContain('<img src=x onerror=alert(1)>');
    expect(stripRich('- **bold** and *soft*')).toContain('bold and soft');
  });
});
