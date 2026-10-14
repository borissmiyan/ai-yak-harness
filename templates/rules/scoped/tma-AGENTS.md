# 📱 Telegram Mini App (TMA) Engineering Rules (`src/tma/` or `src/features/tma/`)

> **Domain:** Telegram Mini Apps (TMA), Telegram WebApp SDK, `@tma.js`, Viewport, Haptics, and Secure TMA Authentication.

---

## 🎯 Architectural Principles & Invariants

1. **Zero Bot Tokens in Client Bundles**:
   - `BOT_TOKEN` must NEVER be exposed in client code, `VITE_` variables, or React state.
   - Client bundle is public. Only the backend/worker needs `BOT_TOKEN` to verify `initData`.

2. **Cryptographic `initData` Verification (Mandatory)**:
   - Client must send `window.Telegram.WebApp.initData` in the `Authorization: tma <initData>` header.
   - Backend MUST cryptographically verify the signature with HMAC-SHA256 using `HMAC_SHA256("WebAppData", botToken)`.
   - ❌ NEVER trust unverified `user.id` or `initDataUnsafe` from the frontend for sensitive actions.

3. **TMA Lifecycle & Viewport Hygiene**:
   - Call `Telegram.WebApp.ready()` on initial app load.
   - Expand viewport early: `Telegram.WebApp.expand()` (or `requestFullscreen()` where supported).
   - Component Unmount: Always hide and clean up native elements:
     ```ts
     useEffect(() => {
       window.Telegram?.WebApp?.MainButton?.setText('Save')?.show();
       return () => {
         window.Telegram?.WebApp?.MainButton?.hide();
       };
     }, []);
     ```

4. **Safe Haptics & Platform Adaptation**:
   - Check feature availability before calling `HapticFeedback.impactOccurred('medium')`.
   - Adapt colors to Telegram theme (`WebApp.themeParams.bg_color`, `text_color`) or use Yak design tokens with dark mode default.

5. **Swipe-Down & Scroll Safety**:
   - In TMA modals and bottom sheets, disable vertical overscroll (`WebApp.isVerticalSwipesEnabled = false`) when opening interactive sliders or gestures to avoid accidental app closure.

---

## 🚫 Forbidden Antipatterns

- ❌ Exposing `VITE_TELEGRAM_BOT_TOKEN` in frontend code.
- ❌ Trusting `initDataUnsafe` on the server without HMAC-SHA256 validation.
- ❌ Orphaned `MainButton` or `BackButton` lingering after navigating away from a screen.
- ❌ Hardcoded light mode backgrounds without adhering to TMA theme params.
