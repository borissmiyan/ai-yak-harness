# 🛡️ AI Yak Harness (Universal Standard)

> **Автор:** Boris Smiyan / Yak Money ([GitHub](https://github.com/borissmiyan))  
> **Живой эталон (Golden Reference):** [Father Work Database](file:///Users/borissmiyan/Work/AppDev/Father%20Work%20Database) (`borissmiyan/ai-yak-harness`).  
> **Лицензия:** [YAK-FCU-1.0 (Yak Free Commercial & Non-Standalone Resale License)](./LICENSE) — Бесплатно для любых коммерческих приложений и SaaS, запрещена продажа в виде standalone-продукта.  
> **Аксиома харнесса:** *«Промпт — рекомендация, Харнесс — детерминированный Hard Gate»*.

---

## 🎯 Что такое AI Yak Harness?

**AI Yak Harness** — это переносимый, самодостаточный защитный каркас (harness) для разработки с участием автономных ИИ-агентов (Cursor Composer, Claude Code, Antigravity, GitHub Copilot).

### Какую проблему решает харнесс:
Обычный ИИ-ассистент страдает пятью фундаментальными болезнями:
1. **Зуд рефакторинга:** Агент переписывает рабочий чужой код вокруг места правки, раздувая дифф на сотни и тысячи строк.
2. **Молчаливая подделка тестов:** Когда агент ломает код, он часто "чинит" проблему, просто ослабляя или удаляя падающие проверки (`expect(true).toBe(true)`).
3. **Галлюцинации пакетов (Package Hallucination):** Агент самовольно добавляет непроверенные npm-пакеты в `dependencies`, создавая уязвимости Supply Chain.
4. **Скрытые утечки памяти и ре-рендеринг:** Агент создает Blob URL без освобождения (`URL.revokeObjectURL`), забывает снимать обработчики событий (`removeEventListener`), плодит не-мемоизированные списки карточек.
5. **Разрастание контекста (Context Bloat & Rot):** Тысячи строк тестовых логов и мертвый код забивают контекст LLM, вызывая амнезию и галлюцинации.

**AI Yak Harness превращает эти проблемы в физически невозможные:** попытка нарушить правила моментально блокируется детерминированными гейтами Git и CI с кодом возврата `exit 1`.

---

## 🚀 Быстрый старт (Установка за 1 минуту)

### Вариант 1. Автоматический запуск напрямую из папки `ai-yak-harness` (Рекомендуется)
Находясь в любом целевом проекте (например, `cd /Users/borissmiyan/Work/AppDev/voicefin` или `bible-challenge`):

```bash
# Запуск инсталлятора из центрального репозитория
node /Users/borissmiyan/Work/AppDev/ai-yak-harness/setup.mjs .
```

### Вариант 2. Копирование в проект
```bash
cp -r "/Users/borissmiyan/Work/AppDev/ai-yak-harness" ./templates/ai-yak-harness
node ./templates/ai-yak-harness/setup.mjs .
```

Установщик автоматически:
- Скопирует проверочные скрипты в `scripts/` (включая stress runner, silent reporter, schema drift gate, worktree manager).
- Настроит Git-хуки в `.husky/` (`pre-commit`, `pre-push`).
- Развернет CI Quality Gate в `.github/workflows/ci-quality-gate.yml`.
- Установит скилл Сомневающегося Агента в `.agents/skills/adversarial-critic/SKILL.md`.
- Установит шаблоны `knip.json`, `tsconfig.test.json`, `stryker.config.mjs`, `configs/eslint.config.harness.js`, `src/test/setup.ts`, `src/utils/security.ts`.
- Установит конфигурационные сниппеты (`vite.config.snippet.ts`, `react-scan.snippet.ts`, `playwright.config.snippet.ts`, `vitest.config.snippet.ts`).
- Установит Playwright E2E тесты (`e2e/07-memory-leak-hygiene.spec.ts`, `e2e/08-visual-regression.spec.ts`).
- Аккуратно пропишет все 19 команд в `package.json` (`check:hygiene`, `check:memo`, `check:circular`, `check:dead-code`, `check:schema-drift`, `build:analyze`, `harness:worktree`, `test:flaky`, `test:silent`, `test:mutate`, `check:security:snyk`, `verify:remote`, `harness:rollback`, `prepare`, `lint-staged`).
- Создаст или обновит `AGENTS.md` правилами 5-этапного цикла и политикой On-Demand.

### Следующий шаг: Установка зависимостей верификации
```bash
npm i -D husky lint-staged knip dpdm eslint-plugin-sonarjs eslint-plugin-promise rollup-plugin-visualizer @stryker-mutator/core @stryker-mutator/vitest-runner snyk react-scan
npm run prepare
```

### Промпт для ИИ-агента
Скопируйте текст из [AGENT_BOOTSTRAP_PROMPT.md](./AGENT_BOOTSTRAP_PROMPT.md) и отправьте вашему агенту.

---

## 🏛️ 8 Эшелонов Обороны (8 Pillars of AI Yak Harness)

```
[Эшелон 1: Prompt & Roles]      ──► AGENTS.md, 5-этапный цикл, Adversarial Critic Gate (7 фильтров)
         │
[Эшелон 2: AST, Types & Sonar]  ──► noUncheckedIndexedAccess, tsconfig.test.json, ESLint AST (No Emoji, FSD, SonarJS, Promise)
         │
[Эшелон 3: Pre-Commit & Drift]  ──► Anti-Tampering, Dependency Freeze, Diff Budget, Secrets, Hygiene, Memoization, Schema Drift
         │
[Эшелон 4: Hermetic Tests & VM] ──► Hermetic Tests (UTC, Zero Unmocked Network), Flaky Hunter, Silent Reporter
         │
[Эшелон 5: E2E Leak & Visual]   ──► Playwright Heap Profiler (<40MB delta), Visual Layout Stability (<5% diff)
         │
[Эшелон 6: Remote CI Gate]      ──► GitHub Actions: полный прогон на чистой виртуальной машине
         │
[Эшелон 7: Sandbox Isolation]   ──► Ephemeral Git Worktree Manager (scripts/harness-worktree.mjs)
         │
[Эшелон 8: On-Demand Deep QA]   ──► Stryker Mutation CLI & Snyk Security Scanner (строго On-Demand)
```

---

## ⚠️ Политика On-Demand для Stryker CLI и Snyk

> **ЖЕСТКОЕ ПРАВИЛО:**
> 1. Инструменты мутационного тестирования (`npm run test:mutate` / Stryker CLI) и сканирования уязвимостей (`npm run check:security:snyk` / Snyk) **СТРОГО ЗАПРЕЩЕНО** запускать автоматически в pre-commit, `npm run check`, `npm run build` или при общих командах разработчика («давай», «делай», «погнали»).
> 2. Агент **только напоминает** разработчику, что при необходимости глубокой проверки он может запустить Stryker CLI или Snyk.
> 3. Запуск инициируется **ТОЛЬКО** по прямой однозначной команде:
>    - «запусти Stryker CLI» (или «запусти мутационные тесты»)
>    - «запусти Snyk» (или «запусти проверку Snyk»)

> [!NOTE]
> **Практические нюансы On-Demand инструментов:**
> - **Snyk:** Для первого запуска сканирования требуется один раз привязать бесплатный аккаунт через консоль: `npx snyk auth`.
> - **Stryker:** В файле `stryker.config.mjs` массив `mutate` рекомендуется настраивать точечно на ключевые файлы критической бизнес-логики (математика, биллинг, криптография), чтобы избежать получасовых мутационных прогонов по второстепенным UI-компонентам.

---

## 📦 Каталог Инструментов Харнесса

### 1. Скрипты Верификации (`scripts/`)

| Скрипт | Назначение | Как обойти человеку |
| :--- | :--- | :--- |
| `verify-no-test-tampering.mjs` | Блокирует изменение существующих тестов, ослабление `package.json` и самовольное добавление `dependencies` (Dependency Freeze Gate) | `ALLOW_TEST_MUTATION=true` / `ALLOW_DEP_MUTATION=true` |
| `verify-diff-budget.mjs` | Ограничивает дифф до 450 строк и 10 файлов за коммит | `ALLOW_LARGE_DIFF=true` |
| `verify-no-secrets.mjs` | Сканирует коммит на Supabase Service Keys, AWS/R2 ключи, приватные токены | Удалить секрет из диффа |
| `verify-resource-hygiene.mjs` | Ищет утечки памяти (`createObjectURL` без `revoke`, `addEventListener`, таймеры) | `// @resource-hygiene-ignore: <причина>` |
| `verify-memoization.mjs` | Контролирует `React.memo` на всех карточках и строках списков | `// @memo-gate-ignore: <причина>` |
| `verify-no-circular.mjs` | Предотвращает циклические импорты и `undefined` при старте | `ALLOW_CIRCULAR=true` |
| `verify-schema-drift.mjs` | Предотвращает несанкционированный дрейф контрактов БД и RPC типов | `ALLOW_SCHEMA_MUTATION=true` |
| `harness-worktree.mjs` | Управляет изолированными песочницами агентов через ephemeral `git worktree` | — |
| `test-flaky.mjs` | Стресс-раннер: прогоняет тесты 3+ раза подряд для отлова race conditions | — |
| `silent-reporter.mjs` | Репортер для Vitest: 1 строка при успехе, подробный стек при сбое (защита контекста LLM) | — |
| `verify-remote-ci.mjs` | Опрашивает GitHub API / CLI и валидирует удаленный CI Quality Gate | — |
| `harness-rollback.mjs` | Безопасный откат рабочего дерева в Git Stash с временной меткой при тупике агента | — |
| `pre-push.sh` | Ступенчатый шелл-гейт перед отправкой ветки на удаленный сервер | — |

### 2. Конфигурации и Контракты (`configs/`)

| Файл | Назначение |
| :--- | :--- |
| `knip.json` | Детектор мертвого кода, неиспользуемых экспортов и типов (устраняет Context Rot) |
| `tsconfig.test.json` | Включает файлы тестов в строгую проверку типов (`tsc -b`) |
| `stryker.config.mjs` | Конфигурация мутационного тестирования Stryker с Vitest runner (On-Demand) |
| `eslint.config.harness.js` | AST-правила: запрет сырых эмодзи в JSX, FSD Layer Boundaries, лимит 500 строк, SonarJS (дубликаты условий/веток), Promise правила |
| `vite.config.snippet.ts` | Готовый сниппет подключения `rollup-plugin-visualizer` (Pillar 3) |
| `react-scan.snippet.ts` | Готовый сниппет подключения визуального профайлера `react-scan` в DEV режиме (Pillar 8) |
| `playwright.config.snippet.ts`| Готовый сниппет настройки Playwright для тестов утечек памяти и визуальной регрессии |
| `vitest.config.snippet.ts` | Готовый сниппет настройки герметичной среды Vitest (UTC, setupFiles) |

### 3. Герметичное Тестирование и E2E Спецификации (`test/` и `e2e/`)

| Файл | Назначение |
| :--- | :--- |
| `test/setup.ts` | Герметичная тестовая среда: фиксация `process.env.TZ = 'UTC'`, Zero Unmocked Network Gate |
| `test/fixtures/deterministicFixtureFactory.ts` | Фабрика моковых данных на базе детерминированного 32-битного PRNG Mulberry32 |
| `test/examples/adrArchitecturalInvariants.test.ts` | Шаблон тестов архитектурных инвариантов (ADR-as-Code) |
| `test/examples/semanticContractFreeze.test.ts` | Шаблон фиксации структуры интерфейсов и RPC через `expectTypeOf` |
| `test/examples/mutationTesting.test.ts` | Шаблон синтетического мутационного тестирования (отстрел "тестов-иллюзий") |
| `e2e/07-memory-leak-hygiene.spec.ts` | E2E Playwright тест: контроль утечек JS Heap через CDP (`HeapProfiler.collectGarbage`) |
| `e2e/08-visual-regression.spec.ts` | E2E Playwright тест: визуальная регрессия и контроль геометрии Layout |

### 4. Роли и Скиллы Агента (`skills/`)

| Файл | Назначение |
| :--- | :--- |
| `skills/adversarial-critic/SKILL.md` | Роль «Сомневающийся Агент / Адвокат Дьявола»: 7 фильтров допроса плана (Offline/State Integrity, Physical/Domain Invariants, Diff Budget, Type Safety, Race Conditions, Anti-Tampering, UI/Icon Compliance). Код строго заблокирован до вердикта `APPROVED`. |

### 5. Безопасность (`utils/`)

| Файл | Назначение |
| :--- | :--- |
| `utils/security.ts` | Защитные функции на базе DOMPurify: `sanitizeSvg` (защита от Stored XSS через SVG), `sanitizeHtml`, `isSafeUrl` (блокировка executable protocols `javascript:`, `vbscript:`, data-HTML payloads). |

---

## 📜 Условия Лицензии (License Terms)

Проект распространяется под лицензией **[Yak Free Commercial & Non-Standalone Resale License (YAK-FCU-1.0)](./LICENSE)**:

1. **100% Бесплатно для любых проектов (включая коммерческие):**  
   Вы имеете полное право свободно и бесплатно использовать, модифицировать и интегрировать этот харнесс в любые личные и коммерческие приложения, закрытые корпоративные базы данных, SaaS-платформы и клиентские системы. Никаких роялти, скрытых платежей или требований открывать ваш закрытый код.
2. **Строгий запрет продажи отдельным продуктом (No Standalone Resale):**  
   Категорически запрещено продавать, перепродавать, сублицензировать или монетизировать данный харнесс (или его производные) как самостоятельный коммерческий продукт, платный boilerplate/шаблон, платный курс или отдельную платную услугу, где главным объектом продажи является сам харнесс.

---

## ❤️ Монетизация доброй воли (Goodwill Support)

Этот инженерный харнесс распространяется бесплатно, чтобы разработчики могли создавать надёжные, защищённые от регрессий и автономные ИИ-пайплайны без бюрократии.

Если `ai-yak-harness` сберёг вашей команде десятки часов отладки, помог поймать критические утечки памяти или ускорил запуск вашего продукта — вы можете поддержать развитие проекта:

* ⭐ **Поставьте звезду репозиторию** на GitHub (помогает алгоритмам и сообществу)
* ☕ **[Поддержать на GitHub Sponsors](https://github.com/sponsors/borissmiyan)** — любая сумма на кофе или регулярная поддержка
* 📢 **Расскажите о проекте** в X (Twitter), LinkedIn или профильных сообществах
* 💼 **Архитектурный консалтинг и внедрение:** обратная связь через `primeapps.info@gmail.com`
