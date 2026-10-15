# 🏛 Architectural Decision Records (ADR Index)

> **Стандарт:** AI Yak Harness Architecture Decisions  
> **Шаблон:** [TEMPLATE.md](./TEMPLATE.md)

---

## 📑 Реестр архитектурных решений

| ADR | Название | Статус | Дата | Область |
| :--- | :--- | :--- | :--- | :--- |
| **[D-01](./D-01-initial-architecture.md)** | Initial Architecture & Core Foundations | Accepted | 2026-10-10 | Ядро, слои и стек |
| **[D-02](./D-02-security-antipatterns-gate.md)** | Security Anti-Pattern & IDOR Pre-Commit Gate | Accepted | 2026-10-13 | RLS, криптографические UUID, безопасность |
| **[D-03](./D-03-bot-reply-keyboards-doctrine.md)** | Bot Reply Keyboards Doctrine & Golden Master | Accepted | 2026-10-14 | Telegram Bot UX, Keyboard вместо спама |
| **[D-04](./D-04-component-size-and-decomposition-doctrine.md)** | TSX/Hook Architecture, Size Budget & Decomposition | Accepted | 2026-10-15 | Золотой стандарт 150–250 строк, лимиты хуков, колокация стейта |

---

## 📝 Правила добавления новых ADR
1. Каждое ключевое архитектурное решение фиксируется по шаблону `TEMPLATE.md`.
2. Номер ADR строго инкрементален (`D-05`, `D-06`...).
3. Перед принятием решения агент обязан проверить существующие ADR, чтобы исключить коллизии и дублирование.
