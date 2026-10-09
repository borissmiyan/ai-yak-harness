# Icon System

Single source of truth for icons in the project.
AI: always use these exact icon names from the designated library. Do not import from other libraries or invent icon names.

---

## Library

**Primary:** `lucide-react`
**Import pattern:** `import { IconName } from 'lucide-react'`

Do NOT use: `react-icons`, `heroicons` directly, `@phosphor-icons`, emoji as icons.

---

## Standard Sizes

| Context | Size | Class |
|---|---|---|
| Navigation (bottom tab) | 24px | `size={24}` |
| Button icon | 20px | `size={20}` |
| Inline / label icon | 16px | `size={16}` |
| Feature card icon (in container) | 24px | `size={24}` |
| Empty state illustration | 48px | `size={48}` |
| Header action button | 20px | `size={20}` |

**Container:** Always wrap in standard icon container when used as a feature icon:

```tsx
<div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
  <IconName size={24} />
</div>
```

---

## Standard Icon Map

### Actions

| Action | Icon Name | Notes |
|---|---|---|
| Add / Create | `Plus` | Universal add |
| Delete / Remove | `Trash2` | Use Trash2, not Trash |
| Edit | `Pencil` | |
| Save | `Check` | |
| Close / Dismiss | `X` | |
| Back | `ChevronLeft` | |
| Forward / Next | `ChevronRight` | |
| Expand / More | `ChevronDown` | |
| Collapse | `ChevronUp` | |
| Search | `Search` | |
| Filter | `SlidersHorizontal` | |
| Sort | `ArrowUpDown` | |
| Share | `Share2` | |
| Copy | `Copy` | |
| Settings | `Settings` | |
| More options (3-dot) | `MoreHorizontal` | |
| More options (3-dot vertical) | `MoreVertical` | |
| Confirm / Approve | `CheckCircle2` | |
| Cancel / Reject | `XCircle` | |

### Navigation

| Destination | Icon Name |
|---|---|
| Home / Dashboard | `Home` |
| Analytics | `BarChart3` |
| Transactions | `Receipt` |
| Goals / Savings | `Target` |
| Debts | `CreditCard` |
| Accounts | `Wallet` |
| Profile / Settings | `User` |
| Notifications | `Bell` |

### Finance Domain

| Concept | Icon Name | Notes |
|---|---|---|
| Income | `ArrowDownLeft` | Green color |
| Expense | `ArrowUpRight` | Red color |
| Transfer | `ArrowLeftRight` | |
| Balance | `Wallet` | |
| Budget | `PieChart` | |
| Goal | `Target` | |
| Debt | `CreditCard` | |
| Savings | `PiggyBank` | |
| Currency | `DollarSign` or `Banknote` | |
| Calendar / Date | `CalendarDays` | |
| Category | `Tag` | |
| Recurring | `Repeat` | |

### Status & Feedback

| Status | Icon Name | Color |
|---|---|---|
| Success | `CheckCircle2` | `text-accent-primary` |
| Error | `AlertCircle` | `text-accent-destructive` |
| Warning | `AlertTriangle` | `text-accent-warning` |
| Info | `Info` | `text-text-secondary` |
| Loading | (Spinner component) | — |
| Offline | `WifiOff` | `text-text-secondary` |
| Locked | `Lock` | |
| Unlocked | `Unlock` | |

### Voice UI

| State | Icon Name |
|---|---|
| Mic idle | `Mic` |
| Mic recording | `Square` (stop) |
| Mic processing | (Spinner) |

---

## Color Rules for Icons

Icons inherit text color by default. Explicit color only when:

- Semantic meaning (income green, expense red)
- Inside colored icon container (let container set color)
- Status icons (see Status table above)

```tsx
// ✅ Semantic color
<ArrowDownLeft size={20} className="text-accent-primary" />   // income
<ArrowUpRight size={20} className="text-accent-destructive" /> // expense

// ✅ Neutral (inherits parent text color)
<Settings size={20} />

// ❌ Never arbitrary color
<Settings size={20} className="text-blue-400" />
```

---

## Stroke Width

Default lucide stroke width is `2`. Use `strokeWidth={1.5}` for large display icons (size ≥ 32):

```tsx
<Target size={48} strokeWidth={1.5} />    // empty state
<BarChart3 size={48} strokeWidth={1.5} /> // feature illustration
```

---

## Accessibility

Always add `aria-label` when icon is the only content of an interactive element:

```tsx
// ✅
<button aria-label="Delete transaction">
  <Trash2 size={20} />
</button>

// ❌ — screen reader sees nothing
<button>
  <Trash2 size={20} />
</button>
```

Use `aria-hidden="true"` when icon is decorative (text label present):

```tsx
// ✅ — text label present, icon is decorative
<button>
  <Plus size={20} aria-hidden="true" />
  Add expense
</button>
```
