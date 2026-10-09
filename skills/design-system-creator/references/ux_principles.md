# UX Principles for Premium Mobile Interfaces

## 1. Zero Friction Principle

Every interaction should require the minimum possible steps.

- One-tap for the most common action
- Smart defaults eliminate choice paralysis
- Auto-confirmation with undo is better than confirmation dialogs

## 2. Haptic Feedback as a Language

Haptics are not decoration — they are tactile confirmation.

- Light impact: casual interactions (taps, selections)
- Medium impact: significant actions (saves, confirms)
- Heavy / error pattern: destructive or failed actions
- Never fire haptics on passive/scroll interactions

## 3. Motion with Meaning (Not Decoration)

Every animation must communicate something:

- Entrance: "This content is arriving for your attention"
- Exit: "This is gone, task is done"
- Spring physics: organic, feels physical, not mechanical
- Never animate things that don't need attention drawn to them

## 4. Progressive Disclosure

Show only what the user needs right now.

- Primary action is always above the fold
- Advanced options hidden behind secondary tap
- Context-aware suggestions reduce cognitive load

## 5. Financial Clarity (Domain-Specific)

Money needs absolute visual precision:

- Use `Intl.NumberFormat` — never raw string concatenation
- Color semantics: Green = income/growth, Red = expense/loss, Yellow = pending
- Never truncate amounts — if it doesn't fit, reformat

## 6. Voice-First Consideration

When VUI exists, it must be the path of least resistance:

- The record button must be the most visually prominent element
- Visual feedback must react in real-time to audio levels
- Result card must appear immediately after recognition

## 7. Consistent Gesture Grammar

Users build muscle memory — never change a gesture's meaning:

- Swipe left = destructive (delete/archive)
- Long press = enter edit/drag mode
- Swipe down = dismiss modal
- Never reassign these without explicit user education

## 8. State Completeness

Every component must gracefully handle all states:

1. Default
2. Loading (skeleton, not spinner where possible)
3. Error (with recovery CTA)
4. Empty (with onboarding CTA)
5. Offline (cached data + offline badge)
6. Success (confirmation feedback, then return to default)

## 9. Accessibility Non-Negotiables

- All interactive elements must have `aria-label` or `aria-labelledby`
- Touch targets minimum 44x44pt (our standard is 60px ✓)
- Color alone must never be the only signal (pair with icon or text)
- Text contrast: 4.5:1 for body, 3:1 for large text

## 10. Typography Hierarchy

Three levels maximum on any single screen:

- Hero: Page title or key metric
- Primary: Content, list items
- Secondary: Metadata, captions
Never use more than 2 font weights per screen.
