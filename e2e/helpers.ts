import { expect, type Page } from '@playwright/test';
import { createBackup } from '../src/lib/storage/backup';
import type { Resume } from '../src/types/resume';

declare global {
  interface Window {
    __printed?: number;
  }
}

/** Replaces the print dialog, which automation cannot operate. */
export async function stubPrint(page: Page) {
  await page.addInitScript(() => {
    window.print = () => {
      window.__printed = (window.__printed ?? 0) + 1;
    };
  });
}

export async function importResumes(page: Page, resumes: Resume[]) {
  await page.goto('/en/resumes');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.getByTestId('import-input').setInputFiles({
    name: 'fixtures.json',
    mimeType: 'application/json',
    buffer: Buffer.from(createBackup(resumes)),
  });
  await expect(page.getByTestId('resume-card')).toHaveCount(resumes.length);
}

export async function createExample(page: Page, templateId = 'ats-essential') {
  await page.goto(`/en/builder?template=${templateId}`);
  await page.getByLabel('Resume name').fill('Example resume');
  await page.getByLabel(/Fill with fictional example text/).check();
  await page.getByRole('button', { name: 'Create resume', exact: true }).click();
  await page.waitForURL(/\/builder\/(?!ai)[\w-]+$/);
  await expect(page.locator('[data-preview-page]').first()).toBeVisible();
}

export async function saved(page: Page) {
  // The indicator turns to "saving" at once, then back when IndexedDB confirms.
  await page.waitForTimeout(150);
  await expect(page.getByTestId('save-status')).toHaveAttribute('data-status', 'saved');
}

/** Goes through the export dialog to the (stubbed) print window. */
export async function printFromEditor(page: Page) {
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await page.getByRole('button', { name: 'Open print window' }).click();
  await page.waitForFunction(() => window.__printed);
}

export const preview = (page: Page) => page.locator('[data-preview-page]');
