# COMPONENTS.md — Component Registry
>
> Project: [name] | Platform: [All/TG/Web/Desktop] | Last Synced: [DATE]
> ⚠️ CHECK THIS BEFORE CREATING ANY NEW COMPONENT

## How to Use This File

**Before creating a new component:**

1. Search this file (Ctrl+F) for what you need
2. If found → import and use it, don't recreate
3. If not found → create it, then add it here

**Status values:** `stable` | `in-progress` | `deprecated` | `needs-review`

---

## Shared / All Platforms

### Layout

| Component | Path | Props | Status | Platform | Updated |
|---|---|---|---|---|---|
| `PageLayout` | `src/shared/ui/layout/PageLayout.tsx` | `children` | stable | All | [DATE] |
| `StandardHeader` | `src/shared/ui/layout/StandardHeader.tsx` | `title`, `actions?` | stable | All | [DATE] |

### Buttons

| Component | Path | Props | Status | Platform | Updated |
|---|---|---|---|---|---|
| `PrimaryButton` | `src/shared/ui/buttons/PrimaryButton.tsx` | `label`, `onClick`, `loading?`, `disabled?` | stable | All | [DATE] |
| `SecondaryButton` | `src/shared/ui/buttons/SecondaryButton.tsx` | `label`, `onClick`, `loading?`, `disabled?` | stable | All | [DATE] |
| `OutlineButton` | `src/shared/ui/buttons/OutlineButton.tsx` | `label`, `onClick` | stable | All | [DATE] |
| `IconButton` | `src/shared/ui/buttons/IconButton.tsx` | `icon`, `onClick`, `variant?` | stable | All | [DATE] |

### Inputs

| Component | Path | Props | Status | Platform | Updated |
|---|---|---|---|---|---|
| `TextInput` | `src/shared/ui/inputs/TextInput.tsx` | `value`, `onChange`, `placeholder?`, `error?` | stable | All | [DATE] |
| `RadioGroup` | `src/shared/ui/inputs/RadioGroup.tsx` | `options`, `value`, `onChange` | stable | All | [DATE] |
| `Checkbox` | `src/shared/ui/inputs/Checkbox.tsx` | `checked`, `onChange`, `label?` | stable | All | [DATE] |

### Cards

| Component | Path | Props | Status | Platform | Updated |
|---|---|---|---|---|---|
| `MainCard` | `src/shared/ui/cards/MainCard.tsx` | `children`, `className?` | stable | All | [DATE] |
| `MenuItemCard` | `src/shared/ui/cards/MenuItemCard.tsx` | `icon`, `title`, `subtitle?`, `onClick` | stable | All | [DATE] |

### Lists

| Component | Path | Props | Status | Platform | Updated |
|---|---|---|---|---|---|
| `StaggeredList` | `src/shared/ui/animations/StaggeredList.tsx` | `children` | stable | All | [DATE] |
| `SwipeableRow` | `src/shared/ui/lists/SwipeableRow.tsx` | `children`, `onDelete` | stable | All | [DATE] |

### Modals & Sheets

| Component | Path | Props | Status | Platform | Updated |
|---|---|---|---|---|---|
| `SpringSheet` | `src/shared/ui/modals/SpringSheet.tsx` | `isOpen`, `onClose`, `children` | stable | All | [DATE] |
| `BaseModal` | `src/shared/ui/modals/BaseModal.tsx` | `isOpen`, `onClose`, `children` | stable | All | [DATE] |

### Animations

| Component | Path | Props | Status | Platform | Updated |
|---|---|---|---|---|---|
| `MotionDiv` | `src/shared/ui/animations/MotionComponents.tsx` | `children`, `variants?` | stable | All | [DATE] |
| `MotionList` | `src/shared/ui/animations/MotionComponents.tsx` | `children` | stable | All | [DATE] |

### Feedback

| Component | Path | Props | Status | Platform | Updated |
|---|---|---|---|---|---|
| `SkeletonCard` | `src/shared/ui/feedback/SkeletonCard.tsx` | `lines?` | stable | All | [DATE] |
| `EmptyState` | `src/shared/ui/feedback/EmptyState.tsx` | `title`, `description`, `cta?` | stable | All | [DATE] |
| `ErrorState` | `src/shared/ui/feedback/ErrorState.tsx` | `message`, `onRetry?` | stable | All | [DATE] |

### Effects

| Component | Path | Props | Status | Platform | Updated |
|---|---|---|---|---|---|
| `GrainedEffect` | `src/shared/ui/effects/GrainedEffect.tsx` | `texture`, `overlay?` | stable | All | [DATE] |

---

## Voice UI

| Component | Path | Props | Status | Platform | Updated |
|---|---|---|---|---|---|
| `RecordButton` | `src/features/voice-input/components/RecordButton.tsx` | `onResult` | stable | All | [DATE] |
| `ProposalCard` | `src/features/voice-input/components/ProposalCard.tsx` | `proposal`, `onConfirm`, `onEdit` | stable | All | [DATE] |

---

## [TG] Telegram-Specific

_None yet_

## [Web] Web-Specific

_None yet_

## [Desktop] Desktop-Specific

_None yet_

---

## Deprecated Components

| Component | Deprecated | Replacement | Reason |
|---|---|---|---|
| _None yet_ | — | — | — |
