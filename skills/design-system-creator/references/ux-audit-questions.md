# UX Audit Questions

Use this file when generating UX improvement suggestions in DESIGN-HUMAN.md Section 7.
For each user path, run through the relevant question groups below.
A "No" or "Unclear" answer = a suggestion to write.

---

## Group 1 — Friction Audit (Every Path)

| # | Question | Good Answer | Bad Answer |
|---|---|---|---|
| F1 | How many taps from app open to primary action? | ≤ 2 | > 3 |
| F2 | Does every screen have a single obvious primary action? | Yes | Multiple competing CTAs |
| F3 | Are there any confirmation dialogs for reversible actions? | No — use undo instead | Yes |
| F4 | Does the form auto-focus the first input? | Yes | No |
| F5 | Are smart defaults used (last category, last account)? | Yes | User fills everything from scratch |
| F6 | Can the primary action be triggered one-handed? | Yes | Requires two hands or awkward reach |
| F7 | Are there any dead-end screens (no CTA, no back)? | No | Yes |

---

## Group 2 — Feedback Audit (Every Interaction)

| # | Question | Good Answer | Bad Answer |
|---|---|---|---|
| FB1 | Does every button press have haptic feedback? | Yes | No |
| FB2 | Does every async action show a loading state? | Yes | UI freezes silently |
| FB3 | Does every error have a recovery CTA (retry / fix)? | Yes | Error shown with no way forward |
| FB4 | Is success communicated before returning to previous screen? | Yes, briefly | Silent transition |
| FB5 | Are skeleton loaders used instead of spinners for content? | Yes | Spinner on full content areas |
| FB6 | Does optimistic UI apply (show result before server confirms)? | Where appropriate | Always waits for server |

---

## Group 3 — Empty & Edge States

| # | Question | Good Answer | Bad Answer |
|---|---|---|---|
| E1 | Is there an empty state for every list that can be empty? | Yes, with onboarding CTA | Blank screen |
| E2 | Is there an offline state? (cached data + badge) | Yes | App breaks without network |
| E3 | What happens if voice recognition fails? | Clear error + retry | Silent failure |
| E4 | What happens if a required API is unavailable? | Graceful degradation | Crash or blank |
| E5 | Are 0-value amounts handled visually? (e.g. $0.00 balance) | Yes, distinct style | Looks like a bug |

---

## Group 4 — Navigation & Orientation

| # | Question | Good Answer | Bad Answer |
|---|---|---|---|
| N1 | Can the user always tell where they are in the app? | Yes (header, active tab) | Disorienting |
| N2 | Is back/close always accessible without gesture? | Yes | Trap screens |
| N3 | Does the bottom sheet have a drag handle + swipe-down dismiss? | Yes | Only close button |
| N4 | Is the active tab in bottom nav visually distinct? | Yes | Hard to tell |
| N5 | Do modals have a clear dismiss area (backdrop tap)? | Yes | Must find X button |

---

## Group 5 — Performance Perception

| # | Question | Good Answer | Bad Answer |
|---|---|---|---|
| P1 | Do screens render instantly with skeleton, then fill in? | Yes | White flash then content |
| P2 | Are list animations staggered (not all at once)? | Yes, via StaggeredList | All pop in simultaneously |
| P3 | Are heavy operations (AI, sync) done in background? | Yes | Blocks UI |
| P4 | Is there a perceived progress indicator for long operations? | Yes | Spinner with no context |

---

## Group 6 — Financial Domain Specifics

| # | Question | Good Answer | Bad Answer |
|---|---|---|---|
| D1 | Are all amounts formatted with `Intl.NumberFormat`? | Yes | Raw numbers, wrong decimals |
| D2 | Is color + icon used for income vs expense (not color alone)? | Yes | Color only (fails a11y) |
| D3 | Are large numbers abbreviated consistently? ($1.2K, not $1,234.56)? | If abbreviated, consistently | Mixed formats |
| D4 | Is the user's financial "health" visible on the home screen? | Yes, at a glance | Buried in analytics |
| D5 | Are debt amounts visually distinct from regular expenses? | Yes | Same style |

---

## Group 7 — Voice UI Specifics

| # | Question | Good Answer | Bad Answer |
|---|---|---|---|
| V1 | Is the RecordButton the most visually prominent element on the main screen? | Yes | Competing with other elements |
| V2 | Does the recording state make it unmistakably obvious the mic is active? | Yes (red, pulsing, changed icon) | Subtle change |
| V3 | Can the user edit the AI-parsed result before confirming? | Yes | Forced to accept or redo |
| V4 | Is the ProposalCard dismissible with swipe? | Yes | Only tap |
| V5 | What happens if the user speaks in the wrong language? | Fallback to manual input | Silent fail |

---

## How AI Should Use This File

When generating Section 7 (UX Audit) in DESIGN-HUMAN.md:

1. For each user path identified in Section 6, run through relevant groups above
2. For every "No" or "Unclear" answer, write one suggestion in this format:

```
**Problem**: [question that failed]
**Proposed Fix**: [specific change — component, behavior, copy]
**Expected Impact**: [what improves for the user]
```

Prioritize by severity: Friction > Feedback > Edge States > Navigation > Performance > Domain.
