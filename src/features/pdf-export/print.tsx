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
 * Renders the resume with the same component as the live preview, waits until
 * fonts and pagination settle, and hands it to the browser's print engine. The
 * browser shapes the text (including Khmer), embeds fonts and keeps links, and
 * "Save as PDF" writes the file on the user's device.
 */
export async function printResume(resume: Resume) {
  active?.cleanup();

  const container = document.createElement('div');
  container.id = PRINT_ROOT_ID;
  document.body.appendChild(container);

  const style = document.createElement('style');
  style.id = PAGE_STYLE_ID;
  style.textContent = `@page { size: ${resume.design.pageSize === 'a4' ? 'A4' : 'letter'}; margin: 0; }`;
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
      <ResumeDocument
        resume={resume}
        onLayout={() => {
          lastLayout = performance.now();
          clearTimeout(timeout);
          resolve();
        }}
      />,
    );
  }).catch((error) => {
    cleanup();
    throw error;
  });

  await document.fonts.ready;
  await Promise.all(
    Array.from(container.querySelectorAll('img'), (img) => img.decode().catch(() => undefined)),
  );
  // Wait for any font-triggered re-pagination to stop.
  do {
    await wait(120);
    await frame();
  } while (performance.now() - lastLayout < 200);

  // Chrome and Edge propose the document title as the file name.
  document.title = safeFileName(resume.title || resume.data.personal.fullName);
  window.addEventListener('afterprint', cleanup);
  window.print();
}
