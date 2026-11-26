import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SAMPLE_DATA } from '@/constants/sample-resume';
import { filterResumes } from '@/features/resume-management/filter-resumes';
import { createResume } from '@/lib/resume-factory';
import {
  backupWithHistory,
  createBackup,
  MAX_BACKUP_BYTES,
  parseBackup,
  restoreBackup,
} from '@/lib/storage/backup';
import { backupDue, FIRST_REMINDER, REMINDER_AGE } from '@/lib/storage/backup-reminder';
import {
  copyLetter,
  getLetter,
  letterWriter,
  listLetters,
  newLetter,
  saveLetter,
} from '@/lib/storage/letters';
import {
  db,
  deleteAllData,
  deleteResume,
  duplicateResume,
  getResume,
  listResumes,
  renameResume,
  resumeWriter,
  saveResume,
} from '@/lib/storage/db';
import {
  AUTO_INTERVAL,
  AUTO_LIMIT,
  listVersions,
  MANUAL_LIMIT,
  recordVersion,
  restoredResume,
  snapshotIfDue,
  VersionLimitError,
} from '@/lib/storage/versions';

const make = (id: string) =>
  createResume({ id, templateId: 'ats-essential', title: id, data: structuredClone(SAMPLE_DATA) });

beforeEach(async () => {
  await db.resumes.clear();
});

describe('IndexedDB storage', () => {
  it('saves, reads, renames, duplicates and deletes', async () => {
    await saveResume(make('a'));
    expect((await getResume('a'))?.data.personal.fullName).toBe(SAMPLE_DATA.personal.fullName);
    await renameResume('a', '  New name  ');
    expect((await getResume('a'))?.title).toBe('New name');
    const copy = await duplicateResume('a', 'Copy');
    expect(copy!.id).not.toBe('a');
    expect((await listResumes()).resumes).toHaveLength(2);
    await deleteResume('a');
    expect(await getResume('a')).toBeNull();
  });

  it('refuses to overwrite a newer version or revive a deleted resume', async () => {
    const original = make('a');
    await saveResume(original);
    const first = resumeWriter(original);
    const second = resumeWriter(original);
    await first({ ...original, title: 'From tab one', updatedAt: original.updatedAt + 1 });
    await first({ ...original, title: 'Again', updatedAt: original.updatedAt + 2 });
    const late = { ...original, title: 'From tab two', updatedAt: original.updatedAt + 3 };
    await expect(second(late)).rejects.toMatchObject({ reason: 'conflict' });
    expect((await getResume('a'))?.title).toBe('Again');
    await deleteResume('a');
    await expect(first(late)).rejects.toMatchObject({ reason: 'deleted' });
    expect(await getResume('a')).toBeNull();
    await first(late, { force: true });
    expect((await getResume('a'))?.title).toBe('From tab two');
    await first({ ...late, title: 'Back to normal', updatedAt: late.updatedAt + 1 });
    expect((await getResume('a'))?.title).toBe('Back to normal');
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
    expect(parsed).toEqual({
      ok: true,
      resumes: [resume],
      letters: [],
      versions: [],
      skipped: 0,
    });
  });

  it('explains why a file is refused', () => {
    expect(parseBackup('{nope')).toEqual({ ok: false, error: 'not-json' });
    expect(parseBackup('[1,2]')).toEqual({ ok: false, error: 'not-backup' });
    expect(parseBackup('{"app":"resumecraft","resumes":[{"x":1}]}')).toEqual({
      ok: false,
      error: 'no-valid',
    });
    expect(parseBackup(' '.repeat(MAX_BACKUP_BYTES + 1))).toEqual({
      ok: false,
      error: 'too-large',
    });
  });

  it('skips invalid records and keeps valid ones', () => {
    const text = JSON.stringify({ app: 'resumecraft', resumes: [make('a'), { id: 'x' }] });
    expect(parseBackup(text)).toMatchObject({ ok: true, skipped: 1 });
  });

  it('never overwrites an existing resume', async () => {
    const original = make('a');
    await saveResume(original);
    expect(await restoreBackup([original])).toMatchObject({ added: 0, unchanged: 1 });
    const changed = { ...original, title: 'Different' };
    expect(await restoreBackup([changed])).toMatchObject({ added: 1, unchanged: 0 });
    expect((await getResume('a'))?.title).toBe('a');
    expect((await listResumes()).resumes).toHaveLength(2);
  });

  it('does not replace a stored record it cannot read', async () => {
    await db.resumes.put({ id: 'a', schemaVersion: 99 } as never);
    expect(await restoreBackup([make('a')])).toMatchObject({ added: 1, unchanged: 0 });
    expect(await db.resumes.get('a')).toMatchObject({ schemaVersion: 99 });
    expect(await db.resumes.count()).toBe(2);
  });
});

