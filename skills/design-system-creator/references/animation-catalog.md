# Animation Catalog

Single source of truth for all framer-motion variants.
AI: copy these exact configs. Do not invent custom durations or easings.

---

## Core Spring Presets

```ts
// presets.ts — import from shared/ui/animations/presets.ts
export const spring = {
  default:  { type: 'spring', stiffness: 400, damping: 30 },
  snappy:   { type: 'spring', stiffness: 500, damping: 35 },
  bouncy:   { type: 'spring', stiffness: 300, damping: 20 },
  slow:     { type: 'spring', stiffness: 200, damping: 30 },
  modal:    { type: 'spring', stiffness: 400, damping: 35 },
}
```

**Rule:** Never write raw `duration: 0.3` or `ease: 'easeOut'` for interactions.
Springs only. Tween only for non-interactive transitions (color, opacity fade).

---

## Entrance Animations

### Standard item entrance (cards, rows, any content block)

```ts
const itemEntrance = {
  initial: { y: 20, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  transition: spring.default,
}
```

### Entrance from left (navigation forward)

```ts
const slideInFromRight = {
  initial: { x: 40, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  transition: spring.snappy,
}
```

### Scale entrance (modal content, proposal card)

```ts
const scaleEntrance = {
  initial: { scale: 0.92, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  transition: spring.bouncy,
}
```

### Fade only (overlays, backdrops)

```ts
const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.2 },  // tween OK for pure opacity
}
```

---

## Exit Animations

### Standard exit

```ts
exit: { scale: 0.95, opacity: 0, transition: { duration: 0.15 } }
```

### Slide down (bottom sheet close)

```ts
exit: { y: '100%', opacity: 0, transition: spring.modal }
```

### Fade out

```ts
exit: { opacity: 0, transition: { duration: 0.15 } }
```

---

## List Stagger

### StaggeredList — use the shared component, not raw implementation

```ts
// Shared component handles this internally:
// delayChildren: 0.04s, staggerChildren: 0.05s per item
// Each child gets itemEntrance automatically

// Usage:
<StaggeredList>
  {items.map(item => <ItemComponent key={item.id} {...item} />)}
</StaggeredList>
```

### Manual stagger (when StaggeredList can't be used)

```ts
const listContainer = {
  animate: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } }
}
const listItem = {
  initial: { y: 16, opacity: 0 },
  animate: { y: 0, opacity: 1, transition: spring.default },
}
```

---

## Bottom Sheet (SpringSheet)

```ts
const sheetVariants = {
  closed: { y: '100%', opacity: 0 },
  open:   { y: 0,      opacity: 1 },
}
const sheetTransition = spring.modal  // stiffness 400, damping 35

// Backdrop:
const backdropVariants = {
  closed: { opacity: 0 },
  open:   { opacity: 1 },
}
const backdropTransition = { duration: 0.2 }
```

---

## Button / Interactive Press

```ts
// whileTap on all interactive elements
whileTap={{ scale: 0.95 }}
transition={spring.snappy}
// + HapticFeedback.impact('light') in onClick
```

### Card press (MenuItemCard, card-buttons)

```ts
whileTap={{ scale: 0.98 }}
transition={spring.snappy}
```

---

## Number / Counter Animation (balance, amounts)

```ts
// Use framer-motion useSpring + useTransform for animating numbers
import { useSpring, useTransform, motion } from 'framer-motion'

const springValue = useSpring(targetValue, { stiffness: 100, damping: 20 })
const displayValue = useTransform(springValue, v => formatCurrency(Math.round(v)))

// In JSX:
<motion.span>{displayValue}</motion.span>
```

Use when: balance updates, transaction totals changing, goal progress.

---

## Progress Bar

```ts
const progressVariants = {
  initial: { width: 0 },
  animate: { width: `${percentage}%` },
}
const progressTransition = { ...spring.slow, delay: 0.2 }
// Delay 0.2s so user sees the bar start from 0
```

---

## VUI — RecordButton Pulse

```ts
// Pulsing ring around RecordButton during recording
// Implemented as absolute positioned div behind button
const pulseVariants = {
  idle:      { scale: 1,   opacity: 0 },
  recording: { scale: 1.4, opacity: 0, transition: { duration: 1.2, repeat: Infinity } },
}
// Background: bg-red-500/40
```

---

## Swipeable Row (delete reveal)

```ts
// Using framer-motion drag
drag="x"
dragConstraints={{ left: -100, right: 0 }}
dragElastic={0.1}
// At x < -80: reveal delete button with opacity spring
// onDragEnd: if offset.x < -60 → stay open, else snap back
```

---

## Page Transition (route change)

```ts
const pageVariants = {
  initial: { x: 20, opacity: 0 },
  animate: { x: 0,  opacity: 1 },
  exit:    { x: -20, opacity: 0 },
}
const pageTransition = spring.snappy
// Wrap routes in <AnimatePresence mode="wait">
```

---

## Skeleton Shimmer

```ts
// CSS-based, not framer-motion — better performance for repeated elements
// className: "animate-pulse bg-zinc-800/50"
// For shimmer effect add to tailwind config:
// shimmer: 'shimmer 1.5s infinite'
// @keyframes shimmer { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
```

---

## Rules Summary

| Situation | Use |
|---|---|
| Any interactive press | `whileTap scale-0.95` + `spring.snappy` |
| Content entering screen | `itemEntrance` + `spring.default` |
| List of items | `<StaggeredList>` |
| Bottom sheet | `sheetVariants` + `spring.modal` |
| Modal content | `scaleEntrance` + `spring.bouncy` |
| Pure opacity | tween `duration: 0.2` (only exception) |
| Number changing | `useSpring` + `useTransform` |
| Loading content | CSS `animate-pulse` (not framer) |
| Never | Raw `duration` for interactions, `ease: easeOut` |
