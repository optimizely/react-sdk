import { test, expect } from '@playwright/test';

const isStrictMode = process.env.NEXT_PUBLIC_STRICT_MODE === 'true';

test.describe('SSR Sync', () => {
  test('decision is available immediately with no loading state', async ({ page }) => {
    await page.goto('/rendering/ssr-sync');

    // With a pre-fetched datafile, decision should be available immediately — no loading
    await expect(page.getByTestId('decision-loading')).toContainText('false');

    const enabled = page.getByTestId('decision-enabled');
    await expect(enabled).toBeVisible();
    await expect(enabled).toContainText('true');

    await expect(page.getByTestId('decision-variation-key')).toContainText('var_1');
    await expect(page.getByTestId('decision-flag-key')).toContainText('flag_1');
    await expect(page.getByTestId('decision-error')).toContainText('null');

    if (!isStrictMode) {
      await expect(page.getByTestId('decision-render-count')).toContainText('Render Count: 1');
    }
  });

  test('decision is present in server-rendered HTML (JS disabled)', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();

    await page.goto('/rendering/ssr-sync');

    // Decision should be baked into the server HTML
    await expect(page.getByTestId('decision-enabled')).toContainText('true');
    await expect(page.getByTestId('decision-variation-key')).toContainText('var_1');
    await expect(page.getByTestId('decision-flag-key')).toContainText('flag_1');

    await context.close();
  });
});
