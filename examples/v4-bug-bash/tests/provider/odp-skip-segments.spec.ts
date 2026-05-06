import { test, expect } from '@playwright/test';

test.describe('04 — ODP Skip Segments', () => {
  test('decision renders immediately when segments are skipped', async ({ page }) => {
    await page.goto('/provider/04-odp-skip-segments');

    const enabled = page.getByTestId('decision-enabled');
    await expect(enabled).toBeVisible();

    await expect(page.getByTestId('decision-loading')).toContainText('false');
    await expect(page.getByTestId('decision-flag-key')).toContainText('flag1');
    await expect(page.getByTestId('decision-variation-key')).not.toBeEmpty();
    await expect(page.getByTestId('decision-error')).toContainText('null');
  });
});
