# ADR D-02: Security Anti-Pattern & IDOR Pre-Commit Gate

- **Date:** 2026-10-13
- **Status:** Accepted
- **Driver:** Boris Smiyan & Antigravity Security Auditor

## Context & Problem
AI agents and developers frequently introduce subtle authorization and enumeration security bugs:
1. **RLS Column Privilege Leaks:** In PostgreSQL RLS, `UPDATE` policies apply to rows, not columns. Allowing `auth.uid() = id` on tables with `role` or `is_approved` enables self-privilege escalation unless defended by `BEFORE UPDATE` triggers.
2. **Public IDOR Exposure:** Creating `SECURITY DEFINER` RPCs with `GRANT ... TO anon` querying numeric primary keys allows malicious enumeration of all customer records.
3. **Frontend ID Leaks:** Creating shareable customer links containing sequential IDs (`/sign/protokol-19`).

## Decision
1. Introduce mandatory `scripts/verify-security-antipatterns.mjs` in `.husky/pre-commit` and `npm run check:security:antipatterns`.
2. Fail commits with exit code 1 whenever:
   - An unshielded `UPDATE` policy on `profiles` is introduced without a protective trigger.
   - An anonymous RPC queries primary keys by numeric IDs instead of cryptographic tokens.
   - Frontend templates create public links with sequential numeric IDs.
3. Require cryptographic `UUID` signing tokens for all public guest/customer operations.

## Consequences
- **Positive:** Immune to automated IDOR scanning and self-privilege escalation.
- **Negative:** Requires creating unguessable tokens for public links instead of simple IDs.
