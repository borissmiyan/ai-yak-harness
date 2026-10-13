# 🗄️ Database & Schema Rules (`src/db/` or `supabase/`)

> **Domain:** Local databases (Dexie/IndexedDB, SQLite), remote schemas, migrations, and RLS policies.

---

## 🎯 Architectural Principles

1. **Immutable Migrations**:
   - Never mutate already deployed migration files. Always create a new versioned migration.
   - Verify migrations via `npm run check:schema-drift` or dry-run scripts.

2. **Row Level Security (RLS) & Isolation**:
   - Every table must have RLS enabled if using Supabase/PostgreSQL.
   - Tenant isolation must be strictly enforced on insert, select, update, and delete.

3. **Deterministic Indexes**:
   - All columns used in `.where()`, `.order()`, or foreign key joins must have explicit indexes.
