/*
 * An editable Word copy of a cover letter, in the same order as the printed page.
 */
import { BorderStyle, Document, LineRuleType, Packer, Paragraph, TextRun } from 'docx';
import { letterDate } from '@/features/cover-letters/letter-document';
import type { CoverLetter } from '@/types/cover-letter';
import { clean, KHMER_FONT, PAGE } from './build';

/** 20 mm, as on the printed page, in twentieths of a point. */
const MARGIN = 1134;
const MUTED = '4A515C';

/** One paragraph per block of text, keeping single line breaks inside it. */
const lines = (text: string[], spacingAfter: number) =>
  new Paragraph({
    spacing: { after: spacingAfter },
    children: text.map((line, i) => new TextRun({ text: clean(line), break: i ? 1 : 0 })),
  });

export function buildLetterDocument(letter: CoverLetter) {
  const { sender } = letter;
  const fonts = { ascii: 'Calibri', hAnsi: 'Calibri', cs: KHMER_FONT, eastAsia: 'Calibri' };
  const contact = [sender.email, sender.phone, sender.location].filter(Boolean);
  const to = [letter.recipient, letter.company].filter(Boolean);
  const date = letterDate(letter.date, letter.language);
  const body = letter.body
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const signed = sender.fullName && !letter.body.trim().endsWith(sender.fullName.trim());

  const header: Paragraph[] = [
    ...(sender.fullName ? [new Paragraph({ style: 'Title', text: clean(sender.fullName) })] : []),
    ...(sender.headline ? [new Paragraph({ style: 'Sender', text: clean(sender.headline) })] : []),
    ...(contact.length
      ? [new Paragraph({ style: 'Sender', text: clean(contact.join('   |   ')) })]
      : []),
  ];

  return new Document({
    title: clean(letter.title),
    creator: clean(sender.fullName),
    styles: {
      default: {
        document: {
          run: { font: fonts, size: 22, sizeComplexScript: 22 },
          paragraph: { spacing: { line: 276, lineRule: LineRuleType.AUTO } },
        },
        title: {
          run: { font: fonts, bold: true, size: 36, sizeComplexScript: 36 },
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
          run: { color: MUTED },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: PAGE[letter.pageSize],
            margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
          },
        },
        children: [
          ...header,
          // A rule under the sender, as its own paragraph so it is easy to remove.
          ...(header.length
            ? [
                new Paragraph({
                  border: {
                    bottom: { style: BorderStyle.SINGLE, size: 6, color: 'D5D8DD', space: 4 },
                  },
                  spacing: { after: 360 },
                }),
              ]
            : []),
          ...(date ? [lines([date], 240)] : []),
          ...(to.length ? [lines(to, 240)] : []),
          ...body.map((paragraph) => lines(paragraph.split('\n'), 180)),
          ...(signed ? [lines([sender.fullName], 0)] : []),
        ],
      },
    ],
  });
}

export const letterDocxBlob = (letter: CoverLetter) => Packer.toBlob(buildLetterDocument(letter));
export const letterDocxBuffer = (letter: CoverLetter) =>
  Packer.toBuffer(buildLetterDocument(letter));
