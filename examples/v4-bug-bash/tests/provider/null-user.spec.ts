import { test, expect } from '@playwright/test';

const isStrictMode = process.env.NEXT_PUBLIC_STRICT_MODE === 'true';

test.describe('12 — Null User', () => {
  test('shows loading state with no decision when user is null', async ({ page }) => {
    await page.goto('/provider/12-null-user');

    await expect(page.getByTestId('decision-loading')).toContainText('true');
    await expect(page.getByTestId('decision-error')).toContainText('null');
    await expect(page.getByTestId('decision-enabled')).not.toBeVisible();
    await expect(page.getByTestId('decision-variation-key')).not.toBeVisible();
    await expect(page.getByTestId('decision-flag-key')).not.toBeVisible();

    if (!isStrictMode) {
      await expect(page.getByTestId('decision-render-count')).toContainText('Render Count: 1');
    }
  });

  test('loading state persists over time', async ({ page }) => {
    await page.goto('/provider/12-null-user');

    await expect(page.getByTestId('decision-loading')).toContainText('true');

    await page.waitForTimeout(2000);

    await expect(page.getByTestId('decision-loading')).toContainText('true');
    await expect(page.getByTestId('decision-enabled')).not.toBeVisible();
  });
});
