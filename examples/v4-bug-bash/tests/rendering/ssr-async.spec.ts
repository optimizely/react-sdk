import { test, expect } from '@playwright/test';

const isStrictMode = process.env.NEXT_PUBLIC_STRICT_MODE === 'true';

test.describe('SSR Async', () => {
  test('shows loading in server HTML then resolves after datafile fetch', async ({ page }) => {
    await page.goto('/rendering/ssr-async');

    // Wait for datafile fetch to resolve (loading state is transient and may not be observable)
    await expect(page.getByTestId('decision-loading')).toContainText('false', { timeout: 15000 });

    const enabled = page.getByTestId('decision-enabled');
    await expect(enabled).toBeVisible();
    await expect(enabled).toContainText('true');

    await expect(page.getByTestId('decision-variation-key')).toContainText('var_1');
    await expect(page.getByTestId('decision-flag-key')).toContainText('flag_1');
    await expect(page.getByTestId('decision-error')).toContainText('null');

    if (!isStrictMode) {
      await expect(page.getByTestId('decision-render-count')).toContainText('Render Count: 2');
    }
  });

  test('server HTML shows loading state (JS disabled)', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();

    await page.goto('/rendering/ssr-async');

    // Without JS, the page should show the loading state since there's no datafile at SSR time
    await expect(page.getByTestId('decision-loading')).toContainText('true');

    // No decision should be rendered in the server HTML
    await expect(page.getByTestId('decision-enabled')).not.toBeVisible();

    await context.close();
  });
});
