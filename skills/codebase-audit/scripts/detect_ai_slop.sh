#!/usr/bin/env bash
# detect_ai_slop.sh — Find AI-generated technical debt patterns
# Usage: bash detect_ai_slop.sh <target_dir>
#
# CHANGELOG (fixed):
# - Four sections ("Hooks after Early Returns", "Event Listener Leaks",
#   "Interval Leaks", "Form State Overuse") used `find ... | while read -r file; do
#   ...; RES="${RES}${MSG}\n"; done` — because the while loop sat on the RIGHT side
#   of a pipe, bash ran it in a subshell. Every assignment to RES inside that
#   subshell was thrown away the moment the loop ended, so log_finding always
#   received an empty string and those sections silently never appeared in the
#   markdown report (they only ever showed up in the terminal). Fixed by
#   redirecting `< <(find ...)` (process substitution) instead of piping INTO
#   the loop, so the while loop — and its RES assignments — run in the current
#   shell.
# - `echo "$RES" || echo "..."` never falls back to the "not found" message
#   because `echo ""` still returns exit code 0. Replaced with an explicit
#   `[ -z "$RES" ]` check.

set -uo pipefail

TARGET="${1:-.}"
RED='\033[0;31m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
GREEN='\033[0;32m'
NC='\033[0m'

echo "=============================="
echo " AI-SLOP PATTERN SCAN"
echo " Target: $TARGET"
echo "=============================="

# Setup Markdown Reporting
REPORT_DIR="docs/codebase-audit"
mkdir -p "$REPORT_DIR"
DATE=$(date +%Y-%m-%d)
REPORT_FILE="$REPORT_DIR/audit-$DATE.md"

{
  echo "# 🛡️ Codebase Audit Report — $DATE"
  echo ""
  echo "## 📊 Summary"
  echo "- **Target Directory**: \`$TARGET\`"
  echo "- **Scan Date**: $DATE"
} > "$REPORT_FILE"

# Helper to log findings
log_finding() {
  local title="$1"
  local output="$2"
  if [ -n "$output" ] && [ "$output" != " " ]; then
    echo "### $title" >> "$REPORT_FILE"
    echo "\`\`\`" >> "$REPORT_FILE"
    printf '%s\n' "$output" >> "$REPORT_FILE"
    echo "\`\`\`" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
  fi
}

print_or_ok() {
  # $1 = content, $2 = ok message
  if [ -z "$1" ]; then
    echo "  $2"
  else
    echo "$1"
  fi
}


# ──────────────────────────────────────────────
echo ""
echo -e "${CYAN}🧪 STEP: TypeScript compiler baseline (tsc --noEmit)${NC}"
echo "-------------------------------"
# This catches real type errors (implicit any via inference, unsound narrowing,
# incompatible unions) that no regex pattern below can find. Run it BEFORE
# trusting any grep-based "no `any` found" result.
if [ -f "$TARGET/tsconfig.json" ] || [ -f "tsconfig.json" ]; then
  if npx --no-install tsc --noEmit -p "$TARGET" > /tmp/audit_tsc.log 2>&1; then
    echo "  ✅ tsc --noEmit: no type errors"
    echo "- **tsc --noEmit**: ✅ Passed" >> "$REPORT_FILE"
  else
    ERR_COUNT=$(grep -c "error TS" /tmp/audit_tsc.log || true)
    echo "  ❌ tsc --noEmit found $ERR_COUNT error(s) — see below"
    echo "- **tsc --noEmit**: ❌ $ERR_COUNT error(s)" >> "$REPORT_FILE"
    log_finding "TypeScript Compiler Errors" "$(head -n 60 /tmp/audit_tsc.log)"
  fi
else
  echo "  ⚠️  No tsconfig.json found — skipping tsc baseline"
fi

echo "" >> "$REPORT_FILE"
echo "## 🔍 Findings" >> "$REPORT_FILE"

# ──────────────────────────────────────────────
echo ""
echo -e "${RED}🔴 CRITICAL: useCallback/useMemo called inside JSX${NC}"
echo "-------------------------------"
RES=$(grep -rn --include='*.tsx' -E '\{\s*(useCallback|useMemo)\(' "$TARGET" 2>/dev/null | grep -v 'node_modules' || true)
print_or_ok "$RES" "✅ No hooks in JSX found"
log_finding "Hooks inside JSX (Rule of Hooks Violation)" "$RES"

