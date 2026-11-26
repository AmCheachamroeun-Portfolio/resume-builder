import { expect, test } from '@playwright/test';
import { createExample, preview, saved } from './helpers';

const JOB = 'We are hiring a frontend developer who knows React, TypeScript and Kubernetes well.';

test('accepted rewrites go into a tailored copy and the original is untouched', async ({
  page,
}) => {
  await createExample(page);
  const original = page.url();
  await page.route('**/api/ai/status', (route) => route.fulfill({ json: { configured: true } }));
  let calls = 0;
  await page.route('**/api/ai/tailor-resume', (route) => {
    calls++;
    const body = route.request().postDataJSON();
    const field = (label: string) =>
      body.fields.find((f: { label: string }) => f.label.startsWith(label));
    expect(JSON.stringify(body)).not.toContain('maya.sovann@');
    return route.fulfill({
      json: {
        data: {
          requirements: [{ requirement: 'Kubernetes', met: 'no', evidence: '' }],
          suggestions: [
            { field: field('headline').id, text: 'React Developer', reason: 'Matches the role' },
            {
              field: field('professional summary').id,
              text: 'Rejected summary text',
              reason: 'Shorter',
            },
          ],
          emphasise: [],
        },
      },
    });
  });

  await page.getByRole('button', { name: 'Assistant', exact: true }).click();
  await page.getByLabel('What do you want help with?').selectOption('tailor');
  await page.getByLabel('Job description').fill(JOB);
  // The keyword comparison needs neither consent nor a request.
  await expect(page.getByTestId('keywords-matched')).toContainText('react');
  await expect(page.getByTestId('keywords-missing')).toContainText('kubernetes');
  expect(calls).toBe(0);
  await page.getByRole('button', { name: 'I agree, enable AI features' }).click();
  await page.getByRole('button', { name: 'Compare and suggest' }).click();

  const cards = page.getByTestId('tailor-suggestion');
  await expect(cards).toHaveCount(2);
  await expect(page.getByRole('button', { name: /Accept a rewrite/ })).toBeDisabled();
  await cards.first().getByRole('button', { name: 'Accept' }).click();
  await cards.nth(1).getByRole('button', { name: 'Reject' }).click();
  await expect(preview(page).first()).not.toContainText('React Developer');
  await page.getByRole('button', { name: 'Create copy with 1 change' }).click();

  await expect(page).not.toHaveURL(original);
  await expect(page.getByLabel('Resume name')).toHaveValue('Example resume (tailored)');
  await expect(preview(page).first()).toContainText('React Developer');
  await expect(preview(page).first()).not.toContainText('Rejected summary text');
  await saved(page);
  await page.goto(original);
  await expect(preview(page).first()).toContainText('Frontend Developer');
  await expect(preview(page).first()).not.toContainText('React Developer');
});
