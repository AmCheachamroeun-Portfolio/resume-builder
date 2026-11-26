/*
 * An editable Word copy of a resume. It carries the same content, order and
 * visibility as the document on screen in one plain column, which Word and
 * applicant systems read reliably. It does not imitate the template.
 */
import {
  BorderStyle,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  ImageRun,
  LineRuleType,
  Packer,
  Paragraph,
  TabStopType,
  TextRun,
  type ParagraphChild,
} from 'docx';
import { DOCUMENT_LABELS, formatDate } from '@/constants/document-labels';
import type { BuiltInSection } from '@/constants/sections';
import { entriesFor, type Entry } from '@/features/resume-templates/blocks';
import { RESUME_FONTS } from '@/features/resume-templates/fonts';
import { INLINE } from '@/features/resume-templates/rich-text';
import { getTemplate } from '@/features/resume-templates/registry';
import { readableInk } from '@/lib/color';
import { displayUrl, safeHref } from '@/lib/url';
import type { Resume } from '@/types/resume';

/** Page sizes and margins in twentieths of a point. */
const PAGE = { a4: { width: 11906, height: 16838 }, letter: { width: 12240, height: 15840 } };
const TWIPS_PER_PX = 15;
/** Ships with Windows; other systems substitute their own Khmer font. */
export const KHMER_FONT = 'Khmer UI';

/** XML cannot hold control characters, and one would make Word reject the file. */
const clean = (text: string) => text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');

const link = (href: string, label: string) =>
  new ExternalHyperlink({
    link: href,
    children: [new TextRun({ text: clean(label), style: 'Hyperlink' })],
  });

/** **bold**, *italic* and [text](url), as in the editor. */
function inline(text: string): ParagraphChild[] {
  return clean(text)
    .split(INLINE)
    .filter(Boolean)
    .map((part) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return new TextRun({ text: part.slice(2, -2), bold: true, boldComplexScript: true });
      }
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        return new TextRun({ text: part.slice(1, -1), italics: true });
      }
      const match = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
      if (match) {
        const href = safeHref(match[2]!);
        return href ? link(href, match[1]!) : new TextRun(match[1]!);
      }
      return new TextRun(part);
    });
}

function richParagraphs(source: string): Paragraph[] {
  return source.split(/\r?\n/).flatMap((raw) => {
    const line = raw.trim();
    if (!line) return [];
    const bullet = /^(?:[-•*])\s+(.*)$/.exec(line);
    return new Paragraph({
      children: inline(bullet ? bullet[1]! : line),
      ...(bullet ? { bullet: { level: 0 } } : {}),
    });
  });
}

function entryParagraphs(entry: Entry, width: number): Paragraph[] {
  const out: Paragraph[] = [
    new Paragraph({
      style: 'EntryTitle',
      keepNext: true,
      tabStops: [{ type: TabStopType.RIGHT, position: width }],
      children: [
        new TextRun({ text: clean(entry.title), bold: true, boldComplexScript: true }),
        ...(entry.date ? [new TextRun(`\t${clean(entry.date)}`)] : []),
      ],
    }),
  ];
  for (const text of [entry.subtitle, entry.meta]) {
    if (text) out.push(new Paragraph({ style: 'EntryDetail', text: clean(text) }));
  }
  if (entry.links?.length) {
    out.push(
      new Paragraph({
        style: 'EntryDetail',
        children: entry.links.flatMap((l, i) => [
          ...(i ? [new TextRun('  |  ')] : []),
          link(l.href, l.label),
        ]),
      }),
    );
  }
  return [...out, ...(entry.body ?? []).flatMap(richParagraphs)];
}

function contactLine(resume: Resume): ParagraphChild[] {
  const p = resume.data.personal;
  const items: { text: string; href?: string | null }[] = [
    { text: p.email, href: safeHref(`mailto:${p.email.trim()}`) },
    { text: p.phone, href: safeHref(`tel:${p.phone.replace(/\s+/g, '')}`) },
    { text: p.location },
    ...[p.linkedin, p.github, p.website].map((url) => ({
      text: url && displayUrl(url),
      href: safeHref(url),
    })),
    ...p.links.map((l) => ({
      text: l.url && (l.label || displayUrl(l.url)),
      href: safeHref(l.url),
    })),
  ].filter((item) => item.text.trim());
  return items.flatMap((item, i) => [
    ...(i ? [new TextRun('  |  ')] : []),
    item.href ? link(item.href, item.text) : new TextRun(clean(item.text)),
  ]);
}

function photo(resume: Resume): Paragraph[] {
  const { design } = resume;
  const match = /^data:image\/(png|jpeg);base64,(.+)$/.exec(resume.data.personal.photo);
  if (!match || !design.photoVisible || !getTemplate(resume.templateId).photo) return [];
  const data = Uint8Array.from(atob(match[2]!), (c) => c.charCodeAt(0));
  const size = Math.round(design.photoSize);
  return [
    new Paragraph({
      children: [
        new ImageRun({
          type: match[1] === 'png' ? 'png' : 'jpg',
          data,
          transformation: { width: size, height: size },
          altText: { name: 'Photo', title: 'Photo', description: 'Profile photo' },
        }),
      ],
    }),
  ];
}

