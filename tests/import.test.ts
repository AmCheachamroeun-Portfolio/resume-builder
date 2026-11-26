import { Document, HeadingLevel, Packer, Paragraph } from 'docx';
import { describe, expect, it } from 'vitest';
import { groundImport } from '@/lib/ai/guards';
import { documentKind, extractDocx, joinItems } from '@/lib/import/extract';
import { parseLocally, readRange, toDate } from '@/lib/import/parse';
import { redactForAi } from '@/lib/import/redact';
import { importedToData } from '@/lib/import/to-data';
import { emptyContent } from '@/lib/import/types';

/* Entirely fictional. */
const TEXT = `Maya Sovann
Frontend Developer
maya.sovann@example.com | +855 12 000 000 | Phnom Penh, Cambodia
linkedin.com/in/maya-example | github.com/maya-example

PROFESSIONAL SUMMARY
Frontend developer who builds accessible web applications.

Work Experience
Frontend Developer Mar 2024 – Present
Lotus Ledger Studio · Phnom Penh · Full-time
• Built booking screens
• Reviewed pull requests
Junior Web Developer
Riverbank Digital, Siem Reap
June 2022 - February 2024
- Delivered responsive websites

Education
Bachelor of Software Engineering
Sample Institute of Technology
2018 – 2022

Skills
Frontend: React, TypeScript
Git, Figma

Languages
Khmer (Native), English - Professional

Volunteering
Helped at a library`;

describe('reading dates', () => {
  it.each([
    ['Mar 2024', '2024-03'],
    ['September 2021', '2021-09'],
    ['03/2024', '2024-03'],
    ['2024-11', '2024-11'],
    ['មីនា 2024', '2024-03'],
    ['2020', '2020'],
    ['soon', ''],
  ])('%s', (input, expected) => expect(toDate(input)).toBe(expected));

  it('understands ranges and ongoing work', () => {
    expect(readRange('Developer Jan 2020 to Mar 2021')).toMatchObject({
      start: '2020-01',
      end: '2021-03',
      rest: 'Developer',
    });
    expect(readRange('មីនា 2024 – បច្ចុប្បន្ន')).toMatchObject({ current: true, end: '' });
    expect(readRange('No dates here')).toBeNull();
  });
});

describe('reading a resume on the device', () => {
  const result = parseLocally(TEXT);

  it('finds the person and their contact details', () => {
    expect(result.contact).toMatchObject({
      fullName: 'Maya Sovann',
      email: 'maya.sovann@example.com',
      phone: '+855 12 000 000',
      location: 'Phnom Penh, Cambodia',
      linkedin: 'linkedin.com/in/maya-example',
      github: 'github.com/maya-example',
      website: '',
    });
    expect(result.headline).toBe('Frontend Developer');
    expect(result.summary).toContain('accessible web applications');
  });

  it('separates jobs by their dates', () => {
    expect(result.experience).toHaveLength(2);
    expect(result.experience[0]).toMatchObject({
      title: 'Frontend Developer',
      company: 'Lotus Ledger Studio',
      location: 'Phnom Penh',
      start: '2024-03',
      current: true,
      description: '- Built booking screens\n- Reviewed pull requests',
    });
    expect(result.experience[1]).toMatchObject({
      title: 'Junior Web Developer',
      company: 'Riverbank Digital',
      start: '2022-06',
      end: '2024-02',
      description: '- Delivered responsive websites',
    });
  });

  it('reads education, skills, languages and keeps the rest', () => {
    expect(result.education[0]).toMatchObject({
      degree: 'Bachelor of Software Engineering',
      institution: 'Sample Institute of Technology',
      start: '2018',
      end: '2022',
    });
    expect(result.skills.map((s) => s.name)).toEqual(['React', 'TypeScript', 'Git', 'Figma']);
    expect(result.skills[0]!.category).toBe('Frontend');
    expect(result.languages).toEqual([
      { name: 'Khmer', level: 'native' },
      { name: 'English', level: 'professional' },
    ]);
    expect(result.other).toContainEqual({ heading: 'Volunteering', text: 'Helped at a library' });
  });

  it('produces valid resume data without inventing anything', () => {
    const data = importedToData(result, 'More');
    expect(data.experience).toHaveLength(2);
    expect(data.custom[0]!.title).toBe('Volunteering');
    expect(data.certifications).toEqual([]);
  });

  it('drops dates it cannot trust', () => {
    const bad = parseLocally(TEXT);
    bad.experience[0]!.start = 'March';
    expect(importedToData(bad, 'More').experience[0]!.start).toBe('');
  });
});

