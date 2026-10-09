# 🏷️ TypeScript Types & Models Rules (`src/types/`)

> **Domain:** Shared domain models, DTOs, database schemas, utility types, and API contracts.

---

## 🎯 Architectural Principles

1. **Strict Types & Zero `any`**:
   - Every interface must be explicitly typed.
   - Use union types for status states (e.g. `'idle' | 'loading' | 'success' | 'error'`).
   - Discriminated unions for multi-mode payloads.

2. **Single Source of Truth**:
   - Shared domain entities are defined here, not redefined in feature files.
   - Export both domain types and partial DTOs (e.g. `CreateProjectPayload`).

---

## 🚫 Forbidden Antipatterns

- ❌ `any` or `Record<string, any>` where concrete types exist.
- ❌ Duplicate interface declarations across feature folders.
- ❌ `@ts-ignore` without explicit ADR reference and comment explaining why.
