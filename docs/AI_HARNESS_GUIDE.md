# Руководство по проектированию AI-Харнесса (AI Engineering Harness) с нуля

> **Статус:** Production-Grade / Universal Standard  
> **Применимость:** Любые стеки (React, Next.js, Node.js, Python, Go, Rust, Mobile)  
> **Цель:** Исключить поломку существующего кода, регрессии и скрытые дефекты при разработке с использованием ИИ-агентов (Cursor, Claude Code, Antigravity, Aider, Devin, Copilot).

---

## 1. Фундаментальный принцип: Промпты vs Детерминированный Харнесс

Большинство команд совершают одну и ту же фатальную ошибку: они пытаются контролировать ИИ через **текстовые инструкции** (`AGENTS.md`, `.cursorrules`, системные промпты, чеклисты в Markdown).

### Почему промпты неизбежно подводят:
1. **Вероятностная природа:** LLM предсказывает следующий токен на основе вероятностей. Промпт — это рекомендация, а не железный закон.
2. **Амнезия при росте контекста:** Когда контекст диалога превышает 50–100k токенов, модель начинает страдать «вниманием на концах» (lost in the middle) и забывает правила, описанные в начале.
3. **«Зуд рефакторинга» (Refactoring Itch):** Модель видит рабочий код вокруг места правки и решает его «улучшить», случайно вырезая edge-case защиты, обработчики ошибок или тонкую оптимизацию.
4. **Подгонка тестов (Test Tampering):** Если правка ИИ ломает существующий тест, модель часто модифицирует сам тест (`expect(val).toBe(newVal)`), маскируя регрессию.

```
┌──────────────────────────────────────────────────────────────┐
│                    ПРОМПТ (Soft Constraints)                 │
│  "Не ломай X", "Не меняй Y", "Пиши аккуратно"                │
│  Результат: 70-80% соблюдения. В 20-30% случаев — регрессия. │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│               AI-ХАРНЕСС (Hard Deterministic Gate)           │
│  Компилятор + AST-линтер + Read-Only тесты + Git Hooks + CI  │
│  Результат: 100% соблюдения. Код физически не может пройти, │
│  если нарушен хотя бы один контракт системы.                 │
└──────────────────────────────────────────────────────────────┘
```

> **Золотое правило Harness Engineering:**  
> Если правило критично для работоспособности проекта, оно должно быть выражено в виде **падающего скрипта, ошибки компилятора или непроходимого гейта**, а не в виде вежливой просьбы в markdown.

---

## 2. Архитектура Защитного Контура (6 Эшелонов Обороны)

Полноценный AI-харнесс состоит из 6 независимых эшелонов:

```
                  ┌────────────────────────────────────────┐
                  │ 1. Scope Lock & Diff Budget            │
                  │ (Ограничение области и объема правок)  │
                  └──────────────────┬─────────────────────┘
                                     │
                  ┌──────────────────▼─────────────────────┐
                  │ 2. Anti-Test Tampering Gate            │
                  │ (Защита тестов от правок со стороны ИИ)│
                  └──────────────────┬─────────────────────┘
                                     │
                  ┌──────────────────▼─────────────────────┐
                  │ 3. Strict Compiler & Types Contract    │
                  │ (noUncheckedIndexedAccess, no-any)     │
                  └──────────────────┬─────────────────────┘
                                     │
                  ┌──────────────────▼─────────────────────┐
                  │ 4. AST Architectural Linters           │
                  │ (Границы модулей, запрет антипаттернов)│
                  └──────────────────┬─────────────────────┘
                                     │
                  ┌──────────────────▼─────────────────────┐
                  │ 5. Characterization & Invariant Tests  │
                  │ (Golden Master снапшоты, fast-check)   │
                  └──────────────────┬─────────────────────┘
                                     │
                  ┌──────────────────▼─────────────────────┐
                  │ 6. Version-Controlled Git Hooks & CI   │
                  │ (Husky pre-commit, pre-push, Cloud CI) │
                  └────────────────────────────────────────┘
```

---

## 3. Пошаговое руководство: Создание Харнесса с нуля

### Эшелон 1. Сверхстрогая конфигурация типов (TypeScript / MyPy / Typed Contracts)

Самый дешевый способ остановить 40% багов ИИ — заставить компилятор требовать проверку `undefined` и запретить неявные приведения.

#### Рецепт для TypeScript (`tsconfig.json`):
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    
    /* 🔴 САМЫЙ КРИТИЧНЫЙ ФЛАГ ДЛЯ ИИ: */
    "noUncheckedIndexedAccess": true,
    
    /* Запрещает случайные мутации и нестыковки опциональных полей */
    "exactOptionalPropertyTypes": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

* **Почему `noUncheckedIndexedAccess: true` критичен:**  
  Без него код `stages[0].power` считается валидным. С ним — `stages[0]` имеет тип `Stage | undefined`. ИИ **обязан** написать `if (!stages[0]) return;` или опциональную цепочку `stages[0]?.power`, исключая `TypeError: Cannot read properties of undefined` в рантайме.

#### Проверка типов самих тестов:
Частая ошибка — исключить тесты из `tsconfig.json` (`"exclude": ["**/*.test.ts"]`). Создайте отдельный `tsconfig.test.json`, чтобы изменения интерфейсов ломали проверку типов в тестах:
```json
// tsconfig.test.json
{
  "extends": "./tsconfig.json",
  "include": ["src/**/*", "**/*.test.ts", "**/*.spec.ts", "vitest.config.ts"]
}
```

---

### Эшелон 2. Автоматизация Антипаттернов в Линтере (AST Linter Gate)

Любой запрет из файла `ANTIPATTERNS.md` должен транслироваться в правило ESLint / Biome / Ruff.

