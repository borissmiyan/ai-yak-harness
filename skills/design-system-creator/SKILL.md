---
name: design-system-creator
description: >
  Extracts, generates, and maintains a full design system suite for any frontend codebase.
  Produces four documents: DESIGN-AI.md (machine-readable rules for Cursor/Copilot),
  DESIGN-HUMAN.md (readable brand book for team onboarding), COMPONENTS.md (flat component
  registry to prevent duplicates), and ANTIPATTERNS.md (forbidden patterns with examples).
  Also maintains PURPOSE.md (product mission).

  Trigger this skill whenever the user says: "generate design system", "create brandbook",
  "sync design system", "scan components", "regenerate DESIGN.md", "update design docs",
  "document my UI", "add to design system", or starts a new feature/platform and needs
  alignment. Also trigger when the user pastes Tailwind config, component code, or design
  rules and wants to formalize them.

  CRITICAL: Also trigger when AI is about to create a new UI component — check COMPONENTS.md
  first to prevent duplicates.
---

# Design System Creator

## Output Suite

Every project gets these files (in `docs/design/` or project root):

| File | Audience | Purpose |
|---|---|---|
| `DESIGN-AI.md` | AI agents (Cursor, Copilot, Claude) | Machine-readable rules. IF/THEN format. Read before every UI task. |
| `DESIGN-HUMAN.md` | Developers, designers, new team members | Readable brand book. Visual examples, rationale, onboarding guide. |
| `COMPONENTS.md` | AI agents + developers | Flat registry of every component. Check before creating new ones. |
| `ANTIPATTERNS.md` | AI agents | Forbidden patterns with real examples. Updated when violations found. |
| `PURPOSE.md` | Everyone | Product mission. North star for all decisions. |

Templates for all files: `assets/templates/`

---

## Commands

The skill responds to these explicit commands:

| Command | Action |
|---|---|
| `generate design system` | Full generation from scratch — Phases 0→4 |
| `sync design system` / `regenerate` | UPDATE mode — scan, diff, patch only what changed |
| `add component [Name]` | Add one component to COMPONENTS.md + both DESIGN files |
| `log antipattern` | User describes a violation → append to ANTIPATTERNS.md |
| `switch project [name]` | Switch active project context (multi-project support) |
| `design system status` | Show what's documented, what's missing, last sync date |
| `add feature [name]` | Create feature folder structure + fill FEATURE-CHECKLIST.md |
| `check violations` | Run check_design_violations.py mentally or via bash — report issues |
| `diff components` | Run diff_components.py — show undocumented or missing components |
| `generate changelog` | Run generate_changelog.py — parse git log → Decision Log entries |

---

## Phase 0 — Orientation (Always First)

### 0.1 Project Detection

Check if multiple projects exist by looking for:

- Multiple `package.json` files in subdirs
- A `projects.json` or `workspaces` field in root `package.json`
- Multiple `src/` directories

If multiple projects detected → ask:
> "I see multiple projects. Which one should I document? Or should I generate cross-platform docs covering all of them?"

Store the active project name in the doc header as `Project: [name] | Platform: [TG/Web/Desktop/All]`.

### 0.2 PURPOSE.md Check

Look for `PURPOSE.md` in `docs/`, `docs/design/`, or root.

If absent → ask the user:
> "What's the core goal of this app, who are the users, and what problem does it solve? This becomes PURPOSE.md — the north star for every design decision."

Save using `assets/templates/PURPOSE.md`.

### 0.3 Existing Docs Check

- If `DESIGN-AI.md` exists → read it, enter **UPDATE mode**
- If absent → enter **GENERATE mode**
- Always check `COMPONENTS.md` exists — if not, create it even in update mode

---

## Phase 1 — Codebase Scan

Run the scanner:

```bash
python scripts/scan_design_system.py --root ./src --output /tmp/scan_results.md
```

If unavailable, manually scan in this priority order:

| # | Path | Extract |
|---|---|---|
| 1 | `src/app/app.css` or `tailwind.config.*` | Tokens: colors, spacing, radius, fonts |
| 2 | `src/shared/ui/**/*.tsx` | All shared components + variants + props |
| 3 | `src/features/**/components/*.tsx` | Feature UI patterns |
| 4 | `src/shared/ui/animations/` | Motion configs, spring values |
| 5 | `src/entities/**/ui/*.tsx` | Domain display components |
| 6 | `*.stories.*`, `*.md` in UI folders | Already documented states |

**Per file, extract:**

- Component name + exact file path + platform tag (if detectable)
- Tailwind classes used (colors, radius, height, padding)
- Variants / props / states visible in code
- framer-motion variants and transition configs
- Gesture handlers (swipe, drag, long press)
- Haptics calls
- Any `useState` managing visibility (= antipattern flag)
- Lines count (>500 = flag)
- Presence of `aria-*` attributes

---

## Phase 2 — Generate / Update Documents

### GENERATE Mode

Create all 5 files from templates. Fill every section. Mark `_Not yet defined_` where data is missing — never skip a section.

Follow templates:

- `assets/templates/DESIGN-AI.md`
- `assets/templates/DESIGN-HUMAN.md`
- `assets/templates/COMPONENTS.md`
- `assets/templates/ANTIPATTERNS.md`
- `assets/templates/PURPOSE.md`

### UPDATE Mode (Regenerate / Sync Command)

**Golden rule: never delete, only add or deprecate.**

