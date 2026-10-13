# 🛠️ Services & API Integration Rules (`src/services/`)

> **Domain:** Remote network requests, API clients, caching layers, background sync, and offline fallbacks.

---

## 🎯 Architectural Principles

1. **Offline & Network Resilience**:
   - Never let a network failure crash or block the UI.
   - All query services must check local cache/storage if offline or if remote fetch fails/times out.
   - Network requests must have bounded timeouts (e.g. 5-10s) using `AbortController`.

2. **Single Responsibility**:
   - Split services by domain entity (e.g. `authService.ts`, `dataService.ts`).
   - Keep business calculations out of services (move to pure utils).

3. **No Direct UI Coupling**:
   - Services must NOT import React hooks, JSX, or UI components.
   - Services return strongly typed promises: `Promise<T>`.

---

## 🚫 Forbidden Antipatterns

- ❌ Calling direct DB / API clients inside UI components (always encapsulate in a service).
- ❌ Swallowing errors silently without logging or fallback.
- ❌ Hardcoded API endpoints or secret keys.
- ❌ Mutating returned cache objects directly.
