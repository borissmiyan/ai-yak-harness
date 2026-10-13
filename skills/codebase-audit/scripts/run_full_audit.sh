#!/usr/bin/env bash
# run_full_audit.sh — Stage A of the audit pipeline.
#
# Runs Step 0.5 (AST tools) + all detect_*.sh (Step 2) scripts and writes
# EVERY line of their output into .agent/audit/findings_raw.md, plus a
# mechanically-generated checklist section.
#
# WHY THIS EXISTS: the old flow relied on an LLM reading tool output and
# writing a curated markdown report. That step is where findings silently
# got dropped even though the underlying tools found everything. This
# script removes the LLM from the capture/formatting step entirely — it
# only runs tools and does text-processing. Curation/prioritization happens
# later, in the fix plan, never here.
#
# v2 CHANGES (after a real audit run scoped to a subdirectory silently
# produced near-empty results that got backfilled by hand):
#   - AST tools (tsc/ts-prune/madge/depcheck) now always run against the
#     nearest tsconfig.json/package.json ABOVE the given target, never
#     against the target path itself. Passing a feature subdirectory as
#     TARGET used to make `tsc -p <subdir>` fail outright (no tsconfig
#     there), and that failure was silently swallowed.
#   - Every tool's exit code is now recorded, and a Tool Execution Health
#     table is written at the TOP of findings_raw.md so a failed tool is
#     impossible to miss or quietly paper over.
#   - The checklist is validated (10-hex-char IDs only) before the script
#     exits; a malformed line aborts with an error instead of silently
#     being ignored later by sync_fix_plan.sh.
#
# v3 CHANGES:
#   - Every tool section is now timed (wall-clock seconds) and the duration
#     is recorded alongside its status, both in the console progress line
#     and in the Tool Execution Health table in findings_raw.md — so a slow
#     audit run can be diagnosed (which tool ate the time) without having
#     to re-run it with manual stopwatching.
#
# Usage: bash run_full_audit.sh <target_dir>
#
# Output: <project_root>/.agent/audit/findings_raw.md (overwritten)
#         previous version preserved as findings_raw.prev.md for diffing

set -uo pipefail  # NOTE: no -e — a failing detector must not abort the scan

TARGET="${1:-.}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# --- Resolve the actual project root for whole-project AST tools ---
# tsc/ts-prune/madge/depcheck need the real tsconfig.json/package.json,
# not whatever subdirectory the audit happens to be scoped to. Walk
# upward from TARGET until we find one.
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
  return 1
}

PROJECT_ROOT="$(resolve_root "$TARGET" || true)"
if [ -z "${PROJECT_ROOT:-}" ]; then
  echo "WARNING: no tsconfig.json/package.json found above $TARGET — falling back to $TARGET as project root. AST tool results will likely be incomplete/wrong." >&2
  PROJECT_ROOT="$(cd "$TARGET" && pwd)"
fi

if [ "$(cd "$TARGET" && pwd)" != "$PROJECT_ROOT" ]; then
  echo "NOTE: TARGET ($TARGET) is scoped narrower than the project root ($PROJECT_ROOT)."
  echo "      tsc/ts-prune/madge/depcheck will run against the full project at $PROJECT_ROOT"
  echo "      (partial-project type-checking is not meaningful). eslint and the"
  echo "      detect_*.sh regex scripts stay scoped to $TARGET."
fi

# Audit state always lives at the project root, not under the scoped target,
# so a feature-scoped audit and a full-repo audit share the same fix_plan.md
# instead of silently forking audit state per subdirectory.
AUDIT_DIR="$PROJECT_ROOT/.agent/audit"
OUT="$AUDIT_DIR/findings_raw.md"
RAW_LOG="$AUDIT_DIR/.raw_tool_output.log"
HEALTH_LOG="$AUDIT_DIR/.tool_health.tsv"

mkdir -p "$AUDIT_DIR"

