import { test, expect } from '@playwright/test';

const isStrictMode = process.env.NEXT_PUBLIC_STRICT_MODE === 'true';

test.describe('useDecideAsync (CMAB)', () => {
  test('shows loading then resolves with CMAB decision', async ({ page }) => {
    await page.goto('/hooks/use-decide-async-cmab');

    await expect(page.getByTestId('decision-loading')).toContainText('true');

    await expect(page.getByTestId('decision-loading')).toContainText('false', { timeout: 15000 });

    await expect(page.getByTestId('decision-enabled')).toBeVisible();
    await expect(page.getByTestId('decision-flag-key')).toContainText('cmab_test');
    await expect(page.getByTestId('decision-variation-key')).not.toBeEmpty();
    await expect(page.getByTestId('decision-error')).toContainText('null');

    if (!isStrictMode) {
      await expect(page.getByTestId('decision-render-count')).toContainText('Render Count: 2');
    }
  });
});
