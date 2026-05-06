import { test, expect } from '@playwright/test';

const isStrictMode = process.env.NEXT_PUBLIC_STRICT_MODE === 'true';

test.describe('useDecideForKeys', () => {
  test('decides multiple flags immediately with static datafile', async ({ page }) => {
    await page.goto('/hooks/use-decide-for-keys');

    await expect(page.getByTestId('decisions-count')).toContainText('2');

    // flag_1 decision
    await expect(page.getByTestId('decision-flag_1-enabled')).toContainText('true');
    await expect(page.getByTestId('decision-flag_1-variation-key')).toContainText('var_1');
    await expect(page.getByTestId('decision-flag_1-flag-key')).toContainText('flag_1');
    await expect(page.getByTestId('decision-flag_1-error')).toContainText('null');

    // flag_2 decision
    await expect(page.getByTestId('decision-flag_2-enabled')).toContainText('true');
    await expect(page.getByTestId('decision-flag_2-variation-key')).toContainText('var_2');
    await expect(page.getByTestId('decision-flag_2-flag-key')).toContainText('flag_2');
    await expect(page.getByTestId('decision-flag_2-error')).toContainText('null');

    if (!isStrictMode) {
      await expect(page.getByTestId('decisions-render-count')).toContainText('Render Count: 1');
    }
  });
});
