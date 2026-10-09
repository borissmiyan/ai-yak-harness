/**
 * 🛡️ AI Engineering Harness — ESLint AST Quality Rules (ESLint 9 Flat Config)
 * 
 * Эти правила запрещают ключевые антипаттерны ИИ на уровне AST-парсера:
 * 1. Запрет сырых эмодзи в JSX (требуются векторные иконки lucide-react).
 * 2. Ограничение когнитивной сложности файла (максимум 500 строк).
 * 3. Запрет использования any (@typescript-eslint/no-explicit-any).
 * 4. Защита архитектурных слоев (FSD Layer Boundaries).
 * 5. SonarJS & Promise статический анализ (no-duplicated-branches, no-identical-conditions, no-return-wrap).
 * 
 * Использование в вашем eslint.config.js:
 * import { harnessCoreRules, harnessSonarAndPromiseRules, harnessLayerRules } from './configs/eslint.config.harness.js';
 * export default defineConfig([ ...yourConfigs, ...harnessCoreRules, ...harnessSonarAndPromiseRules, ...harnessLayerRules ]);
 */

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
      'max-lines': [
        'warn',
        { max: 500, skipBlankLines: true, skipComments: true },
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
