import { expect, test, type Page } from '@playwright/test';
import { createExample, preview, saved } from './helpers';

/**
 * The browser side of every AI flow, with the two API routes replaced by fixed
 * answers. Gemini is never contacted.
 */
async function mockAi(page: Page, answers: Record<string, unknown>) {
  const requests: { action: string; body: Record<string, unknown> }[] = [];
  await page.route('**/api/ai/**', async (route) => {
    const action = new URL(route.request().url()).pathname.split('/').pop()!;
    if (action === 'status') return route.fulfill({ json: { configured: true } });
    requests.push({ action, body: route.request().postDataJSON() });
    const answer = answers[action];
    if (typeof answer === 'number') {
      return route.fulfill({ status: answer, json: { error: 'quota' } });
    }
    return route.fulfill({ json: { data: answer } });
  });
  return requests;
}

async function openTask(page: Page, task: string) {
  await page.getByRole('button', { name: 'Assistant' }).click();
  await page.getByLabel('What do you want help with?').selectOption(task);
}
const agree = (page: Page) =>
  page.getByRole('button', { name: 'I agree, enable AI features' }).click();

const SUMMARY = 'Frontend developer who builds clear, accessible interfaces.';
const summaries = { options: [{ style: 'concise', text: SUMMARY }] };

test('sends nothing before consent, then applies a summary only when accepted', async ({
  page,
}) => {
  const requests = await mockAi(page, { 'generate-summary': summaries });
  await createExample(page);
  await openTask(page, 'summary');
  await expect(page.getByText('Before anything is sent')).toBeVisible();
  expect(requests).toHaveLength(0);
  await agree(page);

  await page.getByRole('button', { name: 'Generate summaries' }).click();
  const suggestion = page.getByTestId('suggestion');
  await expect(suggestion).toContainText(SUMMARY);
  await expect(preview(page).first()).not.toContainText(SUMMARY);

  // Identity and contact details are never part of the request.
  const sent = JSON.stringify(requests[0]!.body);
  for (const secret of ['Maya', '@example', '+855', 'data:image']) {
    expect(sent).not.toContain(secret);
  }

  await suggestion.getByRole('button', { name: 'Reject' }).click();
  await expect(suggestion).toHaveCount(0);
  await expect(preview(page).first()).not.toContainText(SUMMARY);

  await page.getByRole('button', { name: 'Generate summaries' }).click();
  await suggestion.getByRole('button', { name: 'Edit' }).click();
  await suggestion.getByRole('textbox').fill(`${SUMMARY} Edited by me.`);
  await suggestion.getByRole('button', { name: 'Accept' }).click();
  await page.getByRole('button', { name: 'Close assistant' }).click();
  await expect(preview(page).first()).toContainText('Edited by me.');

  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(preview(page).first()).not.toContainText('Edited by me.');
});

test('adds only the skills the writer ticks', async ({ page }) => {
  await mockAi(page, {
    'suggest-skills': {
      skills: [
        { name: 'Storybook', category: 'Tools', reason: 'Common for interface work.' },
        { name: 'Cypress', category: 'Testing', reason: 'Browser testing.' },
      ],
    },
  });
  await createExample(page);
  await openTask(page, 'skills');
  await agree(page);
  await expect(page.getByText('Enter your target job first.')).toBeVisible();
  await page.getByRole('complementary').getByLabel('Target job').fill('Frontend Developer');
  await page.getByRole('button', { name: 'Suggest skills', exact: true }).last().click();
  await page.getByLabel(/Storybook/).check();
  await page.getByRole('button', { name: /^Add/ }).last().click();
  await page.getByRole('button', { name: 'Close assistant' }).click();
  await expect(preview(page).first()).toContainText('Storybook');
  await expect(preview(page).filter({ hasText: 'Cypress' })).toHaveCount(0);
});

