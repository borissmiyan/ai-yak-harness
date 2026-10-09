# 🧩 Feature Modules Rules (`src/features/`)

> **Domain:** Domain-specific feature slices, page views, and stateful widgets.

---

## 🎯 Architectural Principles

1. **Feature Encapsulation**:
   - Each feature folder is self-contained: `components/`, `hooks/`, `utils/`, `types/`.
   - Expose the public API via an `index.ts` file in the feature root.

2. **Zero Cross-Feature Spaghetti**:
   - Feature A must NOT reach deeply into Feature B's internal private subfolders.
   - Shared cross-domain logic belongs in `src/shared/` or `src/services/`.

3. **Performance & Memoization**:
   - Wrap heavy list items and interactive editors in `React.memo` with proper dependency arrays.
   - Use custom hooks to isolate complex local state and effects.