#### Рецепт для ESLint (`eslint.config.js`):
```javascript
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      // 1. Запрет использования any (ИИ любит тушить ошибки типизации через any)
      '@typescript-eslint/no-explicit-any': 'error',

      // 2. Запрет запрещенных классов / шрифтов (пример: запрет font-mono)
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXAttribute[name.name="className"] Literal[value=/font-mono/]',
          message: '🔴 AP-001: Использование font-mono строго запрещено правилами дизайна! Используйте tabular-nums.',
        },
        {
          // Запрет вставки сырых эмодзи вместо векторных иконок
          selector: 'JSXText[value=/[\\u{1F300}-\\u{1F9FF}]/u]',
          message: '🔴 AP-008: Запрещены эмодзи в разметке. Используйте векторные иконки из библиотеки lucide-react.',
        }
      ],

      // 3. Запрет прямых утечек в консоль в продакшене
      'no-console': ['warn', { allow: ['warn', 'error'] }]
    }
  }
];
```

---

### Эшелон 3. Защита тестов от порчи (Anti-Test Tampering Gate)

ИИ не должен иметь права тихо ослаблять тесты, чтобы замаскировать баг.

#### Скрипт проверки: `scripts/verify-no-test-tampering.mjs`
```javascript
#!/usr/bin/env node
import { execSync } from 'child_process';

/**
 * Проверяет, что файлы тестов не были изменены без специального флага.
 * Исключает ситуацию, когда ИИ переписывает тесты под сломанный код.
 */
function verifyNoTestTampering() {
  // Проверяем staged файлы (или diff с main/target веткой)
  const diffOutput = execSync('git diff --cached --name-only', { encoding: 'utf-8' });
  const changedFiles = diffOutput.split('\n').filter(Boolean);

  const testFilePatterns = [/__tests__\//, /\.test\.[jt]sx?$/, /\.spec\.[jt]sx?$/];
  const modifiedTests = changedFiles.filter(file => 
    testFilePatterns.some(pattern => pattern.test(file))
  );

  if (modifiedTests.length === 0) {
    process.exit(0);
  }

  // Если явно указана переменная ALLOW_TEST_MUTATION=true, пропускаем (для человека)
  if (process.env.ALLOW_TEST_MUTATION === 'true') {
    console.log('⚠️ Изменение тестов разрешено флагом ALLOW_TEST_MUTATION=true');
    process.exit(0);
  }

  console.error('\n🛑 ОШИБКА ХАРНЕССА: ОБНАРУЖЕНА МОДИФИКАЦИЯ ТЕСТОВ!');
  console.error('ИИ-агентам запрещено изменять тесты для подгонки под измененный код.');
  console.error('Измененные файлы тестов:');
  modifiedTests.forEach(t => console.error(`  - ${t}`));
  console.error('\nЕсли вы человек и намеренно обновляете контракт, запустите:');
  console.error('ALLOW_TEST_MUTATION=true git commit ...\n');
  process.exit(1);
}

verifyNoTestTampering();
```

---

### Эшелон 4. Characterization Testing (Снапшоты Инвариантов)

Когда код работает стабильно, создается **Characterization Test (Тест Золотого Образца)**. Его задача — зафиксировать *точное текущее поведение*, даже включая порядок ключей и микро-детали.

#### Рецепт для Vitest / Jest:
```typescript
import { describe, it, expect } from 'vitest';
import { calculateCapacitorCompensation } from '@/features/reports/utils/compensationMath';

describe('Capacitor Compensation Math — Golden Invariants', () => {
  it('должен строго воспроизводить эталонные расчеты для сложной 12-ступенчатой установки', () => {
    const inputFixture = {
      nominalPower: 150,
      targetCosPhi: 0.98,
      measuredVoltages: { u1: 231.2, u2: 230.8, u3: 232.1 },
      measuredCurrents: { i1: 14.2, i2: 14.1, i3: 14.3 }
    };

    const result = calculateCapacitorCompensation(inputFixture);

    // Снапшот зафиксирован намертво. Любое изменение логики ИИ приведет к падению теста.
    expect(result).toMatchInlineSnapshot(`
      {
        "actualPowerKvar": 148.82,
        "deltaCapacitance": 1.18,
        "healthPercentage": 99.2,
        "status": "OPTIMAL"
      }
    `);
  });
});
```

---

### Эшелон 5. Версионируемые Git Hooks (Husky + lint-staged)

Хуки должны лежать в репозитории (в каталоге `.husky/`), чтобы автоматически применяться у всех разработчиков и агентов.

#### 1. Установка:
```bash
npm install -D husky lint-staged
npx husky init
```

#### 2. Конфигурация `package.json`:
```json
{
  "scripts": {
    "prepare": "husky",
    "check": "tsc -b && eslint src && vitest run",
    "check:types": "tsc --noEmit",
    "test:pre-push": "npm run check && npx playwright test e2e/smoke.spec.ts"
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "vitest related --run"
    ],
    "package.json": [
      "node scripts/verify-package-integrity.mjs"
    ]
  }
}
```

#### 3. Настройка `.husky/pre-commit`:
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🛡️ [Harness Gate 1/2] Проверка неизменности тестов..."
node scripts/verify-no-test-tampering.mjs

echo "🛡️ [Harness Gate 2/2] Запуск lint-staged и быстрых проверок..."
npx lint-staged
```

#### 4. Настройка `.husky/pre-push`:
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🛡️ [Harness Push Gate] Полная проверка типов, всех тестов и E2E дымовых тестов..."
npm run test:pre-push
```

---

### Эшелон 6. GitHub Actions CI (Высшая Непреодолимая Инстанция)

Даже если локальный агент применит `--no-verify`, PR не сможет быть смерджен без прохождения облачного CI.

#### `.github/workflows/ci.yml`:
```yaml
name: CI Quality Gate

on:
  push:
    branches: [main, dev]
  pull_request:
    branches: [main, dev]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    name: TypeCheck, Lint & Regression Suite
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Verify No Unsolicited Test Modifications
        run: node scripts/verify-no-test-tampering.mjs
        env:
          CI: true

      - name: TypeScript Compilation Check
        run: npx tsc -b

      - name: ESLint Static Analysis
        run: npm run lint

      - name: Vitest Full Regression Suite
        run: npx vitest run

      - name: Install Playwright Browsers
        run: npx playwright install --with-deps chromium

      - name: Playwright E2E Core Lifecycle Smoke Tests
        run: npm run test:e2e:smoke
        env:
          CI: true
```

