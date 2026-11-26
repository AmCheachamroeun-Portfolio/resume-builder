/*
 * An editable Word copy of a cover letter. It follows the chosen template's
 * header, rules, alignment and colour, in the same reading order as the page.
 */
import {
  AlignmentType,
  BorderStyle,
  Document,
  LineRuleType,
  Packer,
  Paragraph,
  Table,
  TableBorders,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlignTable,
  WidthType,
  type FileChild,
  type IParagraphOptions,
  type IRunOptions,
} from 'docx';
import { letterParts } from '@/features/cover-letters/letter-parts';
import { letterFont, LETTER_TEMPLATES } from '@/features/cover-letters/templates';
import { RESUME_FONTS } from '@/features/resume-templates/fonts';
import { readableInk } from '@/lib/color';
import type { CoverLetter, LetterTemplateId } from '@/types/cover-letter';
import { clean, KHMER_FONT, PAGE } from './build';

const TWIPS_PER_MM = 1440 / 25.4;
const hex = (color: string) => color.slice(1).toUpperCase();

/** Sizes are in half points. */
const SIZES: Record<LetterTemplateId, { body: number; name: number }> = {
  classic: { body: 23, name: 40 },
  modern: { body: 21, name: 48 },
  minimal: { body: 22, name: 36 },
};

type Parts = ReturnType<typeof letterParts>;
type Context = { parts: Parts; accent: string; width: number };

/** One paragraph per block of text, keeping single line breaks inside it. */
const lines = (
  text: string[],
  options: IParagraphOptions = {},
  run: (index: number) => IRunOptions = () => ({}),
) =>
  new Paragraph({
    ...options,
    children: text.map(
      (line, i) => new TextRun({ ...run(i), text: clean(line), break: i ? 1 : 0 }),
    ),
  });

/** A horizontal line as its own paragraph, so it is easy to remove. */
const rule = (color: string, size: number, spacingAfter: number) =>
  new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size, color, space: 4 } },
    spacing: { after: spacingAfter },
  });

/** Two blocks side by side, in a table without visible borders. */
function columns(
  left: Paragraph[],
  right: Paragraph[],
  width: number,
  leftShare: number,
  align: 'top' | 'bottom',
) {
  const first = Math.round(width * leftShare);
  const widths = [first, width - first];
  return new Table({
    width: { size: width, type: WidthType.DXA },
    columnWidths: widths,
    borders: TableBorders.NONE,
    rows: [
      new TableRow({
        cantSplit: true,
        children: [left, right].map(
          (children, i) =>
            new TableCell({
              width: { size: widths[i]!, type: WidthType.DXA },
              margins: { left: 0, right: 0 },
              verticalAlign: VerticalAlignTable[align === 'top' ? 'TOP' : 'BOTTOM'],
              // Word rejects a cell without a paragraph.
              children: children.length ? children : [new Paragraph({})],
            }),
        ),
      }),
    ],
  });
}

const signature = (parts: Parts, bold = false) =>
  parts.signature ? [lines([parts.signature], { spacing: { after: 0 } }, () => ({ bold }))] : [];

const body = (parts: Parts, after: number) =>
  parts.paragraphs.map((paragraph) => lines(paragraph.split('\n'), { spacing: { after } }));

function classic({ parts }: Context): FileChild[] {
  const centred = { alignment: AlignmentType.CENTER };
  const hasHeader = Boolean(parts.name || parts.contact.length);
  return [
    ...(hasHeader
      ? [
          ...(parts.name
            ? [
                new Paragraph({
                  ...centred,
                  style: 'Title',
                  children: [new TextRun({ text: clean(parts.name), allCaps: !parts.khmer })],
                }),
              ]
            : []),
          ...(parts.headline
            ? [lines([parts.headline], centred, () => ({ italics: !parts.khmer }))]
            : []),
          ...(parts.contact.length
            ? [
                lines([parts.contact.join('   |   ')], centred, () => ({
                  size: 19,
                  sizeComplexScript: 19,
                })),
              ]
            : []),
          rule('000000', 6, 400),
        ]
      : []),
    ...(parts.date
      ? [lines([parts.date], { alignment: AlignmentType.RIGHT, spacing: { after: 260 } })]
      : []),
    ...(parts.recipient.length ? [lines(parts.recipient, { spacing: { after: 260 } })] : []),
    ...body(parts, 200),
    ...signature(parts),
  ];
}

