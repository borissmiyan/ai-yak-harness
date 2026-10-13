# DESIGN-AI.md — [Project Name]
>
> Project: [name] | Platform: [TG/Web/Desktop/All] | Last Synced: [DATE]
> Human version: DESIGN-HUMAN.md | Component registry: COMPONENTS.md | Forbidden patterns: ANTIPATTERNS.md

---

## ⚡ QUICK REFERENCE — Read This First

These are the most-violated rules. Apply them before writing any UI code.

```
INTERACTIVE ELEMENT HEIGHT:  h-[60px]          ← NON-NEGOTIABLE. All buttons, inputs, tappable rows.
INPUT/BUTTON RADIUS:         rounded-3xl        ← NON-NEGOTIABLE. NOT rounded-lg, NOT rounded-xl.
CARD RADIUS:                 rounded-[24px]     ← All main content cards.
MODAL MANAGEMENT:            Global state only  ← NEVER useState for modal visibility inside features.
COLORS:                      CSS variables only ← NEVER raw hex. Use var(--color-*) or Tailwind tokens.
NEW COMPONENT:               Check COMPONENTS.md first ← If it exists, reuse it.
FILE LENGTH:                 500 lines max      ← Split into hooks/sub-components/utils if exceeded.
```

---

## 1. DESIGN TOKENS

### IF you need a background color → THEN use

| Token | CSS Variable | Value | Use When |
|---|---|---|---|
| `bg-primary` | `var(--color-bg-primary)` | `#090F08` | Main screen background |
| `bg-secondary` | `var(--color-bg-secondary)` | `#141713` | Cards, sections, elevated surfaces |

### IF you need text color → THEN use

| Token | CSS Variable | Value | Use When |
|---|---|---|---|
| `text-primary` | `var(--color-text-primary)` | `#FFFFFF` | Body text, titles |
| `text-secondary` | `var(--color-text-secondary)` | `#9CA3AF` | Subtitles, placeholders, metadata |

### IF you need an accent color → THEN use

| Token | CSS Variable | Value | Use When |
|---|---|---|---|
| `accent-primary` | `var(--color-accent-primary)` | `#BDFC71` | Primary CTA, success, highlights |
| `accent-warning` | `var(--color-accent-warning)` | `#EAB308` | Warnings, pending states |
| `accent-destructive` | `var(--color-accent-destructive)` | `#EF4444` | Errors, deletes, outgoing money |

### IF you need spacing → THEN use

| Context | Class | Value |
|---|---|---|
| Page top padding (sticky header clearance) | `pt-24` | 96px |
| Page bottom padding (bottom nav clearance) | `pb-40` | 160px |
| Content max-width + centering | `max-w-4xl mx-auto px-4 md:px-8` | — |
| Card internal padding | `p-4` | 16px |

### IF you need border-radius → THEN use

| Use Case | Class | Value |
|---|---|---|
| Inputs, buttons inside modals | `rounded-3xl` | ~24px |
| Main content cards | `rounded-[24px]` | 24px |
| List row items | `rounded-xl` | 12px |
| Icon containers | `rounded-full` | 50% |

---

## 2. COMPONENTS — DECISION RULES

### IF creating a button → THEN

```
height:        h-[60px]      ← always
border-radius: rounded-3xl   ← always
variant:       see table below
```

| Variant | When to Use | Classes |
|---|---|---|
| `primary` | Main CTA, one per screen | `bg-accent-primary text-black` |
| `secondary` | Secondary action | `bg-zinc-800 text-white` |
| `outline` | Tertiary, ghost action | `border border-white/10 text-white` |
| `destructive` | Delete, irreversible action | `bg-accent-destructive text-white` |

**States:**

| State | Transform | Extra |
|---|---|---|
| Active/Press | `scale-95` | Call `HapticFeedback.impact('light')` |
| Loading | `opacity-70 pointer-events-none` | Show spinner inside |
| Disabled | `opacity-50 pointer-events-none` | — |

### IF creating an input → THEN

```
height:        h-[60px]       ← always
border-radius: rounded-3xl    ← always (NOT rounded-lg)
background:    bg-zinc-800
border:        border border-zinc-700
placeholder:   text-zinc-500
focus:         border-accent-primary ring
error:         border-accent-destructive + error text below
```

### IF creating a card → THEN

```
border-radius: rounded-[24px]
background:    bg-gray-800/50
border:        border border-gray-400/5
padding:       p-4
```

### IF creating a list → THEN

```
container:     <StaggeredList> from shared/ui/animations
row:           rounded-xl hover:bg-white/5
icon slot:     w-12 h-12 rounded-full
swipeable:     <SwipeableRow> — swipe left threshold -100px reveals delete
```

### IF creating a modal or bottom sheet → THEN

```
component:     <SpringSheet> (preferred) or <BaseModal>
margin:        16px all sides (floating effect)
header:        pt-2 pb-4 px-4, border-b border-gray-800
header title:  text-xl font-bold tracking-tight
physics:       spring animation (framer-motion)
state:         MUST be in AppModals.tsx registry — NEVER useState locally
```

### IF creating a sticky header → THEN

```
position:      sticky top-0 z-20
background:    bg-bg-primary/80 backdrop-blur-xl
border:        border-b border-white/5
title:         text-3xl font-extrabold text-white tracking-tight
action buttons: bg-white/10 or transparent
```

### IF creating a page layout → THEN

```
wrapper:       <PageLayout>
top padding:   pt-24
bottom padding: pb-40 (if bottom nav present)
width:         max-w-4xl mx-auto px-4 md:px-8
```

---

## 3. MOTION RULES

### IF adding animation → THEN

- Use `framer-motion` only — no raw CSS transitions for interactions
- Use `MotionDiv`, `MotionList` from `shared/ui/animations/MotionComponents.tsx`
- Never write raw `<motion.div>` — use the shared wrappers

### IF component enters the screen → THEN

```js
initial: { y: 20, opacity: 0 }
animate: { y: 0, opacity: 1 }
transition: { type: "spring", stiffness: 400, damping: 30 }
```

### IF component exits → THEN

```js
exit: { scale: 0.95, opacity: 0 }
```

### IF animating a list → THEN

```
Use <StaggeredList> — it handles stagger automatically
```

---

## 4. HAPTICS RULES

### IF user taps a button → THEN: `HapticFeedback.impact('light')`

### IF transaction saved successfully → THEN: `HapticFeedback.notification('success')`

### IF error or cancel → THEN: `HapticFeedback.notification('error')`

### IF radio/checkbox toggles → THEN: `HapticFeedback.impact('light')`

---

## 5. GESTURE RULES

| Gesture | Where | Threshold | Action |
|---|---|---|---|
| Swipe left | `<SwipeableRow>` (transactions) | -100px | Reveal delete button |
| Long press | DnD sortable items | 500ms | Activate drag mode |

---

## 6. ARCHITECTURE RULES

### IF creating a new feature screen → THEN

- Create in `src/features/[feature-name]/`
- Business logic → custom hook in `hooks/useFeatureName.ts`
- UI → components in `components/`
- Helpers → `utils.ts`
- Register any modals in `src/shared/ui/modals/AppModals.tsx`

### IF file approaches 500 lines → THEN split immediately

1. Logic → `hooks/useFeatureName.ts`
2. UI chunks → `components/SubComponent.tsx`
3. Pure functions → `utils.ts`

### IF naming variables/functions → THEN

- Full descriptive names: `transactionIndex` not `txIdx`
- Absolute imports with aliases — no relative `../../` chains

---

## 7. PLATFORM-SPECIFIC RULES

### [All platforms]

All rules above apply everywhere.

### [TG] Telegram Mini-App overrides

_Not yet defined_

### [Web] Web overrides

_Not yet defined_

### [Desktop] Desktop overrides

_Not yet defined_

---

## 8. DECISION LOG

| Date | Change | Reason | Previous Value |
|---|---|---|---|
| [DATE] | [What] | [Why] | [Old value if applicable] |
