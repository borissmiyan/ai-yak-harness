# Typography Scale

Universal typography rules for any project.
Sections 1–3 are universal. Section 4 is filled per-project based on actual tokens.

---

## 1. Scale Principles

**Use a maximum of 5 type roles per project.** More than 5 creates visual noise.
Each role has one job — never mix roles based on aesthetics.

| Role | Job |
|---|---|
| **Display** | Hero numbers, big stats, splash screens |
| **Title** | Page headings, section headings |
| **Body** | Content, descriptions, paragraphs |
| **Label** | UI labels, button text, tags, form labels |
| **Caption** | Metadata, timestamps, secondary info |

---

## 2. Universal Rules

### Hierarchy

- Maximum 3 type sizes visible simultaneously on one screen
- Never skip heading levels: `h1 → h2 → h3`, not `h1 → h3`
- One `h1` per page/screen only

### Line Length

```
Optimal:  45–75 characters per line
Mobile:   35–55 characters (narrower viewport)
Too wide: > 85 characters — add max-width
Too narrow: < 25 characters — feels choppy
```

### Line Height

```
Headings (large, short text): 1.1–1.2
Body text (multi-line):        1.5–1.6
UI labels (single line):       1.0–1.2 (tight, controlled)
```

### Letter Spacing

```
Large headings (≥ 24px): slightly negative (-0.01em to -0.03em) — tracking-tight
Body text:               default (0)
All-caps labels:         slightly positive (+0.05em to +0.1em) — tracking-wide
```

### Weight Usage

- Use maximum 3 weights per project (e.g. 400 / 600 / 800)
- Do not use `font-weight: 500` and `font-weight: 600` together — too similar
- Bold for emphasis, not for decoration

---

## 3. Responsive Scaling

Scale headings down on mobile. Never let a page title wrap to 3+ lines.

```tsx
// Pattern: larger on desktop, smaller on mobile
// Tailwind: mobile-first means default = mobile, md: = desktop

className="text-2xl md:text-3xl font-extrabold"   // page title
className="text-lg md:text-xl font-bold"           // section title
className="text-base"                               // body — usually no scaling needed
className="text-sm"                                 // caption — usually no scaling needed
```

**When to truncate vs wrap:**

| Context | Approach |
|---|---|
| Card title (1 line) | Truncate: `truncate` or `line-clamp-1` |
| Card description | Clamp: `line-clamp-2` |
| Page title | Wrap — never truncate a heading |
| List item label | Truncate if single line, wrap if multi permitted |
| Button label | Never wrap — shorten the copy instead |
| Toast / notification | Clamp to 2 lines max |

---

## 4. Project Type Scale

Fill this section based on actual project tokens after scanning.
Replace `_` placeholders with real values from `app.css` or `tailwind.config`.

### Web / PWA (default scale)

| Role | Tailwind Class | Size | Weight | Line Height | Letter Spacing |
|---|---|---|---|---|---|
| Display | `text-5xl font-black` | 48px | 900 | 1.1 | `-0.02em` |
| Title (page) | `text-3xl font-extrabold tracking-tight` | 30px | 800 | 1.15 | `-0.01em` |
| Title (section) | `text-xl font-bold tracking-tight` | 20px | 700 | 1.2 | `-0.01em` |
| Body | `text-base leading-relaxed` | 16px | 400 | 1.6 | `0` |
| Label | `text-sm font-medium` | 14px | 500 | 1.2 | `0` |
| Caption | `text-xs text-[secondary]` | 12px | 400 | 1.4 | `0` |

### Dense UI (dashboards, data-heavy screens)

| Role | Tailwind Class | Size | Weight | Notes |
|---|---|---|---|---|
| Title | `text-lg font-bold` | 18px | 700 | Compact heading |
| Body | `text-sm leading-snug` | 14px | 400 | Fits more rows |
| Label | `text-xs font-medium` | 12px | 500 | Tight labels |
| Caption | `text-xs` | 11px | 400 | Absolute minimum |

### Large Numbers / Display (stats, balances, metrics)

```tsx
// Hero metric — the thing user cares most about on the screen
className="text-4xl font-black tabular-nums tracking-tight"

// Supporting metric
className="text-2xl font-bold tabular-nums"

// Small metric
className="text-lg font-semibold tabular-nums"
```

**`tabular-nums`** — always use for numbers that change (prevents layout shift when digits update).

---

## 5. Number Formatting

Universal rules regardless of project domain:

```tsx
// ✅ Always use Intl.NumberFormat — never manual string formatting
const format = (value: number, currency?: string) =>
  new Intl.NumberFormat('default', {
    style: currency ? 'currency' : 'decimal',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);

// ✅ Abbreviation for large numbers (when space is tight)
const abbreviate = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
};

// ✅ Consistent decimal places within a list
// If one item has decimals, all items should — prevents ragged alignment
```

---

## 6. Multilingual Considerations

When the app supports multiple languages:

| Language Group | Typography Notes |
|---|---|
| Cyrillic (RU, UK, KG...) | `leading-relaxed` (1.6) minimum — Cyrillic has taller descenders |
| Arabic / Hebrew (RTL) | `dir="rtl"`, use logical CSS properties (`ms-`, `me-`, not `ml-`, `mr-`) |
| CJK (ZH, JA, KO) | `line-height: 1.8` recommended, word-break: `break-all` |
| German / Finnish | Long words — always test with real translations, not Lorem Ipsum |
| All non-English | Add 30% extra width to buttons/labels in design — translations expand |

**Test with real strings, not Lorem Ipsum.**
A button that says "OK" may need to say "Подтвердить" — plan for 3–5× text expansion.

---

## 7. Font Loading

```html
<!-- ✅ Preload critical fonts to prevent FOUT -->
<link rel="preload" href="/fonts/font.woff2" as="font" type="font/woff2" crossorigin>

<!-- ✅ font-display: swap — shows fallback immediately, swaps when loaded -->
@font-face {
  font-family: 'YourFont';
  src: url('/fonts/font.woff2') format('woff2');
  font-display: swap;
}
```

**System font stack fallback (when custom font fails):**

```css
font-family: 'YourFont', -apple-system, BlinkMacSystemFont,
             'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
```