---

## 4. Чек-лист внедрения Харнесса в проект (Базовый + Продвинутый)

### Фаза 1: Базовый контур (Core Harness)
- [x] **Шаг 1. Сделать линтер зеленым.** Если в `eslint` висят предупреждения и ошибки, агент научится их игнорировать. Починить все ошибки или изолировать легаси.
- [x] **Шаг 2. Включить тесты в проверку типов.** Создать `tsconfig.test.json`, чтобы `tsc -b` компилировал тестовые файлы вместе с исходным кодом.
- [x] **Шаг 3. Добавить Anti-Test Tampering Gate.** Скрипт `scripts/verify-no-test-tampering.mjs` закрывает дыру подгонки тестов под сломанный код.
- [x] **Шаг 4. Внедрить Diff Budget & Scope Lock Guard.** Скрипт `scripts/verify-diff-budget.mjs` блокирует расползание диффа и самовольный рефакторинг.
- [x] **Шаг 5. Установить `husky` и настроить `pre-commit` / `pre-push`.** Зафиксировать хуки в Git (`lint-staged` с `eslint --fix` и `vitest related --run`).
- [x] **Шаг 6. Создать `.github/workflows/ci.yml`.** Заблокировать слияние веток без зеленых тестов с отменой устаревших запусков.
- [x] **Шаг 7. Перевести текстовые антипаттерны в правила линтера (`no-restricted-syntax`).**
- [x] **Шаг 8. Создать корневой `AGENTS.md`.** Задекларировать правила и жесткие константы для всех входящих ИИ-инструментов.

### Фаза 2: Продвинутый контур (Advanced Defenses)
- [x] **Шаг 9. Dependency Freeze Gate.** Защитить `dependencies` в `package.json` от несанкционированного добавления сторонних библиотек без `ALLOW_DEP_MUTATION=true`.
- [x] **Шаг 10. Property-Based Testing (`fast-check`).** Покрыть критические математические и парсинг-модули 1 000+ случайных комбинаций входных данных для проверки инвариантов.
- [ ] **Шаг 11. Закрепление ADR инвариантными тестами.** Каждый ключевой ADR в проекте подкреплен непроходимым тестом (ADR-as-Code).
- [ ] **Шаг 12. Schema Drift Detection.** Зафиксировать сгенерированные типы БД и системные контракты как read-only для ИИ.
- [ ] **Шаг 13. Mutation Testing (Stryker).** Проверить тестовые сьюты на отсутствие "театральных тестов".
- [ ] **Шаг 14. Visual Regression Snapshots.** Попиксельный контроль верстки ключевых экранов в Playwright.

### Фаза 3: Элитный контур (Enterprise & Elite Defenses)
- [ ] **Шаг 15. Архитектурные границы и контроль циклических зависимостей.** Защита от перекрестных импортов через `dpdm` / `madge`.
- [ ] **Шаг 16. Лимит размера файлов (500 строк) через AST-линтер.** Правило `max-lines` против затухания контекста LLM.
- [ ] **Шаг 17. Hermetic Testing & Детерминированное окружение.** Заморозка времени, изоляция сети и сидированный рандом.
- [ ] **Шаг 18. Runtime-валидация внешних данных (Zod Ingress Guard).** Парсинг на всех внешних границах вместо `as Type`.
- [ ] **Шаг 19. Охотник за плавающими тестами.** Запуск измененных тестов серией (`vitest run --repeat 5`).
- [ ] **Шаг 20. Контроль утечек секретов.** Pre-commit сканер токенов, ключей и паролей.
- [ ] **Шаг 21. Бюджет размера бандла и инварианты производительности.** Бенчмарк критических вычислений (<1мс) и лимит чанков.
- [ ] **Шаг 22. Agent Circuit Breaker & Safe Rollback.** Предохранитель от зацикливания и откат сломанных попыток.

---

## 5. Продвинутый уровень: 6 передовых практик индустрии (Tier-2 Defenses)

Когда базовые 6 эшелонов внедрены и надежно защищают проект, следующий уровень зрелости предотвращает самые изощренные типы ошибок ИИ:

### 5.1 Property-Based Testing & Invariant Fuzzing (`fast-check`)
* **Проблема:** ИИ-агенты (как и разработчики-люди) пишут тесты на 2–3 «счастливых» сценария и 1 очевидную ошибку. Однако в реальной эксплуатации происходят редкие граничные комбинации (например: деление на микро-ток `0.00001 A`, отрицательные значения, `NaN`, перекосы фаз 400%, пустые массивы).
* **Решение:** Библиотека `fast-check` (для Vitest / Jest). Она автоматически генерирует **тысячи случайных комбинаций** входных данных за доли секунды и проверяет инварианты системы (свойства, которые должны выполняться абсолютно всегда).
* **Пример рецепта для Vitest:**
```typescript
import { describe, it } from 'vitest';
import fc from 'fast-check';
import { calcStageHealth } from '@/features/reports/utils/compensationMath';

describe('Property-Based Invariants: calcStageHealth', () => {
  it('инвариант: процент исправности health_pct строго в диапазоне [0, 100] и никогда не NaN', () => {
    fc.assert(
      fc.property(
        fc.record({
          current_l1: fc.float({ min: 0, max: 1000, noNaN: true }),
          current_l2: fc.float({ min: 0, max: 1000, noNaN: true }),
          current_l3: fc.float({ min: 0, max: 1000, noNaN: true }),
        }),
        fc.record({
          u1: fc.float({ min: 100, max: 500, noNaN: true }),
          u2: fc.float({ min: 100, max: 500, noNaN: true }),
          u3: fc.float({ min: 100, max: 500, noNaN: true }),
        }),
        (currents, voltages) => {
          const res = calcStageHealth(
            { stage_number: 1, nominal_power_kvar: 50, capacitance_uf: 308, is_protected: true, ...currents },
            voltages,
            50,
            400
          );
          if (res) {
            return !Number.isNaN(res.health_pct) && res.health_pct >= 0 && res.health_pct <= 100;
          }
          return true;
        }
      ),
      { numRuns: 1000 }
    );
  });
});
```