if [ -f "$OUT" ]; then
  cp "$OUT" "$AUDIT_DIR/findings_raw.prev.md"
fi

: > "$RAW_LOG"
: > "$HEALTH_LOG"

CONFIG_PARSED="$AUDIT_DIR/.config_parsed.json"
: > "$CONFIG_PARSED"

# Parse .auditrc.json or .auditrc if present
python3 - "$PROJECT_ROOT" "$CONFIG_PARSED" <<'PYEOF'
import sys, os, json

project_root, out_path = sys.argv[1], sys.argv[2]
candidates = [
    os.path.join(project_root, '.auditrc.json'),
    os.path.join(project_root, '.auditrc')
]
config = {
    'excludeDirs': [],
    'disabledTools': [],
    'severityOverrides': {},
    'customChecks': [],
    'failOn': 'CRITICAL',
    'autoFixCommand': ''
}
for p in candidates:
    if os.path.isfile(p):
        try:
            with open(p, 'r', errors='ignore') as f:
                user_cfg = json.load(f)
                if isinstance(user_cfg, dict):
                    for k in config:
                        if k in user_cfg:
                            config[k] = user_cfg[k]
                    print(f"Loaded audit configuration from {os.path.basename(p)}")
            break
        except Exception as e:
            print(f"Warning: failed to read {p}: {e}", file=sys.stderr)

try:
    with open(out_path, 'w') as f:
        json.dump(config, f, indent=2)
except Exception:
    pass
PYEOF

EXTRA_EXCLUDES=$(python3 -c "import json, os; p='$CONFIG_PARSED'; data = json.load(open(p)) if os.path.exists(p) else {}; print(' '.join(data.get('excludeDirs', [])))" 2>/dev/null || true)
if [ -n "$EXTRA_EXCLUDES" ]; then
  export AUDIT_EXTRA_EXCLUDES="$EXTRA_EXCLUDES"
fi

run_section() {
  local title="$1"; local scope="$2"; shift 2

  if [ -f "$CONFIG_PARSED" ]; then
    if python3 -c "import json, sys; d=json.load(open('$CONFIG_PARSED')); sys.exit(0 if '$title' in d.get('disabledTools', []) else 1)" 2>/dev/null; then
      echo "  [$title] skipped (disabled in configuration)"
      return 0
    fi
  fi

  echo "" >> "$RAW_LOG"
  echo "===SECTION::${title}===" >> "$RAW_LOG"
  local start_ts end_ts duration rc=0
  start_ts=$(date +%s)
  "$@" >> "$RAW_LOG" 2>&1 || rc=$?
  end_ts=$(date +%s)
  duration=$((end_ts - start_ts))
  echo "===ENDSECTION===" >> "$RAW_LOG"
  local status="OK"
  if [ "$rc" -ne 0 ]; then
    status="FAILED(exit $rc)"
  fi
  printf "%s\t%s\t%s\t%ss\n" "$title" "$scope" "$status" "$duration" >> "$HEALTH_LOG"
  echo "  [$title] finished in ${duration}s (status: $status)"
}

echo "Running full audit. Scope: $TARGET | Project root for AST tools: $PROJECT_ROOT"

# --- Step 0.5: AST-based ground truth — always at PROJECT_ROOT ---
# --- Step 0.5: AST-based ground truth — always at PROJECT_ROOT ---
run_section "tsc-noEmit" "$PROJECT_ROOT" npx --no-install tsc --noEmit -p "$PROJECT_ROOT"

# Circular dependency verification: use project's fast dpdm guard if present
if [ -f "$PROJECT_ROOT/scripts/verify-no-circular.mjs" ]; then
  run_section "verify_no_circular" "$PROJECT_ROOT" node "$PROJECT_ROOT/scripts/verify-no-circular.mjs"
else
  run_section "madge-circular" "$PROJECT_ROOT" bash -c "npx --no-install madge --circular --extensions ts,tsx '$PROJECT_ROOT' || [ \$? -eq 1 ]"
