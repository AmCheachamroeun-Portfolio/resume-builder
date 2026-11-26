import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { SAMPLE_DATA } from '../src/constants/sample-resume';
import { createExample } from './helpers';

test('a cover letter is written, saved, previewed and printed', async ({ page }) => {
  await createExample(page);
  await page.goto('/en/letters');
  await page.getByRole('button', { name: 'New cover letter' }).click();
  await expect(page).toHaveURL(/\/en\/letters\/[\w-]+$/);
  await page.getByLabel('Company', { exact: true }).fill('Acme');
  await page.getByLabel('Job title').fill('Product Designer');
  await page.getByLabel('Letter text').fill('Dear team,\n\nI would like to join you.');
  const paper = page.getByTestId('letter-paper');
  await expect(paper).toContainText('I would like to join you.');
  await expect(paper).toContainText(SAMPLE_DATA.personal.fullName);
  await expect(page.getByTestId('save-status')).toHaveAttribute('data-status', 'saved');

  await page.reload();
  await expect(page.getByLabel('Letter text')).toHaveValue(/join you/);

  await page.evaluate(() => {
    window.print = () => {
      document.documentElement.dataset.printed = document.title;
    };
  });
  await page.getByRole('button', { name: 'Export PDF' }).click();
  await page.getByLabel('File name').fill('acme-letter');
  await page.getByRole('button', { name: 'Open print window' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-printed', 'acme-letter');
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('#rc-print-root')).toContainText('I would like to join you.');
  const pdf = await page.pdf({ preferCSSPageSize: true });
  expect(pdf.length).toBeGreaterThan(1000);
  await page.emulateMedia({ media: 'screen' });

  await page.getByRole('link', { name: 'All cover letters' }).click();
  await expect(page.getByTestId('letter-row')).toContainText('Product Designer · Acme');
  const download = page.waitForEvent('download');
  await page.goto('/en/settings');
  await page.getByRole('button', { name: 'Export all' }).click();
  const backup = JSON.parse(await readFile((await (await download).path())!, 'utf8'));
  expect(backup.coverLetters).toHaveLength(1);
});

test('an AI draft is applied only after it is accepted, and can be undone', async ({ page }) => {
  await createExample(page);
  let sent: Record<string, string> = {};
  await page.route('**/api/ai/status', (route) => route.fulfill({ json: { configured: true } }));
  await page.route('**/api/ai/cover-letter', (route) => {
    sent = route.request().postDataJSON();
    return route.fulfill({ json: { data: { body: 'Dear Hiring Team,\n\nMocked draft.' } } });
  });
  await page.goto('/en/letters');
  await page.getByRole('button', { name: 'New cover letter' }).click();
  await page.getByLabel('Letter text').fill('My own words.');
  await page.getByRole('button', { name: 'I agree, enable AI features' }).click();
  await page.getByLabel('Company', { exact: true }).fill('Acme');
  await page.getByLabel('Job title').fill('Designer');
  await page.getByRole('button', { name: 'Suggest a new draft' }).click();
  const suggestion = page.getByTestId('suggestion');
  await expect(suggestion).toContainText('Mocked draft.');
  await expect(page.getByLabel('Letter text')).toHaveValue('My own words.');
  // Contact details stay on the device.
  expect(JSON.stringify(sent)).not.toContain('example.com');
  expect(sent.company).toBe('Acme');
  await suggestion.getByRole('button', { name: 'Accept' }).click();
  await expect(page.getByLabel('Letter text')).toHaveValue(/Mocked draft/);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByLabel('Letter text')).toHaveValue('My own words.');
});