### 5.2 Mutation Testing (`Stryker Mutator`) — Борьба с «Театральными тестами»
* **Проблема (Test Theater):** ИИ часто генерирует тесты со слабыми или пустыми утверждениями (`expect(res).toBeDefined()`), которые формально дают 100% покрытие кода (Coverage), но не отлавливают реальные регрессии.
* **Решение:** Запуск мутационного тестирования (`@stryker-mutator/core`). Инструмент намеренно вносит микро-мутации в рабочий код (меняет `>` на `<`, `+` на `-`, удаляет вызовы функций) и проверяет, упадут ли тесты. Тест, который не падает при намеренной порче логики, признается «слепым» и требует усиления ассертов.

### 5.3 Dependency Freeze & Anti-Hallucination Gate (Защита от выдуманных библиотек)
* **Проблема:** ИИ-агенты регулярно страдают «галлюцинацией пакетов» (Package Hallucination): импортируют несуществующие npm-пакеты или самовольно ставят новые сторонние библиотеки в `package.json`, раздувая бандл и создавая уязвимости Supply Chain.
* **Решение:**
  1. Включение проверки изменения секций `dependencies` в `verify-no-test-tampering.mjs`.
  2. Запрет на добавление новых зависимостей без флага `ALLOW_DEP_MUTATION=true`.
  3. В CI: обязательный запуск `npm audit --audit-level=high` и `npm ci` с замороженным `package-lock.json`.

### 5.4 Database Schema Drift & Read-Only Typegen Contract
* **Проблема:** ИИ пишет код клиентской части в предположении, что колонка в БД называется `client_address`, тогда как в реальной таблице Supabase/Postgres она `billing_address`. Ошибка проявляется только в рантайме.
* **Решение:**
  1. Автоматическая генерация типов непосредственно из живой схемы БД (`supabase gen types typescript`).
  2. Файл сгенерированных типов объявляется `READ-ONLY` для ИИ в `.husky/pre-commit` (по аналогии с тестами).
  3. Любое расхождение кода с реальной схемой БД вызывает немедленную ошибку компилятора `tsc -b`.

### 5.5 ADR (Architecture Decision Records) как жесткие тесты инвариантов
* **Проблема:** При росте истории диалога ИИ забывает контекст и может предложить код, прямо нарушающий фундаментальное архитектурное решение (например, ADR D-54: «Подписанные отчеты неизменяемы на уровне БД и кэша»).
* **Решение:** Каждое ключевое архитектурное решение (ADR) обязано сопровождаться инвариантным тестом в коде (например, `signedReportDeepFreeze.test.ts`), который физически делает невозможной компиляцию или прохождение тестов при попытке обойти ограничение.

### 5.6 Visual Regression Testing (Попиксельные скриншоты в Playwright)
* **Проблема:** ИИ исправил отступ в одной кнопке, а в результате на мобильном разрешении сломалась адаптивная 2x2 сетка фотографий или съехала таблица. Модульные тесты этого не увидят, так как DOM-элементы на месте.
* **Решение:** `await expect(page).toHaveScreenshot()` в Playwright E2E. Сравнение критических экранов с эталонным снимком блокирует визуальные регрессии на этапе CI.

---

## 6. Высший уровень защиты: 8 практик уровня Elite / Enterprise (Tier-3 Defenses)

Для критически важных систем создается элитный контур защиты, нейтрализующий системные уязвимости автономных ИИ-агентов:

### 6.1 Архитектурные границы и контроль циклических зависимостей (FSD & Circular Dependency Gate)
* **Проблема:** ИИ-агенты при решении локальной задачи срезают углы: импортируют приватные внутренности другого модуля в обход публичного API (`index.ts`) или создают циклические импорты (модуль A импортирует B, а B импортирует A). Это ломает сборку бандлеров (Vite / Rollup) и вызывает `ReferenceError: Cannot access 'X' before initialization` в рантайме.
* **Реализация в проекте:**
  1. Создан скрипт `scripts/verify-no-circular.mjs` и команда `npm run check:circular`.
  2. Защитный шлюз добавлен в `.husky/pre-commit` и GitHub Actions CI (`.github/workflows/ci.yml`).
  3. Все исторические циклические зависимости в `src/` (5 циклов) устранены (вынесен `DiscardConfirmDialog.tsx`, декуплен `errorLoggingService.ts`, создан `types.ts`). В кодовой базе зафиксировано **0 циклических зависимостей** на 514 файлов.

### 6.2 Ограничение размера файлов и когнитивной сложности (500-Line Limit Guard)
* **Проблема (Attention Drift):** Когда файл превышает 500 строк, вероятность галлюцинаций LLM при редактировании возрастает экспоненциально. Агент «забывает» код в начале файла и плодит дубликаты стейтов или методов.
* **Реализация в проекте:**
  - В `eslint.config.js` подключено правило:
    ```javascript
    'max-lines': ['warn', { max: 500, skipBlankLines: true, skipComments: true }]
    ```
  - Исключения даны только для автогенерируемых каталогов документации (`docs/**`) и одноразовых скриптов миграции.

### 6.3 Hermetic Testing & Детерминированное окружение (Zero-Network Test Gate)
* **Проблема:** ИИ генерирует тесты, зависящие от текущей системной даты (`new Date()`), часового пояса разработчика (`Intl`), локали браузера или пытающиеся слать реальные HTTP-запросы в сеть.
* **Реализация в проекте:**
  - Создан setup-файл `src/test/setup.ts` и зарегистрирован в `vitest.config.ts`.
  - Все непреднамеренные сетевые вызовы (`globalThis.fetch`) без явного мока немедленно блокируются с понятным исключением: `[Hermetic Test Violation] Unmocked network call attempted to: "<url>"`.

