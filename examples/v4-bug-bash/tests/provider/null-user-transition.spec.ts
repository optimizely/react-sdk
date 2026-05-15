import { test, expect } from '@playwright/test';

const isStrictMode = process.env.NEXT_PUBLIC_STRICT_MODE === 'true';

test.describe('13 — Null User Transition (SDK Key Only)', () => {
  test('starts in loading state with null user', async ({ page }) => {
    await page.goto('/provider/13-null-user-transition');

    await expect(page.getByTestId('active-user')).toContainText('null');
    await expect(page.getByTestId('decision-loading')).toContainText('true');
    await expect(page.getByTestId('decision-error')).toContainText('null');
    await expect(page.getByTestId('decision-enabled')).not.toBeVisible();
  });

  test('null to normal user: decision resolves after datafile fetch', async ({ page }) => {
    await page.goto('/provider/13-null-user-transition');

    await expect(page.getByTestId('decision-loading')).toContainText('true');
    await expect(page.getByTestId('decision-enabled')).not.toBeVisible();

    await page.getByTestId('btn-set-normal').click();

    await expect(page.getByTestId('active-user')).toContainText('user-07-a');
    await expect(page.getByTestId('decision-loading')).toContainText('false', { timeout: 15000 });
    await expect(page.getByTestId('decision-enabled')).toContainText('true');
    await expect(page.getByTestId('decision-variation-key')).toContainText('var_1');
    await expect(page.getByTestId('decision-flag-key')).toContainText('flag_1');
  });

  test('normal user to null: goes back to loading state', async ({ page }) => {
    await page.goto('/provider/13-null-user-transition');

    await page.getByTestId('btn-set-normal').click();
    await expect(page.getByTestId('decision-loading')).toContainText('false', { timeout: 15000 });
    await expect(page.getByTestId('decision-enabled')).toContainText('true');

    await page.getByTestId('btn-set-null').click();

    await expect(page.getByTestId('active-user')).toContainText('null');
    await expect(page.getByTestId('decision-loading')).toContainText('true');
    await expect(page.getByTestId('decision-enabled')).not.toBeVisible();
  });

  test('null to holdout user: decision resolves as held out', async ({ page }) => {
    await page.goto('/provider/13-null-user-transition');

    await expect(page.getByTestId('decision-loading')).toContainText('true');

    await page.getByTestId('btn-set-holdout').click();

    await expect(page.getByTestId('active-user')).toContainText('user-12');
    await expect(page.getByTestId('decision-loading')).toContainText('false', { timeout: 15000 });
    await expect(page.getByTestId('decision-enabled')).toContainText('false');
    await expect(page.getByTestId('decision-variation-key')).toContainText('off');
    await expect(page.getByTestId('decision-flag-key')).toContainText('flag_1');
  });

  test('full cycle: null -> normal -> null -> holdout -> null', async ({ page }) => {
    await page.goto('/provider/13-null-user-transition');

    // Start: null
    await expect(page.getByTestId('decision-loading')).toContainText('true');

    // null -> normal
    await page.getByTestId('btn-set-normal').click();
    await expect(page.getByTestId('decision-loading')).toContainText('false', { timeout: 15000 });
    await expect(page.getByTestId('decision-enabled')).toContainText('true');
    await expect(page.getByTestId('decision-variation-key')).toContainText('var_1');

    // normal -> null
    await page.getByTestId('btn-set-null').click();
    await expect(page.getByTestId('decision-loading')).toContainText('true');
    await expect(page.getByTestId('decision-enabled')).not.toBeVisible();

    // null -> holdout
    await page.getByTestId('btn-set-holdout').click();
    await expect(page.getByTestId('decision-loading')).toContainText('false', { timeout: 15000 });
    await expect(page.getByTestId('decision-enabled')).toContainText('false');
    await expect(page.getByTestId('decision-variation-key')).toContainText('off');

    // holdout -> null
    await page.getByTestId('btn-set-null').click();
    await expect(page.getByTestId('decision-loading')).toContainText('true');
    await expect(page.getByTestId('decision-enabled')).not.toBeVisible();
  });

  test('clicking null button while already null does not cause extra renders', async ({ page }) => {
    await page.goto('/provider/13-null-user-transition');

    await expect(page.getByTestId('decision-loading')).toContainText('true');

    if (!isStrictMode) {
      // With SDK key-only, the async datafile fetch causes a second render
      // when the client becomes ready (even though user is still null).
      // Wait for that to settle before checking idempotency.
      await expect(page.getByTestId('decision-render-count')).toContainText('Render Count: 2', { timeout: 15000 });
    }

    const renderCountBefore = await page.getByTestId('decision-render-count').textContent();

    await page.getByTestId('btn-set-null').click();

    await expect(page.getByTestId('decision-loading')).toContainText('true');

    if (!isStrictMode) {
      await expect(page.getByTestId('decision-render-count')).toContainText(renderCountBefore!);
    }
  });
});
