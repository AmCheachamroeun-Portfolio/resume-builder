import Dexie, { type EntityTable } from 'dexie';
import { normaliseSections } from '@/lib/resume-factory';
import { createId } from '@/lib/utils';
import { resumeSchema, type Resume } from '@/types/resume';
import { migrate } from './migrations';

class ResumeDatabase extends Dexie {
  resumes!: EntityTable<Resume, 'id'>;

  constructor() {
    super('resumecraft');
    this.version(1).stores({ resumes: 'id, title, createdAt, updatedAt' });
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
function requestPersistence() {
  if (persistenceRequested || typeof navigator === 'undefined') return;
  persistenceRequested = true;
  void navigator.storage?.persist?.().catch(() => undefined);
}

export async function renameResume(id: string, title: string) {
  await db.resumes.update(id, { title: title.trim().slice(0, 120), updatedAt: Date.now() });
}

export async function duplicateResume(id: string, title: string) {
  const source = await getResume(id);
  if (!source) return null;
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

export async function deleteResume(id: string) {
  await db.resumes.delete(id);
}

export async function deleteAllData() {
  await db.resumes.clear();
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('resumecraft:')) localStorage.removeItem(key);
  }
  // The interface language is the one preference kept in a cookie.
  if (typeof document !== 'undefined') document.cookie = 'NEXT_LOCALE=; Max-Age=0; Path=/';
}
