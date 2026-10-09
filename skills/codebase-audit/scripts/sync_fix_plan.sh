#!/usr/bin/env bash
# sync_fix_plan.sh — Stage B of the audit pipeline.
#
# Builds/updates .agent/audit/fix_plan.md from findings_raw.md's checklist.
# Every finding ID gets exactly one line. Re-running this script after a new
# scan will:
#   - add new finding IDs as `- [ ]` (pending)
#   - LEAVE untouched any ID already marked `[x]` (fixed) or `[~]` (accepted)
#   - mark IDs that no longer appear in findings_raw.md as `[x] (resolved —
#     no longer detected as of <date>)` so the plan reflects reality without
#     losing history
#
# This script never removes a line and never resets a status. That's what
# makes it safe to run every cycle without an LLM having to "remember" what
# was already decided.
#
# Usage: bash sync_fix_plan.sh <target_dir>

set -uo pipefail

TARGET="${1:-.}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AUDIT_DIR="$TARGET/.agent/audit"
FINDINGS="$AUDIT_DIR/findings_raw.md"
PLAN="$AUDIT_DIR/fix_plan.md"
HEALTH_LOG="$AUDIT_DIR/.tool_health.tsv"

if [ ! -f "$FINDINGS" ]; then
  echo "ERROR: $FINDINGS not found. Run run_full_audit.sh first." >&2
  exit 1
fi

# Defense in depth: run_full_audit.sh already calls this, but sync_fix_plan.sh
# must not trust that findings_raw.md wasn't hand-edited since then. A
# malformed ID here means an item would be silently dropped below — refuse
# to proceed instead.
bash "$SCRIPT_DIR/validate_findings.sh" "$TARGET" || {
  echo "ERROR: findings_raw.md failed ID validation — refusing to sync. Fix the malformed line(s) above (or regenerate the file by re-running run_full_audit.sh) before syncing the plan." >&2
  exit 1
}

if [ -f "$HEALTH_LOG" ] && grep -q 'FAILED' "$HEALTH_LOG"; then
  echo "⚠️  WARNING: $HEALTH_LOG shows failed tool(s) from the last scan. Syncing anyway, but fix_plan.md's 'pending: 0' (if reached) does not mean CLEAN until those tools succeed — update_status.sh will refuse to report CLEAN while this holds." >&2
fi

TODAY=$(date -u +"%Y-%m-%d")

python3 - "$FINDINGS" "$PLAN" "$TODAY" "$TARGET" <<'PYEOF'
import re, sys, os

findings_path, plan_path, today, target_dir = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]

# Parse current findings checklist: id -> full line content (section|file:line|desc)
current = {}
with open(findings_path) as f:
    for line in f:
        m = re.match(r'^- \[ \] `([0-9a-f]{10})` \| (.+)$', line.rstrip('\n'))
        if m:
            fid, rest = m.groups()
            current[fid] = rest

# Parse existing plan (if any): id -> (status_char, extra_text)
existing = {}
plan_order = []
if os.path.exists(plan_path):
    with open(plan_path) as f:
        for line in f:
            m = re.match(r'^- \[(x| |~)\] `([0-9a-f]{10})` \| (.+)$', line.rstrip('\n'))
            if m:
                status, fid, rest = m.groups()
                # Strict workspace isolation filter:
                # 1. Reject any finding containing foreign repo names like 'voicefin'
                if 'voicefin' in rest.lower():
                    continue
                # 2. Extract file path from rest: "<section> | <filepath>:<line> | <desc>"
                parts = rest.split('|')
                if len(parts) >= 2:
                    file_candidate = parts[1].strip().split(':')[0].strip()
                    if file_candidate.startswith('./'):
                        file_candidate = file_candidate[2:]
                    # Check if file exists in target workspace
                    candidate_full = os.path.join(target_dir, file_candidate)
                    if not os.path.exists(candidate_full) and fid not in current:
                        # File does not exist in target workspace and wasn't found in current scan -> foreign entry! Drop it!
                        continue
                existing[fid] = (status, rest)
                plan_order.append(fid)

new_lines = []
seen = set()

# 1. Keep existing entries, in their original order, updating resolved status.
for fid in plan_order:
    status, rest = existing[fid]
    seen.add(fid)
    if status == ' ' and fid not in current:
        # Was pending, no longer detected -> mark resolved, keep description.
        new_lines.append(f"- [x] `{fid}` | {rest} | RESOLVED (no longer detected as of {today})")
    else:
        new_lines.append(f"- [{status}] `{fid}` | {rest}")

# 2. Append brand-new findings not yet in the plan.
added = 0
for fid, rest in current.items():
    if fid not in seen:
        new_lines.append(f"- [ ] `{fid}` | {rest}")
        added += 1

pending = sum(1 for l in new_lines if l.startswith('- [ ]'))
done = sum(1 for l in new_lines if l.startswith('- [x]'))
accepted = sum(1 for l in new_lines if l.startswith('- [~]'))

with open(plan_path, 'w') as out:
    out.write("# Fix Plan (Stage B)\n\n")
    out.write(f"Last synced: {today}\n\n")
    out.write("Status legend: `[ ]` pending &nbsp; `[x]` fixed/resolved &nbsp; `[~]` accepted as-is (WET/YAGNI exception — reason required)\n\n")
    out.write(f"Pending: {pending} | Fixed/resolved: {done} | Accepted: {accepted} | New this sync: {added}\n\n")
    out.write("To accept a finding instead of fixing it, change its line to:\n")
    out.write("`- [~] \\`ID\\` | ... | ACCEPTED: <reason, cite the WET/YAGNI rule that applies>`\n\n")
    out.write("## Items\n\n")
    for l in new_lines:
        out.write(l + "\n")

print(f"fix_plan.md synced: {pending} pending, {done} fixed/resolved, {accepted} accepted, {added} new.")
PYEOF