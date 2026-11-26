import { create } from 'zustand';
import type { ListSectionKey } from '@/types/resume';

export const ASSISTANT_TASKS = [
  'chat',
  'summary',
  'improve',
  'skills',
  'tailor',
  'review',
  'ats',
] as const;
export type AssistantTask = (typeof ASSISTANT_TASKS)[number];
export type ImproveTarget = { section: ListSectionKey; id: string; field: string };

type State = {
  open: boolean;
  task: AssistantTask;
  target: ImproveTarget | null;
  openFor: (task: AssistantTask, target?: ImproveTarget) => void;
  setTarget: (target: ImproveTarget | null) => void;
  setTask: (task: AssistantTask) => void;
  toggle: () => void;
  close: () => void;
  reset: () => void;
};

export const useAssistant = create<State>()((set) => ({
  open: false,
  task: 'chat',
  target: null,
  openFor: (task, target) => set((s) => ({ open: true, task, target: target ?? s.target })),
  setTarget: (target) => set({ target }),
  setTask: (task) => set({ task }),
  toggle: () => set((s) => ({ open: !s.open })),
  close: () => set({ open: false }),
  reset: () => set({ open: false, task: 'chat', target: null }),
}));
