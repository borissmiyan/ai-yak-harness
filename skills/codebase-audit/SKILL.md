---
name: codebase-audit
description: "Deep architectural, performance, and security audits for React/TypeScript/Supabase/Zustand/Dexie.js/Telegram Mini Apps codebases. Use when performing code reviews, detecting anti-patterns, checking for violations of YAGNI/DRY/WET/KISS principles, finding performance leaks (re-renders, memory, N+1 queries), identifying offline-sync race conditions, auditing TMA/Supabase security, or cleaning up AI-generated technical debt (JSON.stringify comparisons, redundant useEffect, copy-paste patterns, type cast hacks). Runs static analysis scripts and applies stack-specific reference constraints, then drives a persistent fix-and-reverify loop until the codebase is clean."
---

# Codebase Audit Skill

## Overview

Perform ruthless, stack-specific audits on codebases using:
React 19, TypeScript, Vite, Tailwind CSS v4, Supabase (+ Edge Functions), Zustand, Dexie.js (IndexedDB/offline-first), Telegram Mini Apps SDK, Framer Motion, i18next, dnd-kit, Recharts.

**Important limitation to keep in mind throughout:** the reference files and the
`.sh` scripts encode *known* patterns. They will not find a bug nobody has
described yet. Steps 0.5, 2.5, and 3.5 below exist specifically to catch
problems that are real but don't match any pre-written pattern — don't skip
them just because the regex scripts came back clean.

## Why This Skill Is Structured As A Loop, Not A One-Shot Report

