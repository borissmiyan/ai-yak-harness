# Financial Data Audit Reference (Money, Currency, Rounding)

Any codebase that stores or computes monetary amounts (transactions, balances,
budgets) needs its own category — generic "type safety" or "state management"
checks don't catch the specific ways money gets silently corrupted.

## Table of Contents

1. [Float Storage for Money](#1-float-storage-for-money)
2. [Currency-Unaware Arithmetic](#2-currency-unaware-arithmetic)
3. [Rounding Strategy Inconsistency](#3-rounding-strategy-inconsistency)
4. [Client-Side Total Calculation as Source of Truth](#4-client-side-total-calculation-as-source-of-truth)
5. [Mutation Idempotency for Money Operations](#5-mutation-idempotency-for-money-operations)

---

## 1. Float Storage for Money

### Why It's Terrible

`0.1 + 0.2 !== 0.3` in IEEE 754 floating point. Storing balances as `number`
in JS/TS, or as `float`/`double` in Postgres, means repeated additions
(deposits, transfers, recalculated totals) drift from the true value over
time. This is not a theoretical risk — it compounds with transaction volume.

### Bad

```typescript
interface Transaction {
  amount: number; // ❌ 19.99 + 0.01 can produce 20.000000000000004
}
```

### Good

```typescript
interface Transaction {
  amountMinor: number; // ✅ integer cents/kopecks — 1999 for $19.99
  currency: string;    // ISO 4217 — 'USD', 'KGS'
}
// Or, if the DB/ORM supports it:
// amount: Decimal (Postgres numeric, not float4/float8)
```

### Self-Correction Rule

If a `Transaction`, `Account`, `Balance`, or similar interface has an amount
field typed `number` or `float`/`double` in the DB schema, without a
corresponding `_minor` / cents convention or a `Decimal` type → **CRITICAL:
Float Money Storage**.

---

## 2. Currency-Unaware Arithmetic

### Constraint

Never add, subtract, or compare two amounts without first confirming they
share the same currency. A multi-currency app that sums `amount` fields
across currencies without conversion produces a number that means nothing.

### Self-Correction Rule

If a `.reduce()` or `sum` calculation adds `.amount` fields from records that
have a `currency` field, without filtering or converting by currency first →
**CRITICAL: Currency-Unaware Sum**.

---

## 3. Rounding Strategy Inconsistency

### Constraint

Pick one rounding strategy (banker's rounding / round-half-to-even is
standard for financial systems) and apply it consistently at all
display/calculation boundaries. Mixing `Math.round`, `toFixed(2)` (which
itself has known float bugs — `(1.005).toFixed(2) === "1.00"`), and manual
truncation in different files produces amounts that don't reconcile.

### Bad

```typescript
// ❌ Three different rounding behaviors in the same codebase
const displayed = amount.toFixed(2);           // string-based, has float bugs
const rounded = Math.round(amount * 100) / 100; // float-based, reintroduces drift
const truncated = Math.trunc(amount * 100) / 100; // silently drops fractional cents
```

### Self-Correction Rule

Grep for `.toFixed(`, `Math.round(`, `Math.trunc(`, `Math.floor(` applied to
monetary fields. If more than one strategy appears across the codebase →
**WARNING: Rounding Inconsistency** — consolidate into a single `roundMoney()`
utility.

---

## 4. Client-Side Total Calculation as Source of Truth

### Constraint

Displayed balances and totals should be computed server-side (or from the
synced local cache that mirrors server state), not accumulated purely in
client memory from a partial transaction list. A client that only has page 1
of transactions and sums only those will show a wrong balance.

### Self-Correction Rule

If a "balance" or "total" displayed to the user is computed via
`.reduce()`/`.sum()` over a Dexie query that has a `.limit()` or pagination
applied → **CRITICAL: Partial-Data Balance**. The authoritative total must
come from a full aggregate (server-computed, or a maintained running balance
field updated atomically with each mutation).

---

## 5. Mutation Idempotency for Money Operations

### Constraint

Every mutation that creates or modifies a monetary record (a transaction,
a transfer) MUST carry a client-generated idempotency key (e.g., a UUID
created at the moment the user submits, stored with the mutation and checked
server-side on push). Without this, the known offline-sync race — rapid
backgrounding/foregrounding of a Telegram Mini App WebView queuing the same
mutation twice — silently duplicates a transaction instead of just risking
a UI glitch. See `references/offline_sync.md` → "Mutation Idempotency" for the
implementation pattern this depends on.

### Bad

```typescript
// ❌ No idempotency key — if this mutation is pushed twice (retry, duplicate
// queue entry from a background/foreground race), the server creates two transactions.
await db.mutation_queue.add({
  type: 'CREATE',
  table: 'transactions',
  payload: newTx,
});
```

### Good

```typescript
// ✅ Idempotency key travels with the mutation; server upserts on conflict
await db.mutation_queue.add({
  type: 'CREATE',
  table: 'transactions',
  idempotencyKey: crypto.randomUUID(), // generated once, at creation time — not regenerated on retry
  payload: newTx,
});
```

### Self-Correction Rule

If `mutation_queue.add()` is called for a `CREATE` on a monetary table
without an `idempotencyKey` (or equivalent) field, and the corresponding push
endpoint doesn't do an `ON CONFLICT` / upsert against that key →
**CRITICAL: Non-Idempotent Money Mutation**.
