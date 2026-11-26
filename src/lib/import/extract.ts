/* Reads documents inside the browser. Nothing here sends data anywhere. */

export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;
export const MAX_PDF_PAGES = 15;
export const MAX_TEXT = 24_000;
/** Fewer letters than this means the pages are pictures, not text. */
const MIN_LETTERS = 40;

export type ImportProblem =
  'unsupported' | 'too-large' | 'too-many-pages' | 'password' | 'scanned' | 'unreadable';

export class ImportFailure extends Error {
  constructor(readonly code: ImportProblem) {
    super(code);
  }
}

export type DocumentKind = 'pdf' | 'docx' | 'json';

/** Decided by content first: a renamed file must not reach the wrong parser. */
export function documentKind(name: string, head: Uint8Array): DocumentKind | null {
  const starts = (...bytes: number[]) => bytes.every((b, i) => head[i] === b);
  if (starts(0x25, 0x50, 0x44, 0x46)) return 'pdf';
  if (starts(0x50, 0x4b) && /\.docx$/i.test(name)) return 'docx';
  return /\.json$/i.test(name) ? 'json' : null;
}

export function tidyText(text: string) {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '')
    .replace(/[ \t ]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function checked(text: string) {
  const clean = tidyText(text);
  if ((clean.match(/\p{L}/gu)?.length ?? 0) < MIN_LETTERS) throw new ImportFailure('scanned');
  return { text: clean.slice(0, MAX_TEXT), truncated: clean.length > MAX_TEXT };
}

type TextItem = { str: string; transform: number[]; width: number; hasEOL: boolean };

/** Rebuilds lines from positioned text runs. */
export function joinItems(items: TextItem[]) {
  let out = '';
  let last: TextItem | null = null;
  for (const item of items) {
    if (last && !out.endsWith('\n')) {
      const size = Math.abs(item.transform[3] ?? 10) || 10;
      const newLine = Math.abs((item.transform[5] ?? 0) - (last.transform[5] ?? 0)) > size * 0.6;
      const gap = (item.transform[4] ?? 0) - ((last.transform[4] ?? 0) + last.width);
      if (newLine) out += '\n';
      else if (gap > size * 0.25 && !out.endsWith(' ')) out += ' ';
    }
    out += item.str;
    if (item.hasEOL) out += '\n';
    if (item.str) last = item;
  }
  return out;
}

export async function extractPdf(data: ArrayBuffer) {
  // Loaded on demand: the parser is large and most visits never need it.
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  // The worker is served by this site, as the security policy requires. In tests
  // there is no window and the parser finds its own worker.
  if (typeof window !== 'undefined') {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
      import.meta.url,
    ).toString();
  }
  const task = pdfjs.getDocument({ data: new Uint8Array(data) });
  try {
    const pdf = await task.promise;
    if (pdf.numPages > MAX_PDF_PAGES) throw new ImportFailure('too-many-pages');
    const pages: string[] = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      const content = await (await pdf.getPage(n)).getTextContent();
      pages.push(joinItems(content.items.filter((i) => 'str' in i) as TextItem[]));
    }
    return checked(pages.join('\n'));
  } catch (error) {
    if (error instanceof ImportFailure) throw error;
    const name = error instanceof Error ? error.name : '';
    throw new ImportFailure(name === 'PasswordException' ? 'password' : 'unreadable');
  } finally {
    void task.destroy();
  }
}

export async function extractDocx(data: ArrayBuffer) {
  const mammoth = (await import('mammoth')).default;
  try {
    // Mammoth reads `buffer` in Node and `arrayBuffer` in the browser.
    const input =
      typeof window === 'undefined' ? { buffer: Buffer.from(data) } : { arrayBuffer: data };
    const { value } = await mammoth.extractRawText(input);
    return checked(value.replace(/\n\n/g, '\n'));
  } catch (error) {
    if (error instanceof ImportFailure) {
      // A Word file with no text is empty rather than scanned, but advice is the same.
      throw error;
    }
    throw new ImportFailure('unreadable');
  }
}
