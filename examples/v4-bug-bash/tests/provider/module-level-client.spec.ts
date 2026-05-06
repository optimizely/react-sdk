import { test, expect } from '@playwright/test';

test.describe('09 — Module-Level Client', () => {
  test('decision works with module-scoped client', async ({ page }) => {
    await page.goto('/provider/09-module-level-client');

    const enabled = page.getByTestId('decision-enabled');
    await expect(enabled).toBeVisible();
    await expect(enabled).toContainText('true');

    await expect(page.getByTestId('decision-loading')).toContainText('false');
    await expect(page.getByTestId('decision-variation-key')).toContainText('var_1');
    await expect(page.getByTestId('decision-flag-key')).toContainText('flag_1');
    await expect(page.getByTestId('decision-error')).toContainText('null');
  });
});
