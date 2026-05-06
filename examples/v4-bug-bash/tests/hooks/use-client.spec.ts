import { test, expect } from '@playwright/test';

test.describe('useOptimizelyClient', () => {
  test('returns client instance with config', async ({ page }) => {
    await page.goto('/hooks/use-client');

    await expect(page.getByTestId('client-available')).toContainText('true');
    await expect(page.getByTestId('config-available')).toContainText('true');
    await expect(page.getByTestId('config-revision')).toContainText('16');
    await expect(page.getByTestId('config-sdk-key')).toContainText('RHqLfEuNChEvSDAaemi5i');
    await expect(page.getByTestId('config-features')).toContainText('flag_1');
    await expect(page.getByTestId('config-features')).toContainText('flag_2');
  });
});
