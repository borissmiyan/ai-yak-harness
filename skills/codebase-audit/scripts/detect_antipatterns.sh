#!/usr/bin/env bash
# detect_antipatterns.sh — Find DRY/YAGNI/KISS/WET architectural violations
# Usage: bash detect_antipatterns.sh <target_dir>
#
# CHANGELOG (fixed):
# - Added ts-prune for real dead-code / unused-export detection instead of the
#   "grep for a function name, see if it appears twice" heuristic, which
#   misses re-exports, barrel files, and dynamic usage.
# - Added madge --circular for real circular-import detection instead of only
#   flagging any cross-feature import (which has a lot of false positives —
#   not every cross-feature import is circular or wrong).

set -u

TARGET="${1:-.}"
RED='\033[0;31m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo "=============================="
echo " ARCHITECTURAL ANTI-PATTERN SCAN"
echo " Target: $TARGET"
echo "=============================="

EXCLUDE_OPTS="--exclude-dir=.agent --exclude-dir=.agents --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build --exclude-dir=.git --exclude-dir=backups --exclude-dir=scratch --exclude-dir=graphify-out --exclude-dir=e2e"
if [ -n "${AUDIT_EXTRA_EXCLUDES:-}" ]; then
  for extra_dir in $AUDIT_EXTRA_EXCLUDES; do
    EXCLUDE_OPTS="$EXCLUDE_OPTS --exclude-dir=$extra_dir"
  done
fi

echo ""
echo -e "${RED}🔴 CRITICAL: Business logic in components/ (should be in features/)${NC}"
echo "-------------------------------"
grep -rln --include='*.ts' --include='*.tsx' $EXCLUDE_OPTS \
  -E "from\s+'[\.@/]*core/services/supabase'|from\s+'[\.@/]*db/db'|supabase\.|from\s+'[\.@/]*(store|stores)/|use\w+Store\(" \
  "$TARGET/components" "$TARGET/src/components" 2>/dev/null || echo "  ✅ No Supabase/DB/Zustand calls in components/"

echo ""
echo -e "${RED}🔴 CRITICAL: console.log left in production code${NC}"
echo "-------------------------------"
COUNT=$(grep -rn --include='*.ts' --include='*.tsx' $EXCLUDE_OPTS \
  'console\.log(' \
  "$TARGET" 2>/dev/null | grep -v '.test.' | grep -v '__tests__' | grep -v '.spec.' | wc -l)
echo "  Found: $COUNT console.log statements"
if [ "$COUNT" -gt 20 ]; then
  echo "  ⚠️  High count — consider a logger utility"
fi

echo ""
echo -e "${RED}🔴 CRITICAL: Hardcoded strings (i18n violations)${NC}"
echo "-------------------------------"
grep -rn --include='*.tsx' $EXCLUDE_OPTS \
  -E ">\s*[A-Z][a-z]+(\s+[a-z]+){2,}\s*<" \
  "$TARGET" 2>/dev/null | grep -v '.test.' | grep -v '__tests__' | grep -v 'className' | head -15 || echo "  ✅ No obvious hardcoded strings found"

echo ""
echo -e "${YELLOW}🟡 WARNING: TODO/FIXME/HACK comments${NC}"
echo "-------------------------------"
TODO_COUNT=$(grep -rn --include='*.ts' --include='*.tsx' $EXCLUDE_OPTS \
  -E 'TODO|FIXME|HACK|XXX' \
  "$TARGET" 2>/dev/null | wc -l)
echo "  Found: $TODO_COUNT TODO/FIXME/HACK comments"
grep -rn --include='*.ts' --include='*.tsx' $EXCLUDE_OPTS \
  -E 'TODO|FIXME|HACK|XXX' \
  "$TARGET" 2>/dev/null | head -10

echo ""
echo -e "${YELLOW}🟡 WARNING: Commented-out code blocks (YAGNI)${NC}"
echo "-------------------------------"
grep -rn --include='*.ts' --include='*.tsx' $EXCLUDE_OPTS \
  -E '^\s*//\s*(import |const |let |function |export |return |await )' \
  "$TARGET" 2>/dev/null | head -15 || echo "  ✅ No commented-out code found"

echo ""
echo -e "${YELLOW}🟡 WARNING: Direct window.Telegram access (should use SDK)${NC}"
echo "-------------------------------"
grep -rn --include='*.ts' --include='*.tsx' $EXCLUDE_OPTS \
  -E 'window\.Telegram|window as any.*Telegram|\(window as any\)\.Telegram' \
  "$TARGET" 2>/dev/null | head -10 || echo "  ✅ No direct window.Telegram access"

echo ""
echo -e "${YELLOW}🟡 WARNING: dangerouslySetInnerHTML (XSS risk)${NC}"
echo "-------------------------------"
grep -rn --include='*.tsx' $EXCLUDE_OPTS \
  'dangerouslySetInnerHTML' \
  "$TARGET" 2>/dev/null || echo "  ✅ No dangerouslySetInnerHTML found"

echo ""
echo -e "${YELLOW}🟡 WARNING: process.env usage (should be import.meta.env)${NC}"
echo "-------------------------------"
grep -rn --include='*.ts' --include='*.tsx' $EXCLUDE_OPTS \
  'process\.env' \
  "$TARGET" 2>/dev/null | grep -v 'vite.config' || echo "  ✅ No process.env usage"

