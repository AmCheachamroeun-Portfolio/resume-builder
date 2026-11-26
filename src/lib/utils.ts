import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function createId(): string {
  return globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 20);
}

export function downloadTextFile(filename: string, content: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Keeps letters of every script (including Khmer marks) so file names stay readable. */
export function safeFileName(value: string, fallback = 'resume') {
  const cleaned = value
    .normalize('NFC')
    .replace(/[^\p{L}\p{M}\p{N}\-_ ]+/gu, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
  return cleaned || fallback;
}
