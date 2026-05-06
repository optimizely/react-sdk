import { test, expect } from '@playwright/test';

const isStrictMode = process.env.NEXT_PUBLIC_STRICT_MODE === 'true';

test.describe('06 — ODP Fetch Segments', () => {
  test('shows loading then resolves after segment fetch', async ({ page }) => {
    await page.goto('/provider/06-odp-fetch-segments');

    // Verify loading state appears first
    await expect(page.getByTestId('decision-loading')).toContainText('true');

    // Wait for segment fetch to resolve
    await expect(page.getByTestId('decision-loading')).toContainText('false', { timeout: 15000 });

    // Assert decision values
    await expect(page.getByTestId('decision-enabled')).toBeVisible();
    await expect(page.getByTestId('decision-flag-key')).toContainText('flag1');
    await expect(page.getByTestId('decision-variation-key')).not.toBeEmpty();
    await expect(page.getByTestId('decision-error')).toContainText('null');

    if (!isStrictMode) {
      await expect(page.getByTestId('decision-render-count')).toContainText('Render Count: 2');
    }
  });
});
