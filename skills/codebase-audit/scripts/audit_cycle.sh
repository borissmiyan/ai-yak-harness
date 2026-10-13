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

TARGET="."
CI_MODE=false
FAIL_ON=""
FIX_MODE=false

for arg in "$@"; do
  case "$arg" in
    --ci)
      CI_MODE=true
      ;;
    --fail-on=*)
      FAIL_ON="${arg#*=}"
      CI_MODE=true
      ;;
    --fix)
      FIX_MODE=true
      ;;
    --help|-h)
      echo "Usage: bash audit_cycle.sh [target_dir] [--ci] [--fail-on=CRITICAL|WARN|INFO] [--fix]"
      echo ""
      echo "Flags:"
      echo "  [target_dir]        Directory to audit (default: .)"
      echo "  --ci                Enable CI Quality Gate mode (exits with code 1 on failure)"
      echo "  --fail-on=<level>   Set failure severity threshold: CRITICAL (default), WARN, or INFO"
      echo "  --fix               Attempt safe auto-fix (linter / code style) before scanning"
      exit 0
      ;;
    -*)
      echo "Unknown flag: $arg" >&2
      echo "Use --help for usage information." >&2
      exit 1
      ;;
    *)
      TARGET="$arg"
      ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Resolve the project root
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

# If fail-on wasn't explicitly set in CLI, check .auditrc.json
if [ -z "$FAIL_ON" ]; then
  CONFIG_FAIL_ON=$(python3 -c "import json, os; p='$PROJECT_ROOT/.auditrc.json'; d = json.load(open(p)) if os.path.exists(p) else {}; print(d.get('failOn', 'CRITICAL'))" 2>/dev/null || echo "CRITICAL")
  FAIL_ON="$CONFIG_FAIL_ON"
fi

# Pre-scan Auto-Fix (--fix)
if [ "$FIX_MODE" = true ]; then
  echo "════════════════════════════════════════════════════════════"
  echo " AUDIT CYCLE — Pre-scan Auto-Fix (--fix)"
  echo "════════════════════════════════════════════════════════════"
  
  AUTO_FIX_CMD=""
  CONFIG_FILE="$PROJECT_ROOT/.auditrc.json"
  if [ -f "$CONFIG_FILE" ]; then
    AUTO_FIX_CMD=$(python3 -c "import json; d=json.load(open('$CONFIG_FILE')); print(d.get('autoFixCommand', ''))" 2>/dev/null || true)
  fi

  if [ -n "$AUTO_FIX_CMD" ]; then
    echo "Running custom auto-fix command: $AUTO_FIX_CMD"
    (cd "$PROJECT_ROOT" && eval "$AUTO_FIX_CMD") || echo "⚠️  Custom auto-fix exited with non-zero code, continuing scan..."
  elif [ -f "$PROJECT_ROOT/package.json" ] && grep -q '"lint:fix"' "$PROJECT_ROOT/package.json"; then
    echo "Running npm run lint:fix..."
    (cd "$PROJECT_ROOT" && npm run lint:fix) || echo "⚠️  lint:fix exited with non-zero code, continuing scan..."
  elif [ -f "$PROJECT_ROOT/package.json" ] && grep -q '"lint"' "$PROJECT_ROOT/package.json"; then
    echo "Running npm run lint -- --fix..."
    (cd "$PROJECT_ROOT" && npm run lint -- --fix) || echo "⚠️  npm run lint -- --fix exited with non-zero code, continuing scan..."
  elif command -v npx >/dev/null 2>&1; then
    echo "Running npx eslint --fix..."
    (cd "$PROJECT_ROOT" && npx --no-install eslint --fix "$TARGET") || echo "⚠️  eslint --fix exited with non-zero code, continuing scan..."
  else
    echo "ℹ️  No auto-fix command detected for this project."
  fi
  echo ""
fi

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

echo ""
echo "════════════════════════════════════════════════════════════"
echo " AUDIT CYCLE — Stage B (sync fix plan)"
echo "════════════════════════════════════════════════════════════"

# Validate any PRE-EXISTING fix_plan.md before syncing into it
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

# CI Quality Gate Check
if [ "$CI_MODE" = true ]; then
  echo ""
  echo "════════════════════════════════════════════════════════════"
  echo " AUDIT CYCLE — CI Quality Gate Evaluation (Threshold: $FAIL_ON)"
  echo "════════════════════════════════════════════════════════════"

  SUMMARY_FILE="$PROJECT_ROOT/.agent/audit/summary.json"
  if [ ! -f "$SUMMARY_FILE" ]; then
    echo "❌ CI GATE FAILED: $SUMMARY_FILE not found." >&2
    exit 1
  fi

  python3 - "$SUMMARY_FILE" "$FAIL_ON" <<'PYEOF'
import sys, json

summary_file, fail_on = sys.argv[1], sys.argv[2].upper()
with open(summary_file) as f:
    data = json.load(f)

failures = data.get('toolFailures', [])
if failures:
    print(f"❌ CI GATE FAILED: Tool execution incomplete ({', '.join(failures)}).", file=sys.stderr)
    sys.exit(1)

metrics = data.get('metrics', {})
crit = metrics.get('criticalPending', 0)
warn = metrics.get('warnPending', 0)
info = metrics.get('infoPending', 0)
total = metrics.get('totalPending', 0)

if fail_on == 'CRITICAL':
    if crit > 0:
        print(f"❌ CI GATE FAILED: {crit} unresolved CRITICAL finding(s) pending.", file=sys.stderr)
        sys.exit(1)
elif fail_on == 'WARN':
    if crit > 0 or warn > 0:
        print(f"❌ CI GATE FAILED: {crit} Critical and {warn} Warn finding(s) pending.", file=sys.stderr)
        sys.exit(1)
elif fail_on == 'INFO':
    if total > 0:
        print(f"❌ CI GATE FAILED: {total} finding(s) pending.", file=sys.stderr)
        sys.exit(1)

print(f"✅ CI QUALITY GATE PASSED: 0 blocking findings at threshold '{fail_on}' (Critical: {crit}, Warn: {warn}, Info: {info}).")
sys.exit(0)
PYEOF
  CI_RC=$?
  if [ $CI_RC -ne 0 ]; then
    exit $CI_RC
  fi
fi