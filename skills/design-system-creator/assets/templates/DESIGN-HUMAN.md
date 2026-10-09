# [Project Name] — Brand Book & Design System
>
> Version: 1.0 | Last Updated: [DATE]
> 🤖 AI version (rules format): DESIGN-AI.md | Component registry: COMPONENTS.md

---

## 👋 Start Here (New Team Members)

Welcome to the [Project Name] design system. Here's what you need to know to get started:

1. **The product mission** → Read `PURPOSE.md` first. Every design decision traces back to it.
2. **The visual language** → This document. Read Section 1 and 2.
3. **Before creating a component** → Check `COMPONENTS.md`. It probably already exists.
4. **If something looks wrong** → Check `ANTIPATTERNS.md`. It's probably a known bad pattern.
5. **The rules for AI** → `DESIGN-AI.md` is what Cursor/Copilot reads. Keep it in your project context.

---

## 1. Brand Identity

### Who We Are

[2-3 sentences: what is this product, what does it stand for, what feeling should it evoke]

### Visual Personality

| Attribute | Value |
|---|---|
| **Tone** | [e.g., Premium, Confident, Warm] |
| **Aesthetic** | [e.g., Dark Glassmorphism, Minimal, Vibrant] |
| **Target Emotion** | [How should users feel while using this app] |

### Brand Colors at a Glance

| Role | Color | HEX |
|---|---|---|
| 🟢 Primary Accent | [Name] | `#BDFC71` |
| 🟡 Warning | [Name] | `#EAB308` |
| 🔴 Destructive | [Name] | `#EF4444` |
| ⚫ Background | Deep Night | `#090F08` |

---

## 2. Design Tokens

### Colors

#### Backgrounds

| Name | HEX | When to Use |
|---|---|---|
| Deep Night (`bg-primary`) | `#090F08` | Main screen backgrounds |
| Surface (`bg-secondary`) | `#141713` | Cards, elevated sections |

#### Text

| Name | HEX | When to Use |
|---|---|---|
| Primary (`text-primary`) | `#FFFFFF` | Headings, body text, values |
| Secondary (`text-secondary`) | `#9CA3AF` | Timestamps, labels, hints |

#### Accents

| Name | HEX | When to Use |
|---|---|---|
| Yak Green (`accent-primary`) | `#BDFC71` | Primary CTAs, success, highlights |
| Warning (`accent-warning`) | `#EAB308` | Pending states, alerts |
| Destructive (`accent-destructive`) | `#EF4444` | Errors, deletes, outgoing |

> **Rule for developers**: Never write hex values directly in components. Always use the Tailwind token (`text-accent-primary`) or CSS variable (`var(--color-accent-primary)`).

### Typography

| Role | Size | Weight | Use Case |
|---|---|---|---|
| Page Title | 30px / `text-3xl` | 800 ExtraBold | Screen headers |
| Section Title | 20px / `text-xl` | 700 Bold | Modal headers, sections |
| Body | 16px / `text-base` | 400 Regular | Content, descriptions |
| Caption | 14px / `text-sm` | 400 Regular | Timestamps, metadata |

### Spacing Rhythm

| Context | Value | Why |
|---|---|---|
| Touch target height | `60px` | Comfortable thumb tap on mobile |
| Page top padding | `96px` | Clears the sticky glassmorphism header |
| Page bottom padding | `160px` | Clears the bottom navigation bar |

### Border Radius — The Rounding Language

We use heavy rounding consistently. This is a signature of the brand.

| Shape | Radius | Used For |
|---|---|---|
| Pill | `rounded-3xl` (~24px) | All inputs and buttons |
| Super Card | `rounded-[24px]` | Main content cards |
| Row | `rounded-xl` (12px) | List items |
| Circle | `rounded-full` | Icon containers, avatars |

---

## 3. Materials & Textures

Our surfaces feel physical, not flat. We use layering and blur to create depth.

### Glassmorphism

The signature material for headers and bottom sheets.

```
backdrop-blur-xl + bg-white/5 + border border-white/5
```

Use on: sticky headers, `<SpringSheet>` bottom sheets.

### Glassy Card

For main content cards.

```
bg-gray-800/50 + border border-gray-400/5
```

### Grain Textures (`GrainedEffect` component)

Applied to premium card faces for an "analog" feel.

- Fixed: `brushed-metal-gold`, `platinum`, `holographic`, `cyberpunk`
- Overlay: `carbon`, `noise`, `ascii-grid`

---

## 4. Components

### Buttons

