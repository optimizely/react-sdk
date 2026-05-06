import { test, expect } from '@playwright/test';

test.describe('03 — User + SDK Key Only', () => {
  test('shows loading then resolves to decision after datafile fetch', async ({ page }) => {
    await page.goto('/provider/03-user-sdkkey-only');

    const enabled = page.getByTestId('decision-enabled');
    await expect(enabled).toBeVisible({ timeout: 15000 });
    await expect(enabled).toContainText('true');

    await expect(page.getByTestId('decision-loading')).toContainText('false');
    await expect(page.getByTestId('decision-variation-key')).toContainText('var_1');
    await expect(page.getByTestId('decision-flag-key')).toContainText('flag_1');
    await expect(page.getByTestId('decision-error')).toContainText('null');
  });
});