describe('what may be sent to the model', () => {
  const sent = redactForAi(TEXT, 'Maya Sovann');

  it('removes the name, email, phone and links', () => {
    for (const secret of ['Maya Sovann', '@example', '000 000', 'linkedin.com', 'github.com']) {
      expect(sent).not.toContain(secret);
    }
  });

  it('keeps dates and work history', () => {
    expect(sent).toContain('2018 – 2022');
    expect(sent).toContain('June 2022 - February 2024');
    expect(sent).toContain('Lotus Ledger Studio');
  });

  it('rejects anything the document does not say', () => {
    const output = emptyContent();
    output.experience = [
      {
        title: 'Frontend Developer',
        company: 'Invented Corp',
        location: '',
        start: '2024-03',
        end: '1999',
        current: true,
        description: '- Built booking screens\n- Increased sales by 40%',
      },
    ];
    output.skills = [
      { name: 'React', category: 'Frontend' },
      { name: 'Kubernetes', category: '' },
    ];
    const checked = groundImport(output, sent);
    expect(checked.experience[0]).toMatchObject({
      company: '',
      start: '2024-03',
      end: '',
      description: '- Built booking screens',
    });
    expect(checked.skills).toEqual([{ name: 'React', category: 'Frontend' }]);
    expect(checked.removed).toContain('Invented Corp');
    expect(checked.removed).toContain('Kubernetes');
  });
});

describe('opening files', () => {
  it('decides the type from the content', () => {
    const pdf = new TextEncoder().encode('%PDF-1.7');
    const zip = new Uint8Array([0x50, 0x4b, 3, 4]);
    expect(documentKind('resume.docx', pdf)).toBe('pdf');
    expect(documentKind('resume.docx', zip)).toBe('docx');
    expect(documentKind('archive.zip', zip)).toBeNull();
    expect(documentKind('backup.json', new Uint8Array([123]))).toBe('json');
    expect(documentKind('old.doc', new Uint8Array([0xd0, 0xcf]))).toBeNull();
  });

  it('reads a Word file, including Khmer', async () => {
    const file = await Packer.toBuffer(
      new Document({
        sections: [
          {
            children: [
              new Paragraph({ text: 'Maya Sovann', heading: HeadingLevel.TITLE }),
              new Paragraph('បទពិសោធន៍ការងារ'),
              new Paragraph('Built a fictional booking product for a sample clinic.'),
            ],
          },
        ],
      }),
    );
    const { text } = await extractDocx(new Uint8Array(file).buffer);
    expect(text.split('\n')).toEqual([
      'Maya Sovann',
      'បទពិសោធន៍ការងារ',
      'Built a fictional booking product for a sample clinic.',
    ]);
  });

  it('reports a damaged or empty Word file', async () => {
    await expect(extractDocx(new Uint8Array([1, 2, 3]).buffer)).rejects.toMatchObject({
      code: 'unreadable',
    });
    const empty = await Packer.toBuffer(new Document({ sections: [{ children: [] }] }));
    await expect(extractDocx(new Uint8Array(empty).buffer)).rejects.toMatchObject({
      code: 'scanned',
    });
  });

  it('rebuilds lines from positioned PDF text', () => {
    const at = (str: string, x: number, y: number, hasEOL = false) => ({
      str,
      width: str.length * 5,
      transform: [10, 0, 0, 10, x, y],
      hasEOL,
    });
    expect(
      joinItems([at('Developer', 0, 700), at('2024', 200, 700), at('Studio', 0, 680, true)]),
    ).toBe('Developer 2024\nStudio\n');
  });
});
