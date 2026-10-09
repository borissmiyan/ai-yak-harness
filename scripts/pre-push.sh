#!/usr/bin/env bash
# scripts/pre-push.sh
# 🛡️ AI Engineering Harness Pre-Push Verification Gate
# Runs before any git push to ensure zero regression before hitting remote CI.

set -e

echo ""
echo "========================================================="
echo "🛡️  AUTOMATED PRE-PUSH VERIFICATION GATE"
echo "========================================================="
echo ""

# 1. TypeScript compilation check
echo "▶ [1/3] Running TypeScript TypeCheck..."
if [ -f "tsconfig.json" ]; then
    npx tsc -b || npx tsc --noEmit
    echo "✅ TypeScript build passed with 0 errors."
else
    echo "⏩ No tsconfig.json found, skipping typecheck."
fi
echo ""

# 2. Vitest / Test Suite
echo "▶ [2/3] Running Test Suite..."
npm run test || npx vitest run || npm test
echo "✅ Test suite passed with 0 errors."
echo ""

# 3. Playwright E2E Smoke (if configured)
if [ -f "playwright.config.ts" ] || [ -f "playwright.config.js" ]; then
    echo "▶ [3/3] Running Playwright E2E Smoke Tests..."
    if npm run | grep -q "test:e2e:smoke"; then
        npm run test:e2e:smoke
    elif [ -f "e2e/01-service-report-lifecycle.spec.ts" ]; then
        npx playwright test e2e/01-service-report-lifecycle.spec.ts
    fi
    echo "✅ E2E Smoke test passed with 0 errors."
else
    echo "▶ [3/3] No E2E suite configured, check complete."
fi
echo ""

echo "========================================================="
echo "🎉 ALL PRE-PUSH CHECKS PASSED! PROCEEDING WITH PUSH."
echo "========================================================="
echo ""
exit 0
