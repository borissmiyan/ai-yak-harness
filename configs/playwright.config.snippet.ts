/**
 * 🎭 Playwright Configuration Snippet for Memory & Visual Gates (Pillar 1 & Pillar 5)
 * 
 * Вставьте эти настройки в ваш playwright.config.ts:
 * 
 * import { defineConfig, devices } from '@playwright/test';
 * 
 * export default defineConfig({
 *   testDir: './e2e',
 *   timeout: 60_000,
 *   projects: [
 *     {
 *       name: 'chromium',
 *       use: {
 *         ...devices['Desktop Chrome'],
 *         viewport: { width: 1440, height: 900 },
 *       },
 *     },
 *   ],
 *   webServer: {
 *     command: 'npm run dev',
 *     url: 'http://localhost:5174', // укажите dev port вашего проекта
 *     reuseExistingServer: true,
 *     timeout: 30_000,
 *   },
 * });
 */
