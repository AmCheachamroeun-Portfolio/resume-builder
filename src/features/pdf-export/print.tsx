import type { ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ResumeDocument } from '@/features/resume-templates/resume-document';
import { safeFileName } from '@/lib/utils';
import type { Resume } from '@/types/resume';

export const PRINT_ROOT_ID = 'rc-print-root';
const PAGE_STYLE_ID = 'rc-print-page';

let active: { root: Root; cleanup: () => void } | null = null;

const frame = () => new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Renders a document off screen, waits until it has settled, and hands it to the
 * browser's print engine. The browser shapes the text (including Khmer), embeds
 * fonts and keeps links, and "Save as PDF" writes the file on the user's device.
 */
async function printContent(
  render: (laidOut: () => void) => ReactNode,
  { pageCss, fileName }: { pageCss: string; fileName: string },
) {
  active?.cleanup();

  const container = document.createElement('div');
  container.id = PRINT_ROOT_ID;
  document.body.appendChild(container);

  const style = document.createElement('style');
  style.id = PAGE_STYLE_ID;
  style.textContent = `@page { ${pageCss} }`;
  document.head.appendChild(style);

  const previousTitle = document.title;
  const root = createRoot(container);
  const cleanup = () => {
    if (active?.root !== root) return;
    active = null;
    window.removeEventListener('afterprint', cleanup);
    document.title = previousTitle;
    style.remove();
    // Unmounting inside a React event would warn, so defer it.
    setTimeout(() => {
      root.unmount();
      container.remove();
    });
  };
  active = { root, cleanup };

  let lastLayout = 0;
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('layout-timeout')), 15000);
    root.render(
      render(() => {
        lastLayout = performance.now();
        clearTimeout(timeout);
        resolve();
      }),
    );
  }).catch((error) => {
    cleanup();
    throw error;
  });

  // Lay the text out once so the fonts it needs start loading.
  await frame();
  await document.fonts.ready;
  await Promise.all(
    Array.from(container.querySelectorAll('img'), (img) => img.decode().catch(() => undefined)),
  );
  // Wait for any font-triggered re-pagination to stop.
  do {
    await wait(120);
    await frame();
  } while (performance.now() - lastLayout < 200);

  // A second export started while this one was settling; only the newer one prints.
  if (active?.root !== root) return;

  // Chrome and Edge propose the document title as the file name.
  document.title = safeFileName(fileName);
  window.addEventListener('afterprint', cleanup);
  window.print();
}

const paper = (size: 'a4' | 'letter') => (size === 'a4' ? 'A4' : 'letter');

/** Prints a resume with the same component as the live preview. */
export function printResume(resume: Resume, fileName?: string) {
  return printContent((laidOut) => <ResumeDocument resume={resume} onLayout={laidOut} />, {
    pageCss: `size: ${paper(resume.design.pageSize)}; margin: 0;`,
    fileName: fileName || resume.title || resume.data.personal.fullName,
  });
}

/** Prints flowing text, letting the browser break it into pages. */
export function printFlow(
  render: (laidOut: () => void) => ReactNode,
  { pageSize, margin, fileName }: { pageSize: 'a4' | 'letter'; margin: string; fileName: string },
) {
  return printContent(render, {
    pageCss: `size: ${paper(pageSize)}; margin: ${margin};`,
    fileName,
  });
}
