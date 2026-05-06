import { test, expect } from '@playwright/test';

const isStrictMode = process.env.NEXT_PUBLIC_STRICT_MODE === 'true';

test.describe('07 — Multiple Providers', () => {
  test('provider A gets rollout, provider B is held out', async ({ page }) => {
    await page.goto('/provider/07-multiple-providers');

    // Provider A: normal user — gets rollout variation
    const enabledA = page.getByTestId('decision-a-enabled');
    await expect(enabledA).toBeVisible();
    await expect(enabledA).toContainText('true');
    await expect(page.getByTestId('decision-a-variation-key')).toContainText('var_1');
    await expect(page.getByTestId('decision-a-flag-key')).toContainText('flag_1');

    // Provider B: holdout user — held out from flag_1
    const enabledB = page.getByTestId('decision-b-enabled');
    await expect(enabledB).toBeVisible();
    await expect(enabledB).toContainText('false');
    await expect(page.getByTestId('decision-b-variation-key')).toContainText('off');
    await expect(page.getByTestId('decision-b-flag-key')).toContainText('flag_1');

    if (!isStrictMode) {
      await expect(page.getByTestId('decision-a-render-count')).toContainText('Render Count: 1');
      await expect(page.getByTestId('decision-b-render-count')).toContainText('Render Count: 1');
    }
  });
});
