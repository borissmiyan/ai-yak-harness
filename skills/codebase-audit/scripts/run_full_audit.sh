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

run_section() {
  local title="$1"; local scope="$2"; shift 2
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
run_section "tsc-noEmit" "$PROJECT_ROOT" npx --no-install tsc --noEmit -p "$PROJECT_ROOT"
run_section "ts-prune" "$PROJECT_ROOT" bash -c "cd '$PROJECT_ROOT' && npx --no-install ts-prune -p tsconfig.json"
run_section "madge-circular" "$PROJECT_ROOT" bash -c "npx --no-install madge --circular --extensions ts,tsx '$PROJECT_ROOT' || [ \$? -eq 1 ]"
# eslint is fine scoped to TARGET — config resolution walks up on its own.
run_section "eslint" "$TARGET" bash -c 'npx --no-install eslint "$1" || [ $? -le 1 ]' _ "$TARGET"
run_section "depcheck" "$PROJECT_ROOT" bash -c "npx --no-install depcheck '$PROJECT_ROOT' || [ \$? -eq 255 ]"

# --- Config sanity: is eslint-plugin-react-hooks actually wired in? ---
# The regex heuristic in detect_ai_slop.sh ("Hook called after Early Return")
# can produce a large number of matches on its own, with no way to tell the
# person running the audit whether that count is trustworthy. The AST-based
# eslint-plugin-react-hooks check is the authoritative source per this
# skill's own rules — but if it isn't actually configured, an empty eslint
# section looks identical to "checked and found nothing," which it is not.
# Make the distinction explicit and mechanical instead of asking a human to
# judge it.
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

# --- Mechanical checklist extraction ---
CHECKLIST_TMP="$AUDIT_DIR/.checklist_tmp.txt"
: > "$CHECKLIST_TMP"

python3 - "$RAW_LOG" "$CHECKLIST_TMP" "$PROJECT_ROOT" <<'PYEOF'
import re, sys, hashlib, os

raw_log, out_path, project_root = sys.argv[1], sys.argv[2], sys.argv[3]
section = "unknown"
current_file = None
patterns = [
    re.compile(r'^(?P<file>[^\s:][^:]*\.(?:ts|tsx)):(?P<line>\d+):(?P<rest>.*)$'),
    re.compile(r'^(?P<file>[^\s:(][^(]*\.(?:ts|tsx))\((?P<line>\d+),\d+\):\s*(?P<rest>.*)$'),
    re.compile(r'^(?P<file>[^\s:][^:]*\.(?:ts|tsx)):\s*line\s+(?P<line>\d+),\s*col\s+\d+,\s*(?P<rest>.*)$'),
]

def normalize_file_path(fpath):
    if not fpath:
        return None
    # Reject foreign workspaces like voicefin
    if 'voicefin' in fpath.lower():
        return None
    # If absolute path, convert to relative to project_root
    if os.path.isabs(fpath):
        try:
            rel = os.path.relpath(fpath, project_root)
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
    # Check that file actually exists in project_root
    full_path = os.path.join(project_root, fpath)
    if not os.path.exists(full_path):
        return None
    return fpath

rows = []
with open(raw_log, 'r', errors='replace') as f:
    for line in f:
        line = line.rstrip('\n')
        if line.startswith('===SECTION::'):
            section = line.split('::', 1)[1].rstrip('=')
            current_file = None
            continue
        if line.startswith('===ENDSECTION==='):
            current_file = None
            continue
        if re.match(r'^(?:/[^\s:]+|[^\s:]+)\.(?:ts|tsx)$', line.strip()):
            current_file = normalize_file_path(line.strip())
            continue
        m_eslint = re.match(r'^\s*(?P<line>\d+):\d+\s+(?P<rest>.*)$', line)
        if m_eslint and current_file:
            ln, rest = m_eslint.group('line'), m_eslint.group('rest').strip()
            key = f"{section}|{current_file}|{ln}|{rest}"
            fid = hashlib.md5(key.encode('utf-8')).hexdigest()[:10]
            rows.append((fid, section, current_file, ln, rest))
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
                rows.append((fid, section, norm_file, ln, rest))
                break


seen = set()
with open(out_path, 'w') as out:
    for fid, section, file_, ln, rest in rows:
        if fid in seen:
            continue
        seen.add(fid)
        rest_safe = rest.replace('|', '/')
        out.write(f"- [ ] `{fid}` | {section} | {file_}:{ln} | {rest_safe}\n")

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