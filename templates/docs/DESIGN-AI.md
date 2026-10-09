# DESIGN-AI.md — Design System Rules for AI Agents

> Project: [Your Project Name] | Platform: Web / Mobile / Desktop  
> Companion Docs: `COMPONENTS.md` | `ANTIPATTERNS.md` | `PURPOSE.md`

---

## ⚡ QUICK REFERENCE — Read This First

```text
GLOBAL TYPOGRAPHY:        Inter / Roboto / System sans  ← Strict font hierarchy. Tabular numbers for tables.
INTERACTIVE TOUCH HEIGHT: h-12 (48px) to h-15 (60px)    ← Large, tactile touch targets.
CARD RADIUS:              rounded-2xl (16px)            ← Unified card borders across the UI.
INPUT RADIUS:             rounded-xl (12px)             ← Consistent input corners.
MODAL / SHEET PATTERN:    Bottom sheet / Modal          ← Smooth transitions, background overlay blur.
ICON SYSTEM:              Vector icons (Lucide React)   ← ZERO raw emojis in JSX or buttons.
COLOR SYSTEM:             Design tokens / Tailwind      ← No raw ad-hoc hex values.
MAX FILE LENGTH:          500 lines max                 ← Split into hooks/subcomponents if exceeded.
NEW COMPONENT:            Check COMPONENTS.md first     ← Never create duplicate UI elements.
```

---

## 🎨 Color Palette & Contrast Tokens

- **Backgrounds:** Dark/Light base tokens (e.g. `bg-zinc-950`, `bg-zinc-900`, `bg-zinc-800`).
- **Borders:** Subtle contrasting borders (e.g. `border-zinc-800`, `border-white/10`).
- **Text:** High-contrast hierarchy (`text-white`, `text-zinc-400`, `text-zinc-500`).
- **Accents:** Semantic actions (`bg-indigo-600 hover:bg-indigo-500`, `text-emerald-400`).

---

## 🔠 Typography Tokens

- Use `tabular-nums` for all numeric lists, counters, timestamps, and currency amounts.
- Never use raw monospace fonts for standard tabular data unless explicitly displaying source code.
