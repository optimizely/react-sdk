import { test, expect } from '@playwright/test';

const isStrictMode = process.env.NEXT_PUBLIC_STRICT_MODE === 'true';

test.describe('useDecide (Holdout)', () => {
  test('decision renders immediately for flag_2', async ({ page }) => {
    await page.goto('/hooks/use-decide-holdout');

    await expect(page.getByTestId('decision-loading')).toContainText('false');

    const enabled = page.getByTestId('decision-enabled');
    await expect(enabled).toBeVisible();
    await expect(enabled).toContainText('true');

    await expect(page.getByTestId('decision-variation-key')).toContainText('var_2');
    await expect(page.getByTestId('decision-flag-key')).toContainText('flag_2');
    await expect(page.getByTestId('decision-rule-key')).toContainText('default-rollout-490881-741763388721595');
    await expect(page.getByTestId('decision-error')).toContainText('null');

    if (!isStrictMode) {
      await expect(page.getByTestId('decision-render-count')).toContainText('Render Count: 1');
    }
  });
});