# ──────────────────────────────────────────────
echo ""
echo -e "${RED}🔴 CRITICAL: Hook called after Early Return (Violation)${NC}"
echo "-------------------------------"
RES=""
while IFS= read -r file; do
  FIRST_RETURN=$(grep -nE 'return\s+(null|true|false|<|\[|\{)' "$file" | head -1 | cut -d: -f1)
  if [ -z "$FIRST_RETURN" ]; then continue; fi

  HOOKS_BELOW=$(tail -n +"$((FIRST_RETURN + 1))" "$file" | grep -nE 'const.*=\s*use[A-Z]|use[A-Z][a-zA-Z]+\(' || true)
  if [ -n "$HOOKS_BELOW" ]; then
    LAST_LINE=$(wc -l < "$file" | tr -d ' ')
    if [ "$FIRST_RETURN" -lt $((LAST_LINE - 10)) ]; then
      MSG="🔴 $file — Hook called after return on line $FIRST_RETURN"
      echo "  $MSG"
      RES="${RES}${MSG}"$'\n'
    fi
  fi
done < <(find "$TARGET" -name "*.tsx" -not -path '*/node_modules/*')
[ -z "$RES" ] && echo "  ✅ No hooks-after-return violations found"
log_finding "Hooks after Early Returns" "$RES"

# ──────────────────────────────────────────────
echo ""
echo -e "${RED}🔴 CRITICAL: JSON.stringify used for object comparison${NC}"
echo "-------------------------------"
RES=$(grep -rn --include='*.ts' --include='*.tsx' \
  -E 'JSON\.stringify\(.+\)\s*(===|!==)\s*JSON\.stringify' \
  "$TARGET" 2>/dev/null | grep -v 'node_modules' | grep -v '.test.' || true)
print_or_ok "$RES" "✅ No JSON.stringify comparison found"
log_finding "JSON.stringify Comparisons" "$RES"

# ──────────────────────────────────────────────
echo ""
echo -e "${RED}🔴 CRITICAL: useEffect that only calls setState (derived state)${NC}"
echo "-------------------------------"
RES=$(grep -rn --include='*.tsx' --include='*.ts' \
  -B1 -A3 'useEffect.*=>' \
  "$TARGET" 2>/dev/null | grep -v 'node_modules' | grep -v '.test.' | \
  grep -E 'set[A-Z]\w+\(' | head -20 || true)
print_or_ok "$RES" "✅ No derived-state useEffect found"
log_finding "Derived State useEffect" "$RES"
echo "  NOTE: this is a single-line heuristic. It misses useEffect bodies where"
echo "  the setState call is broken across multiple lines by a formatter — do a"
echo "  manual read of every useEffect in files touched by this audit, don't"
echo "  trust a clean result here on its own."

# ──────────────────────────────────────────────
echo ""
echo -e "${RED}🔴 CRITICAL: 'as unknown as' double type cast${NC}"
echo "-------------------------------"
RES=$(grep -rn --include='*.ts' --include='*.tsx' 'as unknown as' "$TARGET" 2>/dev/null | grep -v 'node_modules' | grep -v '.test.' || true)
print_or_ok "$RES" "✅ No double casts found"
log_finding "Double Type Casts" "$RES"

# ──────────────────────────────────────────────
echo ""
echo -e "${YELLOW}🟡 WARNING: Local State for Global Modals${NC}"
echo "-------------------------------"
RES=$(grep -rn --include='*.tsx' -E 'const \[.*(Modal|Dialog|Sheet).*, set.*\] = useState' "$TARGET" 2>/dev/null | grep -v 'node_modules' | head -10 || true)
print_or_ok "$RES" "✅ Modals seem managed globally."
log_finding "Local Modal State" "$RES"

# ──────────────────────────────────────────────
echo ""
echo -e "${RED}🔴 CRITICAL: Database Overfetching (select('*'))${NC}"
echo "-------------------------------"
RES=$(grep -rn --include='*.ts' --include='*.tsx' -E "\.select\(\s*['\"]\s*\*\s*['\"]\s*\)" "$TARGET" 2>/dev/null | grep -v 'node_modules' | head -10 || true)
print_or_ok "$RES" "✅ No select('*') found"
log_finding "Database Overfetching" "$RES"

# ──────────────────────────────────────────────
echo ""
echo -e "${YELLOW}🟡 WARNING: Missing abortSignal in API Service${NC}"
echo "-------------------------------"
RES=$(grep -rn --include='*.ts' --include='*.tsx' -E "export const .* = async \(.*\) => \{" "$TARGET" 2>/dev/null | grep -v 'abortSignal' | grep -v 'node_modules' | head -10 || true)
print_or_ok "$RES" "✅ API services seem to handle abortSignal"
log_finding "Missing AbortSignal support" "$RES"

# ──────────────────────────────────────────────
echo ""
echo -e "${YELLOW}🟡 WARNING: Possibly unchecked empty array in .in()${NC}"
echo "-------------------------------"
RES=$(grep -rn --include='*.ts' --include='*.tsx' -E "\.in\(\s*['\"][\w]+['\"]\s*,\s*\w+\)" "$TARGET" 2>/dev/null | grep -v 'node_modules' | head -15 || true)
print_or_ok "$RES" "✅ No .in() calls with a bare variable argument found"
log_finding "Possibly Unchecked Empty .in() Array" "$RES"

# ──────────────────────────────────────────────
echo ""
echo -e "${RED}🔴 CRITICAL: Ad-hoc Hex Colors${NC}"
echo "-------------------------------"
RES=$(grep -rn --include='*.tsx' "text-\[#[0-9a-fA-F]*\]\|bg-\[#[0-9a-fA-F]*\]" "$TARGET" 2>/dev/null | grep -v 'node_modules' | head -10 || true)
print_or_ok "$RES" "✅ No ad-hoc hex colors found."
log_finding "Ad-hoc Hex Colors" "$RES"

# ──────────────────────────────────────────────
echo ""
echo -e "${RED}🔴 CRITICAL: File Size Limit Exceeded (> 500 lines)${NC}"
echo "-------------------------------"
RES=$(find "$TARGET" -type f \( -name "*.ts" -o -name "*.tsx" \) -not -path "*/node_modules/*" -print0 \
  | xargs -0 wc -l 2>/dev/null | awk '$1 > 500 && $2 != "total" {print $2 ": " $1 " lines"}' | head -10 || true)
print_or_ok "$RES" "✅ All files are under 500 lines."
log_finding "File Size Violations" "$RES"

# ──────────────────────────────────────────────
echo ""
echo -e "${CYAN}📱 TMA: Missing expand/ready on init${NC}"
echo "-------------------------------"
RES=$(grep -rn --include='*.tsx' --include='*.ts' 'Telegram\.WebApp' "$TARGET" 2>/dev/null | grep -E 'features|App.tsx' | grep -v 'ready(\|expand(' || true)
print_or_ok "$RES" "✅ TMA init looks good."
log_finding "TMA Initialization" "$RES"

# ──────────────────────────────────────────────
echo ""
echo -e "${RED}🔴 CRITICAL: Direct Zustand State Mutation${NC}"
echo "-------------------------------"
RES=$(grep -rn --include='*.ts' --include='*.tsx' -E "state\.[a-zA-Z0-9_.]+\s*=" "$TARGET" 2>/dev/null | grep 'set(' | grep -v 'node_modules' || true)
print_or_ok "$RES" "✅ No direct mutations found"
log_finding "Direct Object Mutation in Stores" "$RES"

# ──────────────────────────────────────────────
echo ""
echo -e "${RED}🔴 CRITICAL: Unmemoized Context Provider Value${NC}"
echo "-------------------------------"
RES=$(grep -rn --include='*.tsx' -E '<.*\.Provider\s+value=\{\s*\{' "$TARGET" 2>/dev/null | grep -v 'node_modules' || true)
print_or_ok "$RES" "✅ Context providers seem to use memoized values"
log_finding "Unmemoized Context Provider" "$RES"

# ──────────────────────────────────────────────
echo ""
echo -e "${RED}🔴 CRITICAL: Missing unsubscribe for Auth side-effects${NC}"
echo "-------------------------------"
RES=$(grep -rn --include='*.ts' --include='*.tsx' 'onAuthStateChange' "$TARGET" 2>/dev/null | grep -v 'unsubscribe' | grep -v 'node_modules' || true)
print_or_ok "$RES" "✅ Auth listeners seem managed"
log_finding "Auth Listener Leaks" "$RES"

# ──────────────────────────────────────────────
echo ""
echo -e "${YELLOW}🟡 WARNING: Naked UUID in JSX${NC}"
echo "-------------------------------"
RES=$(grep -rn --include='*.tsx' -E '>\s*\{.*[iI]d\s*\}\s*<' "$TARGET" 2>/dev/null | grep -v 'node_modules' || true)
print_or_ok "$RES" "✅ No naked UUIDs found in JSX"
log_finding "Naked UUIDs in UI" "$RES"

# ──────────────────────────────────────────────
echo ""
echo -e "${YELLOW}🟡 WARNING: Non-semantic onClick (onClick on Div/Span)${NC}"
echo "-------------------------------"
RES=$(grep -rn --include='*.tsx' -E '<(div|span|p|section|article|li)\s+[^>]*onClick=' "$TARGET" 2>/dev/null | grep -v 'node_modules' | head -10 || true)
print_or_ok "$RES" "✅ Clicking elements seem semantic"
log_finding "Non-semantic Interaction" "$RES"

# ──────────────────────────────────────────────
echo ""
echo -e "${RED}🔴 MEMORY: Event Listener Leak${NC}"
echo "-------------------------------"
RES=""
while IFS= read -r file; do
  if ! grep -q "removeEventListener" "$file"; then
    MSG="🔴 $file — Missing removeEventListener cleanup"
    echo "  $MSG"
    RES="${RES}${MSG}"$'\n'
  fi
