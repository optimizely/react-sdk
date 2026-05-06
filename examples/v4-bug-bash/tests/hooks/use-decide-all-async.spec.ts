import { test, expect } from '@playwright/test';

const isStrictMode = process.env.NEXT_PUBLIC_STRICT_MODE === 'true';

test.describe('useDecideAllAsync', () => {
  test('shows loading then resolves with all decisions', async ({ page }) => {
    await page.goto('/hooks/use-decide-all-async');

    await expect(page.getByTestId('decisions-loading')).toBeVisible();

    await expect(page.getByTestId('decisions-count')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('decisions-count')).not.toBeEmpty();

    if (!isStrictMode) {
      await expect(page.getByTestId('decisions-render-count')).toContainText('Render Count:');
    }
  });
});
