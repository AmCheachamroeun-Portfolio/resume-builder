import { expect, test, type Page } from '@playwright/test';
import { Document, Packer, Paragraph } from 'docx';
import { preview } from './helpers';

/* Fictional content, turned into real PDF and Word files. */
const LINES = [
  'Maya Sovann',
  'Frontend Developer',
  'maya.sovann@example.com | +855 12 000 000',
  'Work Experience',
  'Frontend Developer Mar 2024 – Present',
  'Lotus Ledger Studio · Phnom Penh',
  '- Built booking screens for a sample clinic',
  'Education',
  'Bachelor of Software Engineering',
  'Sample Institute of Technology',
  '2018 – 2022',
  'Skills',
  'React, TypeScript, Playwright',
];

async function pdfOf(page: Page, lines: string[]) {
  const maker = await page.context().newPage();
  await maker.setContent(
    `<body style="font:12px sans-serif">${lines.map((l) => `<div>${l}</div>`).join('')}</body>`,
  );
  const bytes = await maker.pdf({ format: 'A4' });
  await maker.close();
  return bytes;
}

const upload = (page: Page, name: string, buffer: Buffer) =>
  page
    .getByTestId('document-input')
    .setInputFiles({ name, mimeType: 'application/octet-stream', buffer });

/** Every request that leaves the page, to prove documents stay on the device. */
function watch(page: Page) {
  const posts: string[] = [];
  const outside: string[] = [];
  page.on('request', (request) => {
    if (request.method() !== 'GET') posts.push(request.url());
    if (!/^(http:\/\/localhost|data:|blob:)/.test(request.url())) outside.push(request.url());
  });
  return { posts, outside };
}

test('imports a PDF on the device, after review, as a new resume', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto('/en/import');
  const traffic = watch(page);
  await upload(page, 'maya.pdf', await pdfOf(page, LINES));

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Check what was read');
  await page.getByRole('button', { name: 'Sort on this device' }).click();
  await expect(page.getByLabel('Full name')).toHaveValue('Maya Sovann');
  await expect(page.getByLabel('Company')).toHaveValue('Lotus Ledger Studio');
  await page.getByLabel('Company').fill('Lotus Ledger Studio Ltd');
  await page.getByRole('button', { name: 'Remove: Skills 3' }).click();
  await page.getByRole('button', { name: 'Create resume', exact: true }).click();

  await page.waitForURL(/\/builder\/[\w-]+$/);
  const first = preview(page).first();
  await expect(first).toContainText('Lotus Ledger Studio Ltd');
  await expect(first).toContainText('TypeScript');
  await expect(first).not.toContainText('Playwright');
  expect(traffic.posts).toEqual([]);
  expect(traffic.outside).toEqual([]);
  expect(errors).toEqual([]);
});

test('reads a Word file and sends only redacted text to Gemini after consent', async ({ page }) => {
  const requests: { text: string }[] = [];
  await page.route('**/api/ai/**', async (route) => {
    if (route.request().url().endsWith('/status')) {
      return route.fulfill({ json: { configured: true } });
    }
    requests.push(route.request().postDataJSON());
    return route.fulfill({
      json: {
        data: {
          headline: 'Frontend Developer',
          summary: '',
          experience: [
            {
              title: 'Frontend Developer',
              company: 'Lotus Ledger Studio',
              location: 'Phnom Penh',
              start: '2024-03',
              end: '',
              current: true,
              description: '- Built booking screens for a sample clinic',
            },
          ],
          education: [],
          skills: [{ name: 'React', category: '' }],
          projects: [],
          certifications: [],
          languages: [],
          other: [],
          removed: ['Invented Corp'],
        },
      },
    });
  });
  const word = await Packer.toBuffer(
    new Document({ sections: [{ children: LINES.map((l) => new Paragraph(l)) }] }),
  );
  await page.goto('/en/import');
  await upload(page, 'maya.docx', word);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Check what was read');
  await expect(page.getByRole('button', { name: 'Send and sort with Gemini' })).toHaveCount(0);
  expect(requests).toHaveLength(0);

  await page.getByRole('button', { name: 'I agree, enable AI features' }).click();
  expect(requests).toHaveLength(0);
  await page.getByText('See exactly what will be sent').click();
  await expect(page.getByTestId('redacted-text')).toContainText('[email]');
  await page.getByRole('button', { name: 'Send and sort with Gemini' }).click();

  await expect(page.getByText('Invented Corp')).toBeVisible();
  expect(requests).toHaveLength(1);
  for (const secret of ['Maya', '@example', '000 000']) {
    expect(requests[0]!.text).not.toContain(secret);
  }
  // Contact details come back from the reading on this device.
  await expect(page.getByLabel('Email')).toHaveValue('maya.sovann@example.com');
  await page.getByRole('button', { name: 'Create resume', exact: true }).click();
  await page.waitForURL(/\/builder\/[\w-]+$/);
  await expect(preview(page).first()).toContainText('maya.sovann@example.com');
});

test('explains files it cannot read', async ({ page }) => {
  await page.goto('/en/import');
  const problem = page.getByRole('alert').filter({ hasText: /\S/ });
  await upload(page, 'picture.pdf', await pdfOf(page, []));
  await expect(problem).toContainText('No readable text was found');
  await upload(page, 'old.doc', Buffer.from([0xd0, 0xcf, 0x11, 0xe0]));
  await expect(problem).toContainText('Older .doc files are not supported');
  await upload(page, 'broken.pdf', Buffer.from('%PDF-1.7 not really'));
  await expect(problem).toContainText('could not be read');
});

test('the home page does not download the document readers', async ({ page }) => {
  const scripts: string[] = [];
  page.on('response', async (response) => {
    if (response.url().endsWith('.js') || response.url().endsWith('.mjs')) {
      scripts.push(await response.text().catch(() => ''));
    }
  });
  await page.goto('/en', { waitUntil: 'networkidle' });
  expect(scripts.length).toBeGreaterThan(0);
  for (const marker of ['GlobalWorkerOptions', 'word/document.xml', 'wordprocessingml']) {
    expect(scripts.filter((s) => s.includes(marker))).toHaveLength(0);
  }
});
