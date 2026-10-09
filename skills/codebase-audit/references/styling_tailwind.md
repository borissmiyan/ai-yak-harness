# Styling & Tailwind CSS Audit Reference

## Table of Contents

1. [Ad-hoc Hex Colors](#1-ad-hoc-hex-colors)
2. [String Concatenation for Classes](#2-string-concatenation-for-classes)
3. [Component-Specific Magic Numbers](#3-component-specific-magic-numbers)
4. [Touch Targets & Accessibility](#4-touch-targets--accessibility)
5. [Tailwind CSS v4 Configuration](#5-tailwind-css-v4-configuration)

---

## 1. Ad-hoc Hex Colors

### Constraint

Using raw hex strings (e.g., `text-[#FF5733]`) directly in components is **prohibited**. Always use the project's design system tokens or CSS variables defined in the theme.

### Bad

```tsx
// ❌ Ad-hoc magic color
<div className="bg-[#ff0000] border border-[#00ff00]">
  <span className="text-[#0000ff]">Active</span>
</div>
```

### Good

```tsx
// ✅ Design system variables
<div className="bg-bg-primary border border-bg-secondary">
  <span className="text-accent-primary">Active</span>
</div>
```

### Self-Correction Rule

If you see `bg-[#` or `text-[#` inside a component's JSX → **WARNING: Ad-hoc hex color**.

---

## 2. String Concatenation for Classes

### Constraint

Do not construct `className` strings using the `+` operator or complex template literals. Always use a utility function like `cn()` or `clsx()` for conditional styling.

### Bad

```tsx
// ❌ Fragile string concatenation
<button className={"px-4 py-2 " + (isActive ? "bg-blue-500" : "bg-gray-500")}>
```

### Good

```tsx
// ✅ clsx/cn utility
<button className={cn(
  "px-4 py-2",
  isActive ? "bg-primary" : "bg-secondary"
)}>
```

---

## 3. Component-Specific Magic Numbers

### Constraint

Avoid hardcoding arbitrary pixel values for padding, margin, or border-radius unless they are part of a specific one-off design requirement. Prefer standard spacing scales and theme tokens.

### Self-Correction Rule

If a component uses many ad-hoc `p-[17px]` or `rounded-[11px]` values → **WARNING: Magic Number Styling**.

---

## 4. Touch Targets & Accessibility

### Constraint

Interactive elements intended for touch interfaces must have sufficient size (typically at least `44px` to `60px` depending on project requirements).

### Self-Correction Rule

If a main action button or input has a height/width significantly smaller than standard touch targets (e.g., `< 40px`) → **WARNING: Accessibility Violation**.

---

## 5. Tailwind CSS v4 Configuration

### Constraint

Tailwind v4 prioritizes **CSS-first configuration**. Brand variables and theme extensions should be defined in the `@theme` block of your main CSS file rather than nested deep in `tailwind.config.js`.

### Self-Correction Rule

If attempting to add new colors or spacing to a legacy JS config file in a v4 project → **WARNING: Configuration Anti-pattern**. Move to CSS theme variables.
