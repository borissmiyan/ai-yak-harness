# ⚡ AI Engineering Harness Rules (Universal Standard)

> **Golden Reference:** [Father Work Database](file:///Users/borissmiyan/Work/AppDev/Father%20Work%20Database) (`borissmiyan/ai-yak-harness`).  
> **Philosophy:** *«Промпт — рекомендация, Харнесс — детерминированный Hard Gate»*.

---

## 🛑 HARD CONSTRAINTS FOR AI AGENTS (Targeted & Deterministic)

1. **MANDATORY VERIFICATION DISCIPLINE:**
   Перед тем как заявить о выполнении задачи или предоставить финальный ответ пользователю, агент ОБЯЗАН выполнить и подтвердить с 0 ошибок:
   - `npm run check` (Строгая проверка типов `tsc`, правил линтера `eslint` и 100% прохождение всех тестов `vitest`).
   - `npm run build` (Чистая компиляция production-бандла).
   - **REMOTE CI GATE:** После `git push` агент обязан запустить `npm run verify:remote` (или пушить через `npm run push:verify`) и подтвердить код выхода 0 (`success`) удаленного CI Quality Gate. Завершать задачу без успешного удаленного CI запрещено.

2. **ANTI-TEST TAMPERING & DEPENDENCY FREEZE GATE:**
   - **СТРОГО ЗАПРЕЩЕНО** изменять существующие тесты (`*.test.*`, `*.spec.*`), чтобы заставить сломанный код пройти проверки. Тесты — неизменяемая истина.
   - **DEPENDENCY FREEZE:** Агентам запрещено самовольно добавлять или менять зависимости в `"dependencies"` во избежание галлюцинаций пакетов (Package Hallucination) и Supply Chain атак.
   - Любая модификация тестов без флага `ALLOW_TEST_MUTATION=true` или зависимостей без `ALLOW_DEP_MUTATION=true` блокируется pre-commit хуком и CI.

3. **SCOPE LOCK & DIFF BUDGET:**
   - Изменяйте **только** файлы, прямо требуемые задачей. Никакого непрошенного рефакторинга соседнего кода.
   - Ограничение на один коммит: не более **450 строк кода** и не более **10 файлов** (контролируется `scripts/verify-diff-budget.mjs`). Обход только по явному флагу человека `ALLOW_LARGE_DIFF=true`.

4. **RESOURCE HYGIENE & ZERO LEAKS:**
   - Все `URL.createObjectURL()` обязаны иметь парный `URL.revokeObjectURL()` в cleanup.
   - Все слушатели событий `addEventListener` в `useEffect` обязаны иметь cleanup `removeEventListener` или `AbortController`.
   - Все таймеры `setInterval` обязаны иметь `clearInterval`.
   - Проверяется гейтом `npm run check:hygiene` (`scripts/verify-resource-hygiene.mjs`).

5. **COMPONENT MEMOIZATION:**
   - Все компоненты списков и карточек (`*Card.tsx`, `*Row.tsx`, `*Item.tsx`) обязаны быть обернуты в `React.memo` для предотвращения каскадных ре-рендеров.
   - Проверяется гейтом `npm run check:memo` (`scripts/verify-memoization.mjs`).

6. **AST DESIGN SYSTEM & ARCHITECTURE RULES:**
   - **Запрет сырых эмодзи в JSX:** Не использовать символы (⚡, 📝, 🟢, 🛡️, etc.) в UI разметке. Использовать только векторные SVG-иконки из `lucide-react`.
   - **FSD Layer Boundaries:** Компоненты общих слоев (`shared/`, `features/`, `services/`, `db/`) никогда не должны импортировать страницы (`@/pages/**`) или `App`.
   - **Лимит 500 строк на файл:** Файлы не должны превышать 500 строк во избежание выпадения контекста LLM.

7. **HERMETIC & DETERMINISTIC TESTING:**
   - Все тесты обязаны быть офлайн-герметичными (`process.env.TZ = 'UTC'`).
   - Любой не замоканный сетевой вызов (`fetch`) блокируется с исключением `[Hermetic Test Violation]`.
   - Для генерации моковых данных используйте детерминированные фабрики с фиксированным сидом (`createPrng` / Mulberry32).

8. **ОБЯЗАТЕЛЬНЫЙ 5-ЭТАПНЫЙ ЦИКЛ РАЗРАБОТКИ (ВСЕГДА И ДЛЯ ВСЕХ ЗАДАЧ):**
   1. **Этап 1: Research (Исследователь):** Анализ AST-графа, типов, моделей БД и инвариантов перед написанием плана.
   2. **Этап 2: Plan & Spec (Проектировщик):** Формирование плана с TDD-микрошагами (2–5 мин), границами скоупа (Non-Goals) и оценкой Diff Budget (< 450 строк).
   3. **Этап 3: Adversarial Critic Gate (Сомневающийся Агент):** Допрос плана адвокатом дьявола по 7 фильтрам (`skills/adversarial-critic/SKILL.md`). **Код СТРОГО ЗАБЛОКИРОВАН до вердикта `APPROVED`**.
   4. **Этап 4: TDD Execution (Разработчик):** Реализация циклами Red-Green-Refactor под контролем pre-commit хуков и лимита диффа.
   5. **Этап 5: Deterministic Verification (Приемка):** Обязательное подтверждение `npm run check` и `npm run build` с 0 ошибок, а после `git push` — `npm run verify:remote` (код выхода 0).

9. **STRYKER MUTATION & SNYK SECURITY ON-DEMAND POLICY:**
   - **СТРОГИЙ ЗАПРЕТ АВТОЗАПУСКА:** Инструменты мутационного тестирования Stryker CLI (`npm run test:mutate`) и сканер безопасности Snyk (`npm run check:security:snyk`) СТРОГО ЗАПРЕЩЕНО запускать автоматически в pre-commit, `npm run check`, `npm run build` или при общих фразах («давай», «делай», «погнали»).
   - **ПРАВИЛО НАПОМИНАНИЯ (ON-DEMAND REMINDER):** Агент обязан лишь ненавязчиво напоминать разработчику (Борису), что при необходимости глубокой проверки он может запустить Stryker CLI или Snyk.
   - **ЯВНАЯ КОМАНДА ДЛЯ ЗАПУСКА:** Агент запускает `npm run test:mutate` ТОЛЬКО по прямой явной команде: «запусти Stryker CLI» (или «запусти мутационные тесты»). Агент запускает `npm run check:security:snyk` ТОЛЬКО по прямой явной команде: «запусти Snyk» (или «запусти проверку Snyk»).
