#!/usr/bin/env bash
# detect_type_violations.sh — Find TypeScript type safety violations
# Usage: bash detect_type_violations.sh <target_dir>
#
# CHANGELOG (fixed):
# - Added `tsc --noEmit` as the first, authoritative check. Explicit `any` and
#   `as unknown as` are visible to grep, but the more dangerous category —
#   *implicit* any from inference, unsound narrowing, incompatible unions —
#   is invisible to regex and only the compiler catches it. Run this first;
#   treat the grep sections below as a supplement, not a substitute.

set -euo pipefail

TARGET="${1:-.}"
RED='\033[0;31m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo "=============================="
echo " TYPE VIOLATION SCAN"
echo " Target: $TARGET"
echo "=============================="

echo ""
echo -e "${RED}🔴 CRITICAL: tsc --noEmit (compiler-level ground truth)${NC}"
echo "-------------------------------"
if [ -f "$TARGET/tsconfig.json" ] || [ -f "tsconfig.json" ]; then
  if command -v npx >/dev/null 2>&1; then
    if npx --no-install tsc --noEmit -p "$TARGET" > /tmp/audit_tsc_violations.log 2>&1; then
      echo "  ✅ No type errors"
    else
      ERR_COUNT=$(grep -c "error TS" /tmp/audit_tsc_violations.log || true)
      echo "  ❌ $ERR_COUNT type error(s) found:"
      head -n 60 /tmp/audit_tsc_violations.log
    fi
  else
    echo "  ⚠️  npx not available — skipping tsc check"
  fi
else
  echo "  ⚠️  No tsconfig.json found — skipping tsc check"
fi

echo ""
echo -e "${YELLOW}🟡 INFO: Is \`strict\` mode actually on?${NC}"
echo "-------------------------------"
# A codebase can pass the tsc check above and still be full of implicit `any`
# if strict mode (or noImplicitAny specifically) is off. Worth surfacing
# explicitly since it changes how much to trust a clean tsc run.
TSCONFIG=$( [ -f "$TARGET/tsconfig.json" ] && echo "$TARGET/tsconfig.json" || echo "tsconfig.json" )
if [ -f "$TSCONFIG" ]; then
  if grep -q '"strict"\s*:\s*true' "$TSCONFIG"; then
    echo "  ✅ strict: true"
  else
    echo "  ⚠️  strict mode not explicitly on in $TSCONFIG — a clean tsc run"
    echo "     above is weaker evidence than it looks; implicit any may be allowed."
  fi
else
  echo "  ⚠️  tsconfig.json not found"
fi

echo ""
echo -e "${RED}🔴 CRITICAL: Explicit \`any\` usage${NC}"
echo "-------------------------------"
grep -rn --include='*.ts' --include='*.tsx' \
  -E ':\s*any\b|<any>|as any|\bany\[|Record<string,\s*any>' \
  "$TARGET" 2>/dev/null | grep -v 'node_modules' | grep -v '.test.' || echo "  ✅ No \`any\` found"

echo ""
echo -e "${RED}🔴 CRITICAL: @ts-ignore / @ts-expect-error${NC}"
echo "-------------------------------"
grep -rn --include='*.ts' --include='*.tsx' \
  -E '@ts-ignore|@ts-expect-error|@ts-nocheck' \
  "$TARGET" 2>/dev/null | grep -v 'node_modules' || echo "  ✅ No TS suppression found"

echo ""
echo -e "${YELLOW}🟡 WARNING: Non-null assertions (!)${NC}"
echo "-------------------------------"
grep -rn --include='*.ts' --include='*.tsx' \
  -E '\w+!\.' \
  "$TARGET" 2>/dev/null | grep -v 'node_modules' | grep -v '.test.' | head -20 || echo "  ✅ None found"

echo ""
echo -e "${YELLOW}🟡 WARNING: Type casts (as SomeType)${NC}"
echo "-------------------------------"
grep -rn --include='*.ts' --include='*.tsx' \
  -E '\bas\s+[A-Z][a-zA-Z]+' \
  "$TARGET" 2>/dev/null | grep -v 'node_modules' | grep -v 'as React' | grep -v '.test.' | head -20 || echo "  ✅ None found"

echo ""
echo -e "${YELLOW}🟡 WARNING: Missing return types on exported functions${NC}"
echo "-------------------------------"
grep -rn --include='*.ts' --include='*.tsx' \
  -E 'export (async )?function \w+\([^)]*\)\s*\{' \
  "$TARGET" 2>/dev/null | grep -v 'node_modules' | grep -v '.test.' | head -20 || echo "  ✅ All exported functions have return types"

echo ""
echo "=============================="
echo " SCAN COMPLETE"
echo "=============================="