<div align="center">

# 🛡️ AI Yak Harness

**Deterministic Multi-Layer Quality & Safety Harness for Autonomous AI Agents**

[![License](https://img.shields.io/badge/license-YAK--FCU--1.0-blue.svg)](./LICENSE)
[![CI Quality Gate](https://img.shields.io/badge/CI%20Quality%20Gate-deterministic-emerald.svg)](#-layer-6-remote-ci-quality-gate)
[![Tests](https://img.shields.io/badge/tests-1159%20passing-brightgreen.svg)](#-production-proven-results)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-blue.svg)](#-quick-start)
[![Status](https://img.shields.io/badge/status-production--ready-success.svg)](#)

<p align="center">
  <b>Stop AI agents from breaking existing code, tampering with tests, and silently introducing memory leaks.</b>
</p>

<p align="center">
  <b>English</b> • <a href="README.ru.md">Русский</a> • <a href="docs/AI_HARNESS_GUIDE.md">Complete Architecture Guide (700+ lines)</a>
</p>

</div>

---

## 🎯 Why AI Yak Harness?

AI coding assistants (Cursor Composer, Claude Code, Google Antigravity, GitHub Copilot, Aider) are extraordinarily fast at generating code. But when working on production codebases, they suffer from **five fundamental failure modes**:

1. **🧪 Test Tampering:** When AI breaks code, it frequently "fixes" the problem by modifying or weakening the assertions in existing tests (`expect(true).toBe(true)`), giving you a false sense of security.
2. **💥 Refactoring Itch & Diff Bloat:** The model sees working code around the change and tries to "improve" it, bloating diffs into thousands of lines and deleting subtle edge-case handling.
3. **📦 Package Hallucinations:** AI silently injects unvetted npm packages into `dependencies`, creating severe supply-chain risks.
4. **💧 Silent Resource & Memory Leaks:** AI generates `URL.createObjectURL()` without `revokeObjectURL()`, forgets cleanup in `useEffect()`, and creates unbounded re-renders by omitting `React.memo` on list items.
5. **📜 Contract & Schema Drift:** Silent modifications to database models, RPC contracts, or shared interfaces without corresponding migration steps.

> ### ⚡ The Core Axiom
> **"A prompt is a soft recommendation. A harness is a deterministic hard gate."**  
> If a rule is critical to your system's stability, it must be enforced by a **failing script, compiler check, or Git pre-commit barrier (exit code 1)** — never by a polite sentence in markdown.

---

## 🚀 Quick Start (1-Minute Installation)

You can install the harness into any existing TypeScript / React / Node.js project with a single command:

```bash
# Option 1: Direct 1-click execution via npx
npx github:borissmiyan/ai-yak-harness .

# Option 2: Clone and run locally
git clone https://github.com/borissmiyan/ai-yak-harness.git ./templates/ai-yak-harness
node ./templates/ai-yak-harness/setup.mjs .
```

### What the installer configures automatically:
- 🛡️ **Scripts (`scripts/`):** Diff budget guard, anti-test-tampering gate, leak hygiene scanner, memoization checker, no-secrets scanner, schema drift gate.
- 🪝 **Git Hooks (`.husky/`):** Pre-commit and pre-push barriers that block invalid commits before they leave the machine.
- 🚦 **CI Quality Gate (`.github/workflows/ci-quality-gate.yml`):** Zero-trust GitHub Actions workflow running on a pristine VM.
- 🧠 **Adversarial Critic Skill (`.agents/skills/adversarial-critic/`):** Rigorous independent adversarial audit protocol running a 7-filter audit before any code modification.
- 📋 **ADR Architecture Framework (`.planning/decisions/`):** Context tracking and Decision Record templates.
- 📦 **NPM Scripts (`package.json`):** Adds unified verification commands (`npm run check`, `check:hygiene`, `check:memo`, `check:schema-drift`, `verify:remote`).

### Install peer verification dependencies:
```bash
npm i -D husky lint-staged knip dpdm eslint-plugin-sonarjs eslint-plugin-promise rollup-plugin-visualizer @stryker-mutator/core @stryker-mutator/vitest-runner snyk react-scan
npm run prepare
```

---

## 🏛️ The 8 Defense Pillars

```
┌────────────────────────────────────────────────────────────────────────┐
│  PILLAR 1: Prompt & Role Governance (AGENTS.md & Adversarial Critic)   │
│  7-filter adversarial audit. Code generation is BLOCKED until APPROVED.│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│  PILLAR 2: Static AST, Strict Types & Sonar Linting                   │
│  noUncheckedIndexedAccess, tsconfig.test.json, No raw emojis in JSX   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│  PILLAR 3: Pre-Commit Hard Gates (Pre-commit hook)                    │
│  Anti-Tampering • Diff Budget (<450 lines) • Leak Hygiene • No Secrets │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│  PILLAR 4: Hermetic & Deterministic Testing (Vitest)                  │
│  UTC timezone locked, unmocked network blocked, seed PRNG fixtures    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│  PILLAR 5: E2E Leak Profiler & Layout Stability (Playwright)          │
│  CDP Heap delta < 40MB, Visual regression tolerance < 5%              │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│  PILLAR 6: Remote CI Quality Gate (GitHub Actions)                    │
│  Deterministic run on clean VM, mandatory status check before merge   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│  PILLAR 7: Ephemeral Sandboxes (Git Worktree Manager)                 │
│  Isolated branches for risky multi-file agent explorations            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│  PILLAR 8: On-Demand Deep QA (Stryker CLI & Snyk Scanner)             │
│  Mutation testing & CVE vulnerability scanning strictly on-demand      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🧰 Verification Tooling & Human Overrides

Every gate in AI Yak Harness is deterministic and fails with `exit 1`. However, **human engineers maintain total control** via explicit environment flags or inline annotations:

| Script / Gate | What It Enforces / Blocks | Human Override Mechanism |
| :--- | :--- | :--- |
| `verify-no-test-tampering.mjs` | Blocks editing existing tests (`*.test.*`, `*.spec.*`) and adding unauthorized `dependencies` | `ALLOW_TEST_MUTATION=true`<br>`ALLOW_DEP_MUTATION=true` |
| `verify-diff-budget.mjs` | Limits changes to max **450 lines** and **10 files** per commit to prevent runaway refactoring | `ALLOW_LARGE_DIFF=true` |
| `verify-no-secrets.mjs` | Blocks accidental commits of API tokens, private keys, Supabase Service Role keys | Remove secret from commit diff |
| `verify-resource-hygiene.mjs` | Blocks `createObjectURL` without `revoke`, missing listener cleanups, unhandled intervals | `// @resource-hygiene-ignore: <reason>` |
| `verify-memoization.mjs` | Enforces `React.memo` on all list items and cards (`*Card`, `*Row`, `*Item`) | `// @memo-gate-ignore: <reason>` |
| `verify-no-circular.mjs` | Detects circular imports causing runtime `undefined` initialization bugs | `ALLOW_CIRCULAR=true` |
| `verify-schema-drift.mjs` | Prevents uncommitted or drifting DB schemas and RPC contracts | `ALLOW_SCHEMA_MUTATION=true` |
| `verify-security-antipatterns.mjs` | Catches dangerous `eval()`, unescaped `innerHTML`, and untrusted protocols | Fix vulnerability |

---

## 🤖 Supported AI Environments

AI Yak Harness works seamlessly across all modern AI developer setups:

- **Cursor IDE:** Add rules to `.cursorrules` or `.cursor/rules/`.
- **Claude Code:** Add instructions to `CLAUDE.md`.
- **Google Antigravity:** Full support via `AGENTS.md` and native skills in `.agents/skills/`.
- **GitHub Copilot / Workspace:** Works transparently via Git hooks and CI quality gates.
- **Aider / Codex:** Enforced automatically at the Git commit level.

---

## 📊 Production-Proven Results

AI Yak Harness was forged and validated in real-world mission-critical production:

- **1,159 / 1,159 tests passing** in golden reference testing suites.
- **267 automated findings detected and resolved** during initial codebase audit.
- **0 unmocked network leaks** in hermetic test environments.
- **0 regressions** allowed past the Pre-Commit + Remote CI Quality Gate pipeline.

---

## 📜 License (YAK-FCU-1.0)

Distributed under the **[Yak Free Commercial & Non-Standalone Resale License (YAK-FCU-1.0)](./LICENSE)**:

1. **100% Free for All Projects (Including Commercial):**  
   You are free to use, modify, and integrate this harness into any personal project, open-source software, proprietary enterprise application, client delivery, or commercial SaaS platform without royalties.
2. **No Standalone Resale:**  
   You may **not** sell, sublicense, or monetize this harness (or derivatives of it) as a standalone commercial product, paid boilerplate, or paid course where the harness itself is the primary item being sold.

---

## ❤️ Community & Support

- ⭐ **Star this repository** on GitHub to help other engineers discover deterministic AI testing.
- ☕ **[Sponsor on GitHub](https://github.com/sponsors/borissmiyan)** to support ongoing maintenance and new gates.
- 📢 Follow and share on **[X (Twitter)](https://twitter.com/borissmiyan)**.
- 💼 Inquiries & Architecture consulting: `primeapps.info@gmail.com`
