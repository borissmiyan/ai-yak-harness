# Copy & Tone Guide

How Yak Money speaks. Apply to all UI text: buttons, empty states, errors,
tooltips, analytics insights, notifications, onboarding.

AI: read this before writing any user-facing string.

---

## Brand Voice

| Attribute | Description | Example |
|---|---|---|
| **Wise** | Speaks with calm confidence, not lectures | "You're on track." not "You must save more." |
| **Warm** | Feels like a trusted friend, not a bank | "Nice one." not "Transaction recorded successfully." |
| **Direct** | Short sentences. No filler words. | "Add your first expense." not "Get started by adding your very first expense today." |
| **Empowering** | Users are capable — copy confirms it | "You've got this." not "This might be difficult..." |
| **Grounded** | About real life, not abstract finance | "Lunch money" not "Food & Beverage expenditure" |

---

## Tone by Context

| Context | Tone | Notes |
|---|---|---|
| Empty states | Inviting, gentle nudge | Don't guilt. Don't over-explain. |
| Errors | Calm, solution-focused | Never blame the user. Always offer a way out. |
| Success | Brief, warm | Don't over-celebrate small actions. |
| Analytics insights | Observational, curious | Present facts, don't prescribe. |
| Destructive actions | Neutral, clear | No scary language. Just facts. |
| Onboarding | Encouraging, minimal | One idea per screen. |
| Notifications | Conversational | Like a text from a friend, not a system alert. |

---

## Vocabulary

### Preferred Words

| Instead of... | Use... |
|---|---|
| Error | Something went wrong |
| Failed | Didn't work |
| Invalid | Check this |
| Transaction | Expense / Income (context-specific) |
| Record | Add / Track |
| Submit | Save / Done |
| Cancel | Never mind / Back |
| Delete | Remove |
| Loading... | (skeleton, no text) |
| Please wait | (spinner, no text) |
| Successfully saved | Saved ✓ |
| No data available | (empty state illustration + CTA) |

### Forbidden Words & Phrases

- "Error" as a standalone label
- "Invalid input" — always specify what's wrong
- "Please" — sounds corporate
- "Click here" — say what happens instead
- "You must..." — prescriptive, not empowering
- "Warning:" as a prefix — just say the thing
- Any finance jargon: "expenditure", "disbursement", "remittance"
- Exclamation marks in errors or warnings
- ALL CAPS for emphasis

---

## Empty States

Structure: **Observation → Invitation**. Never guilt. Always CTA.

```
✅ "Nothing here yet.
    Add your first expense to see where your money goes."
    [Add expense]

✅ "No goals set.
    Start with one — even small ones add up."
    [Set a goal]

❌ "You haven't added any transactions yet.
    Please add a transaction to get started."
```

Pattern:

- Line 1: Neutral observation. Max 5 words.
- Line 2: What becomes possible. Max 10 words.
- CTA: Action verb + subject. Max 3 words.

---

## Error Messages

Structure: **What happened (briefly) → What to do**. Never technical details to user.

```
✅ "Couldn't save. Check your connection and try again."
   [Try again]

✅ "Something went wrong. We're on it."
   [Retry] [Go back]

❌ "Error 500: Internal server error. Request failed."
❌ "Network request timeout. Please check your internet connection and retry."
```

Rules:

- Never show error codes to users
- Always have at least one action button
- If retry isn't possible — offer a way back
- Keep to 1–2 sentences

---

## Success Messages

Brief. Warm. Then get out of the way.

```
✅ "Saved."
✅ "Done."
✅ "Got it."
✅ "Added."

❌ "Your transaction has been successfully recorded!"
❌ "Great job! Transaction saved successfully. ✓✓"
```

Show for 1.5–2 seconds, then dismiss. No manual close needed for minor successes.

---

## Destructive Action Confirmations

Calm and factual. No alarm language.

```
✅ "Remove this expense?"
   [Remove] [Keep]

✅ "Delete goal?"
   This can't be undone.
   [Delete] [Cancel]

❌ "WARNING: Are you sure you want to permanently delete this transaction?
    This action cannot be reversed!"
```

Rules:

- Question form, not imperative
- Destructive button: action verb only ("Remove", "Delete") — no "Yes, delete it"
- Safe button: "Keep" or "Cancel" — not "No"
- Max 1 line of explanation

---

## Analytics Insights

Observational tone. Present the data, let the user draw conclusions.
Optionally add a gentle nudge — never a prescription.

```
✅ "Food was your biggest spend this month — 34% of expenses."
✅ "You spent less on transport than last month."
✅ "3 days left in the month. You're 80% through your budget."

❌ "You are spending too much on food! You should cut back."
❌ "WARNING: Budget exceeded."
❌ "Congratulations! You saved money this month!"  ← over-celebrating
```

---

## Button Labels

Rules:

- Always a verb: "Add", "Save", "Remove", "View", "Connect"
- Never: "OK", "Yes", "Submit", "Confirm" (too generic)
- Max 2 words
- Sentence case, not Title Case

```
✅ "Add expense"
✅ "Save goal"
✅ "View details"
✅ "Try again"

❌ "Submit"
❌ "Confirm Transaction"
❌ "OK"
❌ "SAVE"
```

---

## Placeholders

Descriptive, not instructional. Show an example, not a command.

```
✅ "e.g. Lunch, taxi, groceries..."
✅ "500"  (for amount field)
✅ "What was it for?"

❌ "Enter transaction name"
❌ "Please type the amount here"
❌ "Input description"
```

---

## Numbers & Currency

```
✅ $1,200        (thousands separator)
✅ $1.2K         (abbreviated when space is tight)
✅ –$45.00       (expense — minus prefix)
✅ +$200.00      (income — plus prefix)
✅ $0.00         (zero balance — show, don't hide)

❌ $1200         (no separator)
❌ 1200.0        (inconsistent decimals)
❌ $-45          (minus after symbol)
```

Always use `Intl.NumberFormat` — never manual string formatting.