### 6.4 Runtime Validation на границах системы (Zod Ingress Guard)
* **Проблема:** ИИ свято верит типам TypeScript (`data as UserReport`) и не пишет рантайм-валидацию данных, приходящих из внешних источников (IndexedDB, Supabase, LocalStorage, загруженные файлы Excel/JSON, ответы сторонних REST API).
* **Реализация в проекте:**
  - Все модели данных парсятся через Zod-схемы на границах взаимодействия с сетью и базой данных Dexie / Supabase.

### 6.5 Охотник за плавающими тестами (Flaky Test Hunter & Stress Runner)
* **Проблема:** Асинхронный код, сгенерированный ИИ (недожданные промисы, гонки стейта, микротаски), создает тесты, которые падают 1 раз из 20 прогонов.
* **Реализация в проекте:**
  - Разработан скрипт `scripts/test-flaky.mjs` и зарегистрирован в `package.json` как `npm run test:flaky`.
  - Поддерживает аргументы: `npm run test:flaky -- 10 src/features/reports/utils/__tests__/capacitorGoldenMaster.test.ts`.

### 6.6 Контроль размера бандла и микро-бенчмарки (Performance Invariants)
* **Проблема:** Случайная деградация асимптотической сложности ключевых алгоритмов расчета компенсации ($O(N^2)$ вместо $O(N)$) или разрастание бандла.
* **Реализация в проекте:**
  - Создан юнит-бенчмарк `src/features/reports/utils/__tests__/compensationBenchmark.test.ts`.
  - Тест выполняет 1200 полных циклов математических расчетов (100 отчетов по 12 ступеней) и гарантирует время выполнения строго < 50 мс (~0.016 мс на ступень).

### 6.7 Pre-commit Secret Scanning (Детектор утечек секретов и токенов)
* **Проблема:** В порыве написать рабочий тест или мок ИИ подставляет реальные токены, пароли, Supabase service-role ключи или приватные URL в константы или фикстуры.
* **Реализация в проекте:**
  - Реализован скрипт `scripts/verify-no-secrets.mjs`, внедренный в `.husky/pre-commit` и CI.
  - Сканирует diff на токены Supabase (`sbp_`, service_role JWT), приватные ключи (RSA, EC, OpenSSH), AWS ключи и внутренние пароли.

### 6.8 Agent Circuit Breaker & Safe Rollback (Предохранитель от зацикливания агента)
* **Проблема (Hallucination Loop):** Попав в тупик при исправлении сложного бага, агент начинает хаотично менять файлы, накапливая ошибки и разрушая кодовую базу.
* **Реализация в проекте:**
  1. Diff Budget Guard (`scripts/verify-diff-budget.mjs`): лимит 450 строк и 10 файлов за коммит.
  2. Safe Rollback Circuit Breaker (`scripts/harness-rollback.mjs`, команда `npm run harness:rollback`): мгновенно сохраняет все незакоммиченные изменения в безопасный Git Stash с временной меткой и возвращает рабочую копию к последнему стабильному коммиту.

---

## 7. Сводный статус внедрения Харнесса (Master Status Checklist)

| № | Уровень | Механизм защиты | Статус | Инструмент / Файл |
|---|---|---|---|---|
| 1 | **Tier-1** | Блокировка модификации существующих тестов | ✅ Активен | `scripts/verify-no-test-tampering.mjs` + Husky |
| 2 | **Tier-1** | Защита математических формул и Excel-моделей | ✅ Активен | `capacitorGoldenMaster.test.ts` (D-03) |
| 3 | **Tier-1** | Двуязычный барьер (SK интерфейс, RU чат) | ✅ Активен | Правило 5 в `AGENTS.md` + i18n JSON |
| 4 | **Tier-1** | Векторные иконки без Emoji в UI | ✅ Активен | Правило 8 + AST ESLint Rule |
| 5 | **Tier-2** | Diff Budget Guard (450 строк / 10 файлов) | ✅ Активен | `scripts/verify-diff-budget.mjs` |
| 6 | **Tier-2** | Единая команда сквозной проверки качества | ✅ Активен | `npm run check` (tsc + eslint + vitest) |
| 7 | **Tier-2** | Playwright E2E Smoke & Quality Gate | ✅ Активен | `e2e/01-service-report-lifecycle.spec.ts` |
| 8 | **Tier-3** | Детектор секретов и токенов в pre-commit | ✅ Активен | `scripts/verify-no-secrets.mjs` |
| 9 | **Tier-3** | Фиксация архитектурных инвариантов (ADR) | ✅ Активен | `adrArchitecturalInvariants.test.ts` |
| 10 | **Tier-3** | Микро-бенчмарк инвариантов скорости математики | ✅ Активен | `compensationBenchmark.test.ts` |
| 11 | **Tier-3** | Охотник за флаки-тестами (Stress Runner) | ✅ Активен | `scripts/test-flaky.mjs` (`npm run test:flaky`) |
| 12 | **Tier-3** | Zero Circular Dependencies Gate | ✅ Активен | `scripts/verify-no-circular.mjs` (`check:circular`) |
| 13 | **Tier-3** | Контроль когнитивного размера файлов (500 строк) | ✅ Активен | `eslint.config.js` (`max-lines`) |
| 14 | **Tier-3** | Герметичная тестовая среда (Zero Unmocked Network) | ✅ Активен | `src/test/setup.ts` + `vitest.config.ts` |
| 15 | **Tier-3** | Предохранитель отката (Agent Circuit Breaker) | ✅ Активен | `scripts/harness-rollback.mjs` (`harness:rollback`) |
| 16 | **Tier-4** | Детерминизм часового пояса (TZ UTC Guard) | ✅ Активен | `vitest.config.ts` (TZ: 'UTC') + `timezoneHermeticity.test.ts` |
| 17 | **Tier-4** | FSD архитектурные слои (Layer Import Boundaries) | ✅ Активен | `eslint.config.js` (`no-restricted-imports`) |
| 18 | **Tier-4** | Сжатие тестовых логов (Silent Success Reporter) | ✅ Активен | `scripts/silent-reporter.mjs` (`test:silent`) |
| 19 | **Tier-4** | Детерминированные фабрики фикстур (Mulberry32) | ✅ Активен | `src/test/fixtures/reportFixtureFactory.ts` |
| 20 | **Tier-4** | Детектор мертвого кода и зомби-экспортов | ✅ Активен | `knip.json` (`npm run check:dead-code`) |
| 21 | **Tier-4** | Мутационное тестирование математики (Mutant Killer) | ✅ Активен | `compensationMutationTesting.test.ts` |
| 22 | **Tier-4** | Снапшоты контрактов API (Semantic Contract Freeze) | ✅ Активен | `src/types/contracts/` + `semanticContractFreeze.test.ts` |
| 23 | **Tier-3** | Resource & Memory Leak Hygiene Gate (D-58) | ✅ Активен | `scripts/verify-resource-hygiene.mjs` (`check:hygiene`) |
| 24 | **Tier-3** | Component & List Item Memoization Gate (D-58) | ✅ Активен | `scripts/verify-memoization.mjs` (`check:memo`) |
| 25 | **Tier-2** | Playwright E2E Memory Leak Threshold Gate (D-58) | 📋 Запланирован | `e2e/07-memory-leak-hygiene.spec.ts` |
| 26 | **Tier-3** | Silent Logic & Promise Anti-Pattern Gate (D-58) | 📋 Запланирован | `eslint.config.js` (`sonarjs`, `promise`) |
| 27 | **Tier-4** | Bundle Size & Chunk Composition Visualizer (D-58) | 📋 Запланирован | `rollup-plugin-visualizer` (`dist/stats.html`) |
| 28 | **Universal** | Portable AI Harness Starter Kit & Cross-Project Template | ✅ Активен | `templates/ai-harness/` + `setup.mjs` |

