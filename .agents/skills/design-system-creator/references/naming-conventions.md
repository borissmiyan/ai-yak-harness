# Naming Conventions

Single source of truth for naming across the entire codebase.
AI: apply these before writing any file, variable, function, or class name.

---

## Files & Folders

| Type | Convention | Example |
|---|---|---|
| React component file | `PascalCase.tsx` | `TransactionCard.tsx` |
| Hook file | `camelCase.ts`, prefix `use` | `useTransactionList.ts` |
| Utility file | `camelCase.ts` | `formatCurrency.ts` |
| Store / atom file | `camelCase.ts`, suffix `Store` or `Atoms` | `transactionStore.ts` |
| Type definitions | `camelCase.ts`, suffix `Types` or `types` | `transactionTypes.ts` |
| Feature folder | `kebab-case` | `budget-wizard/`, `voice-input/` |
| Shared UI folder | `kebab-case` | `shared/ui/bottom-sheets/` |
| Test file | same name + `.test.tsx` | `TransactionCard.test.tsx` |
| Story file | same name + `.stories.tsx` | `TransactionCard.stories.tsx` |

---

## React Components

```tsx
// ✅ PascalCase, full descriptive name
export function TransactionListItem() {}
export function VoiceRecordButton() {}
export const BudgetProgressCard = () => {}

// ❌ Never abbreviated
export function TxItem() {}     // too short
export function VRBtn() {}      // acronym soup
export function Card1() {}      // numbered
```

**Props interfaces:**

```tsx
// ✅ ComponentName + Props
interface TransactionListItemProps {
  transaction: Transaction;
  onDelete: (id: string) => void;
  isLoading?: boolean;
}

// ❌ Never generic
interface Props {}
interface IProps {}
```

---

## Variables & Functions

```tsx
// ✅ Full descriptive camelCase
const transactionIndex = 0;
const selectedCategoryId = 'food';
const isModalVisible = false;
const formattedBalance = formatCurrency(balance);

function handleTransactionDelete(transactionId: string) {}
function calculateMonthlyExpenses(transactions: Transaction[]) {}

// ❌ Never abbreviated
const txIdx = 0;       // abbreviated
const selCatId = '';   // abbreviated
const vis = false;     // meaningless
```

**Boolean variables — always a question:**

```tsx
// ✅ is / has / can / should prefix
const isLoading = true;
const hasTransactions = list.length > 0;
const canDeleteTransaction = !isReadOnly;
const shouldShowProposalCard = voiceResult !== null;

// ❌ No prefix
const loading = true;
const transactions = list.length > 0;
```

---

## Custom Hooks

```tsx
// ✅ use + PascalCase noun, full name
function useTransactionList() {}
function useVoiceRecorder() {}
function useBudgetWizardForm() {}
function useModalRegistry() {}

// ❌ Never
function useData() {}        // too generic
function useTxList() {}      // abbreviated
function getData() {}        // missing use prefix
```

Hooks return objects (not arrays) unless mimicking useState:

```tsx
// ✅ Named return — easier to use, easier to extend
const { transactions, isLoading, deleteTransaction } = useTransactionList();

// ✅ Array only when mimicking useState pattern
const [value, setValue] = useLocalValue('key');
```

---

## Jotai Atoms

```tsx
// ✅ camelCase, suffix Atom
export const activeTransactionAtom = atom<Transaction | null>(null);
export const selectedMonthAtom = atom<string>(currentMonth());
export const isVoiceRecordingAtom = atom<boolean>(false);
export const modalRegistryAtom = atom<ModalState>({});

// Derived atoms — suffix with what they derive
export const currentMonthTransactionsAtom = atom(get => {
  const all = get(transactionsAtom);
  const month = get(selectedMonthAtom);
  return all.filter(t => t.month === month);
});

// ❌ Never
export const data = atom(null);      // generic
export const atom1 = atom(false);    // numbered
export const txAtom = atom([]);      // abbreviated
```

---

## CSS Variables (Design Tokens)

```css
/* ✅ --color-[role]-[variant] */
--color-bg-primary
--color-bg-secondary
--color-text-primary
--color-text-secondary
--color-accent-primary
--color-accent-warning
--color-accent-destructive

/* ✅ --spacing-[name] */
--spacing-touch-target    /* 60px */
--spacing-header-offset   /* 96px */

/* ✅ --radius-[name] */
--radius-card             /* 24px */
--radius-input            /* rounded-3xl */

/* ❌ Never */
--green                   /* no role context */
--c1                      /* meaningless */
--myColor                 /* camelCase in CSS */
```

---

## Tailwind Custom Classes

```css
/* ✅ kebab-case, prefixed by domain */
.card-grad-debts {}
.card-grad-savings {}
.card-grad-standard {}

.text-balance-positive {}
.text-balance-negative {}

/* ❌ Never */
.myCard {}           /* camelCase */
.green-thing {}      /* vague */
.style1 {}           /* numbered */
```

---

## Event Handlers

```tsx
// ✅ handle + [Subject] + [Action]
function handleTransactionDelete() {}
function handleFormSubmit() {}
function handleModalClose() {}
function handleCategorySelect(categoryId: string) {}

// ✅ on + [Subject] + [Action] — for props
interface Props {
  onTransactionDelete: (id: string) => void;
  onModalClose: () => void;
}

// ❌ Never
function click() {}
function doThing() {}
const handler = () => {}
```

---

## Types & Interfaces

```tsx
// ✅ PascalCase noun, no I prefix
type Transaction = { ... }
type Category = { ... }
type ModalState = { ... }
type VoiceRecognitionResult = { ... }

// ✅ Union types — descriptive
type TransactionType = 'income' | 'expense' | 'transfer';
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'destructive';
type Platform = 'web' | 'telegram' | 'desktop';
type ComponentStatus = 'stable' | 'in-progress' | 'deprecated' | 'needs-review';

// ❌ Never
interface ITransaction {}     // I prefix (Java-style)
type t = {}                   // single letter
type Data = {}                // too generic
```

---

## Feature Folder Structure (Naming Inside)

Every feature in `src/features/` follows:

```
feature-name/
  FeatureNamePage.tsx         ← PascalCase + Page suffix for screens
  hooks/
    useFeatureNameLogic.ts    ← use + FeatureName + Logic
    useFeatureNameForm.ts     ← use + FeatureName + Form (if form exists)
  components/
    FeatureSubComponent.tsx   ← PascalCase
  utils.ts                    ← always just utils.ts
  types.ts                    ← always just types.ts
  index.ts                    ← re-exports public API of the feature
```