function sectionParagraphs(resume: Resume, width: number): Paragraph[] {
  const labels = DOCUMENT_LABELS[resume.language];
  const { data } = resume;
  const heading = (text: string) =>
    new Paragraph({ heading: HeadingLevel.HEADING_1, text: clean(text) });
  const block = (title: string, body: Paragraph[]) =>
    body.length ? [heading(title), ...body] : [];

  return resume.sections
    .filter((section) => section.visible)
    .flatMap(({ key }) => {
      if (key === 'summary') {
        return (
          [
            ['summary', data.summary.professional],
            ['about', data.summary.about],
            ['objective', data.summary.objective],
          ] as const
        ).flatMap(([part, text]) => block(labels.sections[part], richParagraphs(text)));
      }
      if (key.startsWith('custom:')) {
        const custom = data.custom.find((c) => `custom:${c.id}` === key);
        if (!custom) return [];
        return block(
          custom.title,
          custom.items
            .filter((i) => [i.title, i.subtitle, i.description].some((v) => v.trim()))
            .flatMap((i) => {
              if (!i.title && !i.subtitle && !i.date) return richParagraphs(i.description);
              return entryParagraphs(
                {
                  id: i.id,
                  title: i.title,
                  subtitle: i.subtitle,
                  date: formatDate(i.date, resume.language),
                  body: [i.description],
                },
                width,
              );
            }),
        );
      }
      const section = key as BuiltInSection;
      const title = labels.sections[section];
      if (section === 'skills') {
        const groups = new Map<string, string[]>();
        for (const skill of data.skills.filter((s) => s.name.trim())) {
          const category = skill.category.trim();
          groups.set(category, [...(groups.get(category) ?? []), skill.name.trim()]);
        }
        return block(
          title,
          [...groups].map(
            ([category, names]) =>
              new Paragraph({
                children: [
                  ...(category ? [new TextRun({ text: `${clean(category)}: `, bold: true })] : []),
                  new TextRun(clean(names.join(', '))),
                ],
              }),
          ),
        );
      }
      if (section === 'languages') {
        return block(
          title,
          data.languages
            .filter((l) => l.name.trim())
            .map((l) => {
              const level = l.level ? ` — ${labels.languageLevels[l.level]}` : '';
              return new Paragraph(clean(`${l.name}${level}`));
            }),
        );
      }
      if (section === 'interests') {
        const names = data.interests.map((i) => i.name.trim()).filter(Boolean);
        return block(title, names.length ? [new Paragraph(clean(names.join(', ')))] : []);
      }
      return block(
        title,
        entriesFor(section, resume).flatMap((e) => entryParagraphs(e, width)),
      );
    });
}

export function buildDocument(resume: Resume) {
  const { design, data } = resume;
  // Fonts every Word installation has, so the file looks the same for the reader.
  const latin = RESUME_FONTS[design.font].serif ? 'Georgia' : 'Calibri';
  const fonts = { ascii: latin, hAnsi: latin, cs: KHMER_FONT, eastAsia: latin };
  const margin = design.margin * TWIPS_PER_PX;
  const page = PAGE[design.pageSize];
  const half = (points: number) => Math.round(points * 2);
  const size = (points: number) => ({ size: half(points), sizeComplexScript: half(points) });
  const accent = readableInk(design.accent).replace('#', '');

  return new Document({
    title: clean(resume.title),
    creator: clean(data.personal.fullName),
    styles: {
      default: {
        document: {
          run: { font: fonts, ...size(design.bodySize + 0.5) },
          paragraph: {
            // "Auto" lets a line with the photo grow instead of cutting it off.
            spacing: {
              after: 40,
              line: Math.round(design.lineHeight * 200),
              lineRule: LineRuleType.AUTO,
            },
          },
        },
        title: {
          run: { font: fonts, bold: true, ...size(Math.min(design.nameSize, 28)) },
          paragraph: { spacing: { after: 40 } },
        },
        heading1: {
          run: { font: fonts, bold: true, color: accent, ...size(design.headingSize + 1) },
          paragraph: {
            spacing: { before: design.sectionSpacing * TWIPS_PER_PX, after: 80 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: accent, space: 2 } },
          },
        },
      },
      paragraphStyles: [
        {
          id: 'EntryTitle',
          name: 'Entry title',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          paragraph: { spacing: { before: 100, after: 0 } },
        },
        {
          id: 'EntryDetail',
          name: 'Entry detail',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { color: '555555' },
          paragraph: { spacing: { after: 20 } },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: page,
            margin: { top: margin, bottom: margin, left: margin, right: margin },
          },
        },
        children: [
          ...photo(resume),
          ...(data.personal.fullName
            ? [new Paragraph({ heading: HeadingLevel.TITLE, text: clean(data.personal.fullName) })]
            : []),
          ...(data.personal.headline
            ? [new Paragraph({ style: 'EntryDetail', text: clean(data.personal.headline) })]
            : []),
          new Paragraph({ children: contactLine(resume) }),
          ...sectionParagraphs(resume, page.width - margin * 2),
        ],
      },
    ],
  });
}

export const docxBlob = (resume: Resume) => Packer.toBlob(buildDocument(resume));
export const docxBuffer = (resume: Resume) => Packer.toBuffer(buildDocument(resume));
