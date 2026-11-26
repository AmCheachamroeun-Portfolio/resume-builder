import { z } from 'zod';
import { createId } from '@/lib/utils';
import { SCHEMA_VERSION, type Resume } from '@/types/resume';
import { db, listResumes, parseResume } from './db';

export const MAX_BACKUP_BYTES = 20 * 1024 * 1024;

const envelopeSchema = z.object({
  app: z.literal('resumecraft'),
  exportedAt: z.string().optional(),
  resumes: z.array(z.unknown()).min(1).max(500),
});

export function createBackup(resumes: Resume[]) {
  return JSON.stringify(
    {
      app: 'resumecraft',
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      resumes,
    },
    null,
    2,
  );
}

export type ImportError = 'too-large' | 'not-json' | 'not-backup' | 'no-valid';
export type ParsedBackup =
  { ok: true; resumes: Resume[]; skipped: number } | { ok: false; error: ImportError };

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
  const resumes = envelope.data.resumes.flatMap((record) => parseResume(record) ?? []);
  if (!resumes.length) return { ok: false, error: 'no-valid' };
  return { ok: true, resumes, skipped: envelope.data.resumes.length - resumes.length };
}

/**
 * Restoring never overwrites: an identical record is ignored, and a different
 * record with the same id is added as a separate copy. That includes rows this
 * version cannot read, which may come from a newer one.
 */
export async function restoreResumes(incoming: Resume[]) {
  const { resumes: existing } = await listResumes();
  const byId = new Map(existing.map((r) => [r.id, r]));
  const taken = new Set((await db.resumes.toCollection().primaryKeys()).map(String));
  const toAdd: Resume[] = [];
  for (const resume of incoming) {
    const current = byId.get(resume.id);
    if (current && JSON.stringify(current) === JSON.stringify(resume)) continue;
    const next = taken.has(resume.id) ? { ...resume, id: createId() } : resume;
    taken.add(next.id);
    byId.set(next.id, next);
    toAdd.push(next);
  }
  await db.resumes.bulkAdd(toAdd);
  return { added: toAdd.length, unchanged: incoming.length - toAdd.length };
}
