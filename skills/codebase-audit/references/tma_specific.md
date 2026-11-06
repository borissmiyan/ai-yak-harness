# TMA (Telegram Mini App) Specific Audit Reference

## 1. Lifecycle Initialization

### Constraint
Every TMA must call `expand()` and `ready()` during the initial mount to ensure the webview is properly sized and visible to the user without "letterboxing".

### Good
```tsx
useEffect(() => {
  const webApp = window.Telegram?.WebApp;
  if (webApp) {
    webApp.ready();
    webApp.expand();
  }
}, []);
```

---

## 2. Haptic Feedback

### Constraint
Use `HapticFeedback` for significant user interactions (success, error, impact) to provide a "native feel". Avoid flooding the bridge with haptics on every hover or scroll.

---

## 3. Back Button Integration

### Constraint
The Telegram `BackButton` must be synchronized with the app's internal routing (e.g., React Router). Users expect the physical/bridge back button to navigate within the app.

---

## 4. Theme Integration

### Constraint
Never hardcode colors. Use `theme_params` provided by the Telegram Web App bridge to match the user's Telegram theme (dark/light mode).

### Bad
```tsx
const bgColor = '#090f08'; // ❌ Hardcoded
```

### Good
```tsx
const webApp = window.Telegram?.WebApp;
const bgColor = webApp?.themeParams.bg_color || '#090f08';
```

---

## 5. Viewport Management

### Constraint
Be cautious with `100vh`. Telegram's navigation bar and header can shift the viewport. Use TWA's `viewportHeight` or CSS variables like `var(--tg-viewport-height)` to ensure icons and buttons aren't cut off.
