# AI-Slop Patterns Audit Reference

## Table of Contents

1. [JSON.stringify Comparisons](#1-jsonstringify-comparisons)
2. [Redundant useEffect for Derived State](#2-redundant-useeffect-for-derived-state)
3. [Copy-Paste State Construction](#3-copy-paste-state-construction)
4. [Over-Engineered Type Casts](#4-over-engineered-type-casts)
5. [Tight-Coupling DRY Trap](#5-tight-coupling-dry-trap)
6. [Redundant Null Checks & Guard Clauses](#6-redundant-null-checks--guard-clauses)
7. [AI Naming Smells](#7-ai-naming-smells)

---

## 1. JSON.stringify Comparisons

### Why It's Terrible

1. **Key-order dependent**: `{"a":1,"b":2}` ≠ `{"b":2,"a":1}` — falsely detects "changes".
2. **O(n) serialization on every call** — massive performance hit on large objects or low-end devices.
3. **No early exit** — serializes the ENTIRE object even if the first field differs.
4. **Breaks on specific types** — silent corruption with circular refs, Date, undefined, Infinity, NaN.

### Bad

```tsx
// ❌ AI-generated comparison using JSON.stringify
const currentStr = JSON.stringify(currentData);
const updatedStr = JSON.stringify(updatedData);
if (currentStr === updatedStr) return;
```

### Good

```tsx
// ✅ Field-level shallow comparison (fastest)
if (current.id === updated.id && current.val === updated.val) return;

// ✅ Deep equality library (if truly needed)
import isEqual from 'fast-deep-equal';
if (isEqual(currentData, updatedData)) return;
```

---

## 2. Redundant useEffect for Derived State

### Why It's Terrible

1. **Extra render cycle**: render → effect → setState → re-render.
2. **Race conditions**: effect runs asynchronously, derived value might be stale during first render.

### Bad

```tsx
// ❌ useEffect + useState for derived value
const [fullName, setFullName] = useState('');

useEffect(() => {
  setFullName(`${user.firstName} ${user.lastName}`);
}, [user.firstName, user.lastName]);
```

### Good

```tsx
// ✅ Compute inline during render
const fullName = `${user.firstName} ${user.lastName}`;
```

---

## 3. Copy-Paste State Construction

### Why It's Terrible

AI often duplicates complex object construction logic. A schema change then requires editing multiple files, risking silent bugs if one is missed.

### Self-Correction Rule

Search for identical object literal constructions (>5 fields). If the same construction appears 3+ times → **CRITICAL: Extract to a pure mapping function**.

---

## 4. Over-Engineered Type Casts

### Constraint

Avoid `as any` or `as unknown as T` to suppress compiler errors. Fix the underlying type mismatch or data structure instead.

### Self-Correction Rule

- `as unknown as` → **CRITICAL: Type Design Flaw**.
- `as any` → **CRITICAL: Safety Violation**.

---

## 5. Tight-Coupling DRY Trap

### Constraint

Do not extract shared code for components that have **different business contexts** or edge cases. Premature DRY leads to complex "God functions" with many conditional branches.

### Self-Correction Rule

If a shared utility has >3 parameters or internal `if (type === ...)` branching to handle different callers → **WARNING: Tight-Coupling DRY Trap**.

---

## 6. Redundant Null Checks & Guard Clauses

### Constraint

Avoid excessive null checks where a value is already guaranteed by the architecture (e.g., a route guard or parent component guarantees a user object exists).

### Self-Correction Rule

If the same null check is repeated multiple times in a nested tree where the value is already established → **WARNING: Redundant Guard**.

---

## 7. AI Naming Smells

### Patterns to Flag

1. Generic names: `data`, `result`, `item`, `response`, `value`.
2. Vague handlers: `handleClick` (use `submitForm`, `toggleSidebar`).
3. Meaningless `.map()` variables: `items.map(item => ...)` (use `items.map(tx => ...)`).

### Self-Correction Rule

If >5 variables in a file use generic "data/result/item" naming → **WARNING: AI Naming Smell**.
