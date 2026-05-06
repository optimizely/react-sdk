import { test, expect } from '@playwright/test';

const isStrictMode = process.env.NEXT_PUBLIC_STRICT_MODE === 'true';

test.describe('08 — Forced Decisions', () => {
  test('initial decision renders correctly (rollout off, no audience match)', async ({ page }) => {
    await page.goto('/provider/08-forced-decision');

    const enabled = page.getByTestId('decision-enabled');
    await expect(enabled).toBeVisible();
    await expect(enabled).toContainText('false');

    await expect(page.getByTestId('decision-variation-key')).toContainText('off');
    await expect(page.getByTestId('decision-flag-key')).toContainText('flag1');

    if (!isStrictMode) {
      await expect(page.getByTestId('decision-render-count')).toContainText('Render Count: 1');
    }
  });

  test('set forced decision changes variation to variation_a', async ({ page }) => {
    await page.goto('/provider/08-forced-decision');

    await expect(page.getByTestId('decision-enabled')).toBeVisible();
    await expect(page.getByTestId('decision-variation-key')).toContainText('off');

    await page.getByTestId('btn-set-forced').click();
    await expect(page.getByTestId('decision-variation-key')).toContainText('variation_a');
    await expect(page.getByTestId('decision-enabled')).toContainText('true');

    if (!isStrictMode) {
      await expect(page.getByTestId('decision-render-count')).toContainText('Render Count: 2');
    }
  });

  test('remove forced decision reverts to original', async ({ page }) => {
    await page.goto('/provider/08-forced-decision');

    await expect(page.getByTestId('decision-enabled')).toBeVisible();

    await page.getByTestId('btn-set-forced').click();
    await expect(page.getByTestId('decision-variation-key')).toContainText('variation_a');

    await page.getByTestId('btn-remove-forced').click();
    await expect(page.getByTestId('decision-variation-key')).toContainText('off');
    await expect(page.getByTestId('decision-enabled')).toContainText('false');

    if (!isStrictMode) {
      await expect(page.getByTestId('decision-render-count')).toContainText('Render Count: 3');
    }
  });

  test('remove all forced decisions reverts to original', async ({ page }) => {
    await page.goto('/provider/08-forced-decision');

    await expect(page.getByTestId('decision-enabled')).toBeVisible();

    await page.getByTestId('btn-set-forced').click();
    await expect(page.getByTestId('decision-variation-key')).toContainText('variation_a');

    await page.getByTestId('btn-remove-all').click();
    await expect(page.getByTestId('decision-variation-key')).toContainText('off');
    await expect(page.getByTestId('decision-enabled')).toContainText('false');

    if (!isStrictMode) {
      await expect(page.getByTestId('decision-render-count')).toContainText('Render Count: 3');
    }
  });
});
