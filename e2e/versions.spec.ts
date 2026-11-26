import { expect, test } from '@playwright/test';
import { createExample, preview, saved } from './helpers';

test('a saved version can be restored after further edits', async ({ page }) => {
  await createExample(page);
  const name = page.getByLabel('Full name');
  await name.fill('Version One');
  await expect(page.getByTestId('save-status')).toHaveAttribute('data-status', 'saved');
  await page.getByRole('button', { name: 'More actions' }).click();
  await page.getByRole('menuitem', { name: 'Version history' }).click();
  const dialog = page.getByRole('dialog', { name: 'Version history' });
  await dialog.getByLabel('Version name (optional)').fill('Checkpoint');
  await dialog.getByRole('button', { name: 'Save current version' }).click();
  await expect(dialog.getByTestId('version-row').first()).toContainText('Checkpoint');
  await page.keyboard.press('Escape');

  await name.fill('Version Two');
  await expect(preview(page).first()).toContainText('Version Two');
  await saved(page);
  await page.getByRole('button', { name: 'More actions' }).click();
  await page.getByRole('menuitem', { name: 'Version history' }).click();
  await dialog.getByRole('button', { name: /Checkpoint/ }).click();
  await dialog.getByRole('button', { name: 'Restore this version' }).click();
  await expect(name).toHaveValue('Version One');
  await expect(page.getByTestId('save-status')).toHaveAttribute('data-status', 'saved');

  // The state that was replaced is kept, and the restore survives a reload.
  await page.reload();
  await expect(name).toHaveValue('Version One');
  await page.getByRole('button', { name: 'More actions' }).click();
  await page.getByRole('menuitem', { name: 'Version history' }).click();
  await expect(dialog.getByText(/Before a restore/)).toBeVisible();
});
