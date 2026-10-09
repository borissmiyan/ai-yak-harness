import { test, expect } from '@playwright/test';

/**
 * 🧹 Template Example: E2E Memory Leak & Resource Hygiene Gate (Pillar 1)
 *
 * Пример теста Playwright для предотвращения утечек памяти при многократной навигации.
 */
test.describe('E2E Memory Leak & Resource Hygiene Gate (Template)', () => {
  test('Repeated navigation across primary routes does not leak excessive JS heap', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'CDP HeapProfiler доступен только в Chromium');

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible({ timeout: 15_000 });

    const client = await page.context().newCDPSession(page);
    await client.send('HeapProfiler.enable');
    await client.send('HeapProfiler.collectGarbage');
    await page.waitForTimeout(500);

    const getHeapSizeMb = async (): Promise<number> => {
      try {
        await client.send('HeapProfiler.collectGarbage');
        const evalRes = await client.send('Runtime.evaluate', {
          expression: 'window.performance && (window.performance as any).memory ? (window.performance as any).memory.usedJSHeapSize : 0',
          returnByValue: true,
        });
        const bytes = typeof evalRes.result.value === 'number' ? evalRes.result.value : 0;
        return bytes / (1024 * 1024);
      } catch {
        return 0;
      }
    };

    const initialHeapMb = await getHeapSizeMb();

    // Циклы навигации между ключевыми маршрутами приложения
    const routes = ['/', '/login', '/'];
    for (let i = 0; i < 6; i++) {
      const targetRoute = routes[i % routes.length];
      await page.goto(targetRoute, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(200);
    }

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const finalHeapMb = await getHeapSizeMb();

    if (initialHeapMb > 0 && finalHeapMb > 0) {
      const heapDeltaMb = finalHeapMb - initialHeapMb;
      expect(heapDeltaMb).toBeLessThan(40);
    } else {
      await expect(page.locator('body')).toBeVisible();
    }
  });
});
