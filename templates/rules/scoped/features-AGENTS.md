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

4. **Component Size, Hook Guard & Decomposition Doctrine (ADR D-04)**:
   - Numerical limits defined in `configs/harness-limits.json`. Exceptions registered strictly in `configs/budget-exceptions.json` (inline `@component-budget-ignore` comments are forbidden).
   - Target size for smart feature components/widgets: **150–250 clean lines**.
   - **300 lines (Warning):** Yellow zone (`max-lines: warn`). Mandatory signal to decompose before adding new code.
   - **500 lines (Error):** Hard emergency ceiling. Pre-commit and CI will block changes.
   - **Hook Guard (`hooks/use<Feature>.ts`):** Max 150 clean lines (warn), max 250 clean lines (error). Decompose heavy logic into domain sub-hooks (e.g. `useFeatureFilters`, `useFeaturePagination`) rather than dumping all state into a single mega-hook.
   - **3 Rules of Decomposition:**
     1. Extract logic into `hooks/use<Feature>.ts` if > 3 `useState`, `useEffect`, or 4-5 handlers.
     2. Evict pure helpers/constants into `utils.ts`, `constants.ts`, `types.ts`.
     3. Isolate heavy JSX (> 40-50 lines) into `components/FeatureHeader.tsx`, `components/FeatureFilter.tsx`. Never define nested components inside the render function (`react/no-unstable-nested-components`).
