# Error Boundary Audit Reference (React + Telegram Mini Apps)

## Why This Matters More in a TMA Than a Normal Web App

In a browser tab, an uncaught render error produces a blank page the user can
reload. In a Telegram Mini App WebView, there's often no visible reload
affordance, and users don't reliably know they can pull-to-refresh or
relaunch the bot. A single uncaught error in one card of a dashboard should
not be able to take down the entire app.

## Table of Contents

1. [Missing Root Error Boundary](#1-missing-root-error-boundary)
2. [Single Global Boundary Instead of Granular Boundaries](#2-single-global-boundary-instead-of-granular-boundaries)
3. [Swallowing Errors Without Reporting](#3-swallowing-errors-without-reporting)
4. [Async Errors Outside Boundary Coverage](#4-async-errors-outside-boundary-coverage)
5. [No Recovery Path](#5-no-recovery-path)

---

## 1. Missing Root Error Boundary

### Constraint

Every app MUST have at least one top-level Error Boundary wrapping the
router/main content, so an unhandled render error produces a fallback UI
instead of an unrecoverable white screen inside the Telegram WebView.

### Self-Correction Rule

Search `App.tsx` / the root render tree for a class component implementing
`componentDidCatch`/`getDerivedStateFromError`, or a library equivalent
(`react-error-boundary`'s `<ErrorBoundary>`). If none wraps the router →
**CRITICAL: No Root Error Boundary**.

---

## 2. Single Global Boundary Instead of Granular Boundaries

### Constraint

A single boundary around the entire app means any error anywhere blanks the
whole screen. Independent, non-critical sections (a chart widget, a single
transaction card, a third-party embed) should have their own boundary so a
failure there degrades gracefully instead of taking down navigation, balance
display, and everything else with it.

### Bad

```tsx
// ❌ One boundary for the whole app — a bug in the analytics chart takes
// down the balance screen, nav, and everything else
<ErrorBoundary fallback={<FullScreenError />}>
  <App />
</ErrorBoundary>
```

### Good

```tsx
// ✅ Root boundary for catastrophic failures, plus local boundaries around
// independently-failable sections
<ErrorBoundary fallback={<FullScreenError />}>
  <Layout>
    <BalanceHeader />
    <ErrorBoundary fallback={<ChartFallback />}>
      <AnalyticsChart />
    </ErrorBoundary>
    <TransactionList />
  </Layout>
</ErrorBoundary>
```

### Self-Correction Rule

If a page renders 3+ independent feature sections (widgets, cards, charts)
under one boundary with no nested boundaries → **WARNING: Coarse-Grained
Error Boundary**.

---

## 3. Swallowing Errors Without Reporting

### Constraint

`componentDidCatch` / the `onError` callback MUST report the error
(Sentry, a logging Edge Function, etc.), not just render a fallback. A
boundary that catches and displays "Something went wrong" with no logging
means the team never finds out the error happened.

### Self-Correction Rule

If an `ErrorBoundary` or `componentDidCatch` implementation renders a
fallback but has no call to an error-reporting service in the same method →
**WARNING: Silent Error Boundary**.

---

## 4. Async Errors Outside Boundary Coverage

### Constraint

React Error Boundaries do NOT catch errors in event handlers, `async`
callbacks, `setTimeout`, or errors during server-side rendering. These need
explicit `try/catch` with the same reporting path, or a `window.onerror` /
`unhandledrejection` global handler as a backstop.

### Self-Correction Rule

If the app has an Error Boundary but no `window.addEventListener('unhandledrejection', ...)`
or global `onError` handler → **WARNING: Async Error Gap** — boundary
coverage is incomplete.

---

## 5. No Recovery Path

### Constraint

A fallback UI MUST offer a way forward — a "Try again" button that resets
the boundary's state (e.g., via `react-error-boundary`'s `resetErrorBoundary`),
or, at minimum, a button that calls `window.Telegram.WebApp.close()` so the
user isn't stuck staring at a dead screen with no exit.

### Bad

```tsx
// ❌ Dead end — no way to recover without force-closing the app externally
function Fallback() {
  return <div>Something went wrong.</div>;
}
```

### Good

```tsx
// ✅ Offers a path forward
function Fallback({ resetErrorBoundary }: FallbackProps) {
  return (
    <div>
      <p>{t('error.generic')}</p>
      <button onClick={resetErrorBoundary}>{t('error.retry')}</button>
    </div>
  );
}
```

### Self-Correction Rule

If a fallback component renders only static text with no retry action or
exit action → **WARNING: No Recovery Path**.