Steps:

1. Run Phase 1 scan
2. Read all existing docs
3. Diff scan results against existing docs
4. For each change found:
   - **New token/component** → append to relevant section, tag `[Added: YYYY-MM-DD]`
   - **Changed pattern** → update the entry, tag `[Updated: YYYY-MM-DD]`, move old value to Decision Log as "Previous behavior"
   - **Removed component** → mark `[DEPRECATED: YYYY-MM-DD]`, do NOT delete the entry
   - **New violation found** → append to ANTIPATTERNS.md
5. Append entry to Decision Log in both DESIGN files
6. Never touch sections that have not changed

---

## Phase 3 — Quality Checklist

Before delivering, verify:

**Tokens**

- [ ] Every hex color in codebase has a token entry
- [ ] No raw hex values used directly in components
- [ ] All spacing values documented

**Components**

- [ ] Every interactive component has all 6 states: Default / Hover / Active / Disabled / Loading / Error
- [ ] Missing states flagged as `⚠️ Missing state`
- [ ] Every component in COMPONENTS.md has: name, path, platform, status, last updated

**Cross-platform**

- [ ] Each component tagged: `[TG]` / `[Web]` / `[Desktop]` / `[All]`
- [ ] Platform-specific overrides documented

**Antipatterns**

- [ ] All `useState` modal violations from scan are logged
- [ ] All files >500 lines flagged
- [ ] All components missing aria-* flagged

**Accessibility (ref: accessibility-checklist.md)**

- [ ] All interactive elements keyboard-reachable
- [ ] Icon-only buttons have aria-label
- [ ] Modals have role="dialog" + focus trap
- [ ] Dynamic content updates use aria-live
- [ ] Color is not the only signal for any state

**Typography (ref: typography-scale.md)**

- [ ] tabular-nums on all changing numbers
- [ ] No text truncation on headings
- [ ] Line lengths within 45–75 char optimal range

**Structure**

- [ ] DESIGN-AI.md starts with Quick Reference (most-violated rules first)
- [ ] DESIGN-HUMAN.md has "Start Here" section for new team members
- [ ] Both files link to each other in headers
- [ ] Files >800 lines → split and link

---

## Phase 4 — Deliver

Write all files to `docs/design/`. Report to user:

- Files created/updated
- Tokens: N | Components: N new, N updated, N deprecated
- Antipatterns logged: N
- Sections still `_Not yet defined_`: [list]
- Top 3 UX suggestions

---

## Multi-Project Support

When working across multiple projects (Web + TG + Desktop):

```
docs/design/
  shared/
    DESIGN-AI.md        ← shared tokens + global rules
    DESIGN-HUMAN.md     ← shared brand book
    ANTIPATTERNS.md     ← shared forbidden patterns
  web/
    COMPONENTS.md
    DESIGN-AI.md        ← web overrides (extends shared)
  telegram/
    COMPONENTS.md
    DESIGN-AI.md        ← TG overrides
```

Shared docs contain `[All]` items only. Platform docs contain only overrides/additions.

---

## Reference Files

Read relevant reference files during the phase that needs them — not all upfront.

| File | Read During | Purpose |
|---|---|---|
| `assets/templates/DESIGN-AI.md` | Phase 2 | Template for AI rules document |
| `assets/templates/DESIGN-HUMAN.md` | Phase 2 | Template for human brand book |
| `assets/templates/COMPONENTS.md` | Phase 2 | Template for component registry |
| `assets/templates/ANTIPATTERNS.md` | Phase 2 | Template for forbidden patterns |
| `assets/templates/PURPOSE.md` | Phase 0 | Template for product mission |
| `references/ux_principles.md` | Phase 2, Section 7 | Core UX principles (background context) |
| `references/ux-audit-questions.md` | Phase 2, Section 7 | Structured questions for UX audit — generates suggestions |
| `references/component-states.md` | Phase 2, Section 3 | Exact class recipes for all 6 states per component |
| `references/platform-constraints.md` | Phase 2, platform sections | TG / Web / Desktop API limits and layout rules |
| `references/naming-conventions.md` | Phase 2 + any new file creation | Naming rules for files, variables, hooks, atoms, CSS |
| `references/animation-catalog.md` | Phase 2, Section 4 | Exact framer-motion configs per animation type |
| `references/copy-tone-guide.md` | Phase 2 + any UI text | Brand voice, vocabulary, empty states, errors, button labels |
| `references/icon-system.md` | Phase 2 + any new component | Icon library, sizes, standard map, a11y rules |
| `references/accessibility-checklist.md` | Phase 2 + Phase 3 QA | WCAG 2.1 AA rules — contrast, keyboard, ARIA, forms, motion |
| `references/typography-scale.md` | Phase 2, tokens section | Type scale, line length, multilingual, number formatting |
| `scripts/scan_design_system.py` | Phase 1 | Full codebase scanner — tokens, components, violations |
| `scripts/check_design_violations.py` | Phase 3 + CI | Fast linter for antipatterns — run before ship |
| `scripts/diff_components.py` | Update mode | Diffs COMPONENTS.md vs codebase — finds undocumented/missing |
| `scripts/generate_changelog.py` | Update mode | Parses git log → generates Decision Log entries ready to paste |
| `assets/templates/FEATURE-CHECKLIST.md` | `add feature` command | Per-feature checklist — structure, states, a11y, i18n, ship criteria |