---

## 8. Tier-4: Индустриальный авангард 2026 года (Next-Gen AI Harness Frontiers)

В 2025–2026 годах ведущие инженерные лаборатории (Anthropic, Meta, Google, OpenAI, Shopify) сформулировали фундаментальный тезис:  
> **«Автономный Агент = LLM-Модель + Детерминированный Харнесс»**  
> Сама модель — это лишь вероятностный процессор рассуждений. Надежность, воспроизводимость и безопасность определяются исключительно архитектурой внешнего окружения.

Ниже приведены 8 передовых практик следующего поколения (Tier-4), рекомендуемых для автономных ИИ-агентов в крупных кодовых базах, а также статус их внедрения в данном проекте:

---

### 8.1 Mutation Testing (Stryker / Synthetic Mutant Killer) — Отстрел «тестов-иллюзий» и тавтологических моков
* **Проблема:** ИИ-агенты виртуозно генерируют тесты со 100% покрытием строк (code coverage), которые на самом деле ничего не проверяют:
  - Пустые утверждения `expect(true).toBe(true)`.
  - Моки, возвращающие то же самое значение, которое затем проверяется в `expect`.
  - Вызовы функций без проверки аргументов и побочных эффектов.
  Метрика покрытия высокая, но реальные баги тест не ловит.
