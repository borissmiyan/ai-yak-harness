# D-01: Initial Architecture & Core Harness Invariants

## Status
Accepted

## Date
2026-10-09

## Context
Starting a new production-grade codebase requires immediate architectural guardrails to prevent AI drift, duplicate components, memory leaks, silent network failures, and test tampering.

## Decision
1. **Adopt AI Yak Harness:** Enforce deterministic 5-stage engineering lifecycle (Research -> Spec -> Adversarial Critic -> TDD -> Deterministic Verification).
2. **Offline-First & Fault Tolerance:** All critical reads must degrade gracefully when network fails.
3. **Strict Type Safety:** Zero `any` or `@ts-ignore`. Types must be declared explicitly in `src/types/`.
4. **Component Registry:** All reusable UI elements must be indexed in `COMPONENTS.md`. AI agents must check before creating new elements.
5. **Anti-Tampering:** Existing tests are immutable truth. Modifying existing tests to pass broken code is blocked by pre-commit hooks.

## Key Invariants
- **Zero Unmocked Network in Unit Tests:** Unit and integration tests must execute with zero external network reliance.
- **Diff Budget:** Max 450 lines per atomic commit.

## Consequences
- **Positive:** High velocity, rock-solid stability, zero AI regression, fully auditable decisions.
- **Negative:** Requires creating an implementation plan and passing Adversarial Critic before touching code.
