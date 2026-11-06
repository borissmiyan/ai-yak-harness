# Database & API Anti-Patterns (Supabase + React)

AI almost always writes database queries following the path of least resistance: pulling all columns via `select('*')`, filtering private data in the browser (bypassing RLS), making queries in loops (N+1), and ignoring stale query cancellations (race conditions).

## Table of Contents

1. [Client-Side Filtering (Data Leaks)](#1-client-side-filtering-data-leaks)
2. [Overfetching (Network Killer)](#2-overfetching-network-killer)
3. [The N+1 Problem (Loops vs Joins)](#3-the-n1-problem-loops-vs-joins)
3b. [Empty `.in()` Arrays](#3b-empty-in-arrays)
4. [Race Conditions (Missing Aborts)](#4-race-conditions-missing-aborts)

---

## 1. Client-Side Filtering (Data Leaks)

### Constraint

NEVER download a full table and filter it via JavaScript (`data.filter()`). This is a critical security vulnerability. All filtering MUST happen on the database side using strict modifiers (`.eq()`, `.in()`) alongside properly configured Row Level Security (RLS).

### Bad

```typescript
// ❌ MASSIVE SECURITY VULNERABILITY — All records are downloaded to the browser
const { data } = await supabase.from('records').select('*');
return data.filter((item: any) => item.user_id === myId);
```

### Good

```typescript
// ✅ Safe server-side filtering
const { data } = await supabase.from('records').select('id, name').eq('user_id', myId);
return data;
```

### Self-Correction Rule

If `.select(...)` is immediately followed by a `.filter()` in JavaScript for business-logic reduction → **CRITICAL SECURITY FLAW**. Refactor to use Supabase modifiers.

---

## 2. Overfetching (Network Killer)

### Constraint

NEVER use `.select('*')` unless absolutely every column is strictly required by the UI. Fetching unused heavy fields (like long text notes, blobs, or large metadata JSONs) destroys performance, especially on mobile devices.

### Bad

```typescript
// ❌ Selects 40 columns when the UI only needs 3
const { data } = await supabase.from('users').select('*').limit(10);
```

### Good

```typescript
// ✅ Explicit projection
const { data } = await supabase.from('users').select('id, first_name, avatar_url').limit(10);
```

### Self-Correction Rule

If a query uses `.select('*')` → **WARNING: Overfetching**. Explicitly list the exact columns required.

---

## 3. The N+1 Problem (Loops vs Joins)

### Constraint

NEVER map over an array and execute a database query for every item (e.g., inside `Promise.all`). This leads to a massive number of HTTP requests.

### Bad

```typescript
// ❌ Makes individual HTTP requests for every item
const itemsWithDetails = await Promise.all(
  items.map(async (i) => {
    const { data: detail } = await supabase.from('details').select('*').eq('id', i.detail_id).single();
    return { ...i, detail };
  })
);
```

### Good

```typescript
// ✅ Executes exactly ONE request using Joins or .in()
const { data } = await supabase
  .from('items')
  .select(`
    id,
    name,
    detail:details(name, icon)
  `);
```

### Self-Correction Rule

If a database query is called inside a loop, `.map`, or `Promise.all` → **CRITICAL PERFORMANCE FLAW**. Refactor to use Joins or `.in()`.

---

## 3b. Empty `.in()` Arrays

### Constraint

Before calling `.in('column', ids)`, check that `ids` is non-empty.
Supabase/PostgREST either returns unexpected results or errors on an empty
array depending on the client version — this is a common runtime crash when
a filter/selection upstream legitimately resolves to zero items (e.g. no
shared accounts yet).

### Bad

```typescript
// ❌ Crashes or returns wrong data if accountIds is []
const { data } = await supabase.from('transactions').select('*').in('account_id', accountIds);
```

### Good

```typescript
// ✅ Short-circuit before the query
if (accountIds.length === 0) return [];
const { data } = await supabase.from('transactions').select('*').in('account_id', accountIds);
```

### Self-Correction Rule

If `.in(column, arr)` is called where `arr` is derived from a `.map()`/
`.filter()` chain (i.e., could plausibly be empty) with no length check
before the call → **WARNING: Unchecked Empty .in() Array**.

---

## 4. Race Conditions (Missing Aborts)

### Constraint

Async data-fetching logic that can be rapidly re-triggered by user input (e.g., filters, search) MUST support `AbortController` injection to cancel stale requests.

### Bad

```typescript
// ❌ Missing AbortSignal. Rapid changes will cause Race Conditions.
export const fetchData = async (query: string) => {
  const { data } = await supabase.from('data').select('id').ilike('name', `%${query}%`);
  return data;
};
```

### Good

```typescript
// ✅ Inject AbortSignal to allow cancellation of stale requests
export const fetchData = async (query: string, abortSignal?: AbortSignal) => {
  const { data, error } = await supabase
    .from('data')
    .select('id')
    .ilike('name', `%${query}%`)
    .abortSignal(abortSignal || new AbortController().signal);
    
  if (error && error.name !== 'AbortError') throw error;
  return data || [];
};
```

### Self-Correction Rule

If an exported API fetch function lacks an `abortSignal` parameter or doesn't pass it to the request → **WARNING: Potential Race Condition**.
