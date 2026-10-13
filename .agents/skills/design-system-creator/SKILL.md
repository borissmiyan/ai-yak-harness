---
name: design-system-creator
description: "Architect, generate, validate, and maintain multi-platform design systems for AI agents. Features Pre-Flight Design Wizard (10+ aesthetic styles, TMA 96px header offset, navigation architectures, motion physics) and dual-tier hard gate verification via scripts/verify-design-system.mjs."
triggers:
  - "generate design system"
  - "create brandbook"
  - "sync design system"
  - "scan components"
  - "update design system"
  - "design wizard"
  - "pre-flight design"
  - "verify design system"
---

# 🎨 Design System Architect & Enforcement Engine

> **Axiom:** *«Промпт — рекомендация, Харнесс дизайн-системы — детерминированный Hard Gate»*.  
> **Philosophy:** До написания первой строчки кода интерфейс проектируется целиком. Код обязан на 100% подчиняться токенам, а любые отклонения блокируются pre-commit гейтом.

---

## ⚡ Core Artifacts Generated

1. **`PURPOSE.md`** — Продуктовая миссия, целевая аудитория, боли и метрики успеха.
2. **`DESIGN-AI.md`** — Машиночитаемые правила токенов, геометрии и ограничений для LLM.
3. **`DESIGN-HUMAN.md`** — Человекочитаемый визуальный брендбук для команды.
4. **`COMPONENTS.md`** — Плоский реестр компонентов (Flat Component Registry) против дублирования.
5. **`ANTIPATTERNS.md`** — База запрещённых UI-паттернов (❌ WRONG vs ✅ CORRECT).
6. **`scripts/verify-design-system.mjs`** — Автоматический валидатор соблюдения дизайн-системы в коде.

---

## 🧭 Phase 0 — Pre-Flight Design Wizard (Всегда перед началом кода)

Перед созданием экранов агент ОБЯЗАН провести интерактивное дизайн-интервью и зафиксировать ответы пользователя.

### Шаг 1: Определение платформы и экосистемы
- **Telegram Mini App (TMA):** Web внутри Telegram.
  - *Hard Invariant:* Если приложение использует `requestFullscreen()`, в корневой контейнер **ОБЯЗАТЕЛЬНО** закладывается отступ **96px** (`pt-[96px]` / `padding-top: 96px`), чтобы системные кнопки Telegram (закрыть, меню) не перекрывали контент.
  - Учёт `viewportStableHeight`, haptics (`Telegram.WebApp.HapticFeedback`).
- **Mobile Native / Cross-Platform:** React Native / Expo, Flutter / Dart. Учёт `SafeAreaView`, свайп-жестов.
- **Web & Desktop SaaS:** Tailwind CSS v4, Next.js / Vite, Electron / Tauri.

### Шаг 2: Каталог стилей (Колоссальный выбор 10+ направлений)

| # | Стиль | Характеристики и ДНК |
| :--- | :--- | :--- |
| 1 | **Neo-Brutalism** | Чёрные границы `border-2 border-black`, жёсткие тени `shadow-[4px_4px_0px_#000]`, кислотные акценты (жёлтый `#FFDE59`, фиолетовый), гротескные шрифты, нулевые скругления `rounded-none`. |
| 2 | **Minimalist Luxury (Linear/Vercel)** | Угольно-чёрный фон (`#09090b`), тончайшие микро-бордеры `border-white/10`, чистый whitespace, акцент точечный, шрифты Inter/Geist. |
| 3 | **Glassmorphism (visionOS)** | Многослойный блюр `backdrop-blur-xl bg-white/10 dark:bg-black/40`, полупрозрачные границы `border-white/20`, фоновые цветные свечения (Aurora glow). |
| 4 | **Material 3 Expressive (Google)** | Тональные палитры (Primary, Secondary, Surface), тактильные крупные радиусы `rounded-3xl` / `rounded-full`, плавающие кнопки и карточки. |
| 5 | **Apple HIG Fluid (iOS 18)** | Сглаженные углы (squircle / `rounded-2xl` 16-20px), адаптивные системные цвета light/dark, списки и тач-таргеты 44-56px. |
| 6 | **High-Tech Industrial / Cyberpunk** | Тёмный углепластик, неоновый бирюзовый/янтарный акцент, срезанные углы (`clip-path`), технические бейджи с `tabular-nums`. |
| 7 | **Neumorphism / Soft 3D** | Мягкие двунаправленные тени (свет сверху-слева, тень снизу-справа), объёмные выпуклые и вдавленные кнопки. |
| 8 | **Modern B2B Clean SaaS** | Нейтральный Zinc/Slate, компактные элементы 36-40px, чёткие таблицы с `tabular-nums`, контрастные бейджи статусов. |
| 9 | **Y2K / Retro OS 90s** | Пиксельная эстетика, рамки с фаской (3D bevel), серые окна в стиле Windows 95 / System 7. |
| 10 | **Custom Reference** | Пользователь указывает ссылку на референс (Raycast, Arc, Monobank) — извлекаем цветовую ДНК, тени и геометрию. |

