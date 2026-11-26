import { createId } from '@/lib/utils';
import type { Resume } from '@/types/resume';
import type { ResumeVersion, VersionKind } from '@/types/version';
import { db, parseResume } from './db';

/** How often a snapshot is taken while someone keeps editing. */
export const AUTO_INTERVAL = 10 * 60_000;
/** Automatic snapshots kept per resume. The oldest make way for new ones. */
export const AUTO_LIMIT = 20;
/** Saved-by-hand versions are never removed automatically, so they are capped. */
export const MANUAL_LIMIT = 30;

export class VersionLimitError extends Error {}

const history = (resumeId: string) =>
  db.versions.where('resumeId').equals(resumeId).sortBy('createdAt');

/** What the document says and looks like, ignoring timestamps and its file name. */
function fingerprint(resume: Resume) {
  const parsed = parseResume(resume);
  return JSON.stringify(parsed && { ...parsed, title: '', createdAt: 0, updatedAt: 0 });
}

/** Newest first. Snapshots this version of the app cannot read are left alone. */
export async function listVersions(resumeId: string): Promise<ResumeVersion[]> {
  const rows = await history(resumeId);
  return rows.reverse().flatMap((row) => {
    const resume = parseResume(row.resume);
    return resume ? [{ ...row, resume }] : [];
  });
}

/**
 * Keeps a copy of `resume`. Automatic snapshots are skipped when nothing changed
 * since the last one. Returns null when nothing was stored.
 */
export async function recordVersion(
  resume: Resume,
  kind: VersionKind,
  name = '',
  now = Date.now(),
): Promise<ResumeVersion | null> {
  return db.transaction('rw', db.resumes, db.versions, async () => {
    // A resume deleted in the meantime must not leave history behind.
    if (!(await db.resumes.get(resume.id))) return null;
    const rows = await history(resume.id);
    const latest = rows.at(-1);
    if (kind !== 'manual' && latest && fingerprint(latest.resume) === fingerprint(resume)) {
      return null;
    }
    if (kind === 'manual' && rows.filter((r) => r.kind === 'manual').length >= MANUAL_LIMIT) {
      throw new VersionLimitError();
    }
    const version: ResumeVersion = {
      id: createId(),
      resumeId: resume.id,
      createdAt: now,
      kind,
      name: name.trim().slice(0, 80),
      resume,
    };
    await db.versions.add(version);
    const automatic = [...rows, version].filter((r) => r.kind !== 'manual');
    await db.versions.bulkDelete(
      automatic.slice(0, Math.max(0, automatic.length - AUTO_LIMIT)).map((r) => r.id),
    );
    return version;
  });
}

export async function snapshotIfDue(resume: Resume, now = Date.now()) {
  const latest = (await history(resume.id)).at(-1);
  if (latest && now - latest.createdAt < AUTO_INTERVAL) return null;
  return recordVersion(resume, 'auto', '', now);
}

export async function deleteVersion(id: string) {
  await db.versions.delete(id);
}

/** The snapshot's content under the open document's identity and name. */
export function restoredResume(current: Resume, version: ResumeVersion): Resume {
  return {
    ...version.resume,
    id: current.id,
    title: current.title,
    createdAt: current.createdAt,
  };
}
