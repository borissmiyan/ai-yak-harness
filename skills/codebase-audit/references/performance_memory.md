# Performance & Memory Management Audit Reference

## 1. Event Listener & Interval Leaks

### Constraint
Always remove event listeners and clear intervals in the cleanup function of a `useEffect` hook. Failure to do so leads to memory leaks and unexpected behavior in long-running PWA/TMA apps.

### Bad
```tsx
useEffect(() => {
  window.addEventListener('resize', handleResize);
  setInterval(tick, 1000);
}, []); // ❌ Missing cleanup
```

### Good
```tsx
useEffect(() => {
  window.addEventListener('resize', handleResize);
  const id = setInterval(tick, 1000);
  
  return () => {
    window.removeEventListener('resize', handleResize);
    clearInterval(id);
  };
}, []); 
```

---

## 2. Expensive Operations in Render

### Constraint
Never perform heavy computations (e.g., complex filtering, large object cloning) directly in the body of a component. Use `useMemo` or move them outside the render cycle.

### Self-Correction Rule
If you see `JSON.parse(JSON.stringify(largeObj))` or `.filter().map().sort()` inside the main component body → **CRITICAL: Performance Bottleneck**.

---

## 3. Reference Consistency (Memoization)

### Constraint
Avoid passing inline objects or functions to memoized children as it breaks `React.memo` and triggers unnecessary re-renders.

### Bad
```tsx
<MemoizedChild config={{ theme: 'dark' }} onClick={() => log('click')} />
```

### Good
```tsx
const config = useMemo(() => ({ theme: 'dark' }), []);
const handleClick = useCallback(() => log('click'), []);
return <MemoizedChild config={config} onClick={handleClick} />;
```

---

## 4. Large State Objects

### Constraint
Do not store massive JSON strings (1MB+) or oversized arrays in a single state atom/Zustand slice. Prune unnecessary data before saving to state.

---

## 5. IndexedDB & Cursor Isolation

### Constraint
When using Dexie.js or raw IndexedDB, ensure cursors and transactions are closed promptly. Avoid keeping IDB transactions open while waiting for external network requests.
