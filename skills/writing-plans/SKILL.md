---
name: writing-plans
description: "Use when you have a spec or requirements for a multi-step task, before touching code. Produces bite-sized TDD plans with Diff Budget and Adversarial Audit Gate."
---

# 📋 Writing Implementation Plans (Harness-Standard)

## Обзор

Этот скилл предназначен для составления исчерпывающих, пошаговых планов реализации (Implementation Plans).  
Каждый шаг должен быть атомарным (2–5 минут работы) и строго следовать дисциплине **TDD (Red-Green-Refactor)**, принципам **DRY/YAGNI** и жестким ограничениям нашего AI-харнесса (**Scope Lock** и **Diff Budget < 450 строк**).

> **Обязательное объявление при старте:**  
> «Я использую скилл writing-plans для составления плана реализации».

Планы сохраняются в: `docs/plans/YYYY-MM-DD-<feature-name>.md` (или `implementation_plan.md` в корне при быстрых задачах).

---

## Обязательная шапка плана (Plan Header)

Каждый план **ОБЯЗАН** начинаться со следующей структуры:

```markdown
# [Название Фичи / Задачи] — Implementation Plan

> **Статус:** [DRAFT | UNDER_AUDIT | APPROVED]  
> **Стек:** React 18, TypeScript 5.9, Vite 7, Vitest, Dexie.js, Supabase, Tailwind CSS v4  
> **Связанные ADR:** [ADR D-XX](file:///Users/borissmiyan/Work/AppDev/Father%20Work%20Database/.planning/decisions/D-XX.md)  
> **Оценка Diff Budget:** ~XXX строк кода, Y файлов (Лимит: 450 строк / 10 файлов)  

### Цель и Архитектура
* **Цель:** [Одно емкое предложение о том, какую проблему решаем]
* **Архитектурный подход:** [2-3 предложения о потоках данных, таблицах Dexie/Supabase и хуках]

### Границы задачи (Scope Lock & Non-Goals)
* ✅ **Входит в скоуп:** [Четкий список того, что реализуем]
* 🛑 **НЕ входит (Non-Goals):** [Что сознательно НЕ трогаем и не рефакторим]
```

---

## Обязательный шлюз: Состязательный аудит (Adversarial Audit Gate)

Перед тем как приступить к написанию кода по плану, план **ОБЯЗАН** пройти состязательный аудит по протоколу [`.agents/skills/adversarial-critic/SKILL.md`](file:///Users/borissmiyan/Work/AppDev/Father%20Work%20Database/.agents/skills/adversarial-critic/SKILL.md).

В документе плана обязательно фиксируется блок аудита:

```markdown
## 🕵️ Adversarial Critic Audit Gate

- [ ] Фильтр 1 (Offline & Dexie Integrity): проверен
- [ ] Фильтр 2 (Physical & Mathematical Invariants): проверен
- [ ] Фильтр 3 (Diff Budget < 450 lines / 10 files): проверен
- [ ] Фильтр 4 (Type Safety & noUncheckedIndexedAccess): проверен
- [ ] Фильтр 5 (Race Conditions & Double-Clicks): проверен
- [ ] Фильтр 6 (Anti-Test Tampering): проверен
- [ ] Фильтр 7 (UI & Localization — no emojis, Slovak sk default): проверен

**Вердикт Сомневающегося Агента:** [APPROVED / REJECTED]  
*(Если REJECTED — перечисляются блокеры и план дорабатывается до получения APPROVED)*.
```

---

## Структура атомарной TDD-задачи (TypeScript / Vitest)

Каждая задача разбивается на микро-шаги по 2–5 минут:

```markdown
### Task N: [Название шага / Компонента]

**Файлы:**
* Создать: `src/features/reports/utils/exampleHelper.ts`
* Изменить: `src/types/reports.ts:45-60`
* Тест: `src/features/reports/utils/__tests__/exampleHelper.test.ts`

#### Шаг 1: Написать падающий тест (RED)
```typescript
import { describe, it, expect } from 'vitest';
import { calculateSomething } from '../exampleHelper';

describe('calculateSomething', () => {
  it('correctly handles zero and nullish inputs safely', () => {
    const result = calculateSomething(0, null);
    expect(result).toBe(0);
  });
});
```

#### Шаг 2: Запустить тест и убедиться, что он упал по правильной причине
Выполнить: `npx vitest run src/features/reports/utils/__tests__/exampleHelper.test.ts`  
Ожидается: FAIL (функция не экспортирована или возвращает ошибку).

#### Шаг 3: Написать минимальный чистый код (GREEN)
```typescript
export function calculateSomething(value: number, fallback: number | null): number {
  if (value === 0) return 0;
  return fallback ?? value;
}
```

#### Шаг 4: Запустить тест и убедиться, что он проходит
Выполнить: `npx vitest run src/features/reports/utils/__tests__/exampleHelper.test.ts`  
Ожидается: PASS (1 passed).

#### Шаг 5: Проверка бюджета и атомарный коммит
```bash
git add src/features/reports/utils/exampleHelper.ts src/features/reports/utils/__tests__/exampleHelper.test.ts
git commit -m "feat(reports): implement calculateSomething helper with nullish safety"
```
```

---

## Финальная приемка после выполнения всех задач плана

Когда все задачи реализованы, запускается **единая цепочка детерминированной верификации**:
1. `npm run check` (Typecheck + AST ESLint + 117+ Vitest тест-сьютов).
2. `npm run build` (Сборка чистого прод-бандла).
3. `graphify update .` (Актуализация AST графа знаний).

Только при 0 ошибок работа над планом считается завершенной.
