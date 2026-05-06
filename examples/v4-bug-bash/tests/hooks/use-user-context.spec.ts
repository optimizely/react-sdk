import { test, expect } from '@playwright/test';

test.describe('useOptimizelyUserContext', () => {
  test('returns user context with correct user ID and attributes', async ({ page }) => {
    await page.goto('/hooks/use-user-context');

    await expect(page.getByTestId('user-context-available')).toContainText('true');
    await expect(page.getByTestId('user-context-user-id')).toContainText('user-hook-context');
    await expect(page.getByTestId('user-context-attributes')).toContainText('premium');
  });

  test('track event updates status', async ({ page }) => {
    await page.goto('/hooks/use-user-context');

    await expect(page.getByTestId('user-context-available')).toContainText('true');
    await expect(page.getByTestId('track-status')).toContainText('Not tracked yet');

    await page.getByTestId('btn-track-event').click();
    await expect(page.getByTestId('track-status')).toContainText('Tracked "event_1"');
  });
});
