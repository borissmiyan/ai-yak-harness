# Component States — Reference

For every interactive component, all 6 states must be implemented.
AI: use these exact class recipes. Do not invent your own.

---

## State Index

| # | State | When | Visual Signal |
|---|---|---|---|
| 1 | Default | Normal, no interaction | Base styles |
| 2 | Hover | Cursor over (web only) | Subtle brightness/bg change |
| 3 | Active / Press | During tap/click | Scale down + haptic |
| 4 | Disabled | Action unavailable | Opacity 50%, no pointer events |
| 5 | Loading | Async operation in progress | Spinner, content locked |
| 6 | Error | Validation or fetch failure | Red border/text, error message |
| + | Empty | No data to display | Illustration + CTA |
| + | Offline | No network | Cached data + offline badge |
| + | Success | Operation completed | Brief confirmation, then reset |

---

## Button

```tsx
// Default (primary)
className="h-[60px] rounded-3xl bg-accent-primary text-black font-semibold"

// Hover (web)
className="... hover:brightness-110"

// Active / Press
className="... active:scale-95 transition-transform"
// + HapticFeedback.impact('light')

// Disabled
className="... opacity-50 pointer-events-none"

// Loading
className="... opacity-70 pointer-events-none"
// Replace label with: <Spinner size={20} />

// Error — not applicable to button itself; show error below the form
```

---

## TextInput

```tsx
// Default
className="h-[60px] rounded-3xl bg-zinc-800 border border-zinc-700 px-4 text-white"

// Focus
className="... border-accent-primary ring-1 ring-accent-primary/30"

// Error
className="... border-accent-destructive"
// + <p className="mt-1 text-xs text-accent-destructive">{errorMessage}</p>

// Disabled
className="... opacity-50 pointer-events-none"

// Loading (e.g. async validation)
// Add spinner icon inside right side of input
```

---

## Card (MainCard)

```tsx
// Default
className="rounded-[24px] bg-gray-800/50 border border-gray-400/5 p-4"

// Hover (if interactive)
className="... hover:bg-gray-800/70 transition-colors"

// Press (if interactive)
className="... active:scale-[0.98] transition-transform"

// Loading
// Render <SkeletonCard /> instead — same dimensions, shimmer animation

// Empty
// Render <EmptyState title="..." description="..." cta={...} />

// Error
// Render <ErrorState message="..." onRetry={...} />
```

---

## List Row (SwipeableRow / row item)

```tsx
// Default
className="rounded-xl px-4 py-3 flex items-center gap-3"

// Hover
className="... hover:bg-white/5 transition-colors"

// Press
className="... active:scale-[0.98]"

// Swipe left (delete reveal)
// Threshold: -100px → show delete button (bg-accent-destructive)

// Loading (skeleton row)
className="rounded-xl h-[60px] bg-zinc-800/50 animate-pulse"

// Disabled
className="... opacity-50 pointer-events-none"
```

---

## Modal / SpringSheet

```tsx
// Open — spring from bottom
initial={{ y: '100%', opacity: 0 }}
animate={{ y: 0, opacity: 1 }}
transition={{ type: 'spring', stiffness: 400, damping: 35 }}

// Close
exit={{ y: '100%', opacity: 0 }}

// Loading state inside modal
// Show skeleton in content area, keep header visible

// Error state inside modal
// Show <ErrorState /> in content area with retry CTA

// Empty state inside modal
// Show <EmptyState /> with relevant CTA
```

---

## RadioGroup Option

```tsx
// Default (unselected)
// Outer circle: border-2 border-zinc-600, bg transparent

// Selected
// Outer circle: border-2 border-accent-primary
// Inner dot: scale 0→1 spring animation, bg-accent-primary

// Disabled
className="... opacity-50 pointer-events-none"
```

---

## Checkbox

```tsx
// Default (unchecked)
className="w-5 h-5 rounded-md border-2 border-zinc-600 bg-transparent"

// Checked
className="... bg-accent-primary border-accent-primary"
// + checkmark icon inside, scale spring animation

// Disabled
className="... opacity-50 pointer-events-none"
```

---

## RecordButton (VUI)

```tsx
// Idle
// Blue gradient + mic icon, no animation

// Recording
// Red gradient + stop icon
// Pulsing ring: animate ring scale 1→1.4, opacity 1→0, repeat
// className ring: "bg-red-500/40 animate-ping"

// Processing
// Spinner, pointer-events-none

// Error (recognition failed)
// Brief shake animation + error haptic
// transition back to Idle after 1.5s
```

---

## Icon Container

```tsx
// Standard wrapper (always)
className="w-12 h-12 rounded-full flex items-center justify-center"

// Colored variants
className="... bg-accent-primary/10 text-accent-primary"   // green tint
className="... bg-accent-warning/10 text-accent-warning"   // yellow tint
className="... bg-accent-destructive/10 text-accent-destructive" // red tint
className="... bg-white/10 text-white"                     // neutral
```

---

## Empty State (EmptyState component)

Structure (always):

1. Illustration or icon (centered, `w-16 h-16 text-text-secondary`)
2. Title (`text-base font-semibold text-text-primary`)
3. Description (`text-sm text-text-secondary text-center`)
4. CTA button (PrimaryButton or OutlineButton)

---

## Skeleton / Loading State

Rules:

- Use skeleton (shape placeholder) not spinner for content areas
- Spinner only inside buttons and small inline loaders
- Skeleton classes: `bg-zinc-800/50 animate-pulse rounded-[same as real component]`
- Match the real component's dimensions exactly