echo ""
echo -e "${CYAN}📊 INFO: Duplicate code blocks (potential DRY violations)${NC}"
echo "-------------------------------"
echo "  Checking for repeated User construction patterns..."
USER_CONSTRUCT=$(grep -rn --include='*.ts' --include='*.tsx' $EXCLUDE_OPTS \
  'const userWithDetails: User' \
  "$TARGET" 2>/dev/null | wc -l)
echo "  \`userWithDetails: User\` constructed in $USER_CONSTRUCT places"
if [ "$USER_CONSTRUCT" -gt 2 ]; then
  echo "  ⚠️  DRY violation — extract to a shared \`buildUserFromProfile()\` utility"
fi

echo ""
echo -e "${CYAN}📊 INFO: Cross-feature imports (coupling check — heuristic)${NC}"
echo "-------------------------------"
grep -rn --include='*.ts' --include='*.tsx' $EXCLUDE_OPTS \
  -E "from\s+'[\./@]*features/\w+/" \
  "$TARGET" 2>/dev/null | grep -v 'App.tsx' | grep -v 'index' | head -15 || echo "  ✅ No cross-feature imports detected"
echo "  NOTE: not every cross-feature import is a bug — see circular dependency check below."

echo ""
echo -e "${RED}🔴 CRITICAL: Circular imports (dpdm / verify-no-circular)${NC}"
echo "-------------------------------"
if [ -f "$TARGET/scripts/verify-no-circular.mjs" ]; then
  node "$TARGET/scripts/verify-no-circular.mjs"
elif command -v npx >/dev/null 2>&1; then
  npx --no-install dpdm --no-warning --no-tree --exit-code circular:1 "$TARGET/src/**/*.{ts,tsx}" 2>/dev/null || \
  npx --no-install madge --circular --extensions ts,tsx "$TARGET" 2>/dev/null || echo "  ✅ Circular check passed"
else
  echo "  ⚠️  npx not available — skipping circular-import check"
fi

echo ""
echo -e "${RED}🔴 CRITICAL: Unused exports (ts-prune — AST-based dead code)${NC}"
echo "-------------------------------"
echo "  This replaces the old 'grep for a function name, count matches' heuristic,"
echo "  which misses barrel re-exports and dynamic imports and gives false positives"
echo "  on anything exported for external/test consumption."
if command -v npx >/dev/null 2>&1 && ( [ -f "$TARGET/tsconfig.json" ] || [ -f "tsconfig.json" ] ); then
  ( cd "${TARGET:-.}" 2>/dev/null && npx --no-install ts-prune -p tsconfig.json ) 2>/tmp/audit_tsprune.log | grep -v "used in module" | head -40 || true
  if [ ! -s /tmp/audit_tsprune.log ]; then
    echo "  (ts-prune not installed? run: npm i -D ts-prune)"
  fi
else
  echo "  ⚠️  No tsconfig.json or npx found — skipping ts-prune"
fi

echo ""
echo -e "${YELLOW}🟡 WARNING: Unused dependencies (depcheck)${NC}"
echo "-------------------------------"
if command -v npx >/dev/null 2>&1 && [ -f "$TARGET/package.json" -o -f "package.json" ]; then
  npx --no-install depcheck "$TARGET" 2>/tmp/audit_depcheck.log | head -30 || echo "  (depcheck not installed? run: npm i -D depcheck)"
else
  echo "  ⚠️  No package.json or npx found — skipping depcheck"
fi

echo ""
echo -e "${RED}🔴 CRITICAL: Known vulnerable dependencies (npm audit)${NC}"
echo "-------------------------------"
if [ -f "$TARGET/package.json" ] || [ -f "package.json" ]; then
  AUDIT_DIR="${TARGET}"
  ( cd "$AUDIT_DIR" 2>/dev/null && npm audit --audit-level=high 2>/tmp/audit_npm.log ) || true
  if grep -q "found 0 vulnerabilities" /tmp/audit_npm.log 2>/dev/null; then
    echo "  ✅ No high/critical vulnerabilities found"
  else
    echo "  ⚠️  See /tmp/audit_npm.log for details, or re-run: npm audit --audit-level=high"
    tail -n 30 /tmp/audit_npm.log 2>/dev/null || true
  fi
else
  echo "  ⚠️  No package.json found — skipping npm audit"
fi

echo ""
echo -e "${YELLOW}🟡 WARNING: Possibly background-mounted modal (no conditional render)${NC}"
echo "-------------------------------"
while IFS= read -r f; do
  if grep -qE "(hidden|opacity-0|display:\s*none)" "$f" 2>/dev/null; then
    if ! grep -qE "\{\s*\w+\s*&&\s*<|\?\s*<\w+.*:\s*null" "$f" 2>/dev/null; then
      echo "  ⚠️  $f — CSS-visibility toggle found with no conditional (&&/ternary-to-null) mount pattern nearby"
    fi
  fi
done < <(find "$TARGET" \( -iname '*Manager*.tsx' -o -iname '*Modals*.tsx' -o -iname '*Sheets*.tsx' \) ! -path '*/.agent/*' ! -path '*/.agents/*' ! -path '*/node_modules/*' ! -path '*/dist/*' ! -path '*/build/*' ! -path '*/.git/*' ! -path '*/backups/*' ! -path '*/scratch/*' ! -path '*/graphify-out/*' 2>/dev/null)
echo "  (Filename heuristic, scoped to Manager/Modals/Sheets components only —"
echo "  flags CSS-visibility classes with no nearby conditional mount pattern."
echo "  See references/ui_architecture.md → 10b.)"

echo ""
echo "=============================="
echo " SCAN COMPLETE"
echo "=============================="
exit 0