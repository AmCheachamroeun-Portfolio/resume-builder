import { mkdirSync, writeFileSync } from 'node:fs';
import mammoth from 'mammoth';
import { describe, expect, it } from 'vitest';
import { sampleResume } from '@/constants/sample-resume';
import { docxBuffer } from '@/lib/docx/build';
import { TEMPLATES } from '@/features/resume-templates/registry';
import { fixture, KHMER_PHRASES } from '../e2e/fixtures';

const text = async (buffer: Buffer) => (await mammoth.extractRawText({ buffer })).value;
const html = async (buffer: Buffer) => (await mammoth.convertToHtml({ buffer })).value;

describe('Word export', () => {
  it('carries sections, entries and working links', async () => {
    const buffer = await docxBuffer(sampleResume('ats-essential'));
    const content = await text(buffer);
    for (const part of ['Maya Sovann', 'Work Experience', 'Lotus Ledger Studio', 'React']) {
      expect(content).toContain(part);
    }
    const page = await html(buffer);
    expect(page).toContain('<h1>Work Experience</h1>');
    expect(page).toContain('href="mailto:maya.sovann@example.com"');
    expect(page).toContain('<ul><li>');
  });

  it('follows the order and visibility chosen in the editor', async () => {
    const resume = sampleResume('ats-essential');
    resume.sections = [
      { key: 'skills', visible: true },
      { key: 'experience', visible: false },
      { key: 'education', visible: true },
    ];
    const content = await text(await docxBuffer(resume));
    expect(content.indexOf('Skills')).toBeLessThan(content.indexOf('Education'));
    expect(content).not.toContain('Lotus Ledger Studio');
  });

  it('keeps Khmer text exactly and names a Khmer font', async () => {
    const buffer = await docxBuffer(fixture('modern-slate', 'khmer'));
    const content = (await text(buffer)).replace(/[\s\u200b]+/g, '');
    for (const phrase of KHMER_PHRASES) expect(content).toContain(phrase);
    mkdirSync('test-results-docx', { recursive: true });
    writeFileSync('test-results-docx/khmer.docx', buffer);
    writeFileSync('test-results-docx/sample.docx', await docxBuffer(sampleResume('modern-slate')));
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('never produces unsafe links or unreadable characters', async () => {
    const resume = sampleResume('ats-essential');
    resume.data.summary.professional = 'Bad\u0001 [click](javascript:alert(1)) **bold** text';
    const page = await html(await docxBuffer(resume));
    expect(page).not.toContain('javascript:');
    expect(page).toContain('Bad');
    expect(page).toContain('<strong>bold</strong>');
  });

  it('builds for every template and an empty resume', async () => {
    for (const template of TEMPLATES) {
      expect((await docxBuffer(sampleResume(template.id))).length).toBeGreaterThan(1000);
    }
    const empty = fixture('ats-essential', 'sample');
    empty.data.personal = { ...empty.data.personal, fullName: '', headline: '' };
    expect((await docxBuffer(empty)).length).toBeGreaterThan(1000);
  });
});
