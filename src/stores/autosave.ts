import { create } from 'zustand';
import { SaveBlockedError, saveResume } from '@/lib/storage/db';
import type { Resume } from '@/types/resume';
import { useEditor } from './editor-store';

export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error' | 'conflict' | 'deleted';
export const useSaveStatus = create<{ status: SaveStatus }>()(() => ({ status: 'idle' }));

export const AUTOSAVE_DELAY = 700;
/** Waits between automatic retries after a failed write. The last one repeats. */
export const RETRY_DELAYS = [2000, 5000, 15000, 30000];

type Document = { id: string };
type Save<T> = (document: T, options?: { force?: boolean }) => Promise<void>;
/** Where the open document lives, so edits can be observed. */
export type DocumentSource<T> = {
  current: () => T | null;
  subscribe: (listener: (next: T | null, previous: T | null) => void) => () => void;
};

const resumeSource: DocumentSource<Resume> = {
  current: () => useEditor.getState().resume,
  subscribe: (listener) =>
    useEditor.subscribe((state, previous) => listener(state.resume, previous.resume)),
};

/** Debounced writer for the open document. Returns controls for flushing and teardown. */
export function startAutosave<T extends Document = Resume>(
  save: Save<T> = saveResume as unknown as Save<T>,
  delay = AUTOSAVE_DELAY,
  source: DocumentSource<T> = resumeSource as unknown as DocumentSource<T>,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: T | null = null;
  let chain: Promise<void> = Promise.resolve();
  let queued = 0;
  let failures = 0;
  let blocked = false;
  let stopped = false;
  const status = (value: SaveStatus) => useSaveStatus.setState({ status: value });

  const write = (resume: T, force = false) => {
    const turn = ++queued;
    pending = null;
    status('saving');
    // Writes are chained so an older snapshot can never land after a newer one.
    chain = chain
      .then(() => (force ? save(resume, { force }) : save(resume)))
      .then(() => {
        failures = 0;
        if (!pending && turn === queued) status('saved');
      })
      .catch((error) => {
        // A newer snapshot is already on its way: this one must not replace it.
        if (turn !== queued) return;
        pending ??= resume;
        if (error instanceof SaveBlockedError) {
          blocked = true;
          clearTimeout(timer);
          status(error.reason);
          return;
        }
        status('error');
        if (stopped) return;
        clearTimeout(timer);
        const wait = RETRY_DELAYS[Math.min(failures++, RETRY_DELAYS.length - 1)];
        timer = setTimeout(flush, wait);
      });
    return chain;
  };

  const flush = (): Promise<void> => {
    clearTimeout(timer);
    return pending && !blocked ? write(pending) : chain;
  };

  const unsubscribe = source.subscribe((next, previous) => {
    if (!next || next === previous) return;
    // Loading a different document is not an edit.
    if (previous?.id !== next.id) return;
    pending = next;
    if (blocked) return;
    status('pending');
    clearTimeout(timer);
    timer = setTimeout(flush, delay);
  });

  const end = () => {
    stopped = true;
    clearTimeout(timer);
    unsubscribe();
  };

  status('saved');
  return {
    flush,
    hasPending: () => pending !== null,
    /** Writes this editor's version although the stored one changed or is gone. */
    overwrite: () => {
      const resume = pending ?? source.current();
      if (!resume) return chain;
      blocked = false;
      clearTimeout(timer);
      return write(resume, true);
    },
    /** Stops without writing: the user chose another version over this one. */
    discard: () => {
      end();
      pending = null;
    },
    stop: () => {
      const last = flush();
      end();
      return last;
    },
  };
}
