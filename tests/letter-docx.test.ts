import mammoth from 'mammoth';
import { describe, expect, it } from 'vitest';
import { SAMPLE_DATA, sampleResume } from '@/constants/sample-resume';
import { letterDocxBuffer } from '@/lib/docx/letter';
import { newLetter } from '@/lib/storage/letters';

const letter = () => ({
  ...newLetter('For Acme', sampleResume('ats-essential')),
  company: 'Acme',
  recipient: 'Hiring Team',
  date: '2026-11-26',
  body: 'Dear Hiring Team,\n\nFirst line\nsecond line\u0001.\n\nSincerely,',
});

const text = async (value: Parameters<typeof letterDocxBuffer>[0]) =>
  (await mammoth.extractRawText({ buffer: await letterDocxBuffer(value) })).value;

describe('cover letter Word export', () => {
  it('holds the sender, date, recipient and body in reading order', async () => {
    const out = await text(letter());
    const { fullName, email } = SAMPLE_DATA.personal;
    const order = [fullName, email, '26 November 2026', 'Hiring Team', 'Acme', 'Dear Hiring Team,'];
    const positions = order.map((part) => out.indexOf(part));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(positions).not.toContain(-1);
    // Control characters would stop Word opening the file.
    expect(out).not.toContain('\u0001');
    expect(out.trim().endsWith(fullName)).toBe(true);
  });

  it('does not sign twice, and keeps Khmer text', async () => {
    const value = letter();
    const name = value.sender.fullName;
    const out = await text({ ...value, language: 'km', body: `សូមគោរព\n\n${name}` });
    expect(out).toContain('សូមគោរព');
    expect(out.match(new RegExp(`^${name}$`, 'gm'))).toHaveLength(2); // header and body
  });

  it('produces a document for an empty letter', async () => {
    const empty = newLetter('Empty');
    await expect(letterDocxBuffer(empty)).resolves.toBeInstanceOf(Buffer);
  });
});