done < <(grep -rl --include='*.tsx' --include='*.ts' "addEventListener" "$TARGET" 2>/dev/null | grep -v 'node_modules')
[ -z "$RES" ] && echo "  ✅ No event listener leaks found"
log_finding "Event Listener Leaks" "$RES"

# ──────────────────────────────────────────────
echo ""
echo -e "${RED}🔴 MEMORY: Interval Leak${NC}"
echo "-------------------------------"
RES=""
while IFS= read -r file; do
  if ! grep -q "clearInterval" "$file"; then
    MSG="🔴 $file — Missing clearInterval cleanup"
    echo "  $MSG"
    RES="${RES}${MSG}"$'\n'
  fi
done < <(grep -rl --include='*.tsx' --include='*.ts' "setInterval" "$TARGET" 2>/dev/null | grep -v 'node_modules')
[ -z "$RES" ] && echo "  ✅ No interval leaks found"
log_finding "Interval Leaks" "$RES"

# ──────────────────────────────────────────────
echo ""
echo -e "${YELLOW}🟡 PERF: Array index as key${NC}"
echo "-------------------------------"
RES=$(grep -rn --include='*.tsx' 'key={index}' "$TARGET" 2>/dev/null || true)
print_or_ok "$RES" "✅ No index-based keys found."
log_finding "Index-based Keys" "$RES"

# ──────────────────────────────────────────────
echo ""
echo -e "${RED}🔴 PERF: Double JSON.stringify${NC}"
echo "-------------------------------"
RES=$(grep -rn --include='*.ts' --include='*.tsx' 'JSON\.stringify(.*JSON\.stringify' "$TARGET" 2>/dev/null || true)
print_or_ok "$RES" "✅ No nested stringify found."
log_finding "Nested JSON.stringify" "$RES"

# ──────────────────────────────────────────────
echo ""
echo -e "${YELLOW}🟡 WARNING: Generic variable names${NC}"
echo "-------------------------------"
RES=""
for name in "const data " "const result " "const response " "const item " "const value "; do
  COUNT=$(grep -rn --include='*.ts' --include='*.tsx' "$name" "$TARGET" 2>/dev/null | grep -v 'node_modules' | grep -v '.test.' | grep -v 'interface' | grep -v 'type ' | wc -l | tr -d ' ')
  if [ "$COUNT" -gt 5 ]; then
    MSG="⚠️  '$name' used ${COUNT} times — consider descriptive names"
    echo "  $MSG"
    RES="${RES}${MSG}"$'\n'
  fi
done
[ -z "$RES" ] && echo "  ✅ Naming looks specific enough"
log_finding "Generic Naming" "$RES"

# ──────────────────────────────────────────────
echo ""
echo -e "${YELLOW}🟡 WARNING: Form State Overuse (>3 useState for inputs)${NC}"
echo "-------------------------------"
RES=""
while IFS= read -r file; do
  COUNT=$(grep -c "useState" "$file" | tr -d ' ')
  if [ "$COUNT" -gt 4 ] && ! grep -q "useForm" "$file"; then
    MSG="⚠️  $file — $COUNT useState hooks found. Consider react-hook-form."
    echo "  $MSG"
    RES="${RES}${MSG}"$'\n'
  fi
done < <(find "$TARGET" -name "*.tsx" -not -path '*/node_modules/*')
[ -z "$RES" ] && echo "  ✅ No form-state overuse found"
log_finding "Form State Overuse" "$RES"

# ──────────────────────────────────────────────
echo ""
echo -e "${YELLOW}🟡 WARNING: Non-Standard Border Radii (rounded-md/lg)${NC}"
echo "-------------------------------"
RES=$(grep -rn --include='*.tsx' "rounded-md\|rounded-lg" "$TARGET" 2>/dev/null | head -10 || true)
print_or_ok "$RES" "✅ Border radii follow design system."
log_finding "Non-Standard Border Radii" "$RES"

echo ""
echo "=============================="
echo " SCAN COMPLETE"
echo " Report generated: $REPORT_FILE"
echo "=============================="
echo "NOTE: grep-based scans only match single-line patterns. A clean result"
echo "above means 'not found in this shape', not 'confirmed absent'. Cross-check"
echo "critical categories (Rule of Hooks, cleanup, derived state) against the"
echo "tsc/eslint output and a manual read of sampled files."

{
  echo ""
  echo "---"
  echo "**Audit Completed Automatically — verify grep-based findings against tsc/eslint output and manual review before treating a clean section as confirmed-safe.**"
} >> "$REPORT_FILE"