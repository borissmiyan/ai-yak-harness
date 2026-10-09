# ANTIPATTERNS.md — Forbidden Engineering & UI Antipatterns

> **Rule for AI Agents:** Read before proposing architecture or modifying code. Never introduce these patterns.

---

## AP-001 — Raw Emojis in User Interfaces

**Severity:** 🔴 Critical — Breaks platform consistency and professional design aesthetics.

```tsx
// ❌ WRONG
<button>⚡ Quick Actions</button>
<span>🛡️ Verified</span>

// ✅ CORRECT
import { Zap, ShieldCheck } from 'lucide-react';
<button><Zap className="w-4 h-4 mr-2" /> Quick Actions</button>
<span className="flex items-center gap-1"><ShieldCheck className="w-4 h-4 text-emerald-400" /> Verified</span>
```

---

## AP-002 — Direct DB / API Client Calls inside Presentation Components

**Severity:** 🔴 Critical — Violates separation of concerns and breaks offline resilience.

```tsx
// ❌ WRONG
export function UserProfile() {
  useEffect(() => {
    supabase.from('users').select('*').then(...); // Direct API coupling
  }, []);
}

// ✅ CORRECT
import { fetchUserProfile } from '@/services/userService';
export function UserProfile() {
  const { data } = useQuery(['user'], fetchUserProfile); // Encapsulated in service layer
}
```

---

## AP-003 — Unmemoized Large Lists & Heavy Child Callbacks

**Severity:** 🟠 High — Causes massive UI frame drops and garbage collection churn.

```tsx
// ❌ WRONG
{items.map(item => (
  <ListItem item={item} onClick={() => handleSelect(item.id)} />
))}

// ✅ CORRECT
const handleSelect = useCallback((id: string) => { ... }, []);
// Inside ListItem.tsx:
export const ListItem = React.memo(function ListItem({ item, onSelect }: Props) { ... });
```

---

## AP-004 — Modifying Existing Tests to Make Broken Code Pass

**Severity:** 🔴 Critical (Anti-Tampering Violation) — Masks regression bugs. Existing tests are immutable truth.
