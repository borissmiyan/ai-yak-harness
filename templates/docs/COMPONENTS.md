# COMPONENTS.md — Component Registry

> ⚠️ **MANDATORY FOR AI AGENTS:** CHECK THIS REGISTRY BEFORE CREATING ANY NEW COMPONENT.  
> If a component exists → reuse it. If not found → create it and register it here.

**Status values:** `stable` | `in-progress` | `deprecated` | `needs-review`

---

## 1. Modals & Drawers

| Component | Path | Props / Purpose | Status | Updated |
| :--- | :--- | :--- | :--- | :--- |
| `Modal` | `src/shared/ui/Modal.tsx` | `isOpen`, `onClose`, `title`, `children` — Base centered dialog | stable | 2026-10-09 |
| `SpringSheet` | `src/shared/ui/SpringSheet.tsx` | Bottom drawer with swipe-down dismiss and spring physics | stable | 2026-10-09 |

---

## 2. Buttons & Inputs

| Component | Path | Props / Purpose | Status | Updated |
| :--- | :--- | :--- | :--- | :--- |
| `Button` | `src/shared/ui/Button.tsx` | `variant`, `size`, `isLoading`, `leftIcon`, `children` | stable | 2026-10-09 |
| `Input` | `src/shared/ui/Input.tsx` | `label`, `error`, `icon`, `value`, `onChange` | stable | 2026-10-09 |
| `SortDropdown` | `src/shared/ui/SortDropdown.tsx` | `options`, `value`, `onChange` — Tactile sort selector | stable | 2026-10-09 |

---

## 3. Feedback & Status Badges

| Component | Path | Props / Purpose | Status | Updated |
| :--- | :--- | :--- | :--- | :--- |
| `Badge` | `src/shared/ui/Badge.tsx` | `variant` (`success`, `warning`, `danger`, `info`) | stable | 2026-10-09 |
| `Skeleton` | `src/shared/ui/Skeleton.tsx` | Content placeholder loading pulse | stable | 2026-10-09 |
