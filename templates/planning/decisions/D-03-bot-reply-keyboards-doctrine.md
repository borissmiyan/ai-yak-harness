# ADR D-03: Bot Reply Keyboards & Inline Callback Latency Doctrine

- **Date:** 2026-10-14
- **Status:** Accepted
- **Driver:** Boris Smiyan & Principal Bot Architect

## Context & Problem
Telegram bots frequently suffer from degraded UX and protocol violations when created by AI agents:
1. **Chat History Flooding:** Placing main menus and navigation buttons inside inline keyboards in message bodies causes the bot to spam new messages or edit messages repeatedly, polluting chat history and creating visual flickers.
2. **Infinite Client Spinners:** Omitting or delaying `ctx.answerCallbackQuery()` on inline button presses leaves the user's Telegram client displaying an infinite loading wheel on the button.
3. **Secret Leakage:** Exposing `BOT_TOKEN` in client builds or committing it to repository configs.

## Decision
1. **Reply Keyboards for Persistent Navigation:**
   - Permanent actions (Main Menu, Catalog, Profile, Settings) MUST use Telegram Reply Keyboards docked under the user's input field (`Keyboard`), not inline buttons inside chat bubbles.
   - Inline keyboards (`InlineKeyboard`) are reserved strictly for contextual, single-interaction actions (e.g., confirming a specific transaction or answering a single quiz card).
2. **Mandatory Immediate Callback Acknowledgment:**
   - Every inline callback query handler MUST execute `await ctx.answerCallbackQuery()` before starting any asynchronous or background work.
3. **Hermetic Bot Testing:**
   - Unit tests must mock Telegram API interactions (`vi.fn()`) and verify that `answerCallbackQuery` is invoked without network access.
4. **Secret Isolation:**
   - `BOT_TOKEN` must never exist in repository files or client bundles.

## Consequences
- **Positive:** Clean, ergonomic chat UI; instant button response feedback without hanging spinners; zero token leaks.
- **Negative:** Developers must design navigation flows separating docked reply actions from contextual inline buttons.
