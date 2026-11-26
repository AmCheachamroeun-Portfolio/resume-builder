import { create } from 'zustand';
import type { CheckTarget } from '@/lib/ats/analyze';

/**
 * Where the writer asked to jump to. `focus` matches a `data-entry` attribute (an
 * entry id, or "personal.email"); `jump` is a request from outside the editor's
 * own layout, such as a compatibility finding.
 */
export const useEditorUi = create<{
  focus: { target: string; at: number } | null;
  focusOn: (target: string) => void;
  clearFocus: () => void;
  jump: { to: CheckTarget; at: number } | null;
  jumpTo: (to: CheckTarget) => void;
}>()((set) => ({
  focus: null,
  focusOn: (target) => set({ focus: { target, at: Date.now() } }),
  clearFocus: () => set({ focus: null, jump: null }),
  jump: null,
  jumpTo: (to) => set({ jump: { to, at: Date.now() } }),
}));
