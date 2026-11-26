import { z } from 'zod';
import { createId } from '@/lib/utils';
import type { CoverLetter } from '@/types/cover-letter';
import { SCHEMA_VERSION, type Resume } from '@/types/resume';
import { db, listResumes, parseResume } from './db';
import { parseLetter } from './letters';

export const MAX_BACKUP_BYTES = 20 * 1024 * 1024;

const envelopeSchema = z.object({
  app: z.literal('resumecraft'),
  exportedAt: z.string().optional(),
  resumes: z.array(z.unknown()).max(500),
  /** Absent in backups that hold no cover letters, including all older ones. */
  coverLetters: z.array(z.unknown()).max(500).optional(),
});

export function createBackup(resumes: Resume[], coverLetters: CoverLetter[] = []) {
  return JSON.stringify(
    {
      app: 'resumecraft',
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      resumes,
      ...(coverLetters.length ? { coverLetters } : {}),
    },
    null,
    2,
  );
}

export type ImportError = 'too-large' | 'not-json' | 'not-backup' | 'no-valid';
export type ParsedBackup =
  | { ok: true; resumes: Resume[]; letters: CoverLetter[]; skipped: number }
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
  const skipped = envelope.data.resumes.length + records.length - resumes.length - letters.length;
  return { ok: true, resumes, letters, skipped };
}

type Stored = { id: string };

/** The records to add so that nothing already stored is replaced. */
function additions<T extends Stored>(incoming: T[], existing: T[], takenIds: string[]) {
  const byId = new Map(existing.map((r) => [r.id, r]));
  const taken = new Set(takenIds);
  const toAdd: T[] = [];
  for (const record of incoming) {
    const current = byId.get(record.id);
    if (current && JSON.stringify(current) === JSON.stringify(record)) continue;
    const next = taken.has(record.id) ? { ...record, id: createId() } : record;
    taken.add(next.id);
    byId.set(next.id, next);
    toAdd.push(next);
  }
  return toAdd;
}

/**
 * Restoring never overwrites: an identical record is ignored, and a different
 * record with the same id is added as a separate copy. That includes rows this
 * version cannot read, which may come from a newer one.
 */
export async function restoreBackup(resumes: Resume[], letters: CoverLetter[] = []) {
  return db.transaction('rw', db.resumes, db.letters, async () => {
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
    await db.resumes.bulkAdd(newResumes);
    await db.letters.bulkAdd(newLetters);
    const added = newResumes.length + newLetters.length;
    return { added, unchanged: resumes.length + letters.length - added };
  });
}
