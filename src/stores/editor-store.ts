import { create } from 'zustand';
import { defaultSections, switchTemplate } from '@/lib/resume-factory';
import { getTemplate } from '@/features/resume-templates/registry';
import { createId } from '@/lib/utils';
import {
  ENTRY_SCHEMAS,
  type Design,
  type ListEntry,
  type ListSectionKey,
  type Resume,
  type ResumeData,
} from '@/types/resume';

export const HISTORY_LIMIT = 100;
/** Edits to the same field within this window collapse into one undo step. */
export const COALESCE_MS = 900;

type EditorState = {
  resume: Resume | null;
  past: Resume[];
  future: Resume[];
  lastEdit: { key: string; at: number } | null;
  load: (resume: Resume) => void;
  close: () => void;
  /** Every change goes through here so history and timestamps stay consistent. */
  apply: (recipe: (resume: Resume) => Resume, coalesceKey?: string) => void;
  undo: () => void;
  redo: () => void;
};

export const useEditor = create<EditorState>()((set) => ({
  resume: null,
  past: [],
  future: [],
  lastEdit: null,
  load: (resume) => set({ resume, past: [], future: [], lastEdit: null }),
  close: () => set({ resume: null, past: [], future: [], lastEdit: null }),
  apply: (recipe, coalesceKey) =>
    set((state) => {
      if (!state.resume) return state;
      const next = recipe(state.resume);
      if (next === state.resume) return state;
      const now = Date.now();
      const merge =
        coalesceKey !== undefined &&
        state.lastEdit?.key === coalesceKey &&
        now - state.lastEdit.at < COALESCE_MS;
      return {
        resume: { ...next, updatedAt: now },
        past: merge ? state.past : [...state.past, state.resume].slice(-HISTORY_LIMIT),
        future: [],
        lastEdit: coalesceKey ? { key: coalesceKey, at: now } : null,
      };
    }),
  undo: () =>
    set((state) => {
      const previous = state.past[state.past.length - 1];
      if (!previous || !state.resume) return state;
      return {
        resume: { ...previous, updatedAt: Date.now() },
        past: state.past.slice(0, -1),
        future: [state.resume, ...state.future],
        lastEdit: null,
      };
    }),
  redo: () =>
    set((state) => {
      const [next, ...rest] = state.future;
      if (!next || !state.resume) return state;
      return {
        resume: { ...next, updatedAt: Date.now() },
        past: [...state.past, state.resume],
        future: rest,
        lastEdit: null,
      };
    }),
}));

// ---------- Actions: small, pure recipes over a resume ----------

const apply: EditorState['apply'] = (...args) => useEditor.getState().apply(...args);
const withData = (r: Resume, data: Partial<ResumeData>): Resume => ({
  ...r,
  data: { ...r.data, ...data },
});

function move<T>(list: T[], from: number, to: number) {
  if (from < 0 || to < 0 || from >= list.length || to >= list.length || from === to) return list;
  const next = [...list];
  next.splice(to, 0, ...next.splice(from, 1));
  return next;
}

export const actions = {
  rename: (title: string) => apply((r) => ({ ...r, title: title.slice(0, 120) }), 'title'),
  setMeta: (patch: Partial<Pick<Resume, 'language' | 'targetRole'>>) =>
    apply((r) => ({ ...r, ...patch }), `meta:${Object.keys(patch).join()}`),
  setPersonal: (patch: Partial<ResumeData['personal']>) =>
    apply(
      (r) => withData(r, { personal: { ...r.data.personal, ...patch } }),
      `personal:${Object.keys(patch).join()}`,
    ),
  setSummary: (patch: Partial<ResumeData['summary']>) =>
    apply(
      (r) => withData(r, { summary: { ...r.data.summary, ...patch } }),
      `summary:${Object.keys(patch).join()}`,
    ),
  addEntry: (key: ListSectionKey, values: Record<string, unknown> = {}) => {
    const id = createId();
    apply((r) =>
      r.data[key].length >= 60
        ? r
        : withData(r, { [key]: [...r.data[key], ENTRY_SCHEMAS[key].parse({ ...values, id })] }),
    );
    return id;
  },
  updateEntry: (key: ListSectionKey, id: string, patch: Partial<ListEntry>) =>
    apply(
      (r) =>
        withData(r, {
          [key]: r.data[key].map((e) => (e.id === id ? { ...e, ...patch } : e)),
        }),
      `${key}:${id}:${Object.keys(patch).join()}`,
    ),
  /** Copies an entry and places the copy straight after it. */
  duplicateEntry: (key: ListSectionKey, id: string) => {
    const copy = createId();
    apply((r) => {
      const list: ListEntry[] = r.data[key];
      const index = list.findIndex((e) => e.id === id);
      if (index < 0 || list.length >= 60) return r;
      const next = [...list];
      next.splice(index + 1, 0, { ...list[index]!, id: copy });
      return withData(r, { [key]: next });
    });
    return copy;
  },
  removeEntry: (key: ListSectionKey, id: string) =>
    apply((r) => withData(r, { [key]: r.data[key].filter((e) => e.id !== id) })),
  moveEntry: (key: ListSectionKey, from: number, to: number) =>
    apply((r) => {
      const list: ListEntry[] = r.data[key];
      const next = move(list, from, to);
      return next === list ? r : withData(r, { [key]: next });
    }),
  moveSection: (from: number, to: number) =>
    apply((r) => {
      const sections = move(r.sections, from, to);
      return sections === r.sections ? r : { ...r, sections };
    }),
  toggleSection: (key: string) =>
    apply((r) => ({
      ...r,
      sections: r.sections.map((s) => (s.key === key ? { ...s, visible: !s.visible } : s)),
    })),
  addCustomSection: (title: string) => {
    const id = createId();
    apply((r) => ({
      ...withData(r, { custom: [...r.data.custom, { id, title, items: [] }] }),
      sections: [...r.sections, { key: `custom:${id}`, visible: true }],
    }));
    return `custom:${id}`;
  },
  updateCustomSection: (id: string, patch: Partial<ResumeData['custom'][number]>) =>
    apply(
      (r) =>
        withData(r, {
          custom: r.data.custom.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        }),
      `custom:${id}:${Object.keys(patch).join()}:${patch.items?.length ?? ''}`,
    ),
  removeCustomSection: (id: string) =>
    apply((r) => ({
      ...withData(r, { custom: r.data.custom.filter((c) => c.id !== id) }),
      sections: r.sections.filter((s) => s.key !== `custom:${id}`),
    })),
  setDesign: (patch: Partial<Design>) =>
    apply((r) => ({ ...r, design: { ...r.design, ...patch } }), `design:${Object.keys(patch)}`),
  /** Restores the template's look; paper size is a property of the document and stays. */
  resetDesign: () =>
    apply((r) => ({
      ...r,
      design: { ...getTemplate(r.templateId).design, pageSize: r.design.pageSize },
    })),
  resetSectionOrder: () =>
    apply((r) => ({
      ...r,
      sections: [
        ...defaultSections(r.templateId),
        ...r.data.custom.map((c) => ({ key: `custom:${c.id}`, visible: true })),
      ],
    })),
  setTemplate: (templateId: string) => apply((r) => switchTemplate(r, templateId)),
  replaceData: (data: ResumeData) => apply((r) => withData(r, data)),
};
