import { test, expect } from '@playwright/test';

const isStrictMode = process.env.NEXT_PUBLIC_STRICT_MODE === 'true';

test.describe('03 — SDK Key + Holdout', () => {
  test('shows loading then resolves to decision after datafile fetch', async ({ page }) => {
    await page.goto('/provider/03-user-sdkkey-only');

    // Wait for datafile fetch to resolve (loading state is transient and may not be observable)
    await expect(page.getByTestId('decision-loading')).toContainText('false', { timeout: 15000 });

    // Assert holdout decision values
    await expect(page.getByTestId('decision-enabled')).toContainText('false');
    await expect(page.getByTestId('decision-variation-key')).toContainText('off');
    await expect(page.getByTestId('decision-flag-key')).toContainText('flag_1');
    await expect(page.getByTestId('decision-error')).toContainText('null');

    if (!isStrictMode) {
      await expect(page.getByTestId('decision-render-count')).toContainText('Render Count: 2');
    }
  });
});
