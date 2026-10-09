# Accessibility Checklist

Universal a11y requirements for any web/mobile app.
AI: apply relevant sections when creating or reviewing any UI component.

WCAG 2.1 AA is the baseline. Items marked [AAA] are optional enhancements.

---

## 1. Color & Contrast

| Rule | Requirement | Check |
|---|---|---|
| Body text contrast | ≥ 4.5:1 against background | Use browser DevTools or axe |
| Large text contrast (≥ 18px bold or ≥ 24px) | ≥ 3:1 | |
| UI component contrast (borders, icons) | ≥ 3:1 | |
| Color is never the only signal | Pair with icon, text, or pattern | e.g. error = red border + icon + message |
| Focus indicator contrast | ≥ 3:1 against adjacent colors | |

**Common failures:**

- Placeholder text at `zinc-500` on `zinc-800` — check contrast ratio
- Disabled state at `opacity-50` — may fall below 3:1
- Accent color on white backgrounds in light mode

---

## 2. Keyboard Navigation

Every interactive element must be reachable and operable by keyboard alone.

| Element | Requirement |
|---|---|
| All buttons, links, inputs | Reachable via `Tab` |
| Trigger = `Enter` or `Space` | Works on buttons and interactive elements |
| `Escape` | Closes modals, dropdowns, tooltips |
| Arrow keys | Navigate within radio groups, tabs, dropdowns |
| Focus trap | Inside open modals — Tab cycles within, not outside |
| Focus restoration | After modal closes → focus returns to trigger element |
| Focus order | Logical, follows visual reading order |
| Skip links | [AAA] "Skip to main content" link for long nav |

**Common failures:**

```tsx
// ❌ div with onClick — not keyboard accessible
<div onClick={handleClick}>Click me</div>

// ✅ button — keyboard + screen reader accessible
<button onClick={handleClick}>Click me</button>

// ❌ custom modal without focus trap
// ✅ use focus-trap-react or manually trap with tabIndex management
```

---

## 3. Semantic HTML & ARIA

### Use semantic elements first — ARIA only when semantic HTML is insufficient

| Use Case | Correct Element |
|---|---|
| Primary page heading | `<h1>` (one per page) |
| Section headings | `<h2>`, `<h3>` in order |
| Navigation | `<nav aria-label="Main">` |
| Main content | `<main>` |
| Buttons | `<button>` |
| Links (navigate) | `<a href>` |
| Form controls | `<input>`, `<select>`, `<textarea>` |
| Lists | `<ul>` / `<ol>` + `<li>` |
| Status messages | `<div role="status" aria-live="polite">` |
| Error messages | `<div role="alert" aria-live="assertive">` |

### ARIA rules

```tsx
// ✅ Icon-only button — always aria-label
<button aria-label="Delete item">
  <TrashIcon />
</button>

// ✅ Decorative icon — aria-hidden
<button>
  <PlusIcon aria-hidden="true" />
  Add item
</button>

// ✅ Input with visible label
<label htmlFor="email">Email</label>
<input id="email" type="email" />

// ✅ Input without visible label
<input aria-label="Search transactions" type="search" />

// ✅ Required field
<input aria-required="true" />

// ✅ Invalid field
<input aria-invalid="true" aria-describedby="email-error" />
<p id="email-error">Enter a valid email address</p>

// ✅ Loading state announced
<button aria-busy="true" aria-disabled="true">
  <Spinner aria-hidden="true" />
  Saving...
</button>

// ✅ Expandable section
<button aria-expanded={isOpen} aria-controls="panel-id">
  Show details
</button>
<div id="panel-id" hidden={!isOpen}>...</div>

// ✅ Modal dialog
<div role="dialog" aria-modal="true" aria-labelledby="modal-title">
  <h2 id="modal-title">Confirm deletion</h2>
  ...
</div>
```

---

## 4. Images & Media

