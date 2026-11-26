import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { TEMPLATES } from '../src/features/resume-templates/registry';
import { fixture, KHMER_PHRASES } from './fixtures';
import { importResumes, preview, printFromEditor, stubPrint } from './helpers';

const OUT = 'test-results-pdf';
const SIZES = { a4: [595, 842], letter: [612, 792] } as const;

async function read(bytes: Buffer) {
  const pdf = await getDocument({ data: new Uint8Array(bytes), useSystemFonts: false }).promise;
  const pages = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const content = await page.getTextContent();
    const links = (await page.getAnnotations()).flatMap((a) => (a.url ? [a.url as string] : []));
    pages.push({
      size: page.view.slice(2).map(Math.round),
      text: content.items.map((item) => ('str' in item ? item.str : '')).join(''),
      links,
    });
  }
  return pages;
}

/** Opens the editor, notes the preview page count, prints, and reads the PDF back. */
async function exportPdf(page: Page, id: string, size: 'a4' | 'letter') {
  await page.goto(`/en/builder/${id}`);
  await expect(preview(page).first()).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
  const previewPages = await preview(page).count();
  await printFromEditor(page);
  const printed = await page.locator('#rc-print-root > .rc-page').count();
  // No "background graphics" option: colours must survive the dialog defaults.
  const bytes = await page.pdf({ preferCSSPageSize: true, printBackground: false });
  mkdirSync(OUT, { recursive: true });
  writeFileSync(`${OUT}/${id}.pdf`, bytes);
  const pages = await read(bytes);

  expect(printed).toBe(previewPages);
  expect(pages).toHaveLength(previewPages);
  for (const p of pages) {
    expect(p.text.trim().length, 'no blank pages').toBeGreaterThan(20);
    expect(Math.abs(p.size[0]! - SIZES[size][0])).toBeLessThanOrEqual(2);
    expect(Math.abs(p.size[1]! - SIZES[size][1])).toBeLessThanOrEqual(2);
  }
  return pages;
}

test.beforeEach(async ({ page }) => stubPrint(page));

for (const template of TEMPLATES) {
  test(`${template.id}: sample, multi-page and Khmer export`, async ({ page }) => {
    test.slow();
    const resumes = (['sample', 'long', 'khmer'] as const).map((kind) =>
      fixture(template.id, kind),
    );
    await importResumes(page, resumes);

    const sample = await exportPdf(page, resumes[0]!.id, 'a4');
    expect(sample.flatMap((p) => p.links)).toContain('mailto:maya.sovann@example.com');

    const long = await exportPdf(page, resumes[1]!.id, 'a4');
    expect(long.length).toBeGreaterThan(1);
    const text = long.map((p) => p.text).join(' ');
    expect(text).toContain('LASTLINEMARKER');
    for (let role = 1; role <= 11; role++) {
      for (let point = 1; point <= 5; point++) {
        // Nothing may be lost or repeated at a page break.
        const found = text.replace(/\s+/g, '').split(`Entry${role}point${point}:`).length - 1;
        expect(found, `entry ${role} point ${point}`).toBe(1);
      }
    }

    const khmer = await exportPdf(page, resumes[2]!.id, 'a4');
    const khmerText = khmer.map((p) => p.text.replace(/[\s\u200b]+/g, '')).join('');
    for (const phrase of KHMER_PHRASES) expect(khmerText, phrase).toContain(phrase);
    const file = readFileSync(`${OUT}/${resumes[2]!.id}.pdf`, 'latin1');
    expect(file, 'a Khmer font is embedded').toMatch(/Noto(Sans|Serif)Khmer/);
  });
}

test('a huge paragraph without sentence ends is not cut off', async ({ page }) => {
  const resume = fixture('navy-professional', 'sample');
  resume.data.summary.professional = `${'run on text '.repeat(600)}ENDMARKER`;
  await importResumes(page, [resume]);
  const pages = await exportPdf(page, resume.id, 'a4');
  expect(pages.length).toBeGreaterThan(1);
  const text = pages.map((p) => p.text.replace(/\s+/g, '')).join('');
  expect(text).toContain('ENDMARKER');
  expect(text.split('runontext').length - 1).toBe(600);
});

test('US Letter paper size is honoured', async ({ page }) => {
  const resume = fixture('ats-essential', 'long', 'letter');
  await importResumes(page, [resume]);
  await exportPdf(page, resume.id, 'letter');
});
