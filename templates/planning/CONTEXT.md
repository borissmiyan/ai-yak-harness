# Project Context & Architecture Index

> **Project Name:** [Your Project Name]  
> **Last Updated:** [YYYY-MM-DD]  
> **Status:** Active Development / Production-Grade

---

## 📌 Project Overview & Purpose

[Brief 2-3 paragraph summary of what the system does, who uses it, and the core problem it solves. Reference PURPOSE.md for product details.]

---

## 🏛 Architecture & Tech Stack

- **Frontend / Client:** React / Vite / TypeScript / Tailwind CSS
- **State Management:** Zustand / Jotai / Context
- **Persistence & Offline:** Dexie.js (IndexedDB) / LocalStorage / SQLite
- **Backend & DB:** Supabase PostgreSQL / Cloudflare Workers / Node.js
- **Testing & Verification:** Vitest / Playwright / ai-yak-harness
- **Design System:** Vector icons (Lucide React), design tokens in `DESIGN-AI.md`

---

## 🗄 Core Data Entities & Relations

```text
User / Organization (id, email, role, created_at)
   └── Projects / Workspaces (id, user_id, title, status)
          └── Resources / Items (id, project_id, payload, version)
```

---

## 📑 Architecture Decisions (ADR Index)

| ID | Title | Status | Date | Key Invariant / Outcome |
| :--- | :--- | :--- | :--- | :--- |
| [D-01](./decisions/D-01-initial-architecture.md) | Initial Architecture & Core Invariants | Accepted | 2026-10-09 | Strict typing, offline resilience, and zero unmocked network tests |
| [D-02](./decisions/D-02-security-antipatterns-gate.md) | Security Anti-Pattern & IDOR Pre-Commit Gate | Accepted | 2026-10-13 | UUID tokens on public links, safe RLS UPDATE triggers, safe RPCs |
| [D-03](./decisions/D-03-bot-reply-keyboards-doctrine.md) | Bot Reply Keyboards & Inline Callback Latency Doctrine | Accepted | 2026-10-14 | Docked Reply Keyboards for navigation, instant callback answer, zero token leaks |
| [D-04](./decisions/D-04-component-size-and-decomposition-doctrine.md) | Component Size, Hook Guard & Decomposition Doctrine | Accepted | 2026-10-15 | 150–250 lines gold standard, 300 warn, 500 error; hooks 150/250 lines |

---

## 🛑 Non-Goals & Boundaries

- [List here features, platforms, or behaviors that are explicitly out of scope to prevent AI hallucinations and feature creep.]
