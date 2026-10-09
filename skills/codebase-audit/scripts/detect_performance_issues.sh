#!/usr/bin/env bash
# detect_performance_issues.sh — Find React/Framer Motion performance anti-patterns
# Usage: bash detect_performance_issues.sh <target_dir>
#
# CHANGELOG (fixed):
# - Memo-check loop used `for f in $(find ...)`, which word-splits on spaces in
#   filenames/paths. Switched to `while IFS= read -r f; do ... done < <(find ...)`.
# - Added eslint-plugin-react-hooks as the authoritative rules-of-hooks /
#   exhaustive-deps check. The regex checks in detect_ai_slop.sh for "hook
#   after early return" and "missing cleanup" are single-line heuristics that
#   miss anything a formatter wraps across multiple lines — eslint parses the
#   actual AST and doesn't have that blind spot.

set -uo pipefail

TARGET="${1:-.}"
RED='\033[0;31m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo "=============================="
echo " PERFORMANCE ISSUE SCAN"
echo " Target: $TARGET"
echo "=============================="

echo ""
echo -e "${CYAN}📊 INFO: React Compiler detection (changes how to read every section below)${NC}"
echo "-------------------------------"
REACT_COMPILER_FOUND=""
for cfg in "$TARGET/babel.config.js" "$TARGET/babel.config.cjs" "$TARGET/vite.config.ts" "$TARGET/vite.config.js" "babel.config.js" "vite.config.ts"; do
  if [ -f "$cfg" ] && grep -qE "react-compiler|babel-plugin-react-compiler" "$cfg" 2>/dev/null; then
    REACT_COMPILER_FOUND="$cfg"
    break
  fi
done
if [ -n "$REACT_COMPILER_FOUND" ]; then
  echo "  ✅ React Compiler is enabled (found in $REACT_COMPILER_FOUND)."
  echo "  → SKIP the 'Missing React.memo' and 'inline object/function breaks"
  echo "    memoization' checks below for compiler-covered directories — the"
  echo "    compiler already handles this and manual memoization on top of it"
  echo "    is redundant at best. See references/react_performance.md."
else
  echo "  ℹ️  React Compiler not detected — manual memoization rules below apply as written."
fi

echo ""
echo -e "${RED}🔴 CRITICAL: React Hooks rule violations (eslint-plugin-react-hooks — AST-based)${NC}"
echo "-------------------------------"
echo "  This is the authoritative check for Rules-of-Hooks and exhaustive-deps —"
echo "  it understands the actual syntax tree, so it catches violations that"
echo "  span multiple lines, which the grep heuristics elsewhere in this skill"
echo "  cannot."
if command -v npx >/dev/null 2>&1; then
  npx --no-install eslint "$TARGET" \
    --no-eslintrc \
    --rulesdir node_modules/eslint-plugin-react-hooks \
    --plugin react-hooks \
    --rule '{"react-hooks/rules-of-hooks":"error","react-hooks/exhaustive-deps":"warn"}' \
    --ext .ts,.tsx 2>/tmp/audit_eslint_hooks.log | head -60 || true
  if [ ! -s /tmp/audit_eslint_hooks.log ] && [ ! -f /tmp/audit_eslint_hooks.log ]; then
    echo "  (Could not run standalone — if the project already has its own"
    echo "   eslint config with react-hooks enabled, prefer: npx eslint . )"
  fi
else
  echo "  ⚠️  npx not available — skipping eslint-plugin-react-hooks check"
fi
echo "  Tip: if this project already has ESLint configured with"
echo "  eslint-plugin-react-hooks, just run \`npx eslint .\` directly instead —"
echo "  it will pick up the project's real config, including exhaustive-deps."

echo ""
echo -e "${RED}🔴 CRITICAL: Full lodash import${NC}"
echo "-------------------------------"
grep -rn --include='*.ts' --include='*.tsx' \
  -E "import\s+_\s+from\s+'lodash'|import\s+lodash|from\s+'lodash'" \
  "$TARGET" 2>/dev/null | grep -v 'node_modules' | grep -v "lodash/" || echo "  ✅ No full lodash imports"

echo ""
echo -e "${RED}🔴 CRITICAL: Full d3 import${NC}"
echo "-------------------------------"
grep -rn --include='*.ts' --include='*.tsx' \
  -E "import\s+\*\s+as\s+d3\s+from|from\s+'d3'" \
  "$TARGET" 2>/dev/null | grep -v 'node_modules' | grep -v "d3-" || echo "  ✅ No full d3 imports"

echo ""
echo -e "${RED}🔴 CRITICAL: Zustand store without selector${NC}"
echo "-------------------------------"
grep -rn --include='*.ts' --include='*.tsx' \
  -E 'use\w+Store\(\)' \
  "$TARGET" 2>/dev/null | grep -v 'node_modules' | grep -v '.test.' | grep -v 'create<' || echo "  ✅ All store calls use selectors"

echo ""
echo -e "${YELLOW}🟡 WARNING: queryKey with 2+ elements (React Query)${NC}"
echo "-------------------------------"
grep -rn --include='*.ts' --include='*.tsx' \
  -E "queryKey:\s*\[[^]]*,[^]]*\]" \
  "$TARGET" 2>/dev/null | grep -v 'node_modules' | head -30 || echo "  ✅ No multi-element queryKey arrays found"
