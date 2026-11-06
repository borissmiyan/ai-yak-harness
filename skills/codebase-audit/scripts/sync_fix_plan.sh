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

python3 - "$FINDINGS" "$PLAN" "$TODAY" "$TARGET" "$AUDIT_DIR" <<'PYEOF'
import re, sys, os, json, shutil, subprocess

findings_path, plan_path, today, target_dir, audit_dir = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5]

target_root_abs = os.path.realpath(target_dir)

# 1. Resolve project identity
project_name = os.path.basename(target_root_abs)
pkg_json_path = os.path.join(target_root_abs, 'package.json')
if os.path.exists(pkg_json_path):
    try:
        with open(pkg_json_path, 'r', errors='ignore') as pf:
            pkg_data = json.load(pf)
            if pkg_data.get('name'):
                project_name = pkg_data['name']
    except Exception:
        pass

root_commit = ""
try:
    res = subprocess.run(["git", "rev-list", "--max-parents=0", "HEAD"], cwd=target_root_abs, capture_output=True, text=True)
    root_commit = res.stdout.strip().split('\n')[0] if res.stdout.strip() else ""
except Exception:
    pass

fingerprint_file = os.path.join(audit_dir, '.project_fingerprint')
is_foreign_workspace = False
foreign_name = "unknown"
foreign_reason = ""

# Check existing fingerprint
if os.path.exists(fingerprint_file):
    try:
        with open(fingerprint_file, 'r', errors='ignore') as ff:
            fp_data = json.load(ff)
            fp_name = fp_data.get('projectName')
            fp_root = fp_data.get('projectRoot')
            fp_commit = fp_data.get('rootCommit')
            
            if fp_commit and root_commit and fp_commit != root_commit:
                is_foreign_workspace = True
                foreign_name = fp_name or "different_git_repo"
                foreign_reason = f"Git root commit mismatch ({fp_commit[:8]} vs {root_commit[:8]})"
            elif fp_root and os.path.realpath(fp_root) != target_root_abs:
                is_foreign_workspace = True
                foreign_name = fp_name or os.path.basename(fp_root)
                foreign_reason = f"Project root path mismatch ({fp_root} vs {target_root_abs})"
            elif fp_name and fp_name != project_name:
                is_foreign_workspace = True
                foreign_name = fp_name
                foreign_reason = f"Project name mismatch ({fp_name} vs {project_name})"
    except Exception:
        pass
elif os.path.exists(plan_path):
    # Legacy un-fingerprinted plan: inspect if it contains foreign entries
    foreign_items = 0
    with open(plan_path, 'r', errors='ignore') as pf:
        for line in pf:
            m = re.match(r'^- \[(x| |~)\] `([0-9a-f]{10})` \| (.+)$', line)
            if m:
                parts = m.group(3).split('|')
                cand = parts[1].strip().split(':')[0].strip() if len(parts) >= 2 else ""
                if cand.startswith('./'): cand = cand[2:]
                norm_parts = set(os.path.normpath(cand).split(os.sep))
                if norm_parts & {'.agent', '.agents', 'node_modules', 'dist', 'build', '.git', 'backups', 'scratch', 'graphify-out'}:
                    foreign_items += 1
                elif cand:
                    cand_full = os.path.realpath(os.path.join(target_root_abs, cand))
                    if not (cand_full.startswith(target_root_abs + os.sep) and os.path.exists(cand_full)):
                        foreign_items += 1
    if foreign_items > 0:
        is_foreign_workspace = True
        foreign_name = "legacy_unfingerprinted_plan"
        foreign_reason = f"Found {foreign_items} foreign/excluded paths in legacy fix_plan.md"

# If foreign workspace detected, archive foreign fix_plan.md and status.md, start fresh
if is_foreign_workspace:
    if os.path.exists(plan_path):
        foreign_bak = os.path.join(audit_dir, f"foreign_fix_plan_{foreign_name}_{today}.bak.md")
        shutil.copy2(plan_path, foreign_bak)
        print(f"⚠️  Detected foreign plan ({foreign_reason})! Archived to {os.path.basename(foreign_bak)}.")
        os.remove(plan_path)
    status_file = os.path.join(audit_dir, "status.md")
    if os.path.exists(status_file):
        status_bak = os.path.join(audit_dir, f"foreign_status_{foreign_name}_{today}.bak.md")
        shutil.copy2(status_file, status_bak)
        os.remove(status_file)

# Update/write current project fingerprint
try:
    with open(fingerprint_file, 'w') as ff:
        json.dump({
            'projectName': project_name,
            'projectRoot': target_root_abs,
            'rootCommit': root_commit,
            'lastAudit': today
        }, ff, indent=2)
except Exception:
    pass

def extract_file_candidate(parts):
    for p in parts:
        cand = p.strip().split(':')[0].strip()
        if cand.startswith('./'):
            cand = cand[2:]
        if re.search(r'\.(?:ts|tsx|sql|js|mjs|json|css|html)$', cand):
            return cand
    return ""

def get_severity(text):
    first_part = text.split('|')[0].strip()
    if first_part in {'CRITICAL', 'WARN', 'INFO'}:
        return first_part
    if 'CRITICAL' in text or 'tsc-noEmit' in text or 'verify_security_antipatterns' in text:
        return 'CRITICAL'
    if 'INFO' in text or 'ts-prune' in text:
        return 'INFO'
    return 'WARN'

# Parse current findings checklist: id -> (status, rest)
current = {}
with open(findings_path) as f:
    for line in f:
        m = re.match(r'^- \[(x| |~)\] `([0-9a-f]{10})` \| (.+)$', line.rstrip('\n'))
        if m:
            st, fid, rest = m.groups()
            current[fid] = (st, rest)

# Parse existing plan (if any): id -> (status_char, extra_text)
existing = {}
plan_order = []
EXCLUDED_PARTS = {'.agent', '.agents', 'node_modules', 'dist', 'build', '.git', 'backups', 'scratch', 'graphify-out', 'e2e'}
for cfg_file in [os.path.join(target_root_abs, '.auditrc.json'), os.path.join(target_root_abs, '.auditrc'), os.path.join(audit_dir, '.config_parsed.json')]:
    if os.path.isfile(cfg_file):
        try:
            with open(cfg_file, 'r', errors='ignore') as cf:
                c_data = json.load(cf)
                for ed in c_data.get('excludeDirs', []):
                    EXCLUDED_PARTS.add(ed)
            break
        except Exception:
            pass

if not is_foreign_workspace and os.path.exists(plan_path):
    with open(plan_path) as f:
        for line in f:
            m = re.match(r'^- \[(x| |~)\] `([0-9a-f]{10})` \| (.+)$', line.rstrip('\n'))
            if m:
                status, fid, rest = m.groups()
                # Strict workspace isolation filter
                parts = rest.split('|')
                file_candidate = extract_file_candidate(parts)
                if file_candidate:
                    path_parts = set(os.path.normpath(file_candidate).split(os.sep))
                    if path_parts & EXCLUDED_PARTS:
                        continue
                    candidate_full = os.path.realpath(os.path.join(target_root_abs, file_candidate))
                    if not candidate_full.startswith(target_root_abs + os.sep) or not os.path.isfile(candidate_full):
                        continue

                existing[fid] = (status, rest)
                plan_order.append(fid)

new_items = []
seen = set()

# 1. Update existing entries with latest severity and description from current scan
for fid in plan_order:
    status, rest = existing[fid]
    seen.add(fid)
    if fid in current:
        curr_st, curr_rest = current[fid]
        # Preserve manual accepted/fixed decision, otherwise take current status
        effective_status = status if status in {'x', '~'} else curr_st
        new_items.append((fid, effective_status, curr_rest))
    elif status == ' ':
        new_items.append((fid, 'x', f"{rest} | RESOLVED (no longer detected as of {today})"))
    else:
        new_items.append((fid, status, rest))

# 2. Append brand-new findings not yet in the plan.
added = 0
for fid, (st, rest) in current.items():
    if fid not in seen:
        new_items.append((fid, st, rest))
        added += 1

# 3. Sort by Status (Pending -> Accepted -> Resolved), then Severity (CRITICAL -> WARN -> INFO)
SEV_ORDER = {'CRITICAL': 0, 'WARN': 1, 'INFO': 2}
STATUS_ORDER = {' ': 0, '~': 1, 'x': 2}
new_items.sort(key=lambda item: (STATUS_ORDER.get(item[1], 3), SEV_ORDER.get(get_severity(item[2]), 1)))

new_lines = [f"- [{st}] `{fid}` | {rest}" for fid, st, rest in new_items]

pending_crit = sum(1 for _, st, r in new_items if st == ' ' and get_severity(r) == 'CRITICAL')
pending_warn = sum(1 for _, st, r in new_items if st == ' ' and get_severity(r) == 'WARN')
pending_info = sum(1 for _, st, r in new_items if st == ' ' and get_severity(r) == 'INFO')
pending = sum(1 for _, st, _ in new_items if st == ' ')
done = sum(1 for _, st, _ in new_items if st == 'x')
accepted = sum(1 for _, st, _ in new_items if st == '~')

with open(plan_path, 'w') as out:
    out.write("# Fix Plan (Stage B)\n\n")
    out.write(f"Last synced: {today}\n\n")
    out.write("Status legend: `[ ]` pending &nbsp; `[x]` fixed/resolved &nbsp; `[~]` accepted as-is (WET/YAGNI exception — reason required)\n\n")
    out.write(f"Pending: {pending} (🔴 Critical: {pending_crit} | 🟡 Warn: {pending_warn} | 📊 Info: {pending_info}) | Fixed/resolved: {done} | Accepted: {accepted} | New this sync: {added}\n\n")
    out.write("To accept a finding instead of fixing it, change its line to:\n")
    out.write("`- [~] \\`ID\\` | ... | ACCEPTED: <reason, cite the WET/YAGNI rule that applies>`\n")
    out.write("Or add an in-code comment directly above the offending line: `// audit-ignore: <reason>`\n\n")
    out.write("## Items\n\n")
    for l in new_lines:
        out.write(l + "\n")

print(f"fix_plan.md synced: {pending} pending (🔴 {pending_crit} Critical, 🟡 {pending_warn} Warn, 📊 {pending_info} Info), {done} fixed/resolved, {accepted} accepted, {added} new.")
PYEOF