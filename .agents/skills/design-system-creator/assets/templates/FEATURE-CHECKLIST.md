# Feature Checklist: [Feature Name]

> Created: [DATE] | Platform: [TG/Web/Desktop/All] | Developer: [name]
> Trigger: add this file to `src/features/[feature-name]/CHECKLIST.md` when starting a new feature.

Fill each checkbox as you complete it. Do not ship until all ✅ Critical items are checked.

---

## 📁 Structure

- [ ] Feature folder created: `src/features/[feature-name]/`
- [ ] Main page component: `[FeatureName]Page.tsx`
- [ ] Business logic extracted to hook: `hooks/use[FeatureName]Logic.ts`
- [ ] Sub-components in: `components/`
- [ ] Helpers in: `utils.ts`
- [ ] Types in: `types.ts`
- [ ] Public API exported from: `index.ts`
- [ ] No file exceeds 500 lines

---

## 🎨 Design Tokens (Critical)

- [ ] All colors use Tailwind tokens or CSS variables (no raw hex)
- [ ] All inputs use `h-[60px] rounded-3xl`
- [ ] All buttons use `h-[60px] rounded-3xl`
- [ ] Cards use `rounded-[24px] bg-gray-800/50`
- [ ] Page wrapped in `<PageLayout>` with correct padding (`pt-24 pb-40`)
- [ ] Sticky header uses glassmorphism: `bg-bg-primary/80 backdrop-blur-xl`

---

## 🧩 Components (Critical)

- [ ] Checked `COMPONENTS.md` before creating any new component
- [ ] No duplicate components created
- [ ] New components added to `COMPONENTS.md` (name, path, platform, status)
- [ ] Reused existing: `StaggeredList`, `SpringSheet`, `PrimaryButton`, `TextInput`, etc.

---

## 📋 Component States

Every interactive component in this feature must have:

- [ ] Default state
- [ ] Hover state (web)
- [ ] Active / Press state (`scale-95` + haptic)
- [ ] Disabled state (`opacity-50 pointer-events-none`)
- [ ] Loading state (skeleton or spinner)
- [ ] Error state (with recovery CTA)
- [ ] Empty state (with onboarding CTA) — for lists/content areas

---

## 🏛️ Modal Management (Critical)

- [ ] No `useState` used for modal visibility
- [ ] All modals registered in `src/shared/ui/modals/AppModals.tsx`
- [ ] Modal state controlled via Jotai atom or URL param

---

## 🎭 Animations

- [ ] Uses `MotionDiv` / `MotionList` from `shared/ui/animations/MotionComponents`
- [ ] No raw `<motion.div>` used
- [ ] List items use `<StaggeredList>`
- [ ] Interactive elements have `whileTap={{ scale: 0.95 }}`
- [ ] Spring configs from `presets.ts` (not custom durations)

---

## 📳 Haptics

- [ ] All button presses call `HapticFeedback.impact('light')`
- [ ] Success actions call `HapticFeedback.notification('success')`
- [ ] Error / cancel calls `HapticFeedback.notification('error')`

---

## 📝 Copy & Text

- [ ] All user-facing strings follow `copy-tone-guide.md`
- [ ] No raw "Error" labels — descriptive messages only
- [ ] Empty state has: short observation + invitation + CTA
- [ ] Destructive confirmations are calm, not alarming
- [ ] Amounts formatted with `Intl.NumberFormat`
- [ ] No hardcoded currency symbols — use i18n/format utilities

---

## ♿ Accessibility

- [ ] All icon-only buttons have `aria-label`
- [ ] Decorative icons have `aria-hidden="true"`
- [ ] Form inputs have associated labels (`htmlFor` / `aria-label`)
- [ ] Interactive elements reachable by keyboard (Tab + Enter/Space)

---

## 🌍 i18n

- [ ] No hardcoded UI strings — all via i18n keys
- [ ] No hardcoded locale-specific formatting (dates, numbers, currency)
- [ ] New i18n keys added to all locale files

---

## 🖥️ Platform

- [ ] Tested on: [ ] iOS  [ ] Android  [ ] Web  [ ] Desktop (check relevant)
- [ ] Platform-specific behavior documented in `COMPONENTS.md` or `DESIGN-AI.md`
- [ ] TG-specific: uses `Telegram.WebApp` APIs where needed (not `window.open`, etc.)

---

## 🧪 Before Ship

- [ ] `python scripts/check_design_violations.py --root ./src --strict` passes
- [ ] `python scripts/diff_components.py` shows no undocumented components
- [ ] Manual smoke test on primary platform
- [ ] Decision log updated in `DESIGN-AI.md` and `DESIGN-HUMAN.md` if any design decisions were made

---

## 📌 Notes

<!-- Any context, decisions, or trade-offs made during this feature -->