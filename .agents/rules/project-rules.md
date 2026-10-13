# ⚡️ Project Rules & Harness Architecture

> **Harness Standard:** AI Yak Harness (Deterministic 8-Layer Gates)  
> **Documentation:** [docs/AI_HARNESS_GUIDE.md](./docs/AI_HARNESS_GUIDE.md)

---

## 🛑 Hard Constraints

1. **Mandatory Verification Discipline:**
   - Execute and confirm with 0 errors: `npm run check` and `npm run build`.
   - After `git push`, verify remote CI gate status.
2. **Anti-Test Tampering Gate:**
   - Never modify existing tests to force broken code to pass.
   - Bypassed only via `ALLOW_TEST_MUTATION=true`.
3. **Scope Lock & Diff Budget:**
   - Max 450 code lines and 10 files per commit.
4. **Resource Hygiene:**
   - Zero unrevoked Object URLs (`createObjectURL`), zero uncleaned event listeners or timers.
5. **Component Memoization:**
   - All list items and cards (`*Card`, `*Row`, `*Item`) must be wrapped in `React.memo`.
6. **5-Stage Development Cycle:**
   - 1. Research -> 2. Plan & Spec -> 3. Adversarial Critic Audit -> 4. TDD Execution -> 5. Verification.
