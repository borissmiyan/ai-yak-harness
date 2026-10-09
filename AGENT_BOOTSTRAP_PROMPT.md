# 📋 Prompt for AI Agents: Bootstrap AI Yak Harness

> **Инструкция для разработчика (Boris):**  
> Скопируйте текст в блоке ниже и отправьте вашему ИИ-ассистенту (Cursor Composer, Claude Code, Antigravity) в любом новом или существующем проекте.

---

```markdown
Привет! В этом проекте мы подключаем наш эталонный детерминированный защитный контур разработки — **AI Yak Harness**.

### 🌟 Центральный репозиторий и эталон:
- **Центральный репозиторий харнесса:** `/Users/borissmiyan/Work/AppDev/ai-yak-harness`
- **Живой эталон реализации (Golden Reference):** `/Users/borissmiyan/Work/AppDev/Father Work Database` (`johnklayton2001-arch/elconder_test_db`)

### 🎯 Твоя первичная задача:
1. Запусти скрипт автоматической установки харнесса:
   ```bash
   node /Users/borissmiyan/Work/AppDev/ai-yak-harness/setup.mjs .
   ```
2. Убедись, что установлены базовые инструменты верификации:
   ```bash
   npm i -D husky lint-staged knip dpdm eslint-plugin-sonarjs eslint-plugin-promise rollup-plugin-visualizer @stryker-mutator/core @stryker-mutator/vitest-runner snyk react-scan
   npm run prepare
   ```
3. Проверь и интегрируй правила из `rules/AGENTS_HARNESS_SNIPPET.md` в наш локальный файл `AGENTS.md` (или `.cursorrules` / `CLAUDE.md`).
4. Подключи правила линтера из `configs/eslint.config.harness.js` в `eslint.config.js`.
5. Запусти тестовую проверку всех защитных гейтов:
   ```bash
   node scripts/verify-diff-budget.mjs
   node scripts/verify-no-secrets.mjs
   node scripts/verify-no-circular.mjs
   node scripts/verify-resource-hygiene.mjs
   node scripts/verify-memoization.mjs
   node scripts/verify-schema-drift.mjs
   npm run check
   ```

### 🛑 Твои жесткие правила работы (Hard Constraints):
1. **MANDATORY VERIFICATION DISCIPLINE:**
   - Перед сдачей задачи ОБЯЗАТЕЛЬНО: `npm run check` (типы + линтер + тесты) и `npm run build` с 0 ошибок.
   - После `git push`: запусти `npm run verify:remote` (или пуш через `npm run push:verify`) и подтверди код выхода 0 удаленного CI Quality Gate.
2. **ANTI-TEST TAMPERING & DEPENDENCY FREEZE:**
   - Никогда не модифицируй существующие тесты для подгонки под сломанный код.
   - Никогда самовольно не добавляй пакеты в `dependencies` в `package.json` (защита от Package Hallucination).
   - Обход только разработчиком по флагам: `ALLOW_TEST_MUTATION=true` или `ALLOW_DEP_MUTATION=true`.
3. **SCOPE LOCK & DIFF BUDGET:**
   - Не более 450 строк изменений кода в `src/` и не более 10 файлов за коммит. Никакого непрошенного рефакторинга.
4. **RESOURCE HYGIENE & ZERO LEAKS:**
   - Все `createObjectURL` обязаны иметь `revokeObjectURL`.
   - Все слушатели событий `addEventListener` и таймеры обязаны очищаться в cleanup `useEffect`.
5. **COMPONENT MEMOIZATION:**
   - Все карточки и строки списков (`*Card`, `*Row`, `*Item`) обязаны быть обернуты в `React.memo`.
6. **HERMETIC & DETERMINISTIC TESTING:**
   - Окружение тестов строго в UTC (`process.env.TZ = 'UTC'`).
   - Любой незамоканный `fetch` блокируется как нарушение герметичности.
   - Фикстуры генерируются через детерминированный сид Mulberry32 PRNG.
7. **5-ЭТАПНЫЙ ЦИКЛ РАЗРАБОТКИ (ДЛЯ ВСЕХ ЗАДАЧ):**
   - 1. Research (сканирование архитектуры и типов)
   - 2. Plan & Spec (TDD-микрошаги, границы Scope, Non-Goals, Diff Budget < 450 строк)
   - 3. Adversarial Critic Gate (допрос плана адвокатом дьявола по 7 фильтрам из `.agents/skills/adversarial-critic/SKILL.md`). **Код СТРОГО ЗАБЛОКИРОВАН до вердикта `APPROVED`**.
   - 4. TDD Execution (Red-Green-Refactor под контролем pre-commit хуков)
   - 5. Deterministic Verification (`npm run check` + `npm run build` + `npm run verify:remote`).
8. **STRYKER & SNYK ON-DEMAND POLICY:**
   - Никогда не запускай `npm run test:mutate` (Stryker) или `npm run check:security:snyk` (Snyk) автоматически.
   - Напоминай разработчику об их доступности. Запуск разрешен ТОЛЬКО по прямой явной команде: «запусти Stryker CLI» или «запусти Snyk».

Подтверди готовность и покажи результат выполнения скрипта установки.
```
