import { create } from 'zustand';
import type { CoverLetter } from '@/types/cover-letter';
import type { DocumentSource } from './autosave';

type LetterState = {
  letter: CoverLetter | null;
  load: (letter: CoverLetter) => void;
  close: () => void;
  /** Every change goes through here so the timestamp stays consistent. */
  update: (patch: Partial<CoverLetter>) => void;
};

export const useLetter = create<LetterState>()((set) => ({
  letter: null,
  load: (letter) => set({ letter }),
  close: () => set({ letter: null }),
  update: (patch) =>
    set((state) =>
      state.letter ? { letter: { ...state.letter, ...patch, updatedAt: Date.now() } } : state,
    ),
}));

export const letterSource: DocumentSource<CoverLetter> = {
  current: () => useLetter.getState().letter,
  subscribe: (listener) =>
    useLetter.subscribe((state, previous) => listener(state.letter, previous.letter)),
};
