import { createRequire } from 'node:module';
import { expect, test, type Page } from '@playwright/test';
import { createExample, saved } from './helpers';

const AXE = createRequire(__filename).resolve('axe-core/axe.min.js');

/** Automated checks catch only part of what makes a page usable. */
async function violations(page: Page) {
  // Let entrance transitions finish, so colours are measured at full strength.
  await page.waitForTimeout(400);
  if (!(await page.evaluate(() => 'axe' in window))) await page.addScriptTag({ path: AXE });
  return page.evaluate(async () => {
    const axe = (window as unknown as { axe: typeof import('axe-core') }).axe;
    // The resume on the page is the writer's document, with its own chosen colours.
    const result = await axe.run(
      { exclude: [['.rc-page']] },
      { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] },
    );
    return result.violations.map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
    );
  });
}

for (const theme of ['light', 'dark'] as const) {
  test(`site pages pass automated accessibility checks (${theme})`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.addInitScript((value) => localStorage.setItem('resumecraft:theme', value), theme);
    await createExample(page);
    await saved(page);
    for (const path of [
      '',
      '/templates',
      '/builder',
      '/builder/ai',
      '/resumes',
      '/letters',
      '/import',
      '/settings',
    ]) {
      await page.goto(`/en${path}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await page.waitForLoadState('networkidle');
      expect(await violations(page), path || '/').toEqual([]);
    }
  });

  test(`editor, dialogs and letters pass automated accessibility checks (${theme})`, async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await page.addInitScript((value) => localStorage.setItem('resumecraft:theme', value), theme);
    await createExample(page);
    await saved(page);
    expect(await violations(page), 'editor').toEqual([]);

    await page.getByRole('button', { name: 'Export', exact: true }).click();
    expect(await violations(page), 'export dialog').toEqual([]);
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: 'Version history' }).click();
    await expect(page.getByTestId('version-row').first()).toBeVisible();
    expect(await violations(page), 'version history').toEqual([]);
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Assistant', exact: true }).click();
    await page.getByLabel('What do you want help with?').selectOption('ats');
    expect(await violations(page), 'compatibility check').toEqual([]);
    await page.getByLabel('What do you want help with?').selectOption('tailor');
    await page
      .getByLabel('Job description')
      .fill('We need React, TypeScript and Kubernetes. '.repeat(2));
    expect(await violations(page), 'job matching').toEqual([]);

    await page.goto('/en/letters');
    await page.getByRole('button', { name: 'New cover letter' }).click();
    await expect(page.getByTestId('letter-paper')).toBeVisible();
    expect(await violations(page), 'letter editor').toEqual([]);
  });
}

test('the phone editor passes automated accessibility checks in Khmer', async ({ page }) => {
  await createExample(page);
  await saved(page);
  const id = page.url().split('/').pop()!;
  await page.setViewportSize({ width: 375, height: 760 });
  await page.goto(`/km/builder/${id}`);
  const modes = page.locator('nav').last().getByRole('button');
  await expect(modes).toHaveCount(4);
  for (let i = 0; i < 4; i++) {
    await modes.nth(i).click();
    expect(await violations(page), `tab ${i}`).toEqual([]);
  }
});
