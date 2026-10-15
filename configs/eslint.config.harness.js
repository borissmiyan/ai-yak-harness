/**
 * 🛡️ AI Engineering Harness — ESLint AST Quality Rules (ESLint 9 Flat Config)
 * 
 * Эти правила запрещают ключевые антипаттерны ИИ на уровне AST-парсера:
 * 1. Запрет сырых эмодзи в JSX (требуются векторные иконки lucide-react).
 * 2. TSX Component Size Doctrine:
 *    - 150–250 строк: Золотой стандарт React-компонента.
 *    - max-lines: 300 (warn) — сигнал к декомпозиции.
 *    - max-lines-per-function: 200 (warn) — ограничение функции компонента.
 *    - max-lines: 500 (error) — жесткий аварийный потолок (Hard Ceiling).
 * 3. Запрет использования any (@typescript-eslint/no-explicit-any).
 * 4. Защита архитектурных слоев (FSD Layer Boundaries).
 * 5. SonarJS & Promise статический анализ (no-duplicated-branches, no-identical-conditions, no-return-wrap).
 * 
 * Использование в вашем eslint.config.js:
 * import { harnessCoreRules, harnessSonarAndPromiseRules, harnessLayerRules } from './configs/eslint.config.harness.js';
 * export default defineConfig([ ...yourConfigs, ...harnessCoreRules, ...harnessSonarAndPromiseRules, ...harnessLayerRules ]);
 */

import fs from 'node:fs';

const limits = JSON.parse(
  fs.readFileSync(new URL('./harness-limits.json', import.meta.url), 'utf-8')
);

export const harnessCoreRules = [
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'prefer-const': 'error',
      'no-empty': 'error',
      // Жесткий аварийный потолок (Hard Limit) для всех TS/TSX файлов
      'max-lines': [
        'error',
        { max: limits.component.tsx_error, skipBlankLines: true, skipComments: true },
      ],
      // AST Rule: Запрет вставки сырых эмодзи в JSX (Design System Rule)
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXText[value=/[\\u{1F300}-\\u{1F9FF}\\u{2600}-\\u{26FF}\\u{2700}-\\u{27BF}]/u]',
          message: 'AI Harness Rule: Raw emojis in JSX are prohibited. Use vector icons (e.g. lucide-react).',
        },
      ],
    },
  },
  {
    // Золотой стандарт React-компонентов (150–250 строк, warning на 300, компонент до 200)
    files: ['**/*.tsx'],
    rules: {
      // Ограничиваем общий размер файла: 300 чистых строк (сигнал к декомпозиции)
      'max-lines': [
        'warn',
        { max: limits.component.tsx_warn, skipBlankLines: true, skipComments: true },
      ],
      // Ограничиваем размер самого React-компонента (функции) внутри файла до 200 строк
      'max-lines-per-function': [
        'warn',
        { max: limits.component.tsx_function_warn, skipBlankLines: true, skipComments: true, IIFEs: true },
      ],
      // Защита от деградации рендера: запрет создания компонентов внутри тел других компонентов
      'react/no-unstable-nested-components': [
        'error',
        { allowAsProps: false },
      ],
    },
  },
  {
    // Защита от «Хук-помойки» (use*.ts Escape Hatch): хук не должен превышать 150 строк
    files: ['**/use*.ts'],
    rules: {
      'max-lines': [
        'warn',
        { max: limits.component.hook_warn, skipBlankLines: true, skipComments: true },
      ],
    },
  },
];

export const harnessSonarAndPromiseRules = [
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'sonarjs/no-identical-conditions': 'error',
      'sonarjs/no-all-duplicated-branches': 'error',
      'sonarjs/no-element-overwrite': 'error',
      'sonarjs/no-collection-size-mischeck': 'error',
      'promise/param-names': 'warn',
      'promise/no-return-wrap': 'error',
    },
  },
];

export const harnessLayerRules = [
  {
    files: ['src/shared/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/pages/**', '**/pages/**', '@/App', '**/App'],
              message: 'Architecture Violation: Code in shared/ must never import from pages or App.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/pages/**', '**/pages/**', '@/App', '**/App'],
              message: 'Architecture Violation: Code in features/ must never import from pages or App.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/services/**/*.{ts,tsx}', 'src/db/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/pages/**', '**/pages/**', '@/App', '**/App', '@/shared/ui/**'],
              message: 'Architecture Violation: Services and DB models must never import from pages or UI components.',
            },
          ],
        },
      ],
    },
  },
];