fi

# AST Security Anti-Patterns Gate (OWASP, RLS, IDOR, Secret Hygiene)
if [ -f "$PROJECT_ROOT/scripts/verify-security-antipatterns.mjs" ]; then
  run_section "verify_security_antipatterns" "$PROJECT_ROOT" node "$PROJECT_ROOT/scripts/verify-security-antipatterns.mjs"
fi

# Resource Hygiene & Memory Leak guard
if [ -f "$PROJECT_ROOT/scripts/verify-resource-hygiene.mjs" ]; then
  run_section "verify_resource_hygiene" "$PROJECT_ROOT" node "$PROJECT_ROOT/scripts/verify-resource-hygiene.mjs"
fi

# Component Memoization guard
if [ -f "$PROJECT_ROOT/scripts/verify-memoization.mjs" ]; then
  run_section "verify_memoization" "$PROJECT_ROOT" node "$PROJECT_ROOT/scripts/verify-memoization.mjs"
fi

# Schema Drift guard
if [ -f "$PROJECT_ROOT/scripts/verify-schema-drift.mjs" ]; then
  run_section "verify_schema_drift" "$PROJECT_ROOT" node "$PROJECT_ROOT/scripts/verify-schema-drift.mjs"
fi

# eslint is fine scoped to TARGET — config resolution walks up on its own.
run_section "eslint" "$TARGET" bash -c 'npx --no-install eslint "$1" || [ $? -le 1 ]' _ "$TARGET"

if npx --no-install ts-prune --version >/dev/null 2>&1; then
  run_section "ts-prune" "$PROJECT_ROOT" bash -c "cd '$PROJECT_ROOT' && npx --no-install ts-prune -p tsconfig.json"
fi

if npx --no-install depcheck --version >/dev/null 2>&1; then
  run_section "depcheck" "$PROJECT_ROOT" bash -c "npx --no-install depcheck '$PROJECT_ROOT' || [ \$? -eq 255 ]"
fi

if command -v npm >/dev/null 2>&1; then
  run_section "npm-audit" "$PROJECT_ROOT" bash -c "cd '$PROJECT_ROOT' && npm audit --json || [ \$? -le 1 ]"
fi

# --- Config sanity: is eslint-plugin-react-hooks actually wired in? ---
REACT_HOOKS_PLUGIN_STATUS="NOT DETECTED"
for cfg in "$PROJECT_ROOT/eslint.config.js" "$PROJECT_ROOT/eslint.config.mjs" "$PROJECT_ROOT/eslint.config.cjs" "$PROJECT_ROOT/.eslintrc.js" "$PROJECT_ROOT/.eslintrc.json" "$PROJECT_ROOT/.eslintrc.cjs"; do
  if [ -f "$cfg" ] && grep -q "react-hooks" "$cfg" 2>/dev/null; then
    REACT_HOOKS_PLUGIN_STATUS="configured (found in $(basename "$cfg"))"
    break
  fi
done
echo "React Hooks ESLint plugin: $REACT_HOOKS_PLUGIN_STATUS" >> "$RAW_LOG"

# --- Step 2: stack-specific regex detectors — scoped to TARGET ---
run_section "detect_type_violations" "$TARGET" bash "$SCRIPT_DIR/detect_type_violations.sh" "$TARGET"
run_section "detect_performance_issues" "$TARGET" bash "$SCRIPT_DIR/detect_performance_issues.sh" "$TARGET"
run_section "detect_antipatterns" "$TARGET" bash "$SCRIPT_DIR/detect_antipatterns.sh" "$TARGET"
run_section "detect_ai_slop" "$TARGET" bash "$SCRIPT_DIR/detect_ai_slop.sh" "$TARGET"
run_section "detect_security_vulnerabilities" "$TARGET" node "$SCRIPT_DIR/detect_security_vulnerabilities.mjs" "$TARGET"