function modern({ parts, accent, width }: Context): FileChild[] {
  const ink = hex(readableInk(accent));
  const muted = '4A515C';
  const right = { alignment: AlignmentType.RIGHT };
  const hasHeader = Boolean(parts.name || parts.contact.length);
  const identity = [
    ...(parts.name ? [new Paragraph({ style: 'Title', text: clean(parts.name) })] : []),
    ...(parts.headline
      ? [lines([parts.headline], {}, () => ({ color: ink, bold: true, size: 22 }))]
      : []),
  ];
  const contact = parts.contact.map((item) =>
    lines([item], right, () => ({ color: muted, size: 18, sizeComplexScript: 18 })),
  );
  const to = parts.recipient.map((line, i) =>
    lines([line], {}, () => (i ? { color: muted } : { bold: true, boldComplexScript: true })),
  );
  const date = parts.date ? [lines([parts.date], right, () => ({ color: ink }))] : [];
  return [
    ...(hasHeader
      ? [columns(identity, contact, width, 0.58, 'bottom'), rule(hex(accent), 18, 240)]
      : []),
    ...(to.length || date.length
      ? [columns(to, date, width, 0.65, 'top'), rule('DFE2E7', 6, 360)]
      : []),
    ...body(parts, 180),
    ...signature(parts, true),
  ];
}

function minimal({ parts }: Context): FileChild[] {
  const sender = (text: string) => new Paragraph({ style: 'Sender', text: clean(text) });
  const header = [
    ...(parts.name ? [new Paragraph({ style: 'Title', text: clean(parts.name) })] : []),
    ...(parts.headline ? [sender(parts.headline)] : []),
    ...(parts.contact.length ? [sender(parts.contact.join('   |   '))] : []),
  ];
  return [
    ...header,
    ...(header.length ? [rule('D5D8DD', 6, 360)] : []),
    ...(parts.date ? [lines([parts.date], { spacing: { after: 240 } })] : []),
    ...(parts.recipient.length ? [lines(parts.recipient, { spacing: { after: 240 } })] : []),
    ...body(parts, 180),
    ...signature(parts),
  ];
}

const LAYOUTS = { classic, modern, minimal };

export function buildLetterDocument(letter: CoverLetter) {
  const parts = letterParts(letter);
  // The web fonts are not on most computers, so Word gets a close system face.
  const latin = RESUME_FONTS[letterFont(letter)].serif ? 'Georgia' : 'Calibri';
  const fonts = { ascii: latin, hAnsi: latin, cs: KHMER_FONT, eastAsia: latin };
  const { body: size, name } = SIZES[letter.template];
  const margin = Math.round(LETTER_TEMPLATES[letter.template].margin * TWIPS_PER_MM);
  const page = PAGE[letter.pageSize];

  return new Document({
    title: clean(letter.title),
    creator: clean(letter.sender.fullName),
    styles: {
      default: {
        document: {
          run: { font: fonts, size, sizeComplexScript: size },
          paragraph: { spacing: { line: 276, lineRule: LineRuleType.AUTO } },
        },
        title: {
          run: { font: fonts, bold: true, size: name, sizeComplexScript: name },
          paragraph: { spacing: { after: 40 } },
        },
      },
      paragraphStyles: [
        {
          id: 'Sender',
          name: 'Sender',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { color: '4A515C' },
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
        children: LAYOUTS[letter.template]({
          parts,
          accent: letter.accent,
          width: page.width - margin * 2,
        }),
      },
    ],
  });
}

export const letterDocxBlob = (letter: CoverLetter) => Packer.toBlob(buildLetterDocument(letter));
export const letterDocxBuffer = (letter: CoverLetter) =>
  Packer.toBuffer(buildLetterDocument(letter));
