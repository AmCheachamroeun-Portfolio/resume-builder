/** When the last full backup was downloaded, and how long a reminder is paused. */
const LAST_KEY = 'resumecraft:last-backup';
const SNOOZE_KEY = 'resumecraft:backup-snooze';

const DAY = 24 * 60 * 60 * 1000;
/** Work never backed up is mentioned once it is a day old. */
export const FIRST_REMINDER = DAY;
/** Later changes are mentioned when the last backup is this old. */
export const REMINDER_AGE = 14 * DAY;
export const SNOOZE = 7 * DAY;

export function backupDue({
  documents,
  lastBackup,
  snoozedUntil,
  now,
}: {
  documents: { createdAt: number; updatedAt: number }[];
  lastBackup: number;
  snoozedUntil: number;
  now: number;
}) {
  if (!documents.length || now < snoozedUntil) return false;
  if (!lastBackup) return documents.some((d) => now - d.createdAt >= FIRST_REMINDER);
  return now - lastBackup >= REMINDER_AGE && documents.some((d) => d.updatedAt > lastBackup);
}

const read = (key: string) => {
  try {
    return Number(localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
};

const listeners = new Set<() => void>();
const write = (key: string, value: number) => {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* the reminder will simply appear again */
  }
  listeners.forEach((listener) => listener());
};

export const reminderState = {
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  /** A string so React can compare snapshots by value. */
  snapshot: () => `${read(LAST_KEY)}:${read(SNOOZE_KEY)}`,
  backedUp: (now = Date.now()) => write(LAST_KEY, now),
  snooze: (now = Date.now()) => write(SNOOZE_KEY, now + SNOOZE),
};
