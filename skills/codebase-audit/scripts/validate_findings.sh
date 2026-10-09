#!/usr/bin/env bash
# validate_findings.sh — Hard gate between Stage A and Stage B.
#
# sync_fix_plan.sh only recognizes checklist lines matching:
#   - [ ] `<10 lowercase hex chars>` | ...
# Any line that LOOKS like a checklist item but doesn't match this exact ID
# format is silently invisible to sync_fix_plan.sh — it just never gets
# added to fix_plan.md, with no error. That's exactly how a real audit run
# ended up "CLEAN" while a hand-written finding using a human-readable slug
# ID sat in findings_raw.md with zero corresponding entry in fix_plan.md.
#
# This script scans the checklist section of findings_raw.md and FAILS
# LOUDLY (non-zero exit) if any `- [ ]` line has a malformed ID, so the
# problem is caught immediately after Stage A instead of discovered later
# by absence.
#
# Usage: bash validate_findings.sh <project_root>

set -uo pipefail

TARGET="${1:-.}"
FINDINGS="$TARGET/.agent/audit/findings_raw.md"

if [ ! -f "$FINDINGS" ]; then
  echo "ERROR: $FINDINGS not found." >&2
  exit 1
fi

# Only inspect the checklist section, not the raw log dump below it —
# the raw log legitimately contains arbitrary "- [ ]"-looking text from
# tool output that isn't meant to be a checklist item.
CHECKLIST_SECTION=$(awk '/^## Checklist/{flag=1; next} /^## Raw tool output/{flag=0} flag' "$FINDINGS")

BAD_LINES=$(echo "$CHECKLIST_SECTION" | grep -E '^- \[[ x~]\]' | grep -vE '^- \[[ x~]\] `[0-9a-f]{10}` \|' || true)

if [ -n "$BAD_LINES" ]; then
  echo "❌ VALIDATION FAILED: found checklist-looking lines with malformed IDs." >&2
  echo "   These will be SILENTLY IGNORED by sync_fix_plan.sh — fix the ID format" >&2
  echo "   (must be exactly 10 lowercase hex characters in backticks) before proceeding:" >&2
  echo "" >&2
  echo "$BAD_LINES" >&2
  echo "" >&2
  echo "   Correct id generation: first 10 hex chars of" >&2
  echo "   md5(\"<section>|<file>|<line>|<description>\")" >&2
  echo "   e.g.: echo -n 'manual|src/foo.ts|42|missing error check' | md5sum | cut -c1-10" >&2
  exit 1
fi

TOTAL=$(echo "$CHECKLIST_SECTION" | grep -cE '^- \[[ x~]\] `[0-9a-f]{10}` \|' || true)
echo "✅ validate_findings.sh: $TOTAL checklist line(s), all IDs well-formed."