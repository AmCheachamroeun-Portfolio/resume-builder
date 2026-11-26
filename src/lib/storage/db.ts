import Dexie, { type EntityTable, type Table } from 'dexie';
import { normaliseSections } from '@/lib/resume-factory';
import { createId } from '@/lib/utils';
import type { CoverLetter } from '@/types/cover-letter';
import { resumeSchema, type Resume } from '@/types/resume';
import type { ResumeVersion } from '@/types/version';
import { migrate } from './migrations';

class ResumeDatabase extends Dexie {
  resumes!: EntityTable<Resume, 'id'>;
  versions!: EntityTable<ResumeVersion, 'id'>;
  letters!: EntityTable<CoverLetter, 'id'>;

  constructor() {
    super('resumecraft');
    this.version(1).stores({ resumes: 'id, title, createdAt, updatedAt' });
    // Additive: existing resumes are carried over untouched.
    this.version(2).stores({
      versions: 'id, resumeId, createdAt',
      letters: 'id, updatedAt',
    });
  }
}

export const db = new ResumeDatabase();

/** Validates a stored or imported record, returning null when it cannot be trusted. */
export function parseResume(input: unknown): Resume | null {
  try {
    const result = resumeSchema.safeParse(migrate(input));
    return result.success ? normaliseSections(result.data) : null;
  } catch {
    return null;
  }
}

export async function listResumes(): Promise<{ resumes: Resume[]; unreadable: number }> {
  const rows = await db.resumes.toArray();
  const resumes = rows.flatMap((row) => parseResume(row) ?? []);
  return { resumes, unreadable: rows.length - resumes.length };
}

export async function getResume(id: string) {
  const row = await db.resumes.get(id);
  return row ? parseResume(row) : null;
}

export async function saveResume(resume: Resume) {
  await db.resumes.put(resume);
  requestPersistence();
}

let persistenceRequested = false;
/** Asks the browser not to evict our data under storage pressure. Best effort. */
export function requestPersistence() {
  if (persistenceRequested || typeof navigator === 'undefined') return;
  persistenceRequested = true;
  void navigator.storage?.persist?.().catch(() => undefined);
}

/** The stored copy is no longer the one this editor was working from. */
export class SaveBlockedError extends Error {
  constructor(readonly reason: 'conflict' | 'deleted') {
    super(reason);
    this.name = 'SaveBlockedError';
  }
}

/**
 * A writer for one open editor. It only writes over the version it last saw, so
 * a second tab cannot be silently overwritten and a deleted document stays
 * deleted. `force` is for the moment the user explicitly chooses to restore it.
 */
export function guardedWriter<T extends { id: string; updatedAt: number }>(
  table: Table<T, string>,
  loaded: T,
) {
  let base = loaded.updatedAt;
  return async (next: T, options?: { force?: boolean }) => {
    await db.transaction('rw', table, async () => {
      if (!options?.force) {
        const stored = await table.get(next.id);
        if (!stored) throw new SaveBlockedError('deleted');
        if (stored.updatedAt !== base) throw new SaveBlockedError('conflict');
      }
      await table.put(next);
    });
    base = next.updatedAt;
    requestPersistence();
  };
}

export const resumeWriter = (loaded: Resume) =>
  guardedWriter(db.resumes as unknown as Table<Resume, string>, loaded);

export async function renameResume(id: string, title: string) {
  await db.resumes.update(id, { title: title.trim().slice(0, 120), updatedAt: Date.now() });
}

export async function duplicateResume(id: string, title: string) {
  const source = await getResume(id);
  return source ? saveCopy(source, title) : null;
}

/** Stores `source` as a new, independent resume. */
export async function saveCopy(source: Resume, title: string) {
  const now = Date.now();
  const copy: Resume = {
    ...source,
    id: createId(),
    title: title.slice(0, 120),
    createdAt: now,
    updatedAt: now,
  };
  await saveResume(copy);
  return copy;
}

/** Removes a resume together with its version history. Cover letters are kept. */
export async function deleteResume(id: string) {
  await db.transaction('rw', db.resumes, db.versions, async () => {
    await db.resumes.delete(id);
    await db.versions.where('resumeId').equals(id).delete();
  });
}

export async function deleteAllData() {
  await db.transaction('rw', db.resumes, db.versions, db.letters, async () => {
    await Promise.all([db.resumes.clear(), db.versions.clear(), db.letters.clear()]);
  });
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('resumecraft:')) localStorage.removeItem(key);
  }
  // The interface language is the one preference kept in a cookie.
  if (typeof document !== 'undefined') document.cookie = 'NEXT_LOCALE=; Max-Age=0; Path=/';
}