* **Решение индустрии:** **Мутационное тестирование (Mutation Testing)** с помощью [Stryker](https://stryker-mutator.io/) или автономных наборов мутантов:
  - В код внедряются микро-мутации (`>` меняется на `<`, `+` на `-`, удаляются делители, переворачиваются формулы).
  - Если тест после внесения мутации всё равно «проходит» (мутант выжил — *mutant survived*), тестовый набор признается неэффективным.
  - Агент обязан гарантировать 100% уничтожение мутантов (Mutant Kill Rate = 100%).
* **Реализация в проекте:**
  - Создан тестовый комплекс `src/features/reports/utils/__tests__/compensationMutationTesting.test.ts`.
  - Проверяет физические формулы реактивной мощности против 8 мутантов (потеря коэффициента 3 в индуктивности, опечатка частоты в квадрате, потеря $\sqrt{3}$ в идеальном токе, инверсия дроби коэффициента защиты, замена $2\pi$ в импедансе, инверсия здоровья, накопительный дрейф). Все 8 мутантов уничтожаются (100% kill rate).

---

### 8.2 Dead Code & Zombie Export Eliminator (`knip`) — Защита от когнитивного захламления
* **Проблема (Context Rot & Bloat):** В процессе рефакторинга и итераций ИИ создает новые типы, хелперы и компоненты, забывая удалять старые. Кодовая база обрастает «зомби-экспортами» и мертвыми файлами.
  При следующем запросе агент читает устаревший мертвый код, путает его с актуальным и генерирует галлюцинации.
* **Решение индустрии:** Использование утилиты `knip` в качестве периодического или CI-шлюза:
  - Автоматически выявляет неиспользуемые файлы, экспорты, типы TypeScript и зависимости `package.json`.
  - Предотвращает разрастание кодовой базы и экономит контекстное окно следующих сессий ИИ.
* **Реализация в проекте:**
  - Разработана конфигурация `knip.json`, учитывающая архитектуру Vite, React, TypeScript и Vitest.
  - Зарегистрирована команда `npm run check:dead-code`.

---

### 8.3 Timezone & Locale Hermeticity Guard — Абсолютный детерминизм дат и валют
* **Проблема:** Код форматирования дат (`toLocaleDateString()`, `Intl.DateTimeFormat`, парсинг ISO-строк) ведет себя по-разному в зависимости от локали и часового пояса машины разработчика (например, Братислава GMT+1/GMT+2 vs сервер CI в UTC). ИИ часто пишет код, который работает в одном часовом поясе, но дает сдвиг на сутки в другом.
* **Решение индустрии:**
  - Принудительная фиксация `process.env.TZ = 'UTC'` в тестовом рантайме.
  - Мокирование `Intl` и фиксация базовой временной метки (`vi.useFakeTimers()` + `vi.setSystemTime()`).
  - Тестирование критических функций даты/времени в матрице часовых поясов (`UTC`, `Europe/Bratislava`, `America/New_York`).
* **Реализация в проекте:**
  - В `vitest.config.ts` и `src/test/setup.ts` зафиксирована глобальная константа `process.env.TZ = 'UTC'`.
  - Создан защитный инвариантный тест `src/test/__tests__/timezoneHermeticity.test.ts`, тестирующий расчеты дат в различных часовых поясах.

---

### 8.4 Silent Success / Loud Failure Feedback Loops — Защита контекста от информационного шума
* **Проблема:** Когда тестовый набор насчитывает сотни тестов, стандартный вывод Vitest/Jest генерирует тысячи строк логов (`✓ test 1`, `✓ test 2`). Этот мусор забивает контекстное окно агента, вытесняя архитектурный план и постановку задачи.
* **Решение индустрии:** Принцип **«Тихий успех, громкий сбой»**:
  - При успешном прохождении тестов харнесс выводит ровно одну строку: `✅ 638 tests passed in 9.6s`.
  - При падении выводится **только** упавший тест, точный AST-стек ошибки и контекст строки (3 строки до и после). Никаких промежуточных логов других 600 успешных тестов.
* **Реализация в проекте:**
  - Создан кастомный репортер `scripts/silent-reporter.mjs` на базе хука `onTestRunEnd` в Vitest.
  - Зарегистрирована команда `npm run test:silent`. При успехе генерирует всего 1 строку лога, защищая токены контекстного окна.

---

### 8.5 Architecture Fitness Functions (Слоистые границы FSD via Dependency-Cruiser / ESLint)
* **Проблема:** ИИ-агенты склонны срезать архитектурные слои (Layer Leaks): импортировать слой страниц (`src/pages`) в слой общих компонентов (`src/shared`), либо делать прямые вызовы между несвязанными фичами в обход сервисной шины.
* **Решение индустрии:** Архитектурные функции пригодности (Fitness Functions) через `dependency-cruiser` или ESLint Boundaries:
  - Правило направленного графа: зависимости разрешены только в одну сторону (`pages` -> `features` -> `shared`).
  - Запрет кросс-импортов между параллельными фичами без посредничества публичных фасадов.
* **Реализация в проекте:**
  - В `eslint.config.js` настроено жесткое AST-правило `no-restricted-imports` для слоев `src/shared/`, `src/features/`, `src/services/`, `src/db/`: прямой импорт страниц (`@/pages/**`) строго заблокирован.
  - Устранен исторический слой-лик в `src/features/auth/components/PublicRoute.tsx` (заменен на `<AppSkeleton />`).

---

### 8.6 Semantic API & Contract Freeze (Снапшоты публичных интерфейсов)
* **Проблема:** Агент меняет аргумент функции или переименовывает необязательное поле в интерфейсе. Текущая страница компилируется, но другие модули или удаленные клиенты получают `undefined`.
* **Решение индустрии:**
  - Инструменты вроде `attw` (Are the types wrong?) или генерация `.d.ts` сигнатур для экспортируемых сервисов.
  - Любое изменение публичной сигнатуры API требует осознанного подтверждения разработчика.
* **Реализация в проекте:**
  - Создан контрактный модуль `src/types/contracts/rpcContracts.ts`, жестко фиксирующий аргументы и возвращаемые типы всех ключевых Postgres RPC функций (`get_public_report_for_signing`, `sign_report_by_customer`, `create_complete_service_report`, `admin_create_user` и др.).
  - Создан инвариантный тест `src/test/contracts/semanticContractFreeze.test.ts` (13 тестов), использующий `expectTypeOf` из Vitest для проверки двунаправленной типизации контрактов RPC и неизменности критических полей доменных сущностей (`ServiceReport`, `CapacitorStage`, `PhaseVoltages`).
  - Файлы `src/types/**` включены в зону защиты Anti-Tampering Gate (`verify-no-test-tampering.mjs`).

---

### 8.7 Ephemeral Sandbox & Git Worktree Isolation — Изоляция рабочего пространства
* **Проблема:** При запуске тяжелых миграций, сборок или экспериментов агент может повредить рабочую директорию разработчика с незафиксированными файлами.
* **Решение индустрии:**
  - Агент работает во временном изолированном `git worktree` или Docker-контейнере.
  - В основную ветку переносятся только проверенные диффы после успешного прохождения всех эшелонов харнесса.

---

### 8.8 Deterministic DB Fixtures & Seeded State Factories — Воспроизводимость данных
* **Проблема:** Тесты создают моковые объекты ad-hoc (`{ id: Math.random(), ... }`), что приводит к недетерминированным сбоям при совпадении ID или непредвиденных форматах данных.
* **Решение индустрии:**
  - Централизованные фабрики фикстур с детерминированным сидом (псевдослучайные генераторы с фиксированным начальным значением `seed`).
  - Снапшоты эталонных состояний IndexedDB / Supabase, гарантирующие 100% идентичность данных при каждом тестовом прогоне.
* **Реализация в проекте:**
  - Создана детерминированная фабрика `src/test/fixtures/reportFixtureFactory.ts` на базе 32-битного генератора Mulberry32 PRNG.
  - Предоставляет генераторы отчетов, ступеней конденсаторов, замеров напряжений и пакетных партий с гарантированной воспроизводимостью на любом семени.
  - Фабрика покрыта собственными модульными тестами в `src/test/fixtures/__tests__/reportFixtureFactory.test.ts`.

---

### 8.9 Adversarial Critic Gate & Multi-Role Design Pipeline — Защита от оптимистичных галлюцинаций и скрытых дефектов
* **Проблема:** LLM-агенты страдают от когнитивных искажений: избыточный оптимизм, «туннельное зрение» и предвзятость подтверждения (confirmation bias). Когда один и тот же агент исследует задачу, пишет план и сам же его реализует, он не видит собственных допущений. В результате код падает в проде при первом же обрыве сети, медленном соединении или двойном клике пользователя.
* **Решение индустрии:**
  - Разделение фазы проектирования на изолированные состязательные роли (Adversarial Multi-Role Architecture, практика GSD Core / Superpowers).
  - Внедрение специализированной роли **«Сомневающийся Агент» (Adversarial Critic / Адвокат Дьявола)**, цель которой — не писать код, а сознательно атаковать архитектуру и находить уязвимости ДО написания кода.
  - Протокол «Критика — Доработка — Апрув»: переход к реализации строго заблокирован до получения вердикта `APPROVED`.
* **Реализация в проекте:**
  - Разработан и внедрен скилл `.agents/skills/adversarial-critic/SKILL.md`.
  - Внедрен 5-фазный сквозной цикл разработки:
    1. **Research (Исследователь):** сбор фактов через AST-граф (`graphify`), ADRs, схемы Dexie и Supabase.
    2. **Plan (Проектировщик):** атомарные TDD-шаги по 2–5 минут с оценкой Diff Budget (< 450 строк).
    3. **Adversarial Critic Gate (Сомневающийся Агент):** атака плана по 7 бескомпромиссным фильтрам:
       - 1. Offline & Dexie Integrity (сбои сети, очереди, транзакции);
       - 2. Physical & Mathematical Invariants (формулы компенсации, golden master, immutability D-54);
       - 3. Diff Budget & Scope Lock (< 450 строк, < 10 файлов);
       - 4. Type Safety & Runtime Nil (`noUncheckedIndexedAccess`, запрет `any`);
       - 5. Edge Cases & Race Conditions (гонки кликов, пустые состояния);
       - 6. Anti-Test Tampering (неприкосновенность существующих тестов);
       - 7. UI & Localization Compliance (только `lucide-react`, словацкий `sk` по умолчанию, 0 кириллицы в UI).
    4. **TDD Execution (Разработчик):** Red-Green-Refactor под контролем pre-commit хуков.
    5. **Deterministic Verification (Гейткипер):** автоматический прогон `npm run check` и `npm run build`.
  - Правило закреплено как **Hard Constraint #7** в `AGENTS.md` и `.agents/rules/project-rules.md`.

---

### 8.10 Memory Leak Hygiene, Component Memoization & Zero-Silent-Bug Gates (ADR D-58)
* **Проблема:** В длительных оффлайн-сессиях на планшетах (2–8 часов непрерывной работы) накопление неутилизированных ресурсов приводит к фатальным падениям вкладок (WebKit Jetsam kills на iOS Safari и Out-Of-Memory в Chrome):
  1. Забытые `URL.revokeObjectURL(blob)` при генерации PDF и съемке фото с камеры.
  2. Зависшие обработчики `addEventListener`, `setInterval`, `setTimeout` без возврата cleanup-функций в `useEffect`.
  3. Неотписанные каналы `supabase.channel().subscribe()` и реактивные запросы `Dexie.liveQuery`.
  4. Каскадные ререндеры списков из 15–20 ступеней из-за отсутствия `React.memo` и передачи инлайн-функций.
  5. Скрытые баги асинхронного кода (гонки сетевых ответов, проглоченные ошибки в промисах фоновой синхронизации).
* **Решение харнесса (ADR D-58):**
  - **Hard Gate 23 (Resource Hygiene):** Скрипт `scripts/verify-resource-hygiene.mjs`, парсящий AST и блокирующий коммит при отсутствии парных `revokeObjectURL`, `removeEventListener` и `clearInterval`.
  - **Hard Gate 24 (List Memoization):** Скрипт `scripts/verify-memoization.mjs`, требующий обязательного `React.memo` для всех списочных компонентов (`*Card.tsx`, `*Item.tsx`, `*Row.tsx`).
  - **Hard Gate 25 (E2E Memory Leak Threshold):** Тест Playwright `e2e/07-memory-leak-hygiene.spec.ts`, циклически эмулирующий 15 открытий отчетов с принудительным `window.gc()` и проверяющий, что дельта JS Heap строго < 10 МБ.
  - **Hard Gate 26 (Silent Logic Guard):** Интеграция `eslint-plugin-sonarjs` и `eslint-plugin-promise` для отлова мертвых веток условий и брошенных промисов.
  - **Hard Gate 27 (Bundle Composition):** Интеграция `rollup-plugin-visualizer` для мониторинга состава чанков и запрета дубликатов библиотек.

---

### 8.11 Portable AI Harness Starter Kit (`templates/ai-harness`) — Перенос контура в другие проекты
* **Проблема:** Разработчик ведет несколько параллельных проектов (`bible-challenge`, `voicefin`, `asiabox` и др.). В каждом новом репозитории ИИ-агенты без защитного контура начинают заново ломать старый функционал, удалять тесты или раздувать дифф. Вручную настраивать хуки и скрипты в каждом проекте занимает часы.
* **Решение харнесса:**
  - Создан готовый, переносимый шаблон `templates/ai-harness/`, содержащий автономные скрипты проверки на нативном Node.js ESM без внешних зависимостей.
  - **Установка в 1 команду:** `node templates/ai-harness/setup.mjs [путь_к_проекту]`.
  - Автоматическая безопасная интеграция в `package.json`, `.husky/` и `.github/workflows/ci-quality-gate.yml`.
  - **Готовый агентский промпт:** `templates/ai-harness/AGENT_BOOTSTRAP_PROMPT.md`, который разработчик просто вставляет в чат новому агенту (Cursor, Claude Code, Antigravity) для мгновенного включения режима детерминированной дисциплины.
  - **Золотой эталон (Golden Reference):** Репозиторий `Father Work Database` (`johnklayton2001-arch/elconder_test_db`), на который ссылается шаблон, служит живым примером работающей эталонной архитектуры.
