/**
 * 🛡️ Vitest Harness Configuration Snippet
 * 
 * Вставьте эти настройки в ваш vitest.config.ts для подключения:
 * 1. UTC таймзоны
 * 2. Герметичной среды тестирования (setupFiles)
 * 3. Изоляции тестов
 */

import { defineConfig, mergeConfig } from 'vitest/config';
// @ts-ignore - Template snippet: in target project ./vite.config is located at project root
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**', '**/.playwright/**'],
      setupFiles: ['./src/test/setup.ts'],
      env: {
        TZ: 'UTC',
      },
    },
  })
);
