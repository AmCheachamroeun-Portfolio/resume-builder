import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { createExample, preview, saved, stubPrint } from './helpers';

const name = (page: Page) => page.getByLabel('Full name', { exact: true });
const sectionRows = (page: Page) =>
  page
    .locator('[data-section-row]')
    .evaluateAll((rows) => rows.map((row) => row.getAttribute('data-section-row')));
const paper = (page: Page) => preview(page).locator('[data-template]').first();

test('creates a resume by hand and keeps it after a reload', async ({ page }) => {
  await page.goto('/en/builder');
  await page.getByLabel('Resume name').fill('From scratch');
  await page.getByRole('button', { name: 'Create resume', exact: true }).click();
  await page.waitForURL(/\/builder\/(?!ai)[\w-]+$/);

  await name(page).fill('Dara Example');
  await page.getByLabel('Email', { exact: true }).fill('dara@example.com');
  await expect(preview(page).first()).toContainText('Dara Example');

  await page.locator('[data-section-row="experience"] button', { hasText: 'Experience' }).click();
  await page.getByRole('button', { name: /^Add to / }).click();
  await page.getByLabel('Job title').fill('Support Engineer');
  await page.getByLabel('Company').fill('Sample Company');
  await page.getByLabel('Responsibilities').fill('- Answered **customer** questions');
  await expect(preview(page).first()).toContainText('Answered customer questions');

  await saved(page);
  await page.reload();
  await expect(name(page)).toHaveValue('Dara Example');
  await expect(preview(page).first()).toContainText('Support Engineer');

  await page.goto('/en/resumes');
  await expect(page.getByRole('heading', { name: 'From scratch' })).toBeVisible();
});

test('saves the last keystrokes when leaving at once', async ({ page }) => {
  await createExample(page);
  const url = page.url();
  await name(page).fill('Left Immediately');
  await page.getByRole('link', { name: 'Back to my resumes' }).click();
  await page.waitForURL(/\/resumes$/);
  await page.goto(url);
  await expect(name(page)).toHaveValue('Left Immediately');
});

test('shows validation messages without losing input', async ({ page }) => {
  await createExample(page);
  const email = page.getByLabel('Email', { exact: true });
  await email.fill('not-an-email');
  await email.blur();
  await expect(page.getByText('Check the email address.')).toBeVisible();
  await expect(email).toHaveValue('not-an-email');
});

test('switches template without changing the text, and can undo it', async ({ page }) => {
  await createExample(page, 'ats-essential');
  await expect(paper(page)).toHaveAttribute('data-template', 'ats-essential');
  await page.getByRole('button', { name: 'Change template' }).first().click();
  await page.locator('[data-pick="modern-slate"]').click();
  await expect(paper(page)).toHaveAttribute('data-template', 'modern-slate');
  await expect(name(page)).toHaveValue('Maya Sovann');
  await expect(preview(page).first()).toContainText('Maya Sovann');

  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(paper(page)).toHaveAttribute('data-template', 'ats-essential');
  await page.getByRole('button', { name: 'Redo' }).click();
  await expect(paper(page)).toHaveAttribute('data-template', 'modern-slate');
});

test('reorders and hides sections, by button and by keyboard', async ({ page }) => {
  await createExample(page);
  const before = await sectionRows(page);

  const first = page.locator(`[data-section-row="${before[0]}"]`);
  await first.getByRole('button', { name: /^Move / }).click();
  await page.getByRole('menuitem', { name: 'Move down' }).click();
  await expect.poll(() => sectionRows(page)).toEqual([before[1], before[0], ...before.slice(2)]);

  // Keyboard drag: pick up, move up, drop.
  const handle = page
    .locator(`[data-section-row="${before[0]}"]`)
    .getByRole('button', { name: /^Drag to reorder/ });
  await handle.focus();
  await page.keyboard.press('Space');
  await page.waitForTimeout(100);
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(250);
  await page.keyboard.press('Space');
  await expect.poll(() => sectionRows(page)).toEqual(before);

  const pages = preview(page);
  await expect(pages.first()).toContainText('Sample Institute');
  await page
    .locator('[data-section-row="education"]')
    .getByRole('button', { name: /^Hide / })
    .click();
  await expect(pages.filter({ hasText: 'Sample Institute' })).toHaveCount(0);
  await saved(page);
  await page.reload();
  await expect(preview(page).first()).toBeVisible();
  await expect(preview(page).filter({ hasText: 'Sample Institute' })).toHaveCount(0);
});

