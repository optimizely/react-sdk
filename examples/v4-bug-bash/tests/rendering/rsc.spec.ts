import { test, expect } from '@playwright/test';

test.describe('RSC (React Server Component)', () => {
  test('decision is rendered entirely on the server', async ({ page }) => {
    await page.goto('/rendering/rsc');

    const enabled = page.getByTestId('decision-enabled');
    await expect(enabled).toBeVisible();
    await expect(enabled).toContainText('true');

    await expect(page.getByTestId('decision-variation-key')).toContainText('var_1');
    await expect(page.getByTestId('decision-flag-key')).toContainText('flag_1');
  });

  test('decision is present in server HTML without client JS', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();

    await page.goto('/rendering/rsc');

    // RSC renders entirely on the server — decision should be in the HTML
    await expect(page.getByTestId('decision-enabled')).toContainText('true');
    await expect(page.getByTestId('decision-variation-key')).toContainText('var_1');
    await expect(page.getByTestId('decision-flag-key')).toContainText('flag_1');

    await context.close();
  });
});
