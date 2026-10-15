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

---

## AP-005 — God Component & Bloated `.tsx` File (> 300 lines warning, > 500 lines blocker)

**Severity:** 🔴 Critical — Causes AI Attention Drift, merge conflicts, and unmaintainable monolithic UI code.

**Industry Standard:**
- **50–150 lines (UI-kit):** Presentational / Dumb components.
- **150–250 lines (Gold Standard):** Smart / Container components, widgets, screens.
- **300–400 lines (Yellow Zone / Tech Debt):** Warning signal to decompose.
- **500 lines (Red Zone / Hard Emergency Ceiling):** Pre-commit / CI blocking error.

```tsx
// ❌ WRONG: 400+ lines mixing types, 5 useStates, 2 useEffects, currency formatting, and 200 lines of JSX
export function InvoiceEditor({ invoiceId }: Props) {
  interface LocalItem { ... }
  const [items, setItems] = useState<LocalItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { /* fetch invoice */ }, [invoiceId]);

  function formatCurrency(val: number) { ... }
  function calculateTotal() { ... }
  async function handleSubmit() { ... }

  return (
    <div>
      {/* 80 lines header */}
      {/* 120 lines items table */}
      {/* 90 lines totals and modal */}
    </div>
  );
}

// ✅ CORRECT: Decomposed according to the 3 rules of decomposition (< 200 lines)
// 1. types.ts / utils.ts: formatCurrency, calculateTotal, LocalItem
// 2. hooks/useInvoiceEditor.ts: items, discount, handlers, submit logic
// 3. components/InvoiceHeader.tsx, components/InvoiceItemsTable.tsx

export function InvoiceEditor({ invoiceId }: Props) {
  const { items, discount, totals, handlers, isSubmitting } = useInvoiceEditor(invoiceId);

  return (
    <div className="space-y-6">
      <InvoiceHeader totals={totals} onSave={handlers.save} isSubmitting={isSubmitting} />
      <InvoiceItemsTable items={items} onUpdate={handlers.updateItem} />
      <InvoiceSummary discount={discount} totals={totals} />
    </div>
  );
}
```
