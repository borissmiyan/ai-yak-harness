# React Performance Audit Reference (React 19, Framer Motion, Recharts)

## Table of Contents

1. [React Compiler: Read This Before Applying Any Memoization Rule](#react-compiler-read-this-before-applying-any-memoization-rule)
2. [Re-render Detection](#re-render-detection)
3. [Memoization Rules](#memoization-rules)
4. [List Virtualization](#list-virtualization)
5. [Animation Performance](#animation-performance)
6. [Bundle Size](#bundle-size)
7. [Lazy Loading](#lazy-loading)

---

## React Compiler: Read This Before Applying Any Memoization Rule

### Constraint

Check whether the project has `babel-plugin-react-compiler` (or the Vite
equivalent) enabled **before** flagging missing `useMemo`/`useCallback`/
`React.memo` anywhere in this file. If the compiler is active, it inserts
this memoization automatically at build time. Manually adding
`useMemo`/`useCallback` on top of compiler-managed code is not just
redundant — it can actively fight the compiler's own memoization and produce
worse results, and it adds review noise the compiler already solved.

### Self-Correction Rule

1. Check `babel.config.js` / `vite.config.ts` for `babel-plugin-react-compiler`
   or `react-compiler` in the plugin list.
2. **If found**: skip the "Missing `React.memo`" and "inline object/function
   breaks memoization" checks in this file entirely for compiler-covered
   directories. Still apply `useMemo`/`useCallback` correctness checks (e.g.
   a `useMemo` with the wrong dependency array is still a bug the compiler
   won't invent semantics for), and still apply List Virtualization, Animation
   Performance, and Bundle Size sections — the compiler doesn't touch those.
3. **If not found**: apply all sections below as written.

---

## Re-render Detection

### Constraint

Components MUST NOT re-render when their props/state haven't changed. Common causes:

1. Inline object/array/function creation in JSX
2. Missing `React.memo` on child components receiving stable props
3. Context providers with rapidly changing values

### Bad — Inline Object Creation

```tsx
// ❌ New object created on every render → child always re-renders
<TransactionCard style={{ padding: 16 }} onPress={() => navigate(tx.id)} />
```

### Good

```tsx
// ✅ Stable references
const cardStyle = useMemo(() => ({ padding: 16 }), []);
const handlePress = useCallback(() => navigate(tx.id), [tx.id]);
<TransactionCard style={cardStyle} onPress={handlePress} />
```

### Self-Correction Rule

In list renders (`.map()`), if any prop is an inline function or object literal, flag as **WARNING — re-render trigger**. If the list can exceed 20 items, escalate to **CRITICAL**. Skip this check if React Compiler is active (see section above).

---

## Derived State Anti-Pattern (AI-Slop)

### Constraint

Values derived purely from props or state MUST be computed inline during render. Using `useEffect` + `useState` to "sync" derived state causes double renders and race conditions. This is the single most common AI code generation mistake.

### Bad

```tsx
// ❌ useEffect + useState for something computable inline — 2x renders
const [total, setTotal] = useState(0);
useEffect(() => setTotal(items.reduce((s, i) => s + i.amount, 0)), [items]);
```

### Good

```tsx
// ✅ Compute inline — if cheap, no hook needed
const total = items.reduce((s, i) => s + i.amount, 0);
// ✅ If expensive, wrap in useMemo
const total = useMemo(() => items.reduce((s, i) => s + i.amount, 0), [items]);
```

### Self-Correction Rule

If `useEffect` contains ONLY `setState(derivedValue)`, flag as **CRITICAL — derived state anti-pattern**. See `references/ai_slop_patterns.md` for the full decision tree. This applies regardless of React Compiler status — the compiler optimizes memoization, it does not remove unnecessary render cycles caused by architectural misuse of `useEffect`.

---

## Memoization Rules

**Skip this entire section if React Compiler is active — see the top of this file.**

### When `React.memo` is REQUIRED

1. List item components (inside `.map()`)
2. Components receiving callbacks from parent
3. Components under frequently updating context/store

### When `React.memo` is WASTEFUL

1. Components that always receive new props (e.g., timestamp display)
2. Components with few children and cheap renders
3. Root-level page components (render infrequently)

### `useMemo` vs `useCallback`

- `useMemo` — for expensive computations (filtering, sorting, aggregation)
- `useCallback` — for functions passed as props to memoized children
- **NEVER** use `useMemo` for simple value assignments or trivial computations

### Bad

```tsx
// ❌ Useless useMemo — more expensive than the computation
const name = useMemo(() => user.firstName, [user.firstName]);
```

### Good

```tsx
// ✅ useMemo for actual computation
const sortedTransactions = useMemo(
  () => transactions.sort((a, b) => new Date(b.date) - new Date(a.date)),
  [transactions]
);
```

---

## List Virtualization

### Constraint

Any list that can exceed **50 items** MUST use `@tanstack/react-virtual` (already in deps). Rendering 200+ DOM nodes for a transaction list destroys scroll performance on TMA WebView.

### Bad

```tsx
// ❌ All items rendered at once
{transactions.map((tx) => <TransactionRow key={tx.id} tx={tx} />)}
```

### Good

```tsx
// ✅ Virtualized — only visible items rendered
const virtualizer = useVirtualizer({ count: transactions.length, getScrollElement, estimateSize: () => 72 });
{virtualizer.getVirtualItems().map((virtualRow) => (
  <TransactionRow key={transactions[virtualRow.index].id} tx={transactions[virtualRow.index]} style={{ transform: `translateY(${virtualRow.start}px)` }} />
))}
```

### Self-Correction Rule

Search for `.map(` in TSX files rendering data arrays. If the data source is a Dexie table or a Supabase query result that could have many items, and no virtualization is present → **WARNING**.

---

## Animation Performance

### Constraint (Framer Motion)

1. **NEVER animate `width`, `height`, or `top`/`left`** — triggers layout recalculation. Use `transform` and `opacity` only for 60fps.
2. **Use `layout` prop sparingly** — it can cause expensive layout measurements. Only use when elements reflow.
3. **`AnimatePresence` MUST wrap exit animations** — missing it means components disappear without animating.
4. **Use `MotionDiv`, `MotionList` from shared/ui** — not raw `motion.div` — to maintain consistency and performance.
5. **NEVER use `repeat: Infinity` on decorative/ambient animations (grain, noise, glow, particle effects) inside a Telegram Mini App WebView.** Continuous GPU-composited loops keep the render thread active indefinitely, draining battery on mobile even when the screen content is otherwise static. Gate any looping decorative animation behind a `prefers-reduced-motion` check or trigger it on a fixed number of iterations / on user interaction only.

### Bad

```tsx
// ❌ Animating height — causes layout thrashing on every frame
<motion.div animate={{ height: isOpen ? 300 : 0 }} />
```

### Good

```tsx
// ✅ Animate transform (GPU-accelerated)
<motion.div
  initial={{ scaleY: 0, opacity: 0 }}
  animate={{ scaleY: 1, opacity: 1 }}
  style={{ transformOrigin: 'top' }}
/>
```

---

## Bundle Size

### Constraint

1. **lodash** — NEVER import the full library. Use specific imports: `import debounce from 'lodash/debounce'`
2. **d3** — Full d3 import is ~500KB. Import only needed modules: `import { scaleLinear } from 'd3-scale'`
3. **recharts** — Recharts does not support the same deep-path imports as lodash/d3 (there is no `recharts/BarChart` module) — the correct fix is importing only the specific named chart components you actually render (`BarChart`, `XAxis`, `Tooltip`, etc.) via the standard named import, and confirming your bundler's tree-shaking removes the rest. A high count of named imports from `recharts` is not itself a problem as long as each one is actually rendered somewhere in the file.
4. **date-fns** — Already tree-shakeable, but verify no `import * as dateFns`
5. **lucide-react** — Each icon is individually importable. Verify no `import * from 'lucide-react'`

### Bad

```tsx
// ❌ Full lodash / d3 imports — no tree-shaking possible
import _ from 'lodash';
import * as d3 from 'd3';
```

### Good

```tsx
// ✅ Specific imports
import debounce from 'lodash/debounce';
import { scaleLinear } from 'd3-scale';
// ✅ recharts: named imports are correct here, unlike lodash/d3 above —
// just make sure every imported component is actually used in the file
import { BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
```

### Self-Correction Rule

Search for:

- `import _ from 'lodash'` or `import lodash` → **CRITICAL — full 75KB import**
- `import * as d3 from 'd3'` → **CRITICAL — full 500KB import**
- For `recharts`: only flag if a named import is present in the import statement but never referenced elsewhere in the file (unused import) → **WARNING — dead import**, not a bundle-size issue. Do NOT flag recharts imports purely for having more than N named exports — that check produces false positives, see the constraint above.

---

## Lazy Loading

### Constraint

Feature pages/routes MUST be lazy-loaded via `React.lazy()` + `Suspense`. Loading the entire app bundle upfront destroys initial load performance in TMA WebView.

### Bad

```tsx
// ❌ All routes loaded eagerly
import Analytics from './features/analytics/AnalyticsPage';
import Budget from './features/budget/BudgetPage';
import Settings from './features/settings/SettingsPage';
```

### Good

```tsx
// ✅ Lazy-loaded routes
const Analytics = lazy(() => import('./features/analytics/AnalyticsPage'));
const Budget = lazy(() => import('./features/budget/BudgetPage'));

<Suspense fallback={<Skeleton />}>
  <Routes>
    <Route path="/analytics" element={<Analytics />} />
    <Route path="/budget" element={<Budget />} />
  </Routes>
</Suspense>
```

### Self-Correction Rule

In `App.tsx` or the router file, if feature page imports are NOT using `lazy()`, flag as **WARNING — bundle bloat**. If App.tsx exceeds 500 lines, flag as **CRITICAL — file too large**. Wrap each lazy route's fallback in the same Error Boundary strategy from `references/error_boundaries.md` — a chunk-load failure (flaky network) should not blank the whole app either.
