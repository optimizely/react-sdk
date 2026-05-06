import { test, expect } from '@playwright/test';

test.describe('05 — ODP Qualified Segments', () => {
  test('decision renders immediately with pre-provided segments', async ({ page }) => {
    await page.goto('/provider/05-odp-qualified-segments');

    const enabled = page.getByTestId('decision-enabled');
    await expect(enabled).toBeVisible();

    await expect(page.getByTestId('decision-loading')).toContainText('false');
    await expect(page.getByTestId('decision-flag-key')).toContainText('flag1');
    await expect(page.getByTestId('decision-variation-key')).not.toBeEmpty();
    await expect(page.getByTestId('decision-error')).toContainText('null');
  });
});
