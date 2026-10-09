// @ts-check
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  packageManager: 'npm',
  reporters: ['html', 'clear-text', 'progress'],
  testRunner: 'vitest',
  vitest: {
    configFile: 'vitest.config.ts'
  },
  mutate: [
    // Настройте целевые файлы критической бизнес-логики:
    'src/**/*.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/__tests__/**'
  ],
  tempDirName: '.stryker-tmp',
  cleanTempDir: true,
  concurrency: 4,
  timeoutMS: 15000,
  thresholds: { high: 80, low: 60, break: null }
};

export default config;
