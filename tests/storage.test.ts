import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SAMPLE_DATA } from '@/constants/sample-resume';
import { createResume } from '@/lib/resume-factory';
import { createBackup, parseBackup, restoreResumes } from '@/lib/storage/backup';
import {
  db,
  deleteAllData,
  deleteResume,
  duplicateResume,
  getResume,
  listResumes,
  renameResume,
  saveResume,
} from '@/lib/storage/db';

const make = (id: string) =>
  createResume({ id, templateId: 'ats-essential', title: id, data: structuredClone(SAMPLE_DATA) });

beforeEach(async () => {
  await db.resumes.clear();
});

describe('IndexedDB storage', () => {
  it('saves, reads, renames, duplicates and deletes', async () => {
    await saveResume(make('a'));
    expect((await getResume('a'))?.data.personal.fullName).toBe('Maya Sovann');
    await renameResume('a', '  New name  ');
    expect((await getResume('a'))?.title).toBe('New name');
    const copy = await duplicateResume('a', 'Copy');
    expect(copy!.id).not.toBe('a');
    expect((await listResumes()).resumes).toHaveLength(2);
    await deleteResume('a');
    expect(await getResume('a')).toBeNull();
  });

  it('counts unreadable records without deleting them', async () => {
    await saveResume(make('good'));
    await db.resumes.put({ id: 'bad', title: 5 } as never);
    const result = await listResumes();
    expect(result.resumes.map((r) => r.id)).toEqual(['good']);
    expect(result.unreadable).toBe(1);
    expect(await db.resumes.count()).toBe(2);
  });

  it('deletes every resume and only this app’s preferences', async () => {
    const store: Record<string, string> = { 'resumecraft:theme': 'dark', other: 'keep' };
    vi.stubGlobal(
      'localStorage',
      new Proxy(store, {
        get: (target, key: string) =>
          key === 'removeItem' ? (k: string) => delete target[k] : target[key],
      }),
    );
    await saveResume(make('a'));
    await deleteAllData();
    expect(await db.resumes.count()).toBe(0);
    expect(store).toEqual({ other: 'keep' });
  });
});

describe('JSON import and export', () => {
  it('round-trips exactly', () => {
    const resume = make('a');
    const parsed = parseBackup(createBackup([resume]));
    expect(parsed).toEqual({ ok: true, resumes: [resume], skipped: 0 });
  });

  it('explains why a file is refused', () => {
    expect(parseBackup('{nope')).toEqual({ ok: false, error: 'not-json' });
    expect(parseBackup('[1,2]')).toEqual({ ok: false, error: 'not-backup' });
    expect(parseBackup('{"app":"resumecraft","resumes":[{"x":1}]}')).toEqual({
      ok: false,
      error: 'no-valid',
    });
    expect(parseBackup(' '.repeat(21 * 1024 * 1024))).toEqual({ ok: false, error: 'too-large' });
  });

  it('skips invalid records and keeps valid ones', () => {
    const text = JSON.stringify({ app: 'resumecraft', resumes: [make('a'), { id: 'x' }] });
    expect(parseBackup(text)).toMatchObject({ ok: true, skipped: 1 });
  });

  it('never overwrites an existing resume', async () => {
    const original = make('a');
    await saveResume(original);
    expect(await restoreResumes([original])).toEqual({ added: 0, unchanged: 1 });
    const changed = { ...original, title: 'Different' };
    expect(await restoreResumes([changed])).toEqual({ added: 1, unchanged: 0 });
    expect((await getResume('a'))?.title).toBe('a');
    expect((await listResumes()).resumes).toHaveLength(2);
  });

  it('does not replace a stored record it cannot read', async () => {
    await db.resumes.put({ id: 'a', schemaVersion: 99 } as never);
    expect(await restoreResumes([make('a')])).toEqual({ added: 1, unchanged: 0 });
    expect(await db.resumes.get('a')).toMatchObject({ schemaVersion: 99 });
    expect(await db.resumes.count()).toBe(2);
  });
});
