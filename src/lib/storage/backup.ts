import { z } from 'zod';
import { createId } from '@/lib/utils';
import type { CoverLetter } from '@/types/cover-letter';
import { SCHEMA_VERSION, type Resume } from '@/types/resume';
import type { ResumeVersion } from '@/types/version';
import { db, listResumes, parseResume } from './db';
import { parseLetter } from './letters';
import { addVersions, AUTO_LIMIT, MANUAL_LIMIT, parseVersion, versionsOf } from './versions';

/** Version history repeats each resume, photo included, so backups can be large. */
export const MAX_BACKUP_BYTES = 100 * 1024 * 1024;
/** How long an export waits for the history before going ahead without it. */
const HISTORY_TIMEOUT = 5000;

const envelopeSchema = z.object({
  app: z.literal('resumecraft'),
  exportedAt: z.string().optional(),
  resumes: z.array(z.unknown()).max(500),
  /** Absent in backups that hold no cover letters, including all older ones. */
  coverLetters: z.array(z.unknown()).max(500).optional(),
  /** Saved versions of the resumes above. Absent in older backups. */
  versions: z
    .array(z.unknown())
    .max(500 * (AUTO_LIMIT + MANUAL_LIMIT))
    .optional(),
});

export function createBackup(
  resumes: Resume[],
  coverLetters: CoverLetter[] = [],
  versions: ResumeVersion[] = [],
) {
  return JSON.stringify(
    {
      app: 'resumecraft',
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      resumes,
      ...(coverLetters.length ? { coverLetters } : {}),
      ...(versions.length ? { versions } : {}),
    },
    null,
    2,
  );
}

/**
 * A backup including each resume's saved versions. If the history cannot be
 * read, for instance when storage is failing, the documents are still backed up.
 */
export async function backupWithHistory(resumes: Resume[], letters: CoverLetter[] = []) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const versions = await Promise.race([
    versionsOf(resumes.map((r) => r.id)),
    new Promise<null>((resolve) => (timer = setTimeout(resolve, HISTORY_TIMEOUT, null))),
  ])
    .catch(() => null)
    .finally(() => clearTimeout(timer));
  return {
    text: createBackup(resumes, letters, versions ?? []),
    historyIncluded: versions !== null,
  };
}

export type ImportError = 'too-large' | 'not-json' | 'not-backup' | 'no-valid';
export type ParsedBackup =
  | {
      ok: true;
      resumes: Resume[];
      letters: CoverLetter[];
      versions: ResumeVersion[];
      skipped: number;
    }
  | { ok: false; error: ImportError };

/** Accepts only our own envelope, then validates every record independently. */
export function parseBackup(text: string): ParsedBackup {
  if (text.length > MAX_BACKUP_BYTES) return { ok: false, error: 'too-large' };
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: 'not-json' };
  }
  const envelope = envelopeSchema.safeParse(json);
  if (!envelope.success) return { ok: false, error: 'not-backup' };
  const records = envelope.data.coverLetters ?? [];
  const resumes = envelope.data.resumes.flatMap((record) => parseResume(record) ?? []);
  const letters = records.flatMap((record) => parseLetter(record) ?? []);
  if (!resumes.length && !letters.length) return { ok: false, error: 'no-valid' };
  const history = envelope.data.versions ?? [];
  const ids = new Set(resumes.map((r) => r.id));
  // A snapshot without its resume has nowhere to go.
  const versions = history.flatMap((record) => {
    const version = parseVersion(record);
    return version && ids.has(version.resumeId) ? version : [];
  });
  const skipped =
    envelope.data.resumes.length +
    records.length +
    history.length -
    (resumes.length + letters.length + versions.length);
  return { ok: true, resumes, letters, versions, skipped };
}

type Stored = { id: string };

/**
 * The records to add so that nothing already stored is replaced, and the id each
 * incoming record ends up under.
 */
function additions<T extends Stored>(incoming: T[], existing: T[], takenIds: string[]) {
  const byId = new Map(existing.map((r) => [r.id, r]));
  const taken = new Set(takenIds);
  const toAdd: T[] = [];
  const ids = new Map<string, string>();
  for (const record of incoming) {
    const current = byId.get(record.id);
    if (current && JSON.stringify(current) === JSON.stringify(record)) {
      ids.set(record.id, record.id);
      continue;
    }
    const next = taken.has(record.id) ? { ...record, id: createId() } : record;
    taken.add(next.id);
    byId.set(next.id, next);
    toAdd.push(next);
    ids.set(record.id, next.id);
  }
  return { toAdd, ids };
}

/**
 * Restoring never overwrites: an identical record is ignored, and a different
 * record with the same id is added as a separate copy. That includes rows this
 * version cannot read, which may come from a newer one. Saved versions follow
 * their resume to whichever id it ends up under.
 */
export async function restoreBackup(
  resumes: Resume[],
  letters: CoverLetter[] = [],
  versions: ResumeVersion[] = [],
) {
  return db.transaction('rw', db.resumes, db.letters, db.versions, async () => {
    const newResumes = additions(
      resumes,
      (await listResumes()).resumes,
      (await db.resumes.toCollection().primaryKeys()).map(String),
    );
    const newLetters = additions(
      letters,
      (await db.letters.toArray()).flatMap((row) => parseLetter(row) ?? []),
      (await db.letters.toCollection().primaryKeys()).map(String),
    );
    await db.resumes.bulkAdd(newResumes.toAdd);
    await db.letters.bulkAdd(newLetters.toAdd);

    let restored = 0;
    let leftOut = 0;
    for (const [from, to] of newResumes.ids) {
      const own = versions.filter((v) => v.resumeId === from);
      if (!own.length) continue;
      const result = await addVersions(to, own);
      restored += result.added;
      leftOut += result.leftOut;
    }

    const added = newResumes.toAdd.length + newLetters.toAdd.length;
    return {
      added,
      unchanged: resumes.length + letters.length - added,
      versions: restored,
      versionsLeftOut: leftOut,
    };
  });
}
