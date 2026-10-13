# Code Principles Audit Reference (YAGNI, DRY, WET, KISS)

## Table of Contents

1. [YAGNI — You Ain't Gonna Need It](#yagni)
2. [DRY — Don't Repeat Yourself](#dry)
3. [WET — Write Everything Twice (Rule of Three)](#wet)
4. [KISS — Keep It Simple, Stupid](#kiss)
5. [Single Responsibility & File Size](#5-single-responsibility--file-size)
6. [Environment Consistency](#6-environment-consistency)
7. [File Structure & Naming](#file-structure)
8. [Dead Code Detection](#dead-code-detection)

---

## ⚠️ Read This First: DRY and WET Can Conflict on the Same Code

The DRY section below says "3+ occurrences → extract." The WET section says
"extracting composition-level logic (not primitives) creates a Tight-Coupling
Trap." Applied mechanically in isolation, these can tell you to do opposite
things to the same block of code. **When they conflict, WET wins:**

- If the repeated block is a **primitive** (formatCurrency, formatDate, a
  single pure calculation) → DRY applies, extract it.
- If the repeated block is a **composition** — it would need >3 parameters,
  internal `if (type === ...)` branching to handle different callers, or
  merges two different business/UI contexts (e.g. Mobile vs Desktop layout)
  → WET applies even at 3+ occurrences. Do not extract; flag the duplication
  as *acceptable* and note why in the audit report, rather than "fixing" it
  into a God function.

When in doubt, ask: "if one caller's requirement changes next month, does
extracting this make that change easier or harder?" If harder → WET wins.

---

## YAGNI

### Constraint

Code MUST NOT contain features, parameters, abstractions, or configurations that are not currently used. "Future-proofing" without a concrete requirement is waste.

### Red Flags

1. **Unused function parameters** — functions accepting args they never read
2. **Config-driven over-abstraction** — a `type` field that only has one value
3. **Empty interface extensions** — `interface Foo extends Bar {}` with no additions
4. **Commented-out code blocks** — "might need later" = YAGNI violation
5. **Premature abstractions** — a `BaseService` class used by only one service

### Bad

```tsx
// ❌ config object with unused options
interface TransactionCardProps {
  tx: Transaction;
  showAvatar?: boolean;   // Never set to true anywhere
  enableSwipe?: boolean;  // Always false in all usages
  renderMode?: 'compact' | 'detailed' | 'minimal'; // Only 'compact' is ever used
}
```

### Good

```tsx
// ✅ Only what's actually used
interface TransactionCardProps {
  tx: Transaction;
}
// Add showAvatar, enableSwipe etc. ONLY when a real feature requires them
```

### Self-Correction Rule

For each interface/type: search the codebase for every field usage. If a field is defined but never read/set → **WARNING — YAGNI**. If > 3 unused fields → **CRITICAL**.

---

## DRY

### Constraint

Logic that appears in 3+ places MUST be extracted into a shared utility, hook, or component — **provided it's a primitive, not a composition; see the conflict note at the top of this file before applying this rule.**

### Common DRY Violations

#### 1. Object Construction Duplication

Identical object literals or mapping logic repeated across multiple functions/files.

#### 2. Duplicate API Query Patterns

Identical query structures (e.g., specific `.select().eq().single()`) repeated in multiple services instead of using a shared helper or generic base.

#### 3. Error Handling Boilerplate

Identical try/catch/finally blocks repeated across many actions or components.

### Self-Correction Rule

Search for identical multi-line blocks (3+ lines, 3+ occurrences). If found,
**first classify it as primitive or composition** (see conflict note above).
Primitive → **WARNING — DRY violation**, extract it. Composition → do NOT
flag as a DRY violation; evaluate under WET instead.

### ⚠️ Tight-Coupling DRY Trap

Extracting shared code creates coupling. If one consumer needs a special case, the shared function grows `if` branches → spaghetti. **Rule:** share PRIMITIVES (formatCurrency, formatDate), not COMPOSITIONS (formatEntityDisplay with 5 params and type-branching). See `references/ai_slop_patterns.md` → Tight-Coupling DRY Trap.

### ⚠️ UI Context DRY Trap (Mobile vs Desktop)

**Never use DRY to merge Mobile and Desktop visual layouts.**
AI often tries to merge `<MobileTransactionForm />` (Bottom Sheet) and `<DesktopTransactionForm />` (Centered Modal) into a single `<TransactionForm />` filled with `if (isMobile)` ternaries.

- **Fix (WET):** Business logic (Zustand, validation) stays DRY. Visual components must be rigidly separated. A little duplicated JSX is better than a component that handles two completely different layout paradigms.

---

## WET

### Constraint (Rule of Three)

Do NOT extract shared code UNTIL you see the pattern 3 times **and** the pattern is a primitive, not a composition — a 3rd occurrence of a composition-level pattern is still WET territory, not a DRY trigger. Two occurrences = acceptable duplication regardless. Premature abstraction creates coupling that's harder to change than duplication.

### Bad — Premature Abstraction

```tsx
// ❌ Premature abstraction — only used in 2 places
const useEntityLoader = <T>(table: string, id: string): T => {
  // Generic loader that's harder to customize than two specific hooks
};
```

### Good — Conscious WET

```tsx
// ✅ Two similar-but-different hooks — acceptable until a third emerges
const useTransaction = (id: string) => useLiveQuery(() => db.transactions.get(id));
const useAccount = (id: string) => useLiveQuery(() => db.accounts.get(id));
// Only extract a generic wrapper when a 3rd entity needs it
```

### Bad — God Login Function (Blind DRY)

```tsx
// ❌ Single function handling completely different auth contexts — if Telegram changes API,
// you touch this function and risk breaking email login
login: async (method: 'telegram' | 'email', payload: unknown) => {
  if (method === 'telegram') { /* 20 lines TMA logic */ }
  else if (method === 'email') { /* 15 lines Supabase email logic */ }
}
```

### Good — Decoupled Auth (Conscious WET)

```tsx
// ✅ Separate functions per business context — isolated, independently evolvable
loginViaTelegram: async (initData: string) => { /* TMA-specific flow */ },
loginViaEmail: async (email: string, password: string) => { /* Supabase email flow */ },
```

### Advanced WET: The Adapter Pattern for Execution Contexts

When handling TMA vs Web vs Electron, a single "God Function" (`useShare()`) filled with `if (isTMA) ... else if (isElectron)` violates KISS and makes the code fragile.
Instead, use the **Adapter Pattern**:

1. Create a strict interface (KISS): `interface IHapticService { success(): void }`
2. Create separate implementations (WET): `TelegramHaptic` and `BrowserHaptic`
3. Expose them through a single Factory: `export const haptic = createHapticService()`
4. **Result:** React UI components NEVER contain `if (isTMA)` checks. They just call `haptic.success()`.

### Self-Correction Rule

- If a "helper" or "utility" is used in only 1-2 places → **WARNING — premature abstraction**. Exception: complex logic (>15 lines).

- If a store action uses `if (method/provider === ...)` branching for different business contexts → **WARNING — God function**. Split into separate actions. See `references/state_management.md` → God Login Functions.
- If a UI component contains `if (window.Telegram?.WebApp)` or `isDesktop ? <A> : <B>` layout switching → **WARNING — Platform Coupling**. Use an Adapter (for logic) or separate components (for UI).
- **If this WET rule and the DRY rule above both fire on the same block, log only the WET finding.** Do not report the same code as both a DRY violation to fix and a WET pattern to preserve — that's a contradictory instruction to whoever reads the report.

---

## KISS

### Constraint

Prefer the simplest solution that works. Over-engineering signals:

1. **Deep inheritance chains** — more than 2 levels
2. **God components** — files > 500 lines (per workspace rule)
3. **Multiple state sources** — a component reading from Zustand, Jotai, Context, AND props
4. **Nested ternaries** — more than 2 levels deep
5. **String-based type discrimination** — using string checks instead of TypeScript discriminated unions
6. **Derived state flags in Zustand** — storing `isLoggedIn`, `isAdmin` alongside `user` instead of computing via selectors

### Bad — Zustand Derived Flags

```tsx
// ❌ AI stores derived boolean alongside source — desync risk if ONE action forgets to update both
create((set) => ({
  user: null,
  isLoggedIn: false,     // ← ALWAYS derivable from user !== null
  isAdmin: false,        // ← ALWAYS derivable from user.role
}))
```

### Good — Zustand Selectors

```tsx
// ✅ Single source of truth + computed selectors
create((set) => ({ user: null }));
export const useIsAuthenticated = () => useAuthStore((s) => s.user !== null);
export const useIsAdmin = () => useAuthStore((s) => s.user?.role === 'admin');
```

### Bad — Nested Ternary

```tsx
// ❌ Nested ternary hell
return isLoading ? <Skeleton /> : error ? <ErrorScreen /> : !data ? <Empty /> : data.type === 'income' ? <Income /> : <Expense />;
```

### Good — Guard Clauses

```tsx
// ✅ Guard clauses (early returns)
if (isLoading) return <Skeleton />;
if (error) return <ErrorScreen />;
if (!data) return <Empty />;
return data.type === 'income' ? <Income /> : <Expense />;
```

### Self-Correction Rule

- If a component has > 3 conditional render paths in a single expression → **WARNING — KISS violation**.

- If a Zustand store field can be computed from another field in the same store → **CRITICAL — derived flag**.

---

## 5. Single Responsibility & File Size

### Constraint

Each file (Component, Hook, Utility) should have one primary responsibility. Large files are harder to test, audit, and maintain.

### Self-Correction Rule

If a file exceeds **500 lines** → **CRITICAL — SRP Violation**. Automatically recommend splitting logic into custom hooks, sub-components, or utilities.

---

## 6. Environment Consistency

### Constraint

Ensure consistent use of environment variable accessors based on the build tool (e.g., Vite vs Webpack). Mixing `process.env` and `import.meta.env` in the same project often leads to silent failures or build errors.

### Self-Correction Rule

If the project uses Vite, search for `process.env` → **CRITICAL — Bundler Conflict**. Use `import.meta.env` instead.

---

## File Structure

### Constraint (per workspace rules)

- `src/components/` — Presentational (dumb) components only

- `src/features/` — Smart components, business logic, API
- `src/core/` — Singletons, stores, constants
- `src/shared/` — Reusable hooks, UI atoms, providers

### Self-Correction Rule

1. If a file in `src/components/` imports from Supabase, Zustand, or makes API calls → **CRITICAL — business logic in dumb component**
2. If a file in `src/core/` renders JSX → **WARNING — UI in core layer**
3. If a feature imports directly from another feature → **WARNING — cross-feature coupling**

---

## Dead Code Detection

### Patterns to Search

1. **Unused exports** — functions/components exported but never imported elsewhere
2. **Legacy fields** — interface fields with comments like "Legacy", "deprecated", "old"
3. **Commented-out imports** — `// import { OldThing } from 'old-module'`
4. **TODO/FIXME/HACK comments** — not dead code, but track and report count

### Self-Correction Rule

If a grep for a function name returns ONLY its definition (no usages), flag as **WARNING — dead code**. Exception: exported from index/barrel files for external consumers. Prefer `ts-prune` (see Step 0.5 in SKILL.md) over a manual grep — it correctly handles barrel re-exports and dynamic imports that a grep count will false-positive on.

---

## Component Casing

### Constraint

All React component files must uniformly use **PascalCase** (e.g., `UserProfile.tsx`). Kebab-case (`user-profile.ts`) can optionally be used for dumb utilities, but any file containing JSX or React bindings must be PascalCase.

### Self-Correction Rule

If you find a `.tsx` file that starts with a lowercase letter → **WARNING: Naming Convention Violation**.

---

## Domain Boundary Isolation

### Constraint

Features should be isolated and modular. A feature should never import components or local logic directly from another sibling feature (e.g., `features/budget` importing from `features/analytics`). Any shared logic must be hoisted to `shared/` or `core/`.

### Self-Correction Rule

If a file in `src/features/X` imports from `../../features/Y` → **CRITICAL: Domain Boundary Leak**. Confirm with `madge --circular` (Step 0.5) whether this import is also part of an actual cycle — a one-way dependency between features is a smaller issue than a circular one, and the report should distinguish the two.

---

## Magic Numbers

### Constraint

Refrain from sprinkling hardcoded numbers in your business logic. Use constants or enums instead (e.g., instead of `status === 2`, use `status === TRANSACTION_STATUS.COMPLETED`).

### Self-Correction Rule

If there is an `if` statement or mapping condition comparing a variable against an unexplained number that isn't `0` or `1` → **WARNING: Magic Number / Readability Risk**.
