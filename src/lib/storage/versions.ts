import { z } from 'zod';
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

const versionSchema = z.object({
  id: z.string().min(1).max(64),
  resumeId: z.string().min(1).max(64),
  createdAt: z.number().int().nonnegative(),
  kind: z.enum(['auto', 'manual', 'restore']),
  name: z.string().max(80).default(''),
  resume: z.unknown(),
});

/** Validates a stored or imported snapshot, returning null when it cannot be trusted. */
export function parseVersion(input: unknown): ResumeVersion | null {
  const result = versionSchema.safeParse(input);
  if (!result.success) return null;
  const resume = parseResume(result.data.resume);
  return resume ? { ...result.data, resume } : null;
}

/** Every readable snapshot of the given resumes, oldest first. */
export async function versionsOf(resumeIds: string[]): Promise<ResumeVersion[]> {
  const rows = await db.versions.where('resumeId').anyOf(resumeIds).sortBy('createdAt');
  return rows.flatMap((row) => parseVersion(row) ?? []);
}

/** What makes two snapshots the same one, whichever resume id they are filed under. */
const identity = ({ createdAt, kind, name, resume }: ResumeVersion) =>
  JSON.stringify([createdAt, kind, name, { ...resume, id: '' }]);

/**
 * Adds the snapshots a resume does not have yet. Stored ones are never replaced
 * or pruned: where a limit is reached, the oldest incoming ones are left out.
 * Call inside a transaction that covers the versions table.
 */
export async function addVersions(resumeId: string, incoming: ResumeVersion[]) {
  const rows = await history(resumeId);
  const present = new Set(rows.flatMap((row) => parseVersion(row) ?? []).map(identity));
  let manual = rows.filter((r) => r.kind === 'manual').length;
  let automatic = rows.length - manual;
  let added = 0;
  let leftOut = 0;
  for (const version of [...incoming].sort((a, b) => b.createdAt - a.createdAt)) {
    const next = { ...version, resumeId, resume: { ...version.resume, id: resumeId } };
    const key = identity(next);
    if (present.has(key)) continue;
    const byHand = next.kind === 'manual';
    if (byHand ? manual >= MANUAL_LIMIT : automatic >= AUTO_LIMIT) {
      leftOut++;
      continue;
    }
    // The id may belong to the resume this one was copied from.
    if (await db.versions.get(next.id)) next.id = createId();
    await db.versions.add(next);
    present.add(key);
    if (byHand) manual++;
    else automatic++;
    added++;
  }
  return { added, leftOut };
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