echo "  NOTE: flags EVERY queryKey array with 2+ elements — most are fine"
echo "  (stable primitives). Each hit needs a manual check of whether any"
echo "  element is a non-primitive reference (object/array) that changes"
echo "  identity on every render/refetch. See references/react_query.md → 1."

echo ""
echo -e "${YELLOW}🟡 WARNING: Context hook destructuring 2+ fields (no selector)${NC}"
echo "-------------------------------"
CONTEXT_HOOKS=$(grep -rlE "useContext\(" "$TARGET" --include='*.ts' --include='*.tsx' 2>/dev/null | grep -v node_modules | xargs -I{} grep -ohE "export (const|function) use\w+" {} 2>/dev/null | awk '{print $NF}' | sort -u)
if [ -z "$CONTEXT_HOOKS" ]; then
  echo "  ✅ No custom Context hooks found (no useContext( usage detected)"
else
  for hook in $CONTEXT_HOOKS; do
    grep -rn --include='*.ts' --include='*.tsx' -E "const\s*\{\s*\w+\s*,\s*\w+.*\}\s*=\s*${hook}\(\)" "$TARGET" 2>/dev/null | grep -v node_modules
  done | head -30
  echo "  NOTE: two-pass heuristic — first finds hooks calling useContext()"
  echo "  internally (${CONTEXT_HOOKS//$'\n'/, }), then flags 2+ field"
  echo "  destructuring of those specific hooks. Doesn't know the TOTAL field"
  echo "  count on the Context value (a 2-field Context isn't a problem) —"
  echo "  check the type definition. See references/state_management.md → 8."
fi

echo ""
echo -e "${YELLOW}🟡 WARNING: Inline functions in JSX (onClick={() => ...)${NC}"
echo "-------------------------------"
grep -rn --include='*.tsx' \
  -E 'on[A-Z]\w+=\{(\(\)|e|\w+)\s*=>' \
  "$TARGET" 2>/dev/null | grep -v 'node_modules' | grep -v '.test.' | head -30 || echo "  ✅ None found"
echo "  NOTE: single-line heuristic — misses handlers a formatter wraps onto"
echo "  the next line (e.g. \`onClick={() =>\` followed by the call below it)."

echo ""
echo -e "${YELLOW}🟡 WARNING: Missing React.memo on list items${NC}"
echo "-------------------------------"
while IFS= read -r f; do
  if ! grep -q 'React.memo\|memo(' "$f" 2>/dev/null; then
    echo "  ⚠️  $f — list-like component without React.memo"
  fi
done < <(find "$TARGET" \( -name '*Item*.tsx' -o -name '*Row*.tsx' -o -name '*Card*.tsx' \) -not -path '*/node_modules/*' 2>/dev/null)
echo "  (End of check — filename heuristic only; a component can legitimately"
echo "  skip memo if it's cheap to render or rarely re-rendered, see"
echo "  references/react_performance.md → 'When React.memo is WASTEFUL'.)"

echo ""
echo -e "${YELLOW}🟡 WARNING: Animating layout properties (height, width, top, left)${NC}"
echo "-------------------------------"
grep -rn --include='*.tsx' \
  -E "animate=\{[^}]*(height|width|top|left)" \
  "$TARGET" 2>/dev/null | grep -v 'node_modules' | head -15 || echo "  ✅ No layout animations found"

echo ""
echo -e "${YELLOW}🟡 WARNING: Infinite Framer Motion loops (repeat: Infinity)${NC}"
echo "-------------------------------"
grep -rn --include='*.tsx' \
  -E "repeat:\s*Infinity" \
  "$TARGET" 2>/dev/null | grep -v 'node_modules' | grep -v 'prefers-reduced-motion' | head -15 || echo "  ✅ No unconditional infinite animation loops found"
echo "  NOTE: flags any repeat: Infinity not on a line/file also mentioning"
echo "  prefers-reduced-motion — see references/react_performance.md → Animation"
echo "  Performance, point 5. A hit here doesn't distinguish decorative loops"
echo "  from functional ones (e.g. a loading spinner) — verify against the file."

echo ""
echo -e "${CYAN}📊 INFO: Large files (>500 lines)${NC}"
echo "-------------------------------"
find "$TARGET" \( -name '*.ts' -o -name '*.tsx' \) ! -path '*/node_modules/*' ! -name '*.test.*' -print0 2>/dev/null \
  | xargs -0 wc -l 2>/dev/null | awk '$1 > 500 && $2 != "total" {print $1" lines: "$2}' || echo "  ✅ All files under 500 lines"

echo ""
echo -e "${CYAN}📊 INFO: Eager imports in App.tsx / router${NC}"
echo "-------------------------------"
grep -n --include='*.tsx' \
  -E "^import\s+\w+\s+from\s+'\./(features|pages)" \
  "$TARGET/App.tsx" "$TARGET/src/App.tsx" 2>/dev/null | grep -v 'lazy' || echo "  ✅ No eager feature imports found (or file not at expected path)"

echo ""
echo "=============================="
echo " SCAN COMPLETE"
echo "=============================="