import { test, expect } from '@playwright/test';

test.describe('08 — Forced Decisions', () => {
  test('initial decision renders correctly (rollout off, no audience match)', async ({ page }) => {
    await page.goto('/provider/08-forced-decision');

    const enabled = page.getByTestId('decision-enabled');
    await expect(enabled).toBeVisible();
    await expect(enabled).toContainText('false');

    await expect(page.getByTestId('decision-variation-key')).toContainText('off');
    await expect(page.getByTestId('decision-flag-key')).toContainText('flag1');
  });

  test('set forced decision changes variation to variation_a', async ({ page }) => {
    await page.goto('/provider/08-forced-decision');

    await expect(page.getByTestId('decision-enabled')).toBeVisible();
    await expect(page.getByTestId('decision-variation-key')).toContainText('off');

    await page.getByTestId('btn-set-forced').click();
    await expect(page.getByTestId('decision-variation-key')).toContainText('variation_a');
    await expect(page.getByTestId('decision-enabled')).toContainText('true');
  });

  test('remove forced decision reverts to original', async ({ page }) => {
    await page.goto('/provider/08-forced-decision');

    await expect(page.getByTestId('decision-enabled')).toBeVisible();

    await page.getByTestId('btn-set-forced').click();
    await expect(page.getByTestId('decision-variation-key')).toContainText('variation_a');

    await page.getByTestId('btn-remove-forced').click();
    await expect(page.getByTestId('decision-variation-key')).toContainText('off');
    await expect(page.getByTestId('decision-enabled')).toContainText('false');
  });

  test('remove all forced decisions reverts to original', async ({ page }) => {
    await page.goto('/provider/08-forced-decision');

    await expect(page.getByTestId('decision-enabled')).toBeVisible();

    await page.getByTestId('btn-set-forced').click();
    await expect(page.getByTestId('decision-variation-key')).toContainText('variation_a');

    await page.getByTestId('btn-remove-all').click();
    await expect(page.getByTestId('decision-variation-key')).toContainText('off');
    await expect(page.getByTestId('decision-enabled')).toContainText('false');
  });
});