test('rewrites one description and shows failures with a retry', async ({ page }) => {
  const answers: Record<string, unknown> = { 'improve-experience': 429 };
  await mockAi(page, answers);
  await createExample(page);
  await openTask(page, 'improve');
  await agree(page);
  await page.getByRole('button', { name: 'Suggest a change' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'usage limit' })).toBeVisible();

  answers['improve-experience'] = { text: '- Delivered reusable components', changes: ['Verb'] };
  await page.getByRole('button', { name: 'Try again' }).click();
  await page.getByTestId('suggestion').getByRole('button', { name: 'Accept' }).click();
  await page.getByRole('button', { name: 'Close assistant' }).click();
  await expect(preview(page).first()).toContainText('Delivered reusable components');
  await saved(page);
});

test('answers a question without attaching the resume unless asked', async ({ page }) => {
  const requests = await mockAi(page, { chat: { reply: 'Keep it to one page.' } });
  await createExample(page);
  await openTask(page, 'chat');
  await agree(page);
  await page.getByLabel('Type your question').fill('How long should it be?');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByText('Keep it to one page.')).toBeVisible();
  expect(requests[0]!.body.context).toBeUndefined();

  await page.getByLabel('Include my resume text').check();
  await page.getByLabel('Type your question').fill('And mine?');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect.poll(() => requests.length).toBe(2);
  expect(String(requests[1]!.body.context)).toContain('Frontend Developer');
});

test('recommends templates', async ({ page }) => {
  await mockAi(page, {
    'recommend-template': {
      recommendations: [{ templateId: 'modern-slate', reason: 'Clear for developers.' }],
    },
  });
  await page.goto('/en/templates');
  await page.getByRole('button', { name: 'Recommend a template' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'I agree, enable AI features' }).click();
  await dialog.getByLabel('Target job', { exact: false }).first().fill('Developer');
  await dialog.getByRole('button', { name: 'Recommend templates' }).click();
  await expect(page.getByTestId('recommendation')).toContainText('Clear for developers.');
});

test('turns guided answers into a reviewed resume', async ({ page }) => {
  const requests = await mockAi(page, {
    'recommend-template': {
      recommendations: [{ templateId: 'clean-timeline', reason: 'Shows progression.' }],
    },
    'generate-draft': {
      headline: 'Web Developer',
      summary: 'Developer who builds booking pages.',
      experience: [
        {
          title: 'Web Developer',
          company: 'Example Studio',
          location: '',
          start: '2023',
          end: '',
          current: true,
          description: '- Built booking pages',
        },
      ],
      education: [],
      skills: [{ name: 'TypeScript', category: '' }],
      projects: [],
      certifications: [],
      languages: [],
      removed: ['Kubernetes'],
    },
  });
  await page.goto('/en/builder/ai');
  const next = () => page.getByRole('button', { name: /^(Next|Continue to draft)$/ }).click();

  await page.getByLabel('Full name').fill('Sokha Private');
  await page.getByLabel('Email').fill('sokha@example.com');
  await next();
  await page.getByLabel('Target job', { exact: false }).first().fill('Web Developer');
  await next();
  await page
    .getByRole('textbox')
    .fill('Web Developer at Example Studio, 2023 to now. Built booking pages.');
  await next();
  for (let i = 0; i < 5; i++) await next();

  await agree(page);
  await page.getByRole('button', { name: 'Generate draft' }).click();
  await expect(page.getByText(/Left out because.*Kubernetes/)).toBeVisible();
  const sent = JSON.stringify(requests.map((r) => r.body));
  expect(sent).not.toContain('Sokha');
  expect(sent).not.toContain('sokha@example.com');

  await page.getByLabel('Include Skills').uncheck();
  await page.getByRole('button', { name: /Create resume with Clean Timeline/ }).click();
  await page.waitForURL(/\/builder\/(?!ai)[\w-]+$/);
  await expect(preview(page).first()).toContainText('Sokha Private');
  await expect(preview(page).first()).toContainText('Built booking pages');
  await expect(preview(page).filter({ hasText: 'TypeScript' })).toHaveCount(0);
});