### Шаг 3: Навигационная архитектура
- **TMA Bottom Nav (Tab Bar):** 3-5 иконок с тактильным откликом `pb-safe`.
- **Fixed Header + Drawer Sheet:** Лаконичная шапка + выезжающий `SpringSheet` снизу/сбоку.
- **Swipe Pager / Horizontal Flow:** Полноэкранный постраничный свайп без видимых кнопок меню.
- **Floating Island FAB:** Плавающая снизу таблетка-остров с ключевыми действиями.
- **Desktop Collapsible Sidebar:** Сворачиваемая левая панель (240px -> 64px) + breadcrumbs.

### Шаг 4: Геометрия элементов и тач-таргеты
- Минимальная высота интерактивных кнопок и инпутов: `48px` (desktop), `56-60px` (mobile/TMA).
- Скругления: строго по токенам (например, `rounded-2xl` для карточек, `rounded-xl` для инпутов).

### Шаг 5: Физика анимаций (Motion Engine)
- **Apple Fluid Spring:** `stiffness: 260, damping: 25, mass: 0.8` (плавное затухание).
- **Material 3 Expressive Spring:** `stiffness: 400, damping: 30, mass: 1` (быстрый, упругий отклик).
- **Аппаратный инвариант:** Анимировать разрешено **ТОЛЬКО** `transform` и `opacity` (120 FPS). Анимация `width`, `height`, `top`, `left`, `margin` строго заблокирована!

### Шаг 6: Типографика и числа
- **Tabular Numbers:** `tabular-nums` обязателен для всех списков чисел, цен, процентов, таймеров.
- **Запрет Monospace:** Шрифт `font-mono` строго запрещён для обычных данных и таблиц (только для блоков программного кода).

---

## 📑 Phase 1 — Генерация и Синхронизация Реестров

1. На основе ответов формируются файлы `PURPOSE.md`, `DESIGN-AI.md`, `COMPONENTS.md`, `ANTIPATTERNS.md`.
2. В `DESIGN-AI.md` в раздел **Quick Reference** выносятся самые жесткие правила:
   - Высота кнопок
   - Наличие отступа 96px для TMA
   - Выбранная шрифтовая пара
   - Токены радиусов и теней
3. В `COMPONENTS.md` создается стартовая таблица компонентов со статусами `stable`.

---

## 🛡️ Phase 2 — Двухуровневый Hard Gate Валидации

Соблюдение дизайн-системы проверяется автоматически:

### Уровень 1: ESLint AST Linter (в редакторе в реальном времени)
- Блокирует сырые эмодзи (⚡, 🛡️, 🟢) в JSX — требует векторные SVG из `lucide-react`.
- Блокирует `font-mono` в не-кодовых компонентах.
- Контролирует лимит в 500 строк на файл.

### Уровень 2: `scripts/verify-design-system.mjs` (Git Pre-Commit)
Запускается перед каждым коммитом (`node scripts/verify-design-system.mjs --staged`):
1. **Anti-Duplicate Check:** Если в `ui/` добавлен новый компонент, проверяет его наличие в `COMPONENTS.md`. Если компонент не зарегистрирован — `exit 1`.
2. **TMA 96px Safe Header Gate:** Если активен TMA Fullscreen, проверяет отступ `pt-[96px]` в корневом макете.
3. **Motion Hardware Acceleration Gate:** Блокирует layout thrashing при попытке анимировать `width`, `height`, `margin`, `padding`.
4. **Emoji in JSX Gate:** Проверяет все измененные JSX-файлы на отсутствие сырых эмодзи.

---

## 🔄 Phase 3 — Режим Обновления и Доработки (Update / Sync Mode)

Когда пользователь или агент дорабатывают дизайн-систему:

1. **Золотое правило:** *Никогда не удалять silently, только добавлять или объявлять `[DEPRECATED]`*.
2. При создании любого нового UI-компонента:
   - Шаг 1: Проверить `COMPONENTS.md` (если есть — переиспользовать).
   - Шаг 2: Создать компонент по токенам `DESIGN-AI.md`.
   - Шаг 3: Внести компонент в `COMPONENTS.md` со статусом `stable`.
3. Команда `sync design system`:
   - Запускает сканер кодовой базы `python scripts/scan_design_system.py`.
   - Находит новые или измененные компоненты и обновляет `COMPONENTS.md`.
   - Записывает изменения в Decision Log.

---

## 🛠️ CLI Инструменты Дизайн-Системы (`scripts/`)

| Скрипт | Команда | Назначение |
| :--- | :--- | :--- |
| `verify-design-system.mjs` | `npm run check:design` | Hard Gate валидация: проверка COMPONENTS.md, 96px шапки TMA, запрет layout thrashing, WCAG контраст. |
| `verify-design-system.mjs` | `npm run check:design:fix` | **Auto-Fixer:** автоматическая регистрация компонентов в COMPONENTS.md и замена сырых эмодзи на Lucide. |
| `export-design-tokens.mjs` | `npm run design:export-tokens -- --style <name>` | **Token-to-Code:** экспорт выбранного стиля в `src/index.css` (Tailwind v4 @theme) и `tokens.ts`. |
| `scaffold-ui-kit.mjs` | `npm run design:scaffold-ui` | **UI-Kit Scaffolder:** генерация 5 канонических примитивов (Button, Input, Badge, Card, SpringSheet) со всеми 6 состояниями. |
| `generate-design-showcase.mjs` | `npm run design:showcase` | **Instant Showcase:** генерация автономного интерактивного `design-showcase.html` для мгновенного превью в браузере. |
