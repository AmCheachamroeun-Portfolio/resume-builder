import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SAMPLE_DATA } from '@/constants/sample-resume';
import {
  API_KEY_STORAGE,
  closeKeyDialog,
  ensureApiKey,
  maskKey,
  promptForApiKey,
  readApiKey,
  removeApiKey,
  requestApiKey,
  saveApiKey,
  useKeyDialog,
} from '@/features/ai-assistant/api-key';
import { isKeyShape } from '@/lib/ai/key';
import { createResume } from '@/lib/resume-factory';
import { backupWithHistory } from '@/lib/storage/backup';
import { deleteAllData, listResumes, saveResume } from '@/lib/storage/db';
import { listLetters, newLetter, saveLetter } from '@/lib/storage/letters';
import { recordVersion } from '@/lib/storage/versions';

const KEY = 'test-key-not-real-0000001a2b';

/* A stand-in whose entries are ordinary properties, as Object.keys expects. */
beforeEach(() => {
  const store: Record<string, string> = {};
  vi.stubGlobal(
    'localStorage',
    Object.defineProperties(store, {
      getItem: { value: (k: string) => store[k] ?? null },
      setItem: { value: (k: string, v: string) => void (store[k] = v) },
      removeItem: { value: (k: string) => void delete store[k] },
    }),
  );
});

describe('the stored API key', () => {
  it('can be saved, recognised without being revealed, replaced and removed', () => {
    expect(readApiKey()).toBe('');
    expect(saveApiKey(KEY)).toBe(true);
    expect(localStorage.getItem(API_KEY_STORAGE)).toBe(KEY);
    expect(readApiKey()).toBe(KEY);
    expect(maskKey(KEY)).toBe('••••••••1a2b');
    saveApiKey(`${KEY}-new1`);
    expect(readApiKey()).toBe(`${KEY}-new1`);
    removeApiKey();
    expect(readApiKey()).toBe('');
    expect(maskKey('')).toBe('');
  });

  it('ignores a stored value that could not be a key', () => {
    localStorage.setItem(API_KEY_STORAGE, 'not a key');
    expect(readApiKey()).toBe('');
    expect(isKeyShape(KEY)).toBe(true);
    for (const bad of ['', 'short', `${KEY} x`, `${KEY}\n`, 'ក'.repeat(30), 'a'.repeat(300)]) {
      expect(isKeyShape(bad), JSON.stringify(bad)).toBe(false);
    }
  });

  it('says when the browser refuses to store it', () => {
    vi.stubGlobal('localStorage', {
      setItem: () => {
        throw new Error('blocked');
      },
    });
    expect(saveApiKey(KEY)).toBe(false);
    expect(readApiKey()).toBe('');
  });

  it('never appears in a backup, and goes when all data is deleted', async () => {
    saveApiKey(KEY);
    const resume = createResume({
      templateId: 'ats-essential',
      title: 'x',
      data: structuredClone(SAMPLE_DATA),
    });
    await saveResume(resume);
    await recordVersion(resume, 'manual', 'one');
    await saveLetter(newLetter('Letter', resume));
    const { text } = await backupWithHistory(
      (await listResumes()).resumes,
      (await listLetters()).letters,
    );
    expect(text).toContain(resume.id);
    expect(text).toContain('coverLetters');
    expect(text).not.toContain(KEY);
    expect(text).not.toContain(API_KEY_STORAGE);
    await deleteAllData();
    expect(readApiKey()).toBe('');
  });
});

describe('asking for a key', () => {
  const open = () => useKeyDialog.getState().open;

  it('carries straight on when there is one', async () => {
    saveApiKey(KEY);
    await expect(ensureApiKey()).resolves.toBe(true);
    expect(open()).toBe(false);
  });

  it('answers everyone who is waiting once a key is saved', async () => {
    const first = ensureApiKey();
    const second = ensureApiKey();
    expect(open()).toBe(true);
    saveApiKey(KEY);
    closeKeyDialog(true);
    await expect(Promise.all([first, second])).resolves.toEqual([true, true]);
    expect(open()).toBe(false);
  });

  it('does not reappear by itself after being closed, but does when asked', async () => {
    const asked = requestApiKey();
    closeKeyDialog(false);
    await expect(asked).resolves.toBe(false);
    promptForApiKey();
    expect(open()).toBe(false);
    void ensureApiKey();
    expect(open()).toBe(true);
    closeKeyDialog(false);
  });
});
