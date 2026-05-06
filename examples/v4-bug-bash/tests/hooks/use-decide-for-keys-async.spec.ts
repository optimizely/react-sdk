import { test, expect } from '@playwright/test';

const isStrictMode = process.env.NEXT_PUBLIC_STRICT_MODE === 'true';

test.describe('useDecideForKeysAsync', () => {
  test('shows loading then resolves with CMAB decisions', async ({ page }) => {
    await page.goto('/hooks/use-decide-for-keys-async');

    await expect(page.getByTestId('decisions-loading')).toBeVisible();

    await expect(page.getByTestId('decisions-count')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('decisions-count')).toContainText('1');

    await expect(page.getByTestId('decision-cmab_test-enabled')).toBeVisible();
    await expect(page.getByTestId('decision-cmab_test-flag-key')).toContainText('cmab_test');
    await expect(page.getByTestId('decision-cmab_test-variation-key')).not.toBeEmpty();
    await expect(page.getByTestId('decision-cmab_test-error')).toContainText('null');

    if (!isStrictMode) {
      await expect(page.getByTestId('decisions-render-count')).toContainText('Render Count:');
    }
  });
});
