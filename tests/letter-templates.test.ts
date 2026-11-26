import { inflateRawSync } from 'node:zlib';
import mammoth from 'mammoth';
import { describe, expect, it } from 'vitest';
import { sampleResume } from '@/constants/sample-resume';
import { letterFont, LETTER_TEMPLATES } from '@/features/cover-letters/templates';
import { letterDocxBuffer } from '@/lib/docx/letter';
import { createBackup, parseBackup } from '@/lib/storage/backup';
import { newLetter, parseLetter } from '@/lib/storage/letters';
import { LETTER_ACCENT, LETTER_TEMPLATE_IDS, type CoverLetter } from '@/types/cover-letter';

const letter = (patch: Partial<CoverLetter> = {}): CoverLetter => ({
  ...newLetter('For Acme', sampleResume('ats-essential')),
  company: 'Acme',
  recipient: 'Hiring Team',
  date: '2026-11-26',
  body: 'Dear Hiring Team,\n\nI am writing to apply.\n\nSincerely,',
  ...patch,
});

/** One file from a zip archive, found through its central directory. */
function unzip(zip: Buffer, name: string) {
  const end = zip.lastIndexOf('PK\u0005\u0006');
  let at = zip.readUInt32LE(end + 16);
  for (let i = 0; i < zip.readUInt16LE(end + 10); i++) {
    const nameLength = zip.readUInt16LE(at + 28);
    if (zip.toString('utf8', at + 46, at + 46 + nameLength) === name) {
      const local = zip.readUInt32LE(at + 42);
      const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
      const data = zip.subarray(start, start + zip.readUInt32LE(at + 20));
      return (zip.readUInt16LE(at + 10) ? inflateRawSync(data) : data).toString('utf8');
    }
    at += 46 + nameLength + zip.readUInt16LE(at + 30) + zip.readUInt16LE(at + 32);
  }
  throw new Error(`${name} is not in the archive`);
}

describe('cover letter templates', () => {
  it('opens a letter saved before templates existed in the original design', () => {
    const old: Record<string, unknown> = letter();
    delete old.template;
    delete old.accent;
    delete old.fonts;
    const parsed = parseLetter(old);
    expect(parsed).toMatchObject({ template: 'minimal', accent: LETTER_ACCENT, fonts: {} });
    expect(parsed).toMatchObject(old);
    expect(letterFont(parsed!)).toBe('source-sans');
  });

  it('replaces style values it does not know without losing the letter', () => {
    const parsed = parseLetter({
      ...letter(),
      template: 'sparkle',
      accent: 'url(https://example.com)',
      fonts: { classic: 'comic-sans', modern: 'inter' },
    });
    expect(parsed).toMatchObject({ template: 'minimal', accent: LETTER_ACCENT });
    expect(parsed?.fonts.classic).toBeUndefined();
    expect(parsed?.fonts.modern).toBe('inter');
    expect(parsed?.body).toBe(letter().body);
  });

  it('uses a typeface only in a layout that offers it', () => {
    expect(letterFont({ template: 'classic', fonts: { classic: 'lora' } })).toBe('lora');
    expect(letterFont({ template: 'classic', fonts: { classic: 'inter' } })).toBe('source-serif');
    expect(letterFont({ template: 'modern', fonts: { classic: 'lora' } })).toBe('plex');
  });

  it('keeps the chosen style in a backup', () => {
    const value = letter({ template: 'modern', accent: '#7a2e2e', fonts: { modern: 'inter' } });
    const parsed = parseBackup(createBackup([], [value]));
    expect(parsed).toMatchObject({ ok: true, letters: [value] });
  });

  it.each(LETTER_TEMPLATE_IDS)('writes the %s layout to Word', async (template) => {
    const value = letter({ template, accent: '#7a2e2e' });
    const buffer = await letterDocxBuffer(value);
    const { value: text } = await mammoth.extractRawText({ buffer });
    const { fullName, email } = value.sender;
    for (const part of [fullName, email, '26 November 2026', 'Hiring Team', 'Acme', 'to apply'])
      expect(text).toContain(part);
    expect(text.indexOf(fullName)).toBeLessThan(text.indexOf('Hiring Team'));
    expect(text.indexOf('Acme')).toBeLessThan(text.indexOf('to apply'));

    const xml = unzip(buffer, 'word/document.xml');
    const margin = Math.round((LETTER_TEMPLATES[template].margin * 1440) / 25.4);
    expect(xml).toContain(`w:left="${margin}"`);
    expect(xml).toContain('w:w="11906" w:h="16838"'); // A4
    // Only the layout that offers a colour uses it.
    expect(xml.includes('7A2E2E')).toBe(template === 'modern');
    expect(xml.includes('<w:tbl>')).toBe(template === 'modern');
    expect(unzip(buffer, 'word/styles.xml')).toContain(
      template === 'classic' ? 'Georgia' : 'Calibri',
    );
  });
});
