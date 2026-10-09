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

---

## 🛑 Non-Goals & Boundaries

- [List here features, platforms, or behaviors that are explicitly out of scope to prevent AI hallucinations and feature creep.]
