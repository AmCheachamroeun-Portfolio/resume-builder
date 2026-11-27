import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { createExample, TEST_KEY } from './helpers';

/* The visitor's own Gemini key. The API routes are answered here, so Gemini is
   never contacted. */
const SECOND_KEY = 'second-key-not-real-99999999';
const STORED = 'resumecraft:gemini-api-key';

type Sent = { path: string; key: string | undefined; body: string };

/** `checks` and `answers` are queues of error codes; once empty, requests succeed. */
async function mockApi(page: Page, checks: string[] = [], answers: string[] = []) {
  const sent: Sent[] = [];
  const addresses: string[] = [];
  const logs: string[] = [];
  page.on('request', (request) => addresses.push(request.url()));
  page.on('console', (message) => logs.push(message.text()));
  await page.route('**/api/ai/**', (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace('/api/ai/', '');
    sent.push({
      path,
      key: request.headers()['x-gemini-api-key'],
      body: request.postData() ?? '',
    });
    const error = (path === 'key' ? checks : answers).shift();
    if (error) {
      return route.fulfill({ status: error === 'quota' ? 429 : 401, json: { error } });
    }
    if (path === 'key') return route.fulfill({ json: { ok: true } });
    const data =
      path === 'chat'
        ? { reply: 'Keep it to one page.' }
        : path === 'improve-experience'
          ? { text: '- Delivered reusable components', changes: ['Verb'] }
          : { options: [{ style: 'concise', text: 'A short summary.' }] };
    return route.fulfill({ json: { data } });
  });
  /** The key stays out of addresses, bodies and the console. */
  const assertPrivate = (...keys: string[]) => {
    for (const key of keys) {
      expect(addresses.join(' ')).not.toContain(key);
      expect(sent.map((s) => s.body).join(' ')).not.toContain(key);
      expect(logs.join(' ')).not.toContain(key);
    }
  };
  return { sent, assertPrivate };
}

const stored = (page: Page) => page.evaluate((name) => localStorage.getItem(name), STORED);
const setup = (page: Page) => page.getByRole('dialog', { name: /your Gemini API key/ });
const field = (page: Page) => setup(page).getByLabel('API key', { exact: true });
const save = (page: Page) => setup(page).getByRole('button', { name: 'Save', exact: true });

async function openTask(page: Page, task: string) {
  await page.getByRole('button', { name: 'Assistant', exact: true }).click();
  await page.getByLabel('What do you want help with?').selectOption(task);
}

