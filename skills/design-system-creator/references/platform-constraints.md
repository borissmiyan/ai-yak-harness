# Platform Constraints

Use when generating platform-specific sections in DESIGN-AI.md or COMPONENTS.md.
Every component tagged [TG], [Web], or [Desktop] must comply with its platform's constraints.

---

## [TG] Telegram Mini-App

### Viewport & Layout

- Width: always 100vw — no horizontal scroll
- Height: variable — `window.Telegram.WebApp.viewportHeight` (changes when keyboard opens)
- Safe areas: respect `env(safe-area-inset-*)` on iOS
- Bottom sheet offset: account for Telegram's native bottom bar (~60px on some clients)
- Max content width: 428px (iPhone Pro Max) — center content on wider screens

### Navigation

- Back button: use `Telegram.WebApp.BackButton` — do NOT render your own back button
- Close button: `Telegram.WebApp.close()` — do not render custom close
- Main button: `Telegram.WebApp.MainButton` — the native bottom CTA (blue bar)
  - Use for primary actions where possible — it's always accessible
  - Set via: `MainButton.setText('Confirm').show()`

### APIs Available

- `Telegram.WebApp.HapticFeedback` — use instead of native vibration API
- `Telegram.WebApp.showAlert()` / `showConfirm()` / `showPopup()` — native dialogs
- `Telegram.WebApp.CloudStorage` — key-value storage (limited, ~1KB per key)
- `Telegram.WebApp.openLink()` — open external URLs (required — window.open blocked)
- `Telegram.WebApp.expand()` — request full-screen height on open

### APIs NOT Available

- Push notifications (use Telegram bot messages instead)
- Background sync
- Service workers (limited support)
- Camera / microphone without explicit user permission flow
- `window.open()` — use `Telegram.WebApp.openLink()` instead

### Styling Constraints

- Telegram injects CSS variables for theme: `--tg-theme-bg-color`, `--tg-theme-text-color`, etc.
- Our tokens should override these, but test for conflicts
- Dark mode: Telegram passes `colorScheme` — ensure our dark theme aligns
- Font: Telegram uses system font — our custom font stack still applies

### Performance

- Bundle size matters more here — TG loads the mini-app fresh each time
- First meaningful paint target: < 1.5s on mid-range Android
- Lazy load features not needed on first screen

### Testing

- Test on: iOS Telegram, Android Telegram, Telegram Desktop
- Use Telegram's BotFather test environment for dev

---

## [Web] Progressive Web App / Browser

### Viewport & Layout

- Responsive: mobile-first, breakpoints at `md` (768px) and `lg` (1024px)
- Max content width: `max-w-4xl` (896px) centered — already in PageLayout
- Address bar: account for it on mobile (use `dvh` not `vh` for full-height layouts)
- Install prompt: handle `beforeinstallprompt` for PWA add-to-home-screen

### Navigation

- Browser back button must work correctly — use URL-based routing
- Deep links must resolve to correct screen
- Page title (`<title>`) must update on navigation

### APIs Available

- Web Push Notifications (with permission)
- Service Worker + offline caching
- Web Share API (`navigator.share`) for sharing transactions
- Clipboard API for copy amounts
- Vibration API (`navigator.vibrate`) — limited Android support, iOS blocked
  - Fallback gracefully when unavailable

### APIs NOT Available (or limited)

- Vibration on iOS Safari — no haptics, must degrade gracefully
- Background sync — partial support

### Styling

- Scrollbar: hide or style (`scrollbar-width: none` on Firefox, webkit scrollbar on Chrome)
- Selection color: style `::selection` with brand color
- Focus-visible: ensure keyboard focus rings are visible (accessibility)
- Print: not required unless explicitly needed

### Performance

- Core Web Vitals targets: LCP < 2.5s, FID < 100ms, CLS < 0.1
- Images: use WebP, lazy load below fold
- Fonts: preload critical fonts, use `font-display: swap`

---

## [Desktop] Desktop App (Electron / Tauri / Web)

### Viewport & Layout

- Min window size: 900×600px — design for this floor
- Sidebar navigation preferred over bottom tabs
- Content area: wider — consider 2-column layouts for analytics screens
- Mouse hover states are visible and expected — implement all hover styles
- No touch events — remove swipe gestures, replace with click/right-click

### Navigation

- Keyboard shortcuts expected — document them
- Right-click context menus for list items (edit, delete)
- No back button UI — users use OS back (Alt+← / Cmd+[)

### APIs (Electron/Tauri specific)

- System notifications via OS notification API
- File system access (for export/import)
- Auto-updater
- Native menus (File, Edit, View...)

### Styling

- Scrollbars are visible on desktop — style them
- Cursor: `cursor-pointer` on all clickable elements (obvious but often missed)
- No `h-screen` with bottom nav — use proper sidebar layout
- Window controls (traffic lights on Mac) — leave space in titlebar

### Differences from Mobile

| Feature | Mobile | Desktop |
|---|---|---|
| Navigation | Bottom tabs | Sidebar |
| Primary action | Floating button / bottom CTA | Toolbar or inline |
| Gestures | Swipe, long press | Click, right-click, keyboard |
| Haptics | Yes | No |
| Font size | Base 16px | Can be 14px for dense UIs |
| Touch targets | 60px | 36–44px acceptable |

---

## [All] Cross-Platform Rules

These apply everywhere regardless of platform:

- Design tokens (colors, radius, spacing) are identical across all platforms
- Component names are identical — only implementation details differ
- Brand identity (logo, colors, typography personality) is identical
- Error messages and empty states use the same copy
- Animations use the same spring configs — platform may affect whether they run
