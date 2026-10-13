# TanStack Query (React Query) Anti-Patterns

## Table of Contents

1. [Unstable queryKey (Cache Bloat)](#1-unstable-querykey-cache-bloat)
2. [Missing staleTime on Rarely-Changing Data](#2-missing-staletime-on-rarely-changing-data)

---

## 1. Unstable queryKey (Cache Bloat)

### Constraint

`queryKey` MUST contain only primitive values (string, number, boolean) or
stable references. Passing an array/object of non-primitive items (e.g. a
list of full record objects) creates a NEW cache entry on every reference
change, even when the underlying data is identical — the cache never
converges and grows unbounded.

### Bad

```typescript
// ❌ sharedAccounts is a new array reference on every render/refetch —
// each one becomes a distinct, permanent cache entry
const { data } = useQuery({
  queryKey: ['familyStats', groupId, sharedAccounts],
  queryFn: () => fetchFamilyStats(groupId, sharedAccounts),
});
```

### Good

```typescript
// ✅ Key on stable primitive identifiers only, derive the rest inside queryFn
const accountIds = sharedAccounts.map((a) => a.id).sort().join(',');
const { data } = useQuery({
  queryKey: ['familyStats', groupId, accountIds],
  queryFn: () => fetchFamilyStats(groupId, sharedAccounts),
});
```

### Self-Correction Rule

If a `queryKey` array contains a variable that is an array/object of
records (not a primitive, not a `.map(x => x.id)` derived value) →
**WARNING: Unstable queryKey — Cache Bloat**.

---

## 2. Missing staleTime on Rarely-Changing Data

### Constraint

Reference/config data that rarely changes (user settings, subscription
tier, feature flags) MUST set an explicit `staleTime` (or use a shared
default via `QueryClient` defaultOptions). Without it, TanStack Query's
default `staleTime: 0` means every component mount/window-focus triggers a
refetch even for data that hasn't changed in hours.

### Self-Correction Rule

If `useQuery` is called for data that is not expected to change within a
user session and neither `staleTime` nor a project-wide `QueryClient`
default is set → **WARNING: Missing staleTime — Unnecessary Refetching**.
