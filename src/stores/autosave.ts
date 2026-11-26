import { create } from 'zustand';
import { saveResume } from '@/lib/storage/db';
import type { Resume } from '@/types/resume';
import { useEditor } from './editor-store';

export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';
export const useSaveStatus = create<{ status: SaveStatus }>()(() => ({ status: 'idle' }));

export const AUTOSAVE_DELAY = 700;

/** Debounced writer for the open resume. Returns controls for flushing and teardown. */
export function startAutosave(
  save: (resume: Resume) => Promise<void> = saveResume,
  delay = AUTOSAVE_DELAY,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: Resume | null = null;
  let chain: Promise<void> = Promise.resolve();
  const status = (value: SaveStatus) => useSaveStatus.setState({ status: value });

  const flush = () => {
    clearTimeout(timer);
    const resume = pending;
    if (!resume) return chain;
    pending = null;
    status('saving');
    // Writes are chained so an older snapshot can never land after a newer one.
    chain = chain
      .then(() => save(resume))
      .then(() => {
        if (!pending) status('saved');
      })
      .catch(() => {
        pending ??= resume;
        status('error');
      });
    return chain;
  };

  const unsubscribe = useEditor.subscribe((state, previous) => {
    if (!state.resume || state.resume === previous.resume) return;
    // Loading a different document is not an edit.
    if (previous.resume?.id !== state.resume.id) return;
    pending = state.resume;
    status('pending');
    clearTimeout(timer);
    timer = setTimeout(flush, delay);
  });

  status('saved');
  return {
    flush,
    hasPending: () => pending !== null,
    stop: () => {
      unsubscribe();
      return flush();
    },
  };
}
