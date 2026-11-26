import type { Resume } from './resume';

/** `auto` while editing, `manual` when the user asks, `restore` just before restoring. */
export type VersionKind = 'auto' | 'manual' | 'restore';

export type ResumeVersion = {
  id: string;
  resumeId: string;
  createdAt: number;
  kind: VersionKind;
  /** Only manual versions are named, and the name is optional. */
  name: string;
  resume: Resume;
};
