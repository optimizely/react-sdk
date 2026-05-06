import { test, expect } from '@playwright/test';

const isStrictMode = process.env.NEXT_PUBLIC_STRICT_MODE === 'true';

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

    if (!isStrictMode) {
      await expect(page.getByTestId('decision-render-count')).toContainText('Render Count: 1');
    }
  });

  test('module-level client persists across navigations', async ({ page }) => {
    await page.goto('/provider/09-module-level-client');

    await expect(page.getByTestId('module-create-count')).toContainText('Module Create Count: 1');

    // Navigate away to a different page
    await page.goto('/provider/10-component-level-client');
    await expect(page.getByTestId('decision-enabled')).toBeVisible();
  });
});
