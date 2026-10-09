#!/usr/bin/env bash
# update_status.sh — Stage E of the audit pipeline.
#
# Writes .agent/audit/status.md — the file a NEW chat/session must read
# before doing anything else. This is what replaces relying on a previous
# chat's claim of "I fixed everything": the ground truth is this file plus
# fix_plan.md, not conversational memory.
#
# Usage: bash update_status.sh <target_dir>

set -uo pipefail

TARGET="${1:-.}"
AUDIT_DIR="$TARGET/.agent/audit"
PLAN="$AUDIT_DIR/fix_plan.md"
STATUS="$AUDIT_DIR/status.md"
HEALTH_LOG="$AUDIT_DIR/.tool_health.tsv"

if [ ! -f "$PLAN" ]; then
  echo "ERROR: $PLAN not found. Run run_full_audit.sh then sync_fix_plan.sh first." >&2
  exit 1
fi

PENDING=$(grep -c '^- \[ \]' "$PLAN" || true)
DONE=$(grep -c '^- \[x\]' "$PLAN" || true)
ACCEPTED=$(grep -c '^- \[~\]' "$PLAN" || true)

PREV_CYCLE=0
if [ -f "$STATUS" ]; then
  PREV_CYCLE=$(grep -oE 'Cycle: [0-9]+' "$STATUS" | grep -oE '[0-9]+' || echo 0)
fi
CYCLE=$((PREV_CYCLE + 1))

# A CLEAN verdict requires BOTH zero pending findings AND that the scan
# which produced them actually ran successfully. Without this check, a
# scan scoped to the wrong path (missing tsconfig, etc.) can silently
# produce near-zero findings and get reported as CLEAN — which is exactly
# what happened in production before this check existed.
TOOL_FAILURE_NOTE=""
if [ -f "$HEALTH_LOG" ] && grep -q 'FAILED' "$HEALTH_LOG"; then
  FAILED_TOOLS=$(awk -F'\t' '$3 ~ /^FAILED/ {print $1}' "$HEALTH_LOG" | tr '\n' ',' | sed 's/,$//')
  TOOL_FAILURE_NOTE=" ($FAILED_TOOLS)"
fi

if [ -n "$TOOL_FAILURE_NOTE" ]; then
  VERDICT="UNKNOWN — tool execution incomplete$TOOL_FAILURE_NOTE. Cannot certify CLEAN or NOT CLEAN until these tools run successfully — a low finding count from a failed tool is not evidence of a clean codebase. Check .agent/audit/findings_raw.md's Tool Execution Health table, fix the invocation (commonly: TARGET path has no tsconfig.json), and re-run Stage A."
elif [ "$PENDING" -eq 0 ]; then
  VERDICT="CLEAN — no pending findings, and all tools executed successfully. All items are either fixed/resolved or explicitly accepted."
else
  VERDICT="NOT CLEAN — $PENDING finding(s) still pending in fix_plan.md."
fi

{
  echo "# Audit Status (Stage E)"
  echo ""
  echo "> Read this file FIRST in any new session before running the audit"
  echo "> skill again. It reflects the actual state of fix_plan.md, not what"
  echo "> any previous conversation claimed."
  echo ""
  echo "Cycle: $CYCLE"
  echo "Last updated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo ""
  echo "**Verdict: $VERDICT**"
  echo ""
  echo "- Pending: $PENDING"
  echo "- Fixed/resolved: $DONE"
  echo "- Accepted as-is: $ACCEPTED"
  echo ""
  echo "Next step: $( [ "$PENDING" -eq 0 ] && echo "none — report clean to the user." || echo "work through the \`[ ]\` items in fix_plan.md, then re-run the full pipeline (Stage A → D)." )"
} > "$STATUS"

echo "Wrote $STATUS — Cycle $CYCLE, verdict: $VERDICT"