import { test, expect } from '@playwright/test';

const isStrictMode = process.env.NEXT_PUBLIC_STRICT_MODE === 'true';

test.describe('02 — User + Datafile + SDK Key', () => {
  test('decision renders immediately (datafile pre-loaded)', async ({ page }) => {
    await page.goto('/provider/02-user-datafile-sdkkey');

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
});
