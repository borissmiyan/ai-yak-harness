# 🎨 UI Design System & Component Rules (`src/shared/ui/`)

> **Domain:** Atomic components, modals, inputs, layout containers, and design tokens.

---

## 🎯 Architectural Principles

1. **Design System Compliance**:
   - Strictly follow tokens in `DESIGN-AI.md`.
   - Before creating any new UI component, check `COMPONENTS.md` to prevent duplicates.
   - When a component is created or modified, update `COMPONENTS.md`.

2. **Mobile-First & Touch Targets**:
   - Minimum interactive touch height on primary inputs/buttons: `48px` (desktop) / `56-60px` (mobile).
   - Card radius and input radius must match design token constants.

3. **Vector Icons Only (No Raw Emojis)**:
   - Use vector icons (e.g. `lucide-react`) exclusively.
   - Never render raw emojis (⚡, 🛡️, 🟢) in buttons, headers, or status badges.

---

## 🚫 Forbidden Antipatterns

- ❌ Files exceeding 500 lines (Hard Ceiling) or 300 lines (Warning). Target size for UI-Kit is 50–150 clean lines.
- ❌ Heavy presentation components: if JSX > 40-50 lines, isolate sub-components.
- ❌ Business logic or direct network fetching inside presentation components.
