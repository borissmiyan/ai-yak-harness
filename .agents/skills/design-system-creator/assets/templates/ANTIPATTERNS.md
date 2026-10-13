# ANTIPATTERNS.md — Forbidden Patterns
>
> Project: [name] | Last Updated: [DATE]
> This file grows over time. Add new entries whenever a violation is found.

## How to Use

AI agents: **Read this entire file before writing any UI code.** These are real mistakes that have been made in this codebase. Do not repeat them.

Developers: When you catch a violation in code review or find a recurring mistake, add it here.

---

## AP-001 — Wrong Border Radius on Inputs and Buttons

**Severity:** 🔴 Critical — breaks visual consistency

**What AI does wrong:**

```tsx
// ❌ WRONG
<input className="h-[60px] rounded-lg bg-zinc-800" />
<button className="h-[60px] rounded-xl">Submit</button>
<button className="h-12 rounded-md">Submit</button>
```

**Correct:**

```tsx
// ✅ CORRECT
<input className="h-[60px] rounded-3xl bg-zinc-800 border border-zinc-700" />
<button className="h-[60px] rounded-3xl bg-accent-primary text-black">Submit</button>
```

**Rule:** `rounded-3xl` on ALL inputs and buttons. `rounded-[24px]` on cards. No exceptions.

---

## AP-002 — Modal Visibility via useState

**Severity:** 🔴 Critical — causes Z-index bugs, prevents global access

**What AI does wrong:**

```tsx
// ❌ WRONG — inside a feature component
const [isModalOpen, setIsModalOpen] = useState(false);
return (
  <>
    <button onClick={() => setIsModalOpen(true)}>Open</button>
    {isModalOpen && <MyModal onClose={() => setIsModalOpen(false)} />}
  </>
);
```

**Correct:**

```tsx
// ✅ CORRECT — register modal in AppModals.tsx, control via global store
// In AppModals.tsx:
// { id: 'my-modal', component: MyModal }

// In feature:
const openModal = useModalStore(state => state.open);
return <button onClick={() => openModal('my-modal')}>Open</button>;
```

**Rule:** ALL modals registered in `src/shared/ui/modals/AppModals.tsx`. Controlled via Jotai atom or URL param.

---

## AP-003 — Raw Hex Colors in Components

**Severity:** 🟡 High — breaks theme consistency, makes future rebrands painful

**What AI does wrong:**

```tsx
// ❌ WRONG
<div className="bg-[#090F08] text-[#BDFC71]">
<div style={{ color: '#9CA3AF' }}>
```

**Correct:**

```tsx
// ✅ CORRECT
<div className="bg-bg-primary text-accent-primary">
<div className="text-text-secondary">
// or via CSS variables:
<div style={{ color: 'var(--color-text-secondary)' }}>
```

**Rule:** Every color must be a Tailwind token or CSS variable. No hex literals in component code.

---

## AP-004 — Wrong Interactive Element Height

**Severity:** 🟡 High — breaks touch usability on mobile

**What AI does wrong:**

```tsx
// ❌ WRONG
<button className="h-10 rounded-3xl">    // 40px — too small
<button className="py-3 rounded-3xl">    // inconsistent
<input className="h-12 rounded-3xl" />  // 48px — too small
```

**Correct:**

```tsx
// ✅ CORRECT — always h-[60px] for interactive elements
<button className="h-[60px] rounded-3xl">
<input className="h-[60px] rounded-3xl" />
```

**Rule:** `h-[60px]` for ALL buttons, inputs, and tappable row items.

---

## AP-005 — Using Raw `motion.div` Instead of Shared Wrappers

**Severity:** 🟠 Medium — inconsistent animation behavior, harder to maintain

**What AI does wrong:**

```tsx
// ❌ WRONG
import { motion } from 'framer-motion';
<motion.div animate={{ opacity: 1 }} initial={{ opacity: 0 }}>
```

**Correct:**

```tsx
// ✅ CORRECT
import { MotionDiv } from 'shared/ui/animations/MotionComponents';
<MotionDiv>  // uses project-standard spring config
```

**Rule:** Use `MotionDiv`, `MotionList` from `shared/ui/animations/MotionComponents.tsx`.

---

## AP-006 — Creating a Component That Already Exists

**Severity:** 🟠 Medium — duplicated code, diverging implementations

**Prevention:**
Before creating any new component, search `COMPONENTS.md` for it.
Common ones AI forgets exist: `PrimaryButton`, `TextInput`, `MainCard`, `SpringSheet`, `StaggeredList`, `EmptyState`.

---

## AP-007 — File Over 500 Lines

**Severity:** 🟠 Medium — violates project architecture rules

**What AI does wrong:**
Building one large component file with all logic, sub-components, and helpers inline.

**Correct — split immediately when approaching 500 lines:**

```
feature/
  MyFeature.tsx           ← UI only, stays <200 lines
  hooks/
    useMyFeatureLogic.ts  ← all business logic
  components/
    MySubComponent.tsx    ← extracted UI pieces
  utils.ts                ← pure helper functions
```

---

## AP-008 — Missing Haptic Feedback on Interactions

**Severity:** 🟢 Low — degrades feel of the app

**What AI does wrong:**
Adding buttons and interactive elements without calling haptics.

**Correct:**

```tsx
// ✅ Always add on interactive elements
onClick={() => {
  HapticFeedback.impact('light');
  handleAction();
}}
```

---

## How to Add a New Antipattern

When you find a new violation, add it at the bottom following this format:

```markdown
## AP-00N — [Short Name]

**Severity:** 🔴 Critical / 🟡 High / 🟠 Medium / 🟢 Low

**What AI does wrong:**
\`\`\`tsx
// ❌ WRONG
[code example]
\`\`\`

**Correct:**
\`\`\`tsx
// ✅ CORRECT
[code example]
\`\`\`

**Rule:** [One-sentence rule to remember]
```
