import { test, expect } from '@playwright/test';

test.describe('07 — Multiple Providers', () => {
  test('both providers render decisions with shared client', async ({ page }) => {
    await page.goto('/provider/07-multiple-providers');

    const enabledA = page.getByTestId('decision-a-enabled');
    await expect(enabledA).toBeVisible();
    await expect(enabledA).toContainText('true');
    await expect(page.getByTestId('decision-a-variation-key')).toContainText('var_1');
    await expect(page.getByTestId('decision-a-flag-key')).toContainText('flag_1');

    const enabledB = page.getByTestId('decision-b-enabled');
    await expect(enabledB).toBeVisible();
    await expect(enabledB).toContainText('true');
    await expect(page.getByTestId('decision-b-variation-key')).toContainText('var_1');
    await expect(page.getByTestId('decision-b-flag-key')).toContainText('flag_1');
  });
});
