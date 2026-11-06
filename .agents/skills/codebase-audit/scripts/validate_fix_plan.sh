#!/usr/bin/env bash
# validate_fix_plan.sh — Hard gate protecting fix_plan.md's format.
#
# fix_plan.md lines must be exactly:
#   - [ |x|~] `<10 lowercase hex chars>` | <rest>
# This is the format sync_fix_plan.sh reads and writes. If fix_plan.md gets
# hand-authored (wrong ID scheme, missing the `| ` separator, extra
# categories/headers as if it were a prose report), sync_fix_plan.sh's
# parser silently skips those lines — which is exactly how a real audit
# ended up with a hand-written 2-item fix_plan.md while every other one of
# the ~150 findings tsc/detect_type_violations/detect_performance_issues
# actually reported was never entered into the plan at all.
#
# Usage: bash validate_fix_plan.sh <project_root>
# Exit 0 if fix_plan.md doesn't exist yet (nothing to validate) or is clean.
# Exit 1 with details if any `## Items` line is malformed.

set -uo pipefail

TARGET="${1:-.}"
PLAN="$TARGET/.agent/audit/fix_plan.md"

if [ ! -f "$PLAN" ]; then
  echo "ℹ️  validate_fix_plan.sh: no fix_plan.md yet — nothing to validate."
  exit 0
fi

ITEMS_SECTION=$(awk '/^## Items/{flag=1; next} flag' "$PLAN")

BAD_LINES=$(echo "$ITEMS_SECTION" | grep -E '^- \[.\]' | grep -vE '^- \[[ x~]\] `[0-9a-f]{10}` \|' || true)

if [ -n "$BAD_LINES" ]; then
  echo "❌ VALIDATION FAILED: fix_plan.md has checklist-looking lines that don't" >&2
  echo "   match the required format. sync_fix_plan.sh's parser will silently" >&2
  echo "   skip these — meaning they vanish from tracking, not get fixed:" >&2
  echo "" >&2
  echo "$BAD_LINES" >&2
  echo "" >&2
  echo "   This file must ONLY be produced by sync_fix_plan.sh, or hand-edited" >&2
  echo "   ONLY by flipping an existing line's [ ] to [x] or [~] — never by" >&2
  echo "   writing new lines or rewriting the format by hand." >&2
  echo "" >&2
  echo "   If this file was hand-authored by mistake and real tracking data is" >&2
  echo "   lost, the safe recovery is: mv it aside (don't delete), then run" >&2
  echo "   audit_cycle.sh again to regenerate fix_plan.md mechanically from" >&2
  echo "   findings_raw.md, and manually re-apply any [x]/[~] decisions that" >&2
  echo "   are still valid by cross-referencing the old file." >&2
  exit 1
fi

TOTAL=$(echo "$ITEMS_SECTION" | grep -cE '^- \[[ x~]\] `[0-9a-f]{10}` \|' || true)
echo "✅ validate_fix_plan.sh: $TOTAL item(s), all well-formed."