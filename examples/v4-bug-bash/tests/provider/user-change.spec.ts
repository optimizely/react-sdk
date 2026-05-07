import { test, expect } from '@playwright/test';

const isStrictMode = process.env.NEXT_PUBLIC_STRICT_MODE === 'true';

test.describe('11 — User Change', () => {
  test('initial normal user gets rollout variation', async ({ page }) => {
    await page.goto('/provider/11-user-change');

    const enabled = page.getByTestId('decision-enabled');
    await expect(enabled).toBeVisible();
    await expect(enabled).toContainText('true');

    await expect(page.getByTestId('decision-variation-key')).toContainText('var_1');
    await expect(page.getByTestId('decision-flag-key')).toContainText('flag_1');
    await expect(page.getByTestId('active-user')).toContainText('user-07-a');

    if (!isStrictMode) {
      await expect(page.getByTestId('decision-render-count')).toContainText('Render Count: 1');
    }
  });

  test('switching to holdout user changes decision to held out', async ({ page }) => {
    await page.goto('/provider/11-user-change');

    await expect(page.getByTestId('decision-enabled')).toBeVisible();
    await expect(page.getByTestId('decision-variation-key')).toContainText('var_1');

    await page.getByTestId('btn-set-holdout').click();

    await expect(page.getByTestId('active-user')).toContainText('user-12');
    await expect(page.getByTestId('decision-enabled')).toContainText('false');
    await expect(page.getByTestId('decision-variation-key')).toContainText('off');
    await expect(page.getByTestId('decision-flag-key')).toContainText('flag_1');

    if (!isStrictMode) {
      await expect(page.getByTestId('decision-render-count')).toContainText('Render Count: 2');
    }
  });

  test('switching back to normal user restores rollout variation', async ({ page }) => {
    await page.goto('/provider/11-user-change');

    await expect(page.getByTestId('decision-enabled')).toBeVisible();

    await page.getByTestId('btn-set-holdout').click();
    await expect(page.getByTestId('decision-variation-key')).toContainText('off');

    await page.getByTestId('btn-set-normal').click();
    await expect(page.getByTestId('decision-enabled')).toContainText('true');
    await expect(page.getByTestId('decision-variation-key')).toContainText('var_1');
    await expect(page.getByTestId('active-user')).toContainText('user-07-a');

    if (!isStrictMode) {
      await expect(page.getByTestId('decision-render-count')).toContainText('Render Count: 3');
    }
  });

  test('clicking the already-active user button does not cause extra renders', async ({ page }) => {
    await page.goto('/provider/11-user-change');

    await expect(page.getByTestId('decision-enabled')).toBeVisible();

    await page.getByTestId('btn-set-normal').click();
    await expect(page.getByTestId('decision-variation-key')).toContainText('var_1');

    if (!isStrictMode) {
      await expect(page.getByTestId('decision-render-count')).toContainText('Render Count: 1');
    }
  });
});
