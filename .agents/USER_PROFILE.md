# 👤 Global User Profile & Architecture Persona (`USER_PROFILE.md`)

> **Location:** `.agents/USER_PROFILE.md`  
> **Target:** Universal Engineering Preferences & AI Interaction Style  
> **Role:** Solo-Founder, Lead Product Architect, Systems Thinker.

---

## 👑 1. Developer Profile & Identity

- **Role:** Solo-Founder & Chief Product Architect.
- **Development Philosophy:** Spec-Driven Development (planning, ADRs, strict scope locks, empirical test verification). Directs autonomous AI agents as a senior pair programmer.
- **Core Directive:** Deliver AAA-grade, production-ready, beautiful software without breaking existing architecture, schemas, or tests.

---

## 🎨 2. Product Architecture & UX Principles

### Code Quality & Limits
- **Strict 500-Line Limit:** Maximum 500 lines per file. Split growing files into modular hooks, sub-components, or pure utilities.
- **Zero Code Bloat:** Clean, concise, readable TypeScript. No `any` types.
- **In-Code Comments:** Clear, descriptive comments on non-obvious math, lifecycle hooks, and architectural boundaries.

### Design Aesthetics & Anti AI-Slop
- **NO AI-SLOP:** Interfaces must feel human, deeply thought out, intuitive, and visually stunning.
- **Corners & Geometry:** Strong preference for super-rounded corners (`rounded-2xl`, `rounded-3xl`) and tactile floating sheets.
- **Touch Ergonomics:** Mobile action buttons and inputs MUST be **52px to 60px** tall (`h-[52px]` – `h-[60px]`). Action bar icon buttons: minimum 48x48px (`w-12 h-12 rounded-xl flex items-center justify-center`).
- **No Raw Emojis in UI:** Use Lucide vector SVG icons exclusively.
- **Typography:** Modern clean sans-serif (Inter / Roboto) with OpenType `tabular-nums` for numbers and tables.

---

## 🛑 3. Hard Safety Guardrails (Non-Negotiable)

1. **NO DESTRUCTIVE DB OPERATIONS:** Never run destructive schema resets without explicit confirmation.
2. **SCOPE LOCK:** Modify ONLY files strictly necessary for the assigned task. No unsolicited refactoring.
3. **SPEC FIRST & PLANNING:** For non-trivial tasks, the agent MUST create an implementation plan defining Scope Boundaries (Non-goals) before modifying code.
4. **EMPIRICAL VERIFICATION:** Tasks are NOT complete until relevant tests, typechecks, linters, and production builds execute with **0 errors**.

---

## 💬 4. Communication Discipline

1. **Chat Language:** Communicate in the developer's preferred primary chat language (Russian `ru` by default).
2. **Educational Explanations:** Explain *what* was changed, *why*, and *how* it works in concise, clear language.
3. **Diffs & Code Links:** Always provide clickable markdown file links (`[filename](file:///path/to/file)`).
