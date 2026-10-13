# React Hooks Anti-Patterns

React Hooks are a common source of bugs, cascading re-renders, and memory leaks. These anti-patterns often stem from ignoring the strict lifecycle constraints of React components.

## Table of Contents

1. [Redundant useEffect for Derived State](#1-redundant-useeffect-for-derived-state)
2. [Hook Violation: useCallback/useMemo in JSX](#2-hook-violation-usecallbackusememo-in-jsx)
3. [Forgotten Cleanup Functions (Memory Leaks)](#3-forgotten-cleanup-functions-memory-leaks)
4. [Dependency Array Blindness](#4-dependency-array-blindness)
5. [Hook Violation: Hooks after Early Returns](#5-hook-violation-hooks-after-early-returns)
6. [Monster Hooks (Violation of SRP)](#6-monster-hooks-violation-of-srp)

---

## 1. Redundant useEffect for Derived State

### Constraint

NEVER use `useEffect` to synchronize state or compute derived values. React renders the component with the old value, fires the effect, updates the state, and triggers a **second, parasitic render**.

### Bad (Double Render)

```tsx
// ❌ Double render, completely unnecessary state
const [total, setTotal] = useState(0);
useEffect(() => {
  let sum = 0;
  items.forEach(i => sum += i.amount);
  setTotal(sum);
}, [items]);
```

### Good (Compute on the fly)

```tsx
// ✅ Computed inline. If expensive, wrap in useMemo.
const total = useMemo(() => {
  return items.reduce((sum, i) => sum + i.amount, 0);
}, [items]);
```

### Self-Correction Rule

If `useEffect` contains ONE action which is `setState(...)` based on another prop or state → **CRITICAL ANTI-PATTERN**. Refactor to inline computation or `useMemo`.

---

## 2. Hook Violation: useCallback/useMemo in JSX

### Constraint

Hooks MUST be called at the top level of a component or custom hook. They CANNOT be called inside JSX expressions, return statements, or conditionally.

### Bad (Violation)

```tsx
// ❌ Hook called inside return statement
return (
  <button onClick={useCallback(() => handleClick(id), [id])}>
    Click Me
  </button>
);
```

### Good (Top Level)

```tsx
// ✅ Hook called at top level
const memoizedClick = useCallback(() => handleClick(id), [id]);

return (
  <button onClick={memoizedClick}>
    Click Me
  </button>
);
```

---

## 3. Forgotten Cleanup Functions (Memory Leaks)

### Constraint

Failing to clean up subscriptions, timers, or event listeners causes memory leaks and unexpected behavior as the application stays open. EVERY `window.addEventListener`, `setInterval`, or external subscription MUST be cancelled in the `useEffect`'s return function.

### Bad (Memory Leak)

```tsx
// ❌ If this component mounts 10 times, 10 duplicate listeners are attached
useEffect(() => {
  window.addEventListener('resize', () => {
    console.log('Resized');
  });
}, []);
```

### Good (Cleaned up)

```tsx
// ✅ Explicit handler + Explicit cleanup
useEffect(() => {
  const handleResize = () => console.log('Resized');
  window.addEventListener('resize', handleResize);

  return () => {
    window.removeEventListener('resize', handleResize);
  };
}, []);
```

### Self-Correction Rule

If `useEffect` establishes a listener, interval, or subscription but DOES NOT have a `return () => ...` statement → **CRITICAL MEMORY LEAK**. Add the cleanup function.

---

## 4. Dependency Array Blindness

### Constraint

AI frequently manipulates the dependency array to "fix" bugs, rather than fixing the architecture:

1. Passing an unmemoized object/array into the dependencies, causing **infinite render loops**.
2. Hardcoding an empty array `[]` missing actual dependencies to stop renders, which results in **stale closures**.

### Self-Correction Rule

NEVER suppress React Hook linting errors `eslint-disable-next-line react-hooks/exhaustive-deps`. Fix the architecture by using `useCallback` or `useMemo` higher up the tree.

---

## 5. Hook Violation: Hooks after Early Returns

### Constraint

Hooks MUST always be called in the exact same order on every render. Calling a hook after a conditional `return` or inside an `if` block violates the **Rules of Hooks**. This causes React to lose track of the hook's state, leading to cryptic errors and application crashes.

### Bad (Violation)

```tsx
// ❌ useLenis and useEffect are skipped if !isOpen
const SpringSheet = ({ isOpen, children }) => {
  if (!isOpen) return null;

  const lenis = useLenis();
  useEffect(() => {
    // ... side effect logic
  }, [lenis]);

  return <div>{children}</div>;
};
```

### Good (Fixed)

```tsx
// ✅ Hooks called at the top, logic handled inside or passed down
const SpringSheet = ({ isOpen, children }) => {
  const lenis = useLenis();

  useEffect(() => {
    if (!isOpen) return;
    // ... side effect logic
  }, [isOpen, lenis]);

  if (!isOpen) return null;

  return <div>{children}</div>;
};
```

### Self-Correction Rule

Identify any `return` statements that are not at the very end of the component. Any hook call (`use...`) located below such a `return` is a **CRITICAL HOOK VIOLATION**. Move all hooks to the top level.

---

## 6. Monster Hooks (Violation of SRP)

### Constraint

Violating the Single Responsibility Principle by stuffing all UI logic, data fetching, formatting, hardware interaction, and error handling into one massive custom hook.

### Self-Correction Rule

If a custom hook is > 100 lines and handles multiple unrelated domains (e.g., API + Form + UI State + Third-party SDKs) → **WARNING: God Hook**. Break it down into isolated domain hooks.
