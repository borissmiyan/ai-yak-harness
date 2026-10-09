#!/usr/bin/env bash
# audit_cycle.sh — THE single command for Stages A, B, and E.
#
# WHY THIS EXISTS: v1 had three separate scripts (run_full_audit.sh,
# sync_fix_plan.sh, update_status.sh) that the calling agent was supposed
# to run in sequence. In practice, the agent ran the first one, then wrote
# its own hand-authored findings_raw.md/fix_plan.md/status.md instead of
# calling the other two — meaning validate_findings.sh (which only runs
# inside those scripts) never got a chance to catch the malformed IDs, and
# a scan where 5 of 8 tools failed still got reported as CLEAN.
#
# There is now exactly one command to remember. It cannot be partially
# run — either the whole cycle completes, or it aborts loudly at the
# stage that failed. Skipping straight to a hand-written report is no
# longer a shorter path than doing it right; there's nothing left to skip.
#
# Usage:
#   bash audit_cycle.sh <target_dir>
#
# Stage C (actually fixing code + flipping [ ] to [x]/[~] in fix_plan.md)
# still happens by hand in between calls to this script — that's expected
# and correct. Re-run this exact same command to verify.

set -uo pipefail

TARGET="${1:-.}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "════════════════════════════════════════════════════════════"
echo " AUDIT CYCLE — Stage A (scan)"
echo "════════════════════════════════════════════════════════════"
bash "$SCRIPT_DIR/run_full_audit.sh" "$TARGET"
STAGE_A_RC=$?
if [ $STAGE_A_RC -ne 0 ]; then
  echo "" >&2
  echo "❌ Stage A failed validation (see above). Fix findings_raw.md (or" >&2
  echo "   regenerate it — never hand-patch the checklist) before continuing." >&2
  echo "   Cycle aborted — fix_plan.md and status.md were NOT touched." >&2
  exit 1
fi

# Resolve the same project root run_full_audit.sh used, so Stage B/E look
# in the same .agent/audit/ directory Stage A just wrote to.
resolve_root() {
  local dir
  dir="$(cd "$1" && pwd)"
  while [ "$dir" != "/" ]; do
    if [ -f "$dir/tsconfig.json" ] || [ -f "$dir/package.json" ]; then
      echo "$dir"
      return 0
    fi
    dir="$(dirname "$dir")"
  done
  echo "$(cd "$1" && pwd)"
}
PROJECT_ROOT="$(resolve_root "$TARGET")"

echo ""
echo "════════════════════════════════════════════════════════════"
echo " AUDIT CYCLE — Stage B (sync fix plan)"
echo "════════════════════════════════════════════════════════════"

# Validate any PRE-EXISTING fix_plan.md before syncing into it — this is
# where the real-world failure landed: a hand-authored fix_plan.md with
# invented IDs sat there and nothing ever checked it.
if ! bash "$SCRIPT_DIR/validate_fix_plan.sh" "$PROJECT_ROOT"; then
  echo "" >&2
  echo "❌ Existing fix_plan.md is malformed (see above) — refusing to sync" >&2
  echo "   on top of it, since sync_fix_plan.sh's parser would silently drop" >&2
  echo "   the malformed lines and lose whatever tracking they represented." >&2
  echo "   Cycle aborted — status.md was NOT updated." >&2
  exit 1
fi

bash "$SCRIPT_DIR/sync_fix_plan.sh" "$PROJECT_ROOT"

echo ""
echo "════════════════════════════════════════════════════════════"
echo " AUDIT CYCLE — Stage E (status)"
echo "════════════════════════════════════════════════════════════"
bash "$SCRIPT_DIR/update_status.sh" "$PROJECT_ROOT"

echo ""
echo "════════════════════════════════════════════════════════════"
echo " VERBATIM status.md — this, unedited, is the verdict to report"
echo "════════════════════════════════════════════════════════════"
cat "$PROJECT_ROOT/.agent/audit/status.md"
echo "════════════════════════════════════════════════════════════"