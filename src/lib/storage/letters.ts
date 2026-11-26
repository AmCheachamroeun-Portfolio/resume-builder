import type { Table } from 'dexie';
import { createId } from '@/lib/utils';
import { coverLetterSchema, type CoverLetter } from '@/types/cover-letter';
import type { Resume } from '@/types/resume';
import { db, guardedWriter, requestPersistence } from './db';

/** Validates a stored or imported letter, returning null when it cannot be trusted. */
export function parseLetter(input: unknown): CoverLetter | null {
  const result = coverLetterSchema.safeParse(input);
  return result.success ? result.data : null;
}

/** The writer's own details, copied from a resume. */
export function senderFrom(resume: Resume): CoverLetter['sender'] {
  const { fullName, headline, email, phone, location } = resume.data.personal;
  return { fullName, headline, email, phone, location };
}

/** Today's date in the visitor's own time zone. */
export function localDay(now = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function newLetter(title: string, resume?: Resume, now = Date.now()): CoverLetter {
  return coverLetterSchema.parse({
    id: createId(),
    title,
    resumeId: resume?.id ?? '',
    language: resume?.language,
    sender: resume ? senderFrom(resume) : undefined,
    pageSize: resume?.design.pageSize,
    date: localDay(new Date(now)),
    createdAt: now,
    updatedAt: now,
  });
}

export async function listLetters() {
  const rows = await db.letters.orderBy('updatedAt').reverse().toArray();
  const letters = rows.flatMap((row) => parseLetter(row) ?? []);
  return { letters, unreadable: rows.length - letters.length };
}

export async function getLetter(id: string) {
  const row = await db.letters.get(id);
  return row ? parseLetter(row) : null;
}

export async function saveLetter(letter: CoverLetter) {
  await db.letters.put(letter);
  requestPersistence();
}

export const letterWriter = (loaded: CoverLetter) =>
  guardedWriter(db.letters as unknown as Table<CoverLetter, string>, loaded);

/** Stores `source` as a new, independent letter. */
export async function copyLetter(source: CoverLetter, title: string) {
  const now = Date.now();
  const copy = {
    ...source,
    id: createId(),
    title: title.slice(0, 300),
    createdAt: now,
    updatedAt: now,
  };
  await saveLetter(copy);
  return copy;
}

export async function deleteLetter(id: string) {
  await db.letters.delete(id);
}
