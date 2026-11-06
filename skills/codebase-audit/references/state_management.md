# State Management Audit Reference (Zustand + Jotai)

## Table of Contents

1. [Selector Granularity](#1-selector-granularity)
2. [Store Bloat](#2-store-bloat)
3. [Async in Stores](#3-async-in-stores)
4. [Re-render Cascades](#4-re-render-cascades)
5. [State Duplication](#5-state-duplication)
6. [Derived State Flags](#6-derived-state-flags)
7. [Listener Leaks](#7-listener-leaks)
8. [React Context Anti-Patterns](#8-react-context-anti-patterns)
9. [Local State for Global Modals](#9-local-state-for-global-modals)
10. [Direct State Mutation](#10-direct-state-mutation)
11. [Form State Overuse](#11-form-state-overuse)

---

## 1. Selector Granularity

### Constraint

Every `useStore()` call MUST use a selector. Subscribing to the entire store triggers re-renders on EVERY state change within that store.

### Bad

```tsx
// ❌ Subscribes to ALL state changes — every unrelated field update triggers re-render
const { user } = useAuthStore();
```

### Good

```tsx
// ✅ Only re-renders when `user` specifically changes
const user = useAuthStore((s) => s.user);
```

### Self-Correction Rule

If you see `useXxxStore()` without a selector arrow function, flag it as **CRITICAL**. If destructuring from the full store, flag as **CRITICAL**.

---

## 2. Store Bloat

### Constraint

A single store should NOT exceed ~10 state fields + ~8 actions. If it does, split by domain to maintain readability and performance.

### Bad

```tsx
// ❌ Monolithic store with too many unrelated fields
create<AppState>((set, get) => ({
  user, theme, notifications, settings, billing,
  isSidebarOpen, isModalOpen, isLoading, error,
  login, logout, toggleSidebar, updateSettings, fetchBilling...
}));
```

### Good

```tsx
// ✅ Focused stores split by responsibility
// authStore — user, session, login/logout
// uiStore — sidebar, modals, theme
// dataStore — specific domain entities and loaders
```

### Self-Correction Rule

Count the fields in every `create<>()` call. If total > 18 (state + actions), recommend splitting the store.

---

## 3. Async in Stores

### Constraint

Async actions inside stores MUST:

1. Handle errors with try/catch (no unhandled promises).
2. Always reset loading state in `finally`.
3. Never swallow errors silently — at minimum log them and update an error state field.

### Good

```tsx
fetchData: async () => {
  set({ isLoading: true, error: null });
  try {
    const data = await api.getData();
    set({ data });
  } catch (e: unknown) {
    set({ error: e instanceof Error ? e.message : 'Unknown error' });
  } finally {
    set({ isLoading: false });
  }
}
```

---

## 4. Re-render Cascades

### Constraint

Derived/computed values MUST NOT be stored in the state if they can be computed from existing state. Use selectors with `useMemo` or shallow equality checks.

### Bad

```tsx
// ❌ Storing computed value in state — stale risk + extra re-renders
const store = create((set) => ({
  items: [],
  totalCount: 0, // ← derived from items.length
  addItem: (item) => set((s) => ({
    items: [...s.items, item],
    totalCount: s.items.length + 1,
  })),
}));
```

### Good

```tsx
// ✅ Compute inline via selector
const totalCount = useStore((s) => s.items.length);
```

---

## 5. State Duplication

### Constraint

The same piece of data MUST NOT exist in both a global store and a persisted local database (like IndexedDB) simultaneously as a source of truth. Pick ONE as the primary source.

---

## 6. Derived State Flags

### Constraint

Store only the **single source of truth** (e.g., `user: User | null`). All derivable values (`isLoggedIn`, `isAdmin`) MUST be selectors or derived properties, NOT separate stored fields.

### Bad

```tsx
// ❌ Derived flags lead to desync when the source updates but the flag doesn't
create<AuthState>((set) => ({
  user: null,
  isLoggedIn: false, // ← derived
  setUser: (user) => set({ user, isLoggedIn: !!user }),
}));
```

### Good

```tsx
// ✅ Derive everything via selectors
const isLoggedIn = useAuthStore((s) => s.user !== null);
```

### Self-Correction Rule

In any store `create()`, if a field can be computed from another field in the same store → **CRITICAL: Derived State Flag**.

---

## 7. Listener Leaks

### Constraint

External subscriptions (e.g., Auth listeners, WebSocket events) established within a store MUST provide a cleanup mechanism.

### Self-Correction Rule

If a subscription is opened but no `unsubscribe` or `cleanup` method exists to terminate it → **CRITICAL: Listener Leak**.

---

## 8. React Context Anti-Patterns

### Constraint

Since a global state manager is available, React Context should be kept to an absolute minimum (e.g., for local scoping or Dependency Injection). Never use it for high-frequency updates without memoization.

### Self-Correction Rule

If a `<Provider value={{...}}>` uses an inline object instead of a `useMemo` reference → **CRITICAL: Provider Re-render Cascade**.

### Self-Correction Rule (Consumer Side)

A separate, more common failure: a Context whose value object bundles many
unrelated fields (e.g. `useAppData()` returning `{ user, transactions,
settings, notifications, ... }`) forces every consumer to re-render on ANY
field change, since Context has no built-in per-field selector like
Zustand's `useStore(s => s.field)`.

If a component calls a Context hook and destructures only 1-2 fields from a
value object that has 4+ fields → **WARNING: Missing Context Selector
Split** (recommend splitting into multiple Contexts by update-frequency, or
migrating high-frequency fields to the existing Zustand/Jotai store).

---

## 9. Local State for Global Modals

### Constraint

Do not use local `useState` for controlling modals that should be part of the global UI stack. Use a global modal manager to ensure correct z-index stacking and visibility management.

### Self-Correction Rule

If `useState` is used for modal visibility in a feature component instead of a global store → **WARNING: Local Modal State**.

---

## 10. Direct State Mutation

### Constraint

NEVER mutate state objects directly. Always replace the object or use immutable updates.

### Bad

```tsx
// ❌ Direct mutation circumvents React reactivity
updateUser: (name) => set((state) => {
  state.user.name = name; 
  return state;
})
```

---

## 11. Form State Overuse

### Constraint

Avoid multiple individual `useState` hooks for complex forms. Use a dedicated form library (like `react-hook-form` + `zod`) to manage validation and reduce re-renders.

### Self-Correction Rule

If a form component contains > 3 `useState` hooks for simple input binding → **WARNING: Form State Overuse**.