test('undoes typing with the keyboard', async ({ page }) => {
  await createExample(page);
  await name(page).fill('Changed Name');
  await page.keyboard.press('Control+z');
  await expect(name(page)).toHaveValue('Maya Sovann');
  await page.keyboard.press('Control+Shift+z');
  await expect(name(page)).toHaveValue('Changed Name');
});

test('changes the design of one resume without touching the app theme', async ({ page }) => {
  await createExample(page);
  await page.getByRole('navigation', { name: 'Sections' }).getByText('Design').click();
  await page.locator('label', { hasText: 'Letter' }).first().click();
  await expect
    .poll(
      async () =>
        (await paper(page).boundingBox())!.width / (await paper(page).boundingBox())!.height,
    )
    .toBeCloseTo(816 / 1056, 2);
  await expect(page.locator('html')).not.toHaveClass(/dark/);
});

test('renames, duplicates, searches, exports, deletes and imports', async ({ page }) => {
  await createExample(page);
  await saved(page);
  await page.goto('/en/resumes');
  const cards = page.getByTestId('resume-card');
  const menu = (title: string) =>
    page.getByRole('button', { name: `Actions for ${title}`, exact: true }).click();

  await menu('Example resume');
  await page.getByRole('menuitem', { name: 'Rename' }).click();
  await page.getByRole('dialog').getByRole('textbox').fill('Main resume');
  await page.getByRole('button', { name: 'Save name' }).click();
  await expect(page.getByRole('heading', { name: 'Main resume' })).toBeVisible();

  await menu('Main resume');
  await page.getByRole('menuitem', { name: 'Duplicate' }).click();
  await expect(cards).toHaveCount(2);

  await page.getByRole('searchbox').fill('copy');
  await expect(cards).toHaveCount(1);
  await page.getByRole('searchbox').fill('');

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export all' }).click();
  const file = await (await download).path();
  const backup = JSON.parse(await readFile(file, 'utf8'));
  expect(backup.app).toBe('resumecraft');
  expect(backup.resumes).toHaveLength(2);

  for (const title of ['Main resume (copy)', 'Main resume']) {
    await menu(title);
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.getByRole('heading', { name: title, exact: true })).toHaveCount(0);
  }
  await expect(cards).toHaveCount(0);

  await page.getByTestId('import-input').setInputFiles(file);
  await expect(cards).toHaveCount(2);
  // Importing the same file again adds nothing.
  await page.getByTestId('import-input').setInputFiles(file);
  await expect(page.getByText(/0 added, 2 already present/)).toBeVisible();
  await expect(cards).toHaveCount(2);

  await page.getByTestId('import-input').setInputFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{oops'),
  });
  await expect(page.getByText(/could not be read/)).toBeVisible();
  await expect(cards).toHaveCount(2);
});