| Element | Requirement |
|---|---|
| Informative images | `alt="description of what it conveys"` |
| Decorative images | `alt=""` |
| Icon images | `alt="icon name"` or `aria-hidden="true"` if paired with text |
| Charts / graphs | Text alternative describing the data |
| Video | Captions for dialogue/sound |
| Audio | Transcript available |

---

## 5. Forms

```tsx
// ✅ Every input has a label (visible or aria-label)
// ✅ Error messages are programmatically associated
// ✅ Required fields marked with aria-required
// ✅ Error summary at top of form if multiple errors
// ✅ Success confirmation announced via aria-live

// ✅ Autocomplete for common fields
<input autoComplete="email" type="email" />
<input autoComplete="current-password" type="password" />
<input autoComplete="name" type="text" />

// ✅ Input type matches expected data
<input type="number" />   // numeric keyboard on mobile
<input type="email" />    // email keyboard on mobile
<input type="tel" />      // phone keyboard on mobile
```

---

## 6. Motion & Animation

```tsx
// ✅ Respect prefers-reduced-motion
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

// In framer-motion:
const shouldReduceMotion = useReducedMotion();
const variants = shouldReduceMotion
  ? { initial: { opacity: 0 }, animate: { opacity: 1 } }   // fade only
  : { initial: { y: 20, opacity: 0 }, animate: { y: 0, opacity: 1 } }; // full
```

Rules:

- No content that flashes more than 3 times per second
- Animations lasting > 5s must be pauseable or stoppable
- Parallax and auto-playing animations must respect `prefers-reduced-motion`

---

## 7. Touch & Mobile

| Rule | Value |
|---|---|
| Minimum touch target | 44×44pt (our standard `h-[60px]` ✓) |
| Touch target spacing | ≥ 8px between adjacent targets |
| Gestures | All swipe/gesture actions have a button alternative |
| Orientation | Content works in both portrait and landscape |
| Zoom | Page works at 200% zoom without horizontal scroll |

---

## 8. Dynamic Content

```tsx
// ✅ Loading state announced
<div aria-live="polite" aria-busy={isLoading}>
  {isLoading ? <Skeleton /> : <Content />}
</div>

// ✅ Success/error toasts announced
<div role="status" aria-live="polite">
  {message}
</div>

// ✅ Error alerts announced immediately
<div role="alert">
  Something went wrong. Try again.
</div>

// ✅ Count changes announced (e.g. cart, notifications)
<span aria-live="polite" aria-atomic="true">
  {count} items
</span>
```

---

## 9. Per-Component Quick Reference

| Component | Key Requirements |
|---|---|
| Button | `<button>`, `aria-label` if icon-only, `aria-busy` when loading |
| Input | `<label>` or `aria-label`, `aria-invalid` on error, `aria-describedby` for hints |
| Modal | `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, focus trap, Escape closes |
| Dropdown | `role="listbox"`, arrow key navigation, `aria-selected` |
| Tabs | `role="tablist"`, `role="tab"`, `aria-selected`, arrow key navigation |
| Toast | `role="status"` (info/success) or `role="alert"` (error) |
| Progress bar | `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax` |
| Toggle/Switch | `role="switch"`, `aria-checked` |
| Skeleton | `aria-hidden="true"` — screen readers should skip loading placeholders |
| List | `<ul>/<ol>` + `<li>`, or `role="list"` if CSS resets list semantics |

---

## 10. Testing

**Manual checks (do these before shipping):**

- [ ] Tab through entire screen — every interactive element reachable
- [ ] Activate all interactions with keyboard only
- [ ] Check with browser zoom at 200%
- [ ] Test with `prefers-reduced-motion` enabled

**Automated checks:**

- [ ] Run axe DevTools browser extension
- [ ] Run Lighthouse accessibility audit (target score ≥ 90)

**Screen reader smoke test [AAA]:**

- [ ] VoiceOver (iOS/macOS) or TalkBack (Android) — navigate key screens