All buttons share the same geometry — this is non-negotiable for visual consistency.

```
Height: 60px  |  Border Radius: rounded-3xl
```

| Variant | Background | Text Color | When to Use |
|---|---|---|---|
| Primary | Yak Green `#BDFC71` | Black | The main action on a screen. One per screen. |
| Secondary | Dark `zinc-800` | White | Supporting action |
| Outline | Transparent | White | Ghost/tertiary action |
| Destructive | Red `#EF4444` | White | Delete, irreversible action |

**States all buttons must support:**

- Press → shrinks to 95% scale + light haptic
- Loading → spinner appears, button locked
- Disabled → 50% opacity, unclickable

---

### Inputs

Same geometry as buttons for visual harmony.

```
Height: 60px  |  Border Radius: rounded-3xl  |  Background: zinc-800
```

> ⚠️ Common mistake: using `rounded-lg` or `rounded-xl` on inputs. Always `rounded-3xl`.

---

### Cards

Main cards use our "Super Rounded" signature:

```
rounded-[24px] + bg-gray-800/50 + border border-gray-400/5 + p-4
```

---

### Modals & Bottom Sheets

We use `<SpringSheet>` (preferred) which creates a "floating" bottom sheet with 16px margins on all sides and spring physics. This feels natural and physical.

> ⚠️ Common mistake: controlling modal visibility with `useState` inside a feature. All modals must be registered in `AppModals.tsx` and controlled via global state. This prevents Z-index bugs and makes modals accessible from anywhere.

---

## 5. Motion & Feel

### Philosophy

Animations communicate state changes — they're not decoration. Every transition should say something: "this arrived", "this succeeded", "this is gone".

### Spring Physics

We use spring animations everywhere because they feel physical and organic.

```
stiffness: 400 | damping: 30
```

### Standard Patterns

| Pattern | Animation | Used For |
|---|---|---|
| Item enters | Slides up 20px + fades in | Cards, list items appearing |
| Item exits | Scales to 95% + fades out | Dismissals, deletes |
| List | Staggered entrance (50ms per item) | All lists via `<StaggeredList>` |
| Modal | Spring from bottom | `<SpringSheet>` |

### Haptic Feedback

Physical vibration is part of the experience — not an afterthought.

| Action | Haptic |
|---|---|
| Any button tap | Light impact |
| Transaction saved | Success notification |
| Error or cancel | Error notification |

---

## 6. Voice UI (VUI)

Voice input is the primary transaction capture method — the "Yak Heart" of the product.

### RecordButton

The most prominent element on the main screen. States:

- **Idle**: Blue gradient + microphone icon
- **Recording**: Red gradient + stop icon + pulsing red wave
- **Processing**: Spinner, locked

### After Recording

A `<ProposalCard>` appears with the parsed transaction — amount, category suggestion, and confirm/edit options. User can confirm with one tap or wait 2 seconds for auto-confirm.

---

## 7. User Journey

### Golden Path (Primary)

```
Open app
  → See balance overview
  → Tap RecordButton
  → Speak ("500 on lunch")
  → ProposalCard appears with "Food" category
  → Confirm (tap or 2s auto)
  → Success haptic + animation
  → Transaction saved
```

### Design Principle Behind This

Every step in this path was chosen to remove friction. The voice input eliminates typing. The auto-confirm eliminates a tap. The haptic makes success feel real.

---

## 8. Architecture for Developers

### Folder Structure

```
src/
  features/     ← ALL business logic. New screens live here.
  shared/ui/    ← UI components only. No business logic.
  entities/     ← Domain models (transaction, category...)
  core/         ← Global state (Jotai atoms), contexts, types
```

### Key Rules

| Rule | What It Means |
|---|---|
| 500-line limit | If a file gets long, split into hook + sub-components + utils |
| Modal registry | All modals in `AppModals.tsx`, never `useState` locally |
| Absolute imports | Use path aliases, never `../../..` chains |
| Full names | `transactionIndex` not `txIdx` — code is read more than written |

---

## 9. Platforms

| Platform | Status | Key Differences |
|---|---|---|
| Web | [Active/Planned] | _Not yet defined_ |
| Telegram Mini-App | [Active/Planned] | _Not yet defined_ |
| Desktop | [Active/Planned] | _Not yet defined_ |

---

## 10. Decision Log

> This section records _why_ we made certain choices. Understanding the reasoning prevents future regressions.

| Date | Decision | Reason |
|---|---|---|
| [DATE] | [What was decided] | [Why — what problem it solved] |