# --- Step 2.5: User-defined custom checks from .auditrc.json ---
if [ -f "$CONFIG_PARSED" ]; then
  while IFS='|' read -r c_name c_cmd; do
    if [ -n "$c_name" ] && [ -n "$c_cmd" ]; then
      run_section "$c_name" "$PROJECT_ROOT" bash -c "$c_cmd"
    fi
  done < <(python3 - "$CONFIG_PARSED" <<'PYEOF'
import json, sys
try:
    data = json.load(open(sys.argv[1]))
    for item in data.get('customChecks', []):
        if isinstance(item, dict) and item.get('name') and item.get('cmd'):
            print(f"{item['name']}|{item['cmd']}")
except Exception:
    pass
PYEOF
)
fi

# --- Mechanical checklist extraction ---
CHECKLIST_TMP="$AUDIT_DIR/.checklist_tmp.txt"
: > "$CHECKLIST_TMP"

python3 - "$RAW_LOG" "$CHECKLIST_TMP" "$PROJECT_ROOT" "$CONFIG_PARSED" <<'PYEOF'
import re, sys, hashlib, os, json

raw_log, out_path, project_root, config_path = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
project_root_abs = os.path.realpath(project_root)
section = "unknown"
sub_severity = "WARN"
current_file = None
current_sec_file = None

cfg = {}
if os.path.isfile(config_path):
    try:
        with open(config_path, 'r', errors='ignore') as cf:
            cfg = json.load(cf)
    except Exception:
        pass

patterns = [
    re.compile(r'^(?P<file>[^\s:][^:]*\.(?:ts|tsx|sql|js|mjs)):(?P<line>\d+):(?P<rest>.*)$'),
    re.compile(r'^(?P<file>[^\s:(][^(]*\.(?:ts|tsx|sql|js|mjs))\((?P<line>\d+),\d+\):\s*(?P<rest>.*)$'),
    re.compile(r'^(?P<file>[^\s:][^:]*\.(?:ts|tsx|sql|js|mjs)):\s*line\s+(?P<line>\d+),\s*col\s+\d+,\s*(?P<rest>.*)$'),
]

EXCLUDED_DIR_NAMES = {'.agent', '.agents', 'node_modules', 'dist', 'build', '.git', 'backups', 'scratch', 'graphify-out', 'e2e'}
for d in cfg.get('excludeDirs', []):
    EXCLUDED_DIR_NAMES.add(d)

severity_overrides = cfg.get('severityOverrides', {})
custom_check_severities = {}
for cc in cfg.get('customChecks', []):
    if isinstance(cc, dict) and cc.get('name') and cc.get('severity'):
        custom_check_severities[cc['name']] = cc['severity']

def normalize_file_path(fpath):
    if not fpath:
        return None
    # If absolute path, convert to relative to project_root
    if os.path.isabs(fpath):
        try:
            rel = os.path.relpath(fpath, project_root_abs)
            if rel.startswith('..'):
                return None
            fpath = rel
        except ValueError:
            return None
    else:
        if fpath.startswith('./'):
            fpath = fpath[2:]
        if fpath.startswith('../'):
            return None

    norm_path = os.path.normpath(fpath)
    parts = set(norm_path.split(os.sep))
    if parts & EXCLUDED_DIR_NAMES:
        return None

    # Check that file actually exists strictly inside project_root
    full_path = os.path.realpath(os.path.join(project_root_abs, norm_path))
    if not full_path.startswith(project_root_abs + os.sep) or not os.path.exists(full_path):
        return None
    return norm_path

