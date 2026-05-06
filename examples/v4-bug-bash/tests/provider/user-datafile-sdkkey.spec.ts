import { test, expect } from '@playwright/test';

test.describe('02 — User + Datafile + SDK Key', () => {
  test('decision renders immediately (datafile pre-loaded)', async ({ page }) => {
    await page.goto('/provider/02-user-datafile-sdkkey');

    const enabled = page.getByTestId('decision-enabled');
    await expect(enabled).toBeVisible();
    await expect(enabled).toContainText('true');

    await expect(page.getByTestId('decision-loading')).toContainText('false');
    await expect(page.getByTestId('decision-variation-key')).toContainText('var_1');
    await expect(page.getByTestId('decision-flag-key')).toContainText('flag_1');
    await expect(page.getByTestId('decision-error')).toContainText('null');
  });
});