test('offers setup, explains failures and then finishes the action asked for', async ({ page }) => {
  const api = await mockApi(page, ['invalid-key', 'quota']);
  await createExample(page);
  await openTask(page, 'summary');
  await expect(setup(page)).toHaveCount(0);
  await page.getByRole('button', { name: 'I agree, enable AI features' }).click();

  // Opens by itself, with the guide, a masked field and nothing to save yet.
  await expect(setup(page)).toBeVisible();
  await expect(field(page)).toBeFocused();
  await expect(field(page)).toHaveAttribute('type', 'password');
  await expect(save(page)).toBeDisabled();
  await expect(setup(page).getByRole('link', { name: 'Open Google AI Studio' })).toHaveAttribute(
    'href',
    'https://aistudio.google.com/apikey',
  );
  await setup(page).getByRole('button', { name: 'Show API key' }).click();
  await expect(field(page)).toHaveAttribute('type', 'text');
  await setup(page).getByRole('button', { name: 'Show API key' }).click();
  await expect(field(page)).toHaveAttribute('type', 'password');

  // Closing it leaves a way back, and it does not return on its own.
  await setup(page).getByRole('button', { name: 'Cancel' }).click();
  await expect(setup(page)).toHaveCount(0);
  await page.getByLabel('What do you want help with?').selectOption('skills');
  await page.getByLabel('What do you want help with?').selectOption('summary');
  await expect(setup(page)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Add API key' })).toBeVisible();

  await page.getByRole('button', { name: 'Generate summaries' }).click();
  await expect(setup(page)).toBeVisible();
  expect(api.sent).toHaveLength(0);

  await field(page).fill('too short');
  await save(page).click();
  await expect(setup(page).getByRole('alert')).toContainText('does not look like an API key');
  expect(api.sent).toHaveLength(0);

  await field(page).fill(TEST_KEY);
  await field(page).press('Enter');
  await expect(setup(page).getByRole('alert')).toContainText('rejected this API key');
  expect(await stored(page)).toBeNull();

  await save(page).click();
  await expect(setup(page).getByRole('alert')).toContainText('quota');
  await expect(setup(page).getByRole('button', { name: 'Save anyway' })).toBeVisible();
  expect(await stored(page)).toBeNull();

  await save(page).click();
  await expect(setup(page)).toHaveCount(0);
  expect(await stored(page)).toBe(TEST_KEY);
  // The summaries requested before setup arrive without another click.
  await expect(page.getByTestId('suggestion')).toContainText('A short summary.');
  expect(api.sent.map((s) => s.path)).toEqual(['key', 'key', 'key', 'generate-summary']);
  expect(api.sent.every((s) => s.key === TEST_KEY)).toBe(true);
  await expect(page.getByRole('button', { name: 'Add API key' })).toHaveCount(0);
  api.assertPrivate(TEST_KEY);
});

test('can keep a key that has run out of quota', async ({ page }) => {
  await mockApi(page, ['quota']);
  await page.goto('/en/settings');
  await page.getByRole('button', { name: 'Add API key' }).click();
  await field(page).fill(TEST_KEY);
  await save(page).click();
  await setup(page).getByRole('button', { name: 'Save anyway' }).click();
  await expect(setup(page)).toHaveCount(0);
  expect(await stored(page)).toBe(TEST_KEY);
});

test('keeps an unsent chat question when setup is closed, then sends it', async ({ page }) => {
  const api = await mockApi(page);
  await createExample(page);
  await openTask(page, 'chat');
  await page.getByRole('button', { name: 'I agree, enable AI features' }).click();
  await setup(page).getByRole('button', { name: 'Close' }).click();
  const question = page.getByLabel('Type your question');
  await question.fill('How long should it be?');
  await page.getByRole('button', { name: 'Send' }).click();
  await page.keyboard.press('Escape');
  await expect(question).toHaveValue('How long should it be?');
  // Escape closed only the dialog, not the assistant behind it.
  await expect(page.getByRole('complementary', { name: 'Assistant' })).toBeVisible();
  await page.getByRole('button', { name: 'Send' }).click();
  await field(page).fill(TEST_KEY);
  await save(page).click();
  await expect(page.getByText('Keep it to one page.')).toBeVisible();
  expect(api.sent.map((s) => s.path)).toEqual(['key', 'chat']);
});

test('writing help waits for a key, then runs', async ({ page }) => {
  const api = await mockApi(page);
  await createExample(page);
  await page.locator('[data-section-row="summary"] button', { hasText: 'Summary' }).click();
  await page.getByRole('button', { name: 'Writing help for Professional summary' }).click();
  await page.getByRole('menuitem', { name: 'Make concise' }).click();
  await page.getByRole('button', { name: 'I agree, enable AI features' }).click();
  await expect(setup(page)).toBeVisible();
  await field(page).fill(TEST_KEY);
  await save(page).click();
  await expect(page.getByTestId('suggestion')).toContainText('Delivered reusable components');
  expect(api.sent.map((s) => s.path)).toEqual(['key', 'improve-experience']);
});

test('lets a rejected key be changed and retries the same request', async ({ page }) => {
  const api = await mockApi(page, [], ['invalid-key']);
  await createExample(page);
  await openTask(page, 'summary');
  await page.getByRole('button', { name: 'I agree, enable AI features' }).click();
  await field(page).fill(TEST_KEY);
  await save(page).click();
  await page.getByRole('button', { name: 'Generate summaries' }).click();
  await page.getByRole('button', { name: 'Change API key' }).click();
  await expect(setup(page)).toContainText('Saved key: ••••••••0000');
  await expect(field(page)).toHaveValue('');
  await field(page).fill(SECOND_KEY);
  await save(page).click();
  await expect(page.getByTestId('suggestion')).toContainText('A short summary.');
  expect(api.sent.at(-1)).toMatchObject({ path: 'generate-summary', key: SECOND_KEY });
  api.assertPrivate(TEST_KEY, SECOND_KEY);
});

test('Settings adds, updates and removes the key, and backups never include it', async ({
  page,
}) => {
  const api = await mockApi(page);
  await createExample(page);
  await page.goto('/en/settings');
  const section = page.locator('#api-key');
  await expect(section).toContainText('No key added yet.');
  await section.getByRole('button', { name: 'Add API key' }).click();
  await field(page).fill(`  ${TEST_KEY}  `);
  await save(page).click();
  await expect(section).toContainText('Saved key: ••••••••0000');
  expect(await stored(page)).toBe(TEST_KEY);
  expect(await page.content()).not.toContain(TEST_KEY);

  await section.getByRole('button', { name: 'Update' }).click();
  await field(page).fill(SECOND_KEY);
  await save(page).click();
  await expect(section).toContainText('Saved key: ••••••••9999');

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export all' }).click();
  const backup = await readFile((await (await download).path())!, 'utf8');
  expect(backup).toContain('Example resume');
  expect(backup).not.toContain(SECOND_KEY);
  expect(backup).not.toContain('gemini');

  await section.getByRole('button', { name: 'Remove' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Remove' }).click();
  await expect(section).toContainText('No key added yet.');
  expect(await stored(page)).toBeNull();

  // Deleting all data takes the key with it.
  await section.getByRole('button', { name: 'Add API key' }).click();
  await field(page).fill(TEST_KEY);
  await save(page).click();
  await page.getByRole('button', { name: 'Delete all data' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete all data' }).click();
  await expect(section).toContainText('No key added yet.');
  expect(await stored(page)).toBeNull();
  api.assertPrivate(TEST_KEY, SECOND_KEY);
});

test('sits above the template recommendation dialog', async ({ page }) => {
  await mockApi(page);
  await page.goto('/en/templates');
  await page.getByRole('button', { name: 'Recommend a template' }).click();
  await page.getByRole('button', { name: 'I agree, enable AI features' }).click();
  await expect(setup(page)).toBeVisible();
  await field(page).click();
  await setup(page).getByRole('button', { name: 'Cancel' }).click();
  await expect(setup(page)).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: 'Recommend a template' })).toBeVisible();
});

test('fits a phone and speaks Khmer', async ({ page }) => {
  await mockApi(page);
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto('/km/builder/ai');
  const dialog = page.getByRole('dialog', { name: 'បន្ថែមសោ API របស់ Gemini' });
  await expect(dialog).toBeVisible();
  const box = (await dialog.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(360);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(640);
  await expect(dialog.getByRole('button', { name: 'រក្សាទុក', exact: true })).toBeInViewport();
});