test('deletes all local data from settings', async ({ page }) => {
  await createExample(page);
  await saved(page);
  await page.goto('/en/settings');
  await expect(page.getByText('1 resume stored')).toBeVisible();
  await page.getByRole('button', { name: 'Delete all data' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete all data' }).click();
  await expect(page.getByText('No resumes stored')).toBeVisible();
});

test('opens the print window with only the resume in it', async ({ page }) => {
  await stubPrint(page);
  await createExample(page);
  await page.getByRole('button', { name: 'Download PDF' }).click();
  await expect.poll(() => page.evaluate(() => window.__printed ?? 0)).toBe(1);
});

test('adds a photo and refuses unsupported files', async ({ page }) => {
  await createExample(page, 'navy-professional');
  await page.getByTestId('photo-input').setInputFiles({
    name: 'notes.gif',
    mimeType: 'image/gif',
    buffer: Buffer.from('GIF89a'),
  });
  await expect(page.getByText('Choose a JPG, PNG or WebP image.')).toBeVisible();

  // A real image drawn in the page, so the browser can decode it.
  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 600;
    canvas.getContext('2d')!.fillRect(0, 0, 900, 600);
    return canvas.toDataURL('image/png').split(',')[1]!;
  });
  await page.getByTestId('photo-input').setInputFiles({
    name: 'photo.png',
    mimeType: 'image/png',
    buffer: Buffer.from(png, 'base64'),
  });
  const photo = page.getByRole('img', { name: 'Your profile photo' });
  await expect(photo).toHaveAttribute('src', /^data:image\/(jpeg|webp|png)/);
  const size = await photo.evaluate((img: HTMLImageElement) => [
    img.naturalWidth,
    img.naturalHeight,
  ]);
  expect(size[0]).toBe(size[1]);
});

test('says plainly that AI is unavailable without a key, and still checks compatibility', async ({
  page,
}) => {
  await createExample(page);
  await page.getByRole('button', { name: 'Assistant' }).click();
  await expect(page.getByText('AI features are not available')).toBeVisible();
  await page.getByLabel('What do you want help with?').selectOption('ats');
  await expect(page.getByTestId('ats-score')).toBeVisible();
  await page.getByRole('button', { name: 'Close assistant' }).click();
  await expect(page.getByTestId('ats-score')).toHaveCount(0);

  const response = await page.request.post('/api/ai/chat', {
    data: { language: 'en', messages: [{ role: 'user', text: 'Hi' }] },
  });
  expect(response.status()).toBe(503);
});

test('translates the interface to Khmer but never the resume', async ({ page }) => {
  await createExample(page);
  await saved(page);
  const id = page.url().split('/').pop()!;
  await page.goto(`/km/builder/${id}`);
  await expect(page.locator('html')).toHaveAttribute('lang', 'km');
  await expect(page.getByRole('button', { name: 'ទាញយក PDF' })).toBeVisible();
  await expect(preview(page).first()).toContainText('Maya Sovann');
  await expect(preview(page).first()).toContainText('Frontend Developer');
});

for (const path of ['', '/templates', '/builder', '/resumes', '/settings', '/builder/ai']) {
  test(`has no console errors or sideways scrolling on a phone: ${path || '/'}`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setViewportSize({ width: 375, height: 740 });
    for (const locale of ['en', 'km']) {
      await page.goto(`/${locale}${path}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await page.waitForLoadState('networkidle');
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, locale).toBeLessThanOrEqual(0);
    }
    expect(errors).toEqual([]);
  });
}

test('edits on a phone through the Sections, Edit, Design and Preview views', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 740 });
  await page.goto('/en/builder?template=ats-essential');
  await page.getByLabel('Resume name').fill('Phone resume');
  await page.getByLabel(/Fill with fictional example text/).check();
  await page.getByRole('button', { name: 'Create resume', exact: true }).click();
  await page.waitForURL(/\/builder\/(?!ai)[\w-]+$/);
  const views = page.getByRole('navigation', { name: 'Editor views' });

  await name(page).fill('Mobile Writer');
  await views.getByRole('button', { name: 'Preview' }).click();
  await expect(preview(page).first()).toContainText('Mobile Writer');

  await views.getByRole('button', { name: 'Sections' }).click();
  await page.locator('[data-section-row="skills"] button', { hasText: 'Skills' }).click();
  await page.getByPlaceholder('Type names, separated by commas').fill('Docker, Figma Design');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await views.getByRole('button', { name: 'Preview' }).click();
  await expect(preview(page).first()).toContainText('Docker');

  await views.getByRole('button', { name: 'Design' }).click();
  await expect(page.getByText('Changes apply to this resume only.')).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
