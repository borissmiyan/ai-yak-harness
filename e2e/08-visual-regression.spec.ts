import { test, expect } from '@playwright/test';

/**
 * 🎨 Template Example: Visual Regression & Layout Stability Gate (Pillar 5)
 *
 * Пример теста стабильности геометрических границ интерфейса и снимков экрана.
 */
test.describe('Visual Regression Testing Gate (Template)', () => {
  test('Main layout renders without breaking bounds', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible({ timeout: 15_000 });

    const mainContainer = page.locator('main, #root, body').first();
    await expect(mainContainer).toBeVisible();

    const box = await mainContainer.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.width).toBeGreaterThan(200);
      expect(box.height).toBeGreaterThan(100);
    }

    if (process.env.VISUAL_REGRESSION === 'true') {
      await expect(page).toHaveScreenshot('app-layout.png', {
        maxDiffPixelRatio: 0.05,
        animations: 'disabled',
      });
    }
  });
});
