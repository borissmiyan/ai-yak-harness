# 🔧 Pure Utilities Rules (`src/utils/` / `src/shared/utils/`)

> **Domain:** Pure math calculations, formatting helpers, date parsers, string sanitizers.

---

## 🎯 Architectural Principles

1. **100% Deterministic & Pure**:
   - No side-effects, no global state mutations, no network I/O.
   - Same inputs must ALWAYS return the exact same outputs.

2. **100% Test Coverage Requirement**:
   - Every utility function must have an adjacent unit test in `__tests__/`.
   - Cover edge cases: empty strings, `null`, `undefined`, boundary numbers, NaN.