def check_audit_ignore(rel_path, line_no):
    if not line_no:
        return None
    try:
        ln_idx = int(line_no)
    except ValueError:
        return None
    full_path = os.path.join(project_root_abs, rel_path)
    if not os.path.isfile(full_path):
        return None
    try:
        with open(full_path, 'r', errors='ignore') as sf:
            lines = sf.readlines()
        candidates = []
        if 1 <= ln_idx <= len(lines):
            candidates.append(lines[ln_idx - 1])
        if ln_idx - 2 >= 0 and ln_idx - 2 < len(lines):
            candidates.append(lines[ln_idx - 2])
        for cand_line in candidates:
            m = re.search(r'(?://|/\*)\s*audit-ignore(?::?\s*(.*?))?(?:\*/)?$', cand_line.strip())
            if m:
                reason = m.group(1).strip() if m.group(1) else "in-code audit-ignore annotation"
                return reason
    except Exception:
        pass
    return None

npm_audit_buffer = []
rows = []
with open(raw_log, 'r', errors='replace') as f:
    for line in f:
        line = line.rstrip('\n')
        if line.startswith('===SECTION::'):
            section = line.split('::', 1)[1].rstrip('=')
            if section in severity_overrides:
                sub_severity = severity_overrides[section]
            elif section in custom_check_severities:
                sub_severity = custom_check_severities[section]
            elif section in {'tsc-noEmit', 'verify_security_antipatterns', 'detect_security_vulnerabilities', 'verify_no_circular', 'madge-circular', 'verify_resource_hygiene', 'verify_schema_drift'}:
                sub_severity = "CRITICAL"
            elif section in {'ts-prune'}:
                sub_severity = "INFO"
            elif section in {'depcheck'}:
                sub_severity = "WARN"
            else:
                sub_severity = "WARN"
            current_file = None
            current_sec_file = None
            npm_audit_buffer = []
            continue
        if line.startswith('===ENDSECTION==='):
            if section == 'npm-audit' and npm_audit_buffer:
                try:
                    audit_str = '\n'.join(npm_audit_buffer)
                    start_pos = audit_str.find('{')
                    if start_pos != -1:
                        data = json.loads(audit_str[start_pos:])
                        vulns = data.get('vulnerabilities', {})
                        for pkg, vinfo in vulns.items():
                            s_level = vinfo.get('severity', 'moderate').upper()
                            sev = 'CRITICAL' if s_level in {'CRITICAL', 'HIGH'} else ('WARN' if s_level == 'MODERATE' else 'INFO')
                            via = vinfo.get('via', [])
                            for itm in via:
                                if isinstance(itm, dict):
                                    t_title = itm.get('title', 'Known vulnerability')
                                    u_url = itm.get('url', '')
                                    k_key = f"npm-audit|package.json|1|{pkg}:{t_title}"
                                    f_id = hashlib.md5(k_key.encode('utf-8')).hexdigest()[:10]
                                    d_desc = f"Dependency vulnerability in {pkg}: {t_title} ({s_level}) {u_url}".strip()
                                    rows.append((f_id, sev, "npm-audit", "package.json", "1", d_desc, None))
                except Exception:
                    pass
                npm_audit_buffer = []
            section = "unknown"
            sub_severity = "WARN"
            current_file = None
            current_sec_file = None
            continue

        if section == 'npm-audit':
            npm_audit_buffer.append(line)
            continue

        if section not in severity_overrides:
            if 'CRITICAL' in line or '🔴' in line or 'MEMORY:' in line or 'PERF: Double JSON.stringify' in line:
                sub_severity = "CRITICAL"
            elif 'WARNING' in line or 'WARN' in line or '🟡' in line:
                sub_severity = "WARN"
            elif 'INFO' in line or '📊' in line or 'ℹ️' in line:
                sub_severity = "INFO"

        # Parser for verify_security_antipatterns format:
        # - <filepath>
        #   <message>
        if section == 'verify_security_antipatterns':
            m_sec_file = re.match(r'^\s*-\s+(?P<file>[^\s:]+\.(?:sql|ts|tsx|js|mjs))\s*$', line)
            if m_sec_file:
                current_sec_file = normalize_file_path(m_sec_file.group('file'))
                continue
            m_sec_msg = re.match(r'^\s{2,}(?P<msg>.+)$', line)
            if m_sec_msg and current_sec_file:
                rest = m_sec_msg.group('msg').strip()
                key = f"{section}|{current_sec_file}|1|{rest}"
                fid = hashlib.md5(key.encode('utf-8')).hexdigest()[:10]
                ign = check_audit_ignore(current_sec_file, '1')
                sev = severity_overrides.get(section, "CRITICAL")
                rows.append((fid, sev, section, current_sec_file, '1', rest, ign))
                current_sec_file = None
                continue

        if re.match(r'^(?:/[^\s:]+|[^\s:]+)\.(?:ts|tsx|sql|js|mjs)$', line.strip()):
            current_file = normalize_file_path(line.strip())
            continue
        m_eslint = re.match(r'^\s*(?P<line>\d+):\d+\s+(?P<rest>.*)$', line)
        if m_eslint and current_file:
            ln, rest = m_eslint.group('line'), m_eslint.group('rest').strip()
            sev = severity_overrides.get(section, "CRITICAL" if "error" in rest.lower() else "WARN")
            key = f"{section}|{current_file}|{ln}|{rest}"
            fid = hashlib.md5(key.encode('utf-8')).hexdigest()[:10]
            ign = check_audit_ignore(current_file, ln)
            rows.append((fid, sev, section, current_file, ln, rest, ign))
            continue
        for pat in patterns:
            m = pat.match(line.strip())
            if m:
                raw_file, ln, rest = m.group('file'), m.group('line'), m.group('rest').strip()
                norm_file = normalize_file_path(raw_file)
                if not norm_file:
                    break
                key = f"{section}|{norm_file}|{ln}|{rest}"
                fid = hashlib.md5(key.encode('utf-8')).hexdigest()[:10]
                ign = check_audit_ignore(norm_file, ln)
                rows.append((fid, sub_severity, section, norm_file, ln, rest, ign))
                break


seen = set()
with open(out_path, 'w') as out:
    for fid, sev, section, file_, ln, rest, ign in rows:
        if fid in seen:
            continue
        seen.add(fid)
        rest_safe = rest.replace('|', '/')
        if ign:
            out.write(f"- [~] `{fid}` | {sev} | {section} | {file_}:{ln} | {rest_safe} | ACCEPTED: in-code audit-ignore ({ign})\n")
        else:
            out.write(f"- [ ] `{fid}` | {sev} | {section} | {file_}:{ln} | {rest_safe}\n")

print(f"Extracted {len(seen)} unique findings into checklist.")
PYEOF

TOTAL=$(wc -l < "$CHECKLIST_TMP" | tr -d ' ')
FAILED_COUNT=$(awk -F'\t' '$3 ~ /^FAILED/' "$HEALTH_LOG" | wc -l | tr -d ' ')
HOOK_AFTER_RETURN_COUNT=$(grep -c "Hook called after return" "$RAW_LOG" || true)

{
  echo "# Audit Findings — Raw (Stage A)"
  echo ""
  echo "Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo "Scope (TARGET): $TARGET"
  echo "Project root (AST tools): $PROJECT_ROOT"
  echo "Total findings extracted: $TOTAL"
  echo ""
  echo "## ⚙️ Tool Execution Health"
  echo ""
  echo "| Tool | Scope | Status | Duration |"
  echo "|---|---|---|---|"
  while IFS=$'\t' read -r title scope status duration; do
    marker="✅"
    [[ "$status" == FAILED* ]] && marker="❌"
    echo "| $marker $title | $scope | $status | $duration |"
  done < "$HEALTH_LOG"
  echo ""
  if [ "$FAILED_COUNT" -gt 0 ]; then
    echo "> ⚠️ **$FAILED_COUNT tool(s) failed to execute.** A low or zero finding"
    echo "> count from a failed tool means \"the tool didn't run,\" not \"nothing"
    echo "> was found.\" Do NOT report CLEAN based on this scan until failed tools"
    echo "> are fixed (usually a wrong path/missing tsconfig) and re-run."
    echo ">"
    echo "> update_status.sh will refuse to report CLEAN while this table shows"
    echo "> any ❌."
  else
    echo "All tools executed successfully. An empty/low finding count below can be"
    echo "trusted as an actual result, not a tool failure."
  fi
  echo ""
  echo "## 🔧 Config Sanity"
  echo ""
  echo "- React Hooks ESLint plugin: **$REACT_HOOKS_PLUGIN_STATUS**"
  echo "- \`detect_ai_slop.sh\` regex heuristic \"Hook called after Early Return\" found: **$HOOK_AFTER_RETURN_COUNT** matches"
  echo ""
  if [ "$REACT_HOOKS_PLUGIN_STATUS" = "NOT DETECTED" ] && [ "$HOOK_AFTER_RETURN_COUNT" -gt 0 ]; then
    echo "> ⚠️ **The authoritative AST check for Rules-of-Hooks is not configured,"
    echo "> but the regex heuristic found $HOOK_AFTER_RETURN_COUNT matches.** Per this"
    echo "> skill's own rules, the eslint-plugin-react-hooks result is supposed to"
    echo "> override the regex heuristic — but it can't, because it isn't running."
    echo "> These $HOOK_AFTER_RETURN_COUNT matches may be real violations, or may be"
    echo "> false positives from a heuristic that can't distinguish an early return"
    echo "> inside a nested callback from one in the component body itself."
    echo ">"
    echo "> Do not add these findings to fix_plan.md as CRITICAL yet. Before Stage B:"
    echo "> add \`eslint-plugin-react-hooks\` to the project's eslint config (this is"
    echo "> a one-time, low-risk setup change — not a code fix), re-run"
    echo "> \`audit_cycle.sh\`, and let the real eslint output replace this section."
    echo "> If eslint then reports few or no rules-of-hooks violations, the regex"
    echo "> matches were mostly noise and should NOT be worked through one by one."
  elif [ "$REACT_HOOKS_PLUGIN_STATUS" != "NOT DETECTED" ]; then
    echo "Plugin is configured — the eslint section above is authoritative for"
    echo "Rules-of-Hooks findings. Trust it over the regex heuristic count."
  fi
  echo ""
  echo "> This file is generated mechanically by run_full_audit.sh. Nothing here"
  echo "> is curated or prioritized — that happens in fix_plan.md. Do not hand-edit"
  echo "> the checklist below; regenerate it by re-running this script. Any manual"
  echo "> addition (Cross-Artifact Diff / Convention Deviation findings) MUST use"
  echo "> a 10-character lowercase-hex id — \`md5(\"manual|<file>|<line>|<desc>\")\`"
  echo "> truncated to 10 chars — or it will be rejected by validate_findings.sh"
  echo "> instead of silently ignored."
  echo ""
  echo "## Checklist (auto-extracted, one line per finding)"
  echo ""
  if [ "$TOTAL" -eq 0 ]; then
    echo "_No file:line findings could be auto-extracted from tool output. If the health table above shows failures, that is almost certainly why — fix the tool invocation and re-run before trusting this as clean. If all tools succeeded and this is still empty, treat the raw log below as ground truth._"
  else
    cat "$CHECKLIST_TMP"
  fi
  echo ""
  echo "## Raw tool output (full, unfiltered — ground truth)"
  echo ""
  echo '```'
  cat "$RAW_LOG"
  echo '```'
} > "$OUT"

rm -f "$CHECKLIST_TMP"

TOOL_COUNT=$(wc -l < "$HEALTH_LOG" | tr -d ' ')
echo "Wrote $OUT ($TOTAL checklist items; $FAILED_COUNT/$TOOL_COUNT tools failed)."

# --- Validate checklist ID format before handing off to Stage B ---
bash "$SCRIPT_DIR/validate_findings.sh" "$PROJECT_ROOT"