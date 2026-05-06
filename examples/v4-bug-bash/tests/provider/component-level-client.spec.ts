import { test, expect } from '@playwright/test';

test.describe('10 — Component-Level Client', () => {
  test('decision works with component-scoped client', async ({ page }) => {
    await page.goto('/provider/10-component-level-client');

    const enabled = page.getByTestId('decision-enabled');
    await expect(enabled).toBeVisible();
    await expect(enabled).toContainText('true');

    await expect(page.getByTestId('decision-loading')).toContainText('false');
    await expect(page.getByTestId('decision-variation-key')).toContainText('var_1');
    await expect(page.getByTestId('decision-flag-key')).toContainText('flag_1');
    await expect(page.getByTestId('decision-error')).toContainText('null');
  });
});
