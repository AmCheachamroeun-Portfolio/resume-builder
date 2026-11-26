import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createResume } from '@/lib/resume-factory';
import { SaveBlockedError } from '@/lib/storage/db';
import { RETRY_DELAYS, startAutosave, useSaveStatus } from '@/stores/autosave';
import { actions, COALESCE_MS, useEditor } from '@/stores/editor-store';
import type { Resume } from '@/types/resume';

const current = () => useEditor.getState().resume!;
const load = (id = 'r1') =>
  useEditor.getState().load(createResume({ id, templateId: 'ats-essential', title: 'Mine' }));

beforeEach(() => {
  vi.useFakeTimers();
  load();
  return () => {
    useEditor.getState().close();
    vi.useRealTimers();
  };
});

describe('editing', () => {
  it('adds, updates, reorders and removes entries', () => {
    const first = actions.addEntry('experience', { title: 'First' });
    actions.addEntry('experience', { title: 'Second' });
    actions.updateEntry('experience', first, { company: 'Sample Co' });
    actions.moveEntry('experience', 0, 1);
    expect(current().data.experience.map((e) => e.title)).toEqual(['Second', 'First']);
    actions.removeEntry('experience', first);
    expect(current().data.experience.map((e) => e.title)).toEqual(['Second']);
  });

  it('reorders, hides and resets sections', () => {
    const original = current().sections.map((s) => s.key);
    actions.moveSection(0, 2);
    expect(current().sections[2]!.key).toBe(original[0]);
    actions.toggleSection('skills');
    expect(current().sections.find((s) => s.key === 'skills')!.visible).toBe(false);
    actions.resetSectionOrder();
    expect(current().sections.map((s) => s.key)).toEqual(original);
  });

  it('manages custom sections together with their position', () => {
    const key = actions.addCustomSection('Courses');
    expect(current().sections.at(-1)!.key).toBe(key);
    actions.removeCustomSection(key.slice('custom:'.length));
    expect(current().data.custom).toHaveLength(0);
    expect(current().sections.some((s) => s.key === key)).toBe(false);
  });

  it('switches template without losing content', () => {
    actions.setPersonal({ fullName: 'Maya Sovann' });
    actions.setTemplate('modern-slate');
    expect(current().templateId).toBe('modern-slate');
    expect(current().data.personal.fullName).toBe('Maya Sovann');
    useEditor.getState().undo();
    expect(current().templateId).toBe('ats-essential');
  });
});

describe('undo and redo', () => {
  it('groups continuous typing into one step', () => {
    for (const name of ['M', 'Ma', 'May', 'Maya']) actions.setPersonal({ fullName: name });
    expect(useEditor.getState().past).toHaveLength(1);
    useEditor.getState().undo();
    expect(current().data.personal.fullName).toBe('');
    useEditor.getState().redo();
    expect(current().data.personal.fullName).toBe('Maya');
  });

  it('starts a new step after a pause and clears redo on a new edit', () => {
    actions.setPersonal({ fullName: 'A' });
    vi.advanceTimersByTime(COALESCE_MS + 1);
    actions.setPersonal({ fullName: 'AB' });
    useEditor.getState().undo();
    expect(current().data.personal.fullName).toBe('A');
    actions.setPersonal({ fullName: 'C' });
    expect(useEditor.getState().future).toHaveLength(0);
  });
});

describe('autosave', () => {
  it('debounces writes and saves only the newest version', async () => {
    const save = vi.fn(async (resume: Resume) => void resume);
    const autosave = startAutosave(save, 500);
    actions.rename('One');
    actions.rename('Two');
    expect(useSaveStatus.getState().status).toBe('pending');
    await vi.advanceTimersByTimeAsync(499);
    expect(save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0]![0].title).toBe('Two');
    expect(useSaveStatus.getState().status).toBe('saved');
    await autosave.stop();
  });

  it('keeps the change and reports an error when storage fails, then retries', async () => {
    const save = vi
      .fn<(resume: Resume) => Promise<void>>()
      .mockRejectedValueOnce(new Error('quota'))
      .mockResolvedValue();
    const autosave = startAutosave(save, 100);
    actions.rename('Kept');
    await vi.advanceTimersByTimeAsync(100);
    expect(useSaveStatus.getState().status).toBe('error');
    expect(autosave.hasPending()).toBe(true);
    await autosave.flush();
    expect(save.mock.calls[1]![0].title).toBe('Kept');
    expect(useSaveStatus.getState().status).toBe('saved');
    await autosave.stop();
  });

  it('flushes on stop and does not save when another document is loaded', async () => {
    const save = vi.fn(async () => {});
    const autosave = startAutosave(save, 10_000);
    load('r2');
    await vi.advanceTimersByTimeAsync(20_000);
    expect(save).not.toHaveBeenCalled();
    actions.rename('Last words');
    await autosave.stop();
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('retries a failed write on its own', async () => {
    const save = vi
      .fn<(resume: Resume) => Promise<void>>()
      .mockRejectedValueOnce(new Error('quota'))
      .mockResolvedValue();
    const autosave = startAutosave(save, 100);
    actions.rename('Retried');
    await vi.advanceTimersByTimeAsync(100 + RETRY_DELAYS[0]!);
    expect(save).toHaveBeenCalledTimes(2);
    expect(useSaveStatus.getState().status).toBe('saved');
    await autosave.stop();
  });

  it('never lets a failed older write replace a newer one', async () => {
    let fail!: (error: Error) => void;
    const written: string[] = [];
    const save = vi.fn((resume: Resume) => {
      if (!written.length && resume.title === 'Old') {
        return new Promise<void>((_, reject) => (fail = reject));
      }
      written.push(resume.title);
      return Promise.resolve();
    });
    const autosave = startAutosave(save, 100);
    actions.rename('Old');
    await vi.advanceTimersByTimeAsync(100);
    vi.advanceTimersByTime(COALESCE_MS + 1);
    actions.rename('New');
    const done = autosave.flush();
    fail(new Error('quota'));
    await done;
    await vi.advanceTimersByTimeAsync(RETRY_DELAYS.at(-1)!);
    expect(written).toEqual(['New']);
    expect(autosave.hasPending()).toBe(false);
    await autosave.stop();
  });

  it('stops at a conflict until the user chooses to overwrite', async () => {
    const save = vi.fn(async (_: Resume, options?: { force?: boolean }) => {
      if (!options?.force) throw new SaveBlockedError('conflict');
    });
    const autosave = startAutosave(save, 100);
    actions.rename('Mine, edited');
    await vi.advanceTimersByTimeAsync(100);
    expect(useSaveStatus.getState().status).toBe('conflict');
    actions.setPersonal({ fullName: 'Still typing' });
    await vi.advanceTimersByTimeAsync(RETRY_DELAYS.at(-1)!);
    await autosave.flush();
    expect(save).toHaveBeenCalledTimes(1);
    expect(useSaveStatus.getState().status).toBe('conflict');
    expect(autosave.hasPending()).toBe(true);
    await autosave.overwrite();
    expect(save.mock.calls[1]![0].data.personal.fullName).toBe('Still typing');
    expect(useSaveStatus.getState().status).toBe('saved');
    await autosave.stop();
  });

  it('writes nothing after discard', async () => {
    const save = vi.fn(async () => {});
    const autosave = startAutosave(save, 100);
    actions.rename('Thrown away');
    autosave.discard();
    await vi.advanceTimersByTimeAsync(1000);
    expect(save).not.toHaveBeenCalled();
  });
});