describe('version history', () => {
  beforeEach(async () => {
    await db.versions.clear();
  });

  it('keeps changed states, skips unchanged ones and respects the interval', async () => {
    const resume = make('a');
    await saveResume(resume);
    expect(await recordVersion(resume, 'auto', '', 1000)).not.toBeNull();
    // A new timestamp or file name is not a change to the document.
    const renamed = { ...resume, title: 'Other', updatedAt: resume.updatedAt + 1 };
    expect(await recordVersion(renamed, 'auto', '', 2000)).toBeNull();
    const edited = { ...resume, targetRole: 'Designer' };
    expect(await snapshotIfDue(edited, 1000 + AUTO_INTERVAL - 1)).toBeNull();
    expect(await snapshotIfDue(edited, 1000 + AUTO_INTERVAL)).not.toBeNull();
    const list = await listVersions('a');
    expect(list.map((v) => v.resume.targetRole)).toEqual(['Designer', resume.targetRole]);
  });

  it('prunes automatic versions but never the ones saved by hand', async () => {
    const resume = make('a');
    await saveResume(resume);
    await recordVersion(resume, 'manual', '  Keep me  ', 1);
    for (let i = 0; i < AUTO_LIMIT + 5; i++) {
      await recordVersion({ ...resume, targetRole: `Role ${i}` }, 'auto', '', 10 + i);
    }
    const list = await listVersions('a');
    expect(list).toHaveLength(AUTO_LIMIT + 1);
    expect(list.at(-1)).toMatchObject({ kind: 'manual', name: 'Keep me' });
    expect(list[0]!.resume.targetRole).toBe(`Role ${AUTO_LIMIT + 4}`);
    for (let i = 1; i < MANUAL_LIMIT; i++) await recordVersion(resume, 'manual', '', 100 + i);
    await expect(recordVersion(resume, 'manual')).rejects.toBeInstanceOf(VersionLimitError);
  });

  it('restores content under the current identity and is removed with the resume', async () => {
    const resume = make('a');
    await saveResume(resume);
    const version = (await recordVersion({ ...resume, targetRole: 'Old role' }, 'manual'))!;
    const current = { ...resume, title: 'Current name', targetRole: 'New role' };
    expect(restoredResume(current, version)).toMatchObject({
      id: 'a',
      title: 'Current name',
      targetRole: 'Old role',
    });
    await deleteResume('a');
    expect(await listVersions('a')).toEqual([]);
    // Nothing is recorded for a resume that no longer exists.
    expect(await recordVersion(resume, 'auto')).toBeNull();
  });
});

describe('version history in backups', () => {
  beforeEach(async () => {
    await db.versions.clear();
  });

  /** A resume with one version saved by hand and one automatic one. */
  async function withHistory() {
    const resume = make('a');
    await saveResume(resume);
    await recordVersion({ ...resume, targetRole: 'First' }, 'manual', 'Draft', 1);
    await recordVersion({ ...resume, targetRole: 'Second' }, 'auto', '', 2);
    return resume;
  }
  const exported = async (resume: ReturnType<typeof make>) => {
    const { text, historyIncluded } = await backupWithHistory([resume]);
    expect(historyIncluded).toBe(true);
    const parsed = parseBackup(text);
    if (!parsed.ok) throw new Error(parsed.error);
    return parsed;
  };
  const restore = (parsed: Awaited<ReturnType<typeof exported>>) =>
    restoreBackup(parsed.resumes, parsed.letters, parsed.versions);

  it('restores the history on a device that has nothing', async () => {
    const backup = await exported(await withHistory());
    await Promise.all([db.resumes.clear(), db.versions.clear()]);
    expect(await restore(backup)).toMatchObject({ added: 1, versions: 2 });
    expect((await listVersions('a')).map((v) => [v.name, v.resume.targetRole])).toEqual([
      ['', 'Second'],
      ['Draft', 'First'],
    ]);
  });

  it('adds nothing twice, and brings back only what was deleted', async () => {
    const backup = await exported(await withHistory());
    expect(await restore(backup)).toMatchObject({ added: 0, versions: 0 });
    await db.versions.delete((await listVersions('a'))[0]!.id);
    expect(await restore(backup)).toMatchObject({ versions: 1 });
    expect(await listVersions('a')).toHaveLength(2);
  });

  it('files the history under the copy when the resume has changed since', async () => {
    const resume = await withHistory();
    const backup = await exported(resume);
    await saveResume({ ...resume, targetRole: 'Newer' });
    expect(await restore(backup)).toMatchObject({ added: 1, versions: 2 });
    expect(await listVersions('a')).toHaveLength(2);
    const copy = (await listResumes()).resumes.find((r) => r.id !== 'a')!;
    const history = await listVersions(copy.id);
    expect(history).toHaveLength(2);
    expect(history.every((v) => v.resume.id === copy.id)).toBe(true);
    expect(await db.versions.count()).toBe(4);
  });

  it('never prunes stored versions to make room', async () => {
    const backup = await exported(await withHistory());
    await db.versions.clear();
    for (let i = 0; i < AUTO_LIMIT; i++) {
      await recordVersion({ ...make('a'), targetRole: `Role ${i}` }, 'auto', '', 100 + i);
    }
    const before = (await listVersions('a')).map((v) => v.id);
    expect(await restore(backup)).toMatchObject({ versions: 1, versionsLeftOut: 1 });
    expect((await listVersions('a')).map((v) => v.id)).toEqual(expect.arrayContaining(before));
  });

  it('skips snapshots that are invalid or belong to no resume in the file', () => {
    const resume = make('a');
    const version = { id: 'v', resumeId: 'a', createdAt: 1, kind: 'manual', name: '', resume };
    const text = JSON.stringify({
      app: 'resumecraft',
      resumes: [resume],
      versions: [version, { ...version, resumeId: 'gone' }, { ...version, resume: {} }, 7],
    });
    const parsed = parseBackup(text);
    expect(parsed).toMatchObject({ ok: true, skipped: 3 });
    expect(parsed.ok && parsed.versions).toHaveLength(1);
  });
});

describe('cover letters', () => {
  beforeEach(async () => {
    await db.letters.clear();
  });

  it('copies the sender from a resume and outlives that resume', async () => {
    const resume = make('a');
    await saveResume(resume);
    const letter = newLetter('For Acme', resume);
    expect(letter.sender.fullName).toBe(SAMPLE_DATA.personal.fullName);
    expect(letter.resumeId).toBe('a');
    await saveLetter(letter);
    await deleteResume('a');
    expect((await getLetter(letter.id))?.sender.fullName).toBe(SAMPLE_DATA.personal.fullName);
  });

  it('guards against overwriting from a second tab', async () => {
    const letter = newLetter('One');
    await saveLetter(letter);
    const first = letterWriter(letter);
    const second = letterWriter(letter);
    await first({ ...letter, body: 'First', updatedAt: letter.updatedAt + 1 });
    await expect(
      second({ ...letter, body: 'Second', updatedAt: letter.updatedAt + 2 }),
    ).rejects.toMatchObject({ reason: 'conflict' });
    expect((await getLetter(letter.id))?.body).toBe('First');
  });

  it('travels in backups without replacing anything', async () => {
    const letter = { ...newLetter('Mine'), body: 'Dear team' };
    await saveLetter(letter);
    const parsed = parseBackup(createBackup([], [letter, { id: 'broken' } as never]));
    expect(parsed).toMatchObject({ ok: true, resumes: [], skipped: 1 });
    if (!parsed.ok) throw new Error('unreachable');
    expect(await restoreBackup([], parsed.letters)).toMatchObject({ added: 0, unchanged: 1 });
    await saveLetter({ ...letter, body: 'Changed since the backup' });
    expect(await restoreBackup([], parsed.letters)).toMatchObject({ added: 1, unchanged: 0 });
    const bodies = (await listLetters()).letters.map((l) => l.body);
    expect(bodies.sort()).toEqual(['Changed since the backup', 'Dear team']);
    await copyLetter(letter, 'Copy');
    expect((await listLetters()).letters).toHaveLength(3);
    vi.stubGlobal('localStorage', {});
    await deleteAllData();
    expect(await db.letters.count()).toBe(0);
  });

  it('keeps older backup files readable and refuses empty ones', () => {
    const old = JSON.stringify({ app: 'resumecraft', resumes: [make('a')] });
    expect(parseBackup(old)).toMatchObject({ ok: true, letters: [] });
    expect(parseBackup(createBackup([]))).toEqual({ ok: false, error: 'no-valid' });
  });
});

describe('library helpers', () => {
  const day = 24 * 60 * 60 * 1000;
  const documents = [{ createdAt: 100 * day, updatedAt: 120 * day }];

  it('reminds about backups only when there is something to lose', () => {
    const due = (lastBackup: number, now: number, snoozedUntil = 0) =>
      backupDue({ documents, lastBackup, snoozedUntil, now });
    expect(due(0, 100 * day + FIRST_REMINDER - 1)).toBe(false);
    expect(due(0, 100 * day + FIRST_REMINDER)).toBe(true);
    expect(due(0, 130 * day, 131 * day)).toBe(false);
    // Backed up after the last change: nothing to say, however long ago.
    expect(due(121 * day, 300 * day)).toBe(false);
    expect(due(119 * day, 119 * day + REMINDER_AGE)).toBe(true);
    expect(due(119 * day, 119 * day + REMINDER_AGE - 1)).toBe(false);
    expect(backupDue({ documents: [], lastBackup: 0, snoozedUntil: 0, now: day })).toBe(false);
  });

  it('searches and sorts resumes', () => {
    const resumes = [
      { ...make('b'), title: 'Beta', updatedAt: 2, createdAt: 1 },
      { ...make('a'), title: 'Alpha', updatedAt: 1, createdAt: 2 },
    ];
    const ids = (query: string, sort: 'title' | 'updatedAt' | 'createdAt') =>
      filterResumes(resumes, query, sort, () => 'Minimal White').map((r) => r.id);
    expect(ids('', 'title')).toEqual(['a', 'b']);
    expect(ids('', 'updatedAt')).toEqual(['b', 'a']);
    expect(ids('', 'createdAt')).toEqual(['a', 'b']);
    expect(ids('  BETA ', 'title')).toEqual(['b']);
    expect(ids('minimal', 'title')).toHaveLength(2);
    expect(resumes[0]!.id).toBe('b');
  });
});
