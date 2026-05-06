import { test, expect } from '@playwright/test';

const isStrictMode = process.env.NEXT_PUBLIC_STRICT_MODE === 'true';

test.describe('useDecideAsync (UPS)', () => {
  test('shows loading then resolves after UPS lookup', async ({ page }) => {
    await page.goto('/hooks/use-decide-async-ups');

    await expect(page.getByTestId('decision-loading')).toContainText('true');

    await expect(page.getByTestId('decision-loading')).toContainText('false', { timeout: 10000 });

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
});