Earlier versions of this skill produced a curated markdown report at the end
of a single pass. In practice this meant an LLM read raw tool output and
**summarized** it — which quietly dropped findings ("2-3 critical, 5-8
warnings") even when the underlying tools had found more. Worse, "I fixed
everything" at the end of a session was a claim, not a verified fact — a new
session with no memory of that claim would re-run the tools and honestly
find what was actually still there.

This version separates **finding** (mechanical, exhaustive, no LLM
summarization) from **fixing** (LLM-driven) from **verifying** (mechanical
diff against the previous scan, not a self-report). All state lives in
files under `.agent/audit/`, committed to git, so a brand-new chat session
gets the true current state by reading `.agent/audit/status.md` — never by
trusting what a previous conversation said.

## Audit Pipeline

### Step -0.5: Workspace Isolation Enforcement (MANDATORY)

Every audit MUST strictly operate within the boundaries of the target project repository (`$PROJECT_ROOT`).
- **Mechanical Path Validation:** `run_full_audit.sh` extracts findings ONLY for files that physically exist within the current repository, normalizing all filepaths relative to `$PROJECT_ROOT` and discarding foreign paths.
- **Cross-Workspace Decontamination:** `sync_fix_plan.sh` automatically filters out any existing entries referencing foreign repositories (e.g., `voicefin`) or non-existent files. Copying `.agent` across workspaces will never contaminate the local `fix_plan.md`.

### Step -1: Project Context Bootstrap (MANDATORY — run before everything else)

Before touching any code, anchor the audit in the project's own decisions and user expectations. Skipping this step causes the audit to apply generic heuristics that may directly contradict this project's documented architecture — that is an audit failure.

**1. Read the User Profile:**

```
.agents/USER_PROFILE.md
```

Extract:

- Hard safety guardrails (NEVER violate these during fix suggestions).
- Code quality rules (500-line limit, no `any`, mandatory comments).
- UX preferences (rounding, modal-first, SSOT, etc.).
- Communication expectations (diffs, educational explanations, empirical verification).

**2. Read the Decision Log Index:**

```
.planning/CONTEXT.md
```

Scan the decisions table. For every ADR whose **Scope** overlaps the feature area under audit, open and read that ADR file from `.planning/decisions/`. Pay special attention to:

- ADRs with status `Broken / Refactor` — these are known problem areas.
- The most recent 3–4 ADRs — they contain the most up-to-date architectural decisions.

**3. Read Relevant Folder AGENTS.md Rules (lazy-loaded):**
For every source folder you will audit, check if a local `AGENTS.md` exists and read it:

- `src/services/AGENTS.md`
- `src/shared/ui/AGENTS.md`
- `src/shared/ui/modals/AGENTS.md`
- `src/shared/hooks/AGENTS.md`
- `src/core/AGENTS.md`
- `src/features/AGENTS.md`
- `src/db/AGENTS.md`
- `src/types/AGENTS.md`
- `src/utils/AGENTS.md`
- `supabase/AGENTS.md`
- `locales/AGENTS.md`

**4. Read Prior Audit State (if this isn't the first run):**

```
.agent/audit/status.md
.agent/audit/fix_plan.md
```

If these exist, this is a continuation, not a fresh audit. Trust these files
over anything said earlier in the current conversation, and over anything
implied by a previous conversation. If `status.md` says CLEAN but you have
reason to believe code changed since, re-run Stage A before believing it.

**5. Summarize Context Before Proceeding:**
Write a one-paragraph internal summary (not shown to user) of:

- What the feature area does, based on ADRs.
- Any known bugs or refactor notes from ADRs.
- User constraints that will affect how you report and fix issues.
- Whether an audit is already in progress per `status.md`.

Only after completing all five sub-steps above, proceed to Step 0.

---

### Step 0: Dynamic Rule Discovery

**CRITICAL**: Before proceeding, check if the directory `.agent/rules/` exists in the project root.

- If it exists, **READ ALL** files within it (e.g., `design-system.md`, `architecture.md`).
- These rules take **absolute precedence** over the generic audit criteria below.
- Incorporate these project-specific constraints into your audit plan for this session.

### Step 1: Classify the Code Under Audit

Determine the code's domain category:

| Category | Signals | Reference File | Priority |
| :------- | :------ | :------------- | :------- |
| **AI-Slop / Tech Debt** | `JSON.stringify` comparisons, `useEffect` with only `setState`, `as unknown as`, copy-paste blocks, generic names (`data`, `result`) | `references/ai_slop_patterns.md` | Critical |
| **State Management** | Zustand stores, `create()`, `get()`, `set()`, selectors | `references/state_management.md` | High |
| **Database & API** | `select('*')`, `.filter()`, missing `AbortSignal`, N+1 `Promise.all` | `references/database_api.md` | High |
| **Offline Sync / Data** | Dexie tables, `mutation_queue`, `SyncService`, `bulkPut`, IndexedDB | `references/offline_sync.md` | Medium |
| **React Hooks** | `useEffect`, `useState`, `useMemo`, `useCallback`, subscriptions, cleanups | `references/react_hooks.md` | Critical |
| **React Query / TanStack Query** | `useQuery`, `useMutation`, `queryKey`, `QueryClient` | `references/react_query.md` | Medium |
| **UI Architecture** | Naked Modals, Flexbox Blowouts (`min-w-0`), Global Scroll Bans, CLS Skeletons | `references/ui_architecture.md` | High |
| **Architecture / Principles** | File structure, duplication, feature scope, dead code, naming | `references/code_principles.md` | Medium |
| **Styling & CSS** | Ad-hoc hex colors, CSS string concatenation, strict border radii, touch targets, `@theme` vs config | `references/styling_tailwind.md` | High |

If code spans multiple categories, read ALL relevant reference files before auditing.

---

### Stages A, B, E: One Command (`audit_cycle.sh`)

```bash
bash .agent/skills/codebase-audit/scripts/audit_cycle.sh <target_dir>
```

This is the **only** command for scanning, syncing the fix plan, and
computing the verdict. It chains `run_full_audit.sh` (Stage A) →
`validate_fix_plan.sh` + `sync_fix_plan.sh` (Stage B) → `update_status.sh`
(Stage E), and ends by printing `status.md` verbatim. There used to be
three separate scripts here that the agent was expected to run in
sequence — in practice, a real audit ran the first one, then hand-wrote
its own `findings_raw.md`/`fix_plan.md`/`status.md` instead of calling the
other two, so the tool-failure gate and ID validation never got a chance
to fire. **There is no longer a partial path.** Either the whole cycle
completes, or it aborts loudly with instructions at whichever stage
failed, and it will refuse to sync on top of a `fix_plan.md` that isn't in
the exact format it expects — including one that got there by hand.

`<target_dir>` may be a feature subdirectory. `tsc`/`ts-prune`/`madge`/
`depcheck` auto-detect and run against the real project root (nearest
`tsconfig.json`/`package.json` above it); `eslint` and the `detect_*.sh`
scripts stay scoped to `<target_dir>`. Audit state (`.agent/audit/`) always
lives at the detected project root.

**Hard rule — no exceptions:** `findings_raw.md`, `fix_plan.md`, and
`status.md` are written ONLY by these scripts. **Do not use your file-edit
tool on any of the three.** The one narrow exception is Stage C below
(flipping an *existing* line's `[ ]` to `[x]`/`[~]` in `fix_plan.md` — never
adding new lines, never touching `findings_raw.md` or `status.md` by hand).
If a manual finding needs adding (Cross-Artifact Diff / Convention
Deviation, see rule below), it goes into `findings_raw.md`'s checklist
section with a correctly-formatted id and then `audit_cycle.sh` is re-run
— it is never appended to `fix_plan.md` directly.

**Reporting the verdict to the user:** your chat reply's verdict section
must be the verbatim content `audit_cycle.sh` printed from `status.md` —
paste it as-is (in a code block or quoted), not retyped into your own
prose, not reorganized into an emoji-headed "system-by-system" report, and
never replaced by your own narrative summary of what you found while
reading code. Commentary and BAD→GOOD examples for what Stage C actually
fixed can go around it, but the verdict itself is not something you
compose — it's something you cat.

**Rules for the scan itself:**

1. **Never hand-summarize tool output before it reaches findings_raw.md.**
   The script does the formatting; you do not re-type or curate the list.
   This has already caused two real production audits to report CLEAN on
   a payment system while missing 500+ line files, ~30 `any` usages, 9
   circular imports, and every category the regex/AST tools cover, because
   the mechanical output got replaced by hand-authored narrative.
2. **A clean result from any regex script or the checklist extractor means
   "not found in this shape," not "confirmed absent."** Corroborate with the
   AST tool sections of the same file and, for files you read directly in
   Step 3 below, your own read of the code.
2b. **Check the Tool Execution Health table at the top of findings_raw.md
   before drawing any conclusion from a low finding count.** `audit_cycle.sh`
   already refuses to certify CLEAN when a tool failed — but if you're
   reading findings_raw.md directly for any reason, don't second-guess that
   gate by treating a failed tool's empty section as "nothing found."
3. Also perform the Cross-Artifact Diff (Dexie vs Supabase schema, RLS
   policy vs identifier column, push sanitizer vs legacy fields — see the
   original Step 2.5 checks in `references/offline_sync.md` and
   `references/tma_security.md`) and the Convention Deviation Pass (5–10
   project-specific conventions, checked against the codebase — see
   `references/code_principles.md`). Append findings from both as additional
   checklist-style lines directly into `.agent/audit/findings_raw.md` under a
   `## Manual findings (Cross-Artifact Diff / Convention Deviations)`
   section, using the same `- [ ]` \`id\` format so Stage B picks them up.
   Generate the id the same way the script does: first 10 hex chars of
   `md5("manual|<file>|<line-or-N/A>|<description>")` — e.g.
   `echo -n 'manual|src/foo.ts|42|missing error check' | md5sum | cut -c1-10`.
   A human-readable slug (e.g. `id_c01_something`) is NOT valid here — it
   will not match the format `sync_fix_plan.sh` requires, and
   `validate_findings.sh` (run automatically at the end of Stage A, and
   again at the start of Stage B) will reject the whole file rather than
   let it pass through silently ignored.

### After the cycle: read the result (part of the same `audit_cycle.sh` run)

`audit_cycle.sh` already ran Stage B (sync) and Stage E (status) internally
and printed `status.md` verbatim at the end — you don't run those
separately. What it did:

- Updated `.agent/audit/fix_plan.md` from the current `findings_raw.md`.
  Every finding ID gets exactly one line. Existing `[x]` (fixed) and `[~]`
  (accepted) lines are **never** reset — only newly-appearing IDs are added
  as `[ ]`, and IDs that disappeared from the latest scan are auto-marked
  `[x] RESOLVED`.
- The plan covers **every** pending item, not just Critical-severity ones.
  The goal is zero unresolved technical debt from this scan, not a "top N"
  report.
- Computed the verdict (CLEAN / NOT CLEAN / UNKNOWN) — see below.

**Manual read pass (allowed, narrow):** After the cycle runs, you may read
`fix_plan.md` and mark `[~] ACCEPTED: <reason citing the rule>` on an
existing line if it's a known intentional pattern from
`references/code_principles.md`'s WET/DRY conflict rules, or note in an
existing line's description that two IDs are the same root cause (without
deleting either line). **Do not mark anything `[x]` by hand** unless you
have actually made the corresponding code change in Stage C. Do not add,
remove, or reformat lines — `validate_fix_plan.sh` (run automatically at
the start of every `audit_cycle.sh` call) will refuse to proceed past a
plan that doesn't match the exact format it expects.

### Stage C: Execution (fix everything in fix_plan.md)

Work through `fix_plan.md` top to bottom, or grouped by file if that's more
efficient — your choice, but every `[ ]` line must eventually be addressed.
For each item:

1. Open the file at the given location, read enough surrounding context to
   understand it (don't fix from the one-line description alone).
2. Apply the fix using the BAD→GOOD pattern from the relevant reference
   file.
3. Only after the edit is made, flip that line in `fix_plan.md` to `[x]`.
4. If, while reading the code, you determine the finding is a false
   positive or an intentional exception per `code_principles.md`, mark it
   `[~] ACCEPTED: <reason>` instead of fixing it — do not silently skip it.

Do not stop partway and declare success. If you run out of turns/budget
before finishing the plan, that's fine — `fix_plan.md` on disk is the
record of what's left, and the next session picks it up from there via
Step -1.4.

### Stage D: Re-Audit & Verify (mechanical diff, not a self-report)

Re-run the exact same command:

```bash
bash .agent/skills/codebase-audit/scripts/audit_cycle.sh <target_dir>
```

This is the actual verification — an item is only "resolved" because it no
longer appears in tool output, never because an agent said it was fixed. If
a fix introduced a new finding (regression), it appears as a brand-new
`[ ]` line. Do not paraphrase this as "I re-checked and it's fine" — the
verbatim `status.md` printed at the end of the run is the check.

### Stage E: Reading the Verdict / Loop Control

The verdict is whatever `status.md` says, printed verbatim at the end of
`audit_cycle.sh`'s output — CLEAN, NOT CLEAN, or UNKNOWN.

- **CLEAN** (zero `[ ]` lines in fix_plan.md, AND every tool in the last
  scan's health table succeeded): report this to the user plainly, pasting
  the verbatim status.md content. Nothing left to do.
- **NOT CLEAN**: report the pending count (from the verbatim output), then
  go back to Stage C and keep going. Do not start over from Stage A's raw
  output description — `fix_plan.md` already has the current, correct list.
- **UNKNOWN** (one or more tools failed to execute): do not report CLEAN or
  NOT CLEAN to the user under any circumstance. Report that the scan was
  incomplete, name the failed tools (in the verbatim output and in
  findings_raw.md's health table), fix the cause, and re-run
  `audit_cycle.sh` before saying anything about the codebase's actual state.

Commit `.agent/audit/*` (findings_raw.md, findings_raw.prev.md,
fix_plan.md, status.md) to git at the end of each cycle so the audit trail
is visible in PR history and any future session — in this chat or a new
one — has ground truth to read instead of relying on conversation memory.

---

### Step 3: Manual Deep Audit (feeds into Stage A's findings, done alongside it)

Read the relevant reference file(s) identified in Step 1. Apply every constraint and self-correction rule from those files against the code under audit.

For any file that is large, central to the request, or was flagged by any
tool above, **read the whole file** rather than judging it from a grep
snippet — logical bugs (wrong order of operations, a `catch` that silently
continues past a failure, a race between two async calls) are syntactically
invisible and only show up when the file is read end to end. The
`offline_sync.md` example of `pushChanges()` continuing on failure and then
letting `pullTable()` overwrite local data is exactly this kind of bug: no
regex catches it, only reading the function. Findings from this pass go into
`findings_raw.md`'s manual section per Stage A rule 3 above.

---

## Output To The User (every cycle, not just the last one)

After Stage E, tell the user, in the chat, in this order:

1. That `.agent/audit/findings_raw.md` now contains the full raw scan (state
   the total count extracted).
2. That `.agent/audit/fix_plan.md` has been synced (state pending / fixed /
   accepted counts).
3. If this is a fix cycle (Stage C ran): what was actually fixed this
   cycle, with BAD→GOOD snippets for anything non-trivial.
4. The Stage E verdict, verbatim: CLEAN, or NOT CLEAN with the pending
   count.

Never tell the user "everything is fixed" unless `status.md` says CLEAN.

## Self-Correction Rules (Global)

1. **NEVER skip reading reference files.** The whole point is stack-specific depth. Generic advice = audit failure.
2. **NEVER mark something as "fine" without verifying** against the specific constraints in the reference file.
3. **ALWAYS provide BAD→GOOD code examples** for every issue found. No vague descriptions.
4. **ALWAYS check files for the 500-line limit** per the workspace rules.
5. **ALWAYS verify `any` is not used** — substitute with `unknown`, `Record<string, unknown>`, or proper types. Prefer the Step 0.5 `tsc`/strict-mode check over the regex grep for this — it also catches *implicit* any, which grep cannot.
6. **ALWAYS check for AI-slop patterns** — `JSON.stringify` comparisons, `useEffect` that only sets state, `as unknown as` casts, and copy-pasted object construction. Read `references/ai_slop_patterns.md` for every audit.
7. **NEVER treat a clean regex-script result as proof of absence.** These scripts match single-line shapes only. State findings as "not found by pattern X" rather than "confirmed absent" unless corroborated by an AST tool (Step 0.5) or a full manual read (Step 3).
8. **ALWAYS run the Cross-Artifact Diff** (part of Stage A, rule 3) when the codebase has both a local schema (Dexie/IndexedDB) and a remote schema (Supabase), or both application code and RLS policies — these categories of bug are structurally invisible to single-file review.
9. **ALWAYS run the Convention Deviation Pass** (part of Stage A, rule 3) before finishing the scan. A codebase-specific inconsistency that matches no reference-file rule is still a real finding.
10. **NEVER report a cycle as complete based on memory of having fixed things.** Completion is only `status.md` saying CLEAN, produced by `update_status.sh` reading `fix_plan.md`. If you believe something is fixed but haven't re-run Stage A/D, say so explicitly — "believed fixed, not yet re-verified" — rather than reporting it as resolved.
11. **NEVER silently drop a pending item because it seems minor.** Every `[ ]` in `fix_plan.md` must become `[x]` (fixed or auto-resolved) or `[~]` (explicitly accepted with a cited reason). There is no third option and no "skip because low priority."
