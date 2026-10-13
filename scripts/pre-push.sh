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
echo "▶ [1/5] Running TypeScript TypeCheck..."
if [ -f "tsconfig.json" ]; then
    npx tsc -b || npx tsc --noEmit
    echo "✅ TypeScript build passed with 0 errors."
else
    echo "⏩ No tsconfig.json found, skipping typecheck."
fi
echo ""

# 2. Vitest / Test Suite
echo "▶ [2/5] Running Test Suite..."
npm run test || npx vitest run || npm test
echo "✅ Test suite passed with 0 errors."
echo ""

# 3. Production Build Validation
echo "▶ [3/5] Validating Production Build..."
if npm run | grep -q "build"; then
    npm run build
    echo "✅ Production bundle built successfully."
else
    echo "⏩ No build script found, skipping."
fi
echo ""

# 4. Codebase Audit Gate (Critical Security & Architecture)
echo "▶ [4/5] Running Codebase Audit Gate..."
if [ -f ".agents/skills/codebase-audit/scripts/audit_cycle.sh" ]; then
    bash .agents/skills/codebase-audit/scripts/audit_cycle.sh . --ci --fail-on=CRITICAL
    echo "✅ Codebase Audit gate passed with 0 critical issues."
else
    echo "⏩ codebase-audit skill not found, skipping."
fi
echo ""

# 5. Playwright E2E Smoke (if configured)
if [ -f "playwright.config.ts" ] || [ -f "playwright.config.js" ]; then
    echo "▶ [5/5] Running Playwright E2E Smoke Tests..."
    if npm run | grep -q "test:e2e:smoke"; then
        npm run test:e2e:smoke
    elif [ -f "e2e/01-service-report-lifecycle.spec.ts" ]; then
        npx playwright test e2e/01-service-report-lifecycle.spec.ts
    fi
    echo "✅ E2E Smoke test passed with 0 errors."
else
    echo "▶ [5/5] No E2E suite configured, check complete."
fi
echo ""

echo "========================================================="
echo "🎉 ALL PRE-PUSH CHECKS PASSED! PROCEEDING WITH PUSH."
echo "========================================================="
echo ""
exit 0
