import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';
import { SAMPLE_DATA } from '@/constants/sample-resume';
import { createResume } from '@/lib/resume-factory';

describe('database upgrade', () => {
  it('carries resumes saved by the previous release into the new database version', async () => {
    const old = new Dexie('resumecraft');
    old.version(1).stores({ resumes: 'id, title, createdAt, updatedAt' });
    const saved = createResume({
      id: 'kept',
      templateId: 'ats-essential',
      title: 'Written before the upgrade',
      data: structuredClone(SAMPLE_DATA),
    });
    await old.table('resumes').add(saved);
    old.close();

    const { db, getResume } = await import('@/lib/storage/db');
    expect(await getResume('kept')).toEqual(saved);
    expect(db.verno).toBe(2);
    expect(await db.versions.count()).toBe(0);
    expect(await db.letters.count()).toBe(0);
  });
});
