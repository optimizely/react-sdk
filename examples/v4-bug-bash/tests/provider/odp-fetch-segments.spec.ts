import { test, expect } from '@playwright/test';

test.describe('06 — ODP Fetch Segments', () => {
  test('shows loading then resolves after segment fetch', async ({ page }) => {
    await page.goto('/provider/06-odp-fetch-segments');

    const enabled = page.getByTestId('decision-enabled');
    await expect(enabled).toBeVisible({ timeout: 15000 });

    await expect(page.getByTestId('decision-loading')).toContainText('false');
    await expect(page.getByTestId('decision-flag-key')).toContainText('flag1');
    await expect(page.getByTestId('decision-variation-key')).not.toBeEmpty();
    await expect(page.getByTestId('decision-error')).toContainText('null');
  });
});
