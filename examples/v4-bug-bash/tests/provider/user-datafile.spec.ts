import { test, expect } from '@playwright/test';

test.describe('01 — User + Datafile', () => {
  test('decision renders immediately with no loading state', async ({ page }) => {
    await page.goto('/provider/01-user-datafile');

    const loading = page.getByTestId('decision-loading');
    await expect(loading).toContainText('false');

    const enabled = page.getByTestId('decision-enabled');
    await expect(enabled).toBeVisible();
    await expect(enabled).toContainText('true');

    await expect(page.getByTestId('decision-variation-key')).toContainText('var_1');
    await expect(page.getByTestId('decision-flag-key')).toContainText('flag_1');
    await expect(page.getByTestId('decision-rule-key')).toContainText('default-rollout-490876-741763388721595');
    await expect(page.getByTestId('decision-error')).toContainText('null');
  });
});
