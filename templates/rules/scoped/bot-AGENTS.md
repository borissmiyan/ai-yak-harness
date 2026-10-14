# 🤖 Telegram & Chat Bot Engineering Rules (`src/bot/`)

> **Domain:** Telegram Bots (Grammy, Telegraf), Discord, Slack bots, Webhooks, Long-polling, and Bot CLI interactions.

---

## 🎯 Architectural Principles & Invariants

1. **Strict Secret Hygiene**:
   - `BOT_TOKEN` and webhook secrets MUST reside exclusively in environment variables:
     - Local dev: `.env` or `.dev.vars` (both strictly in `.gitignore`).
     - Serverless/Cloudflare: Secrets Store (`wrangler secret put BOT_TOKEN`).
   - ❌ NEVER commit tokens to Git, `wrangler.toml [vars]`, or hardcode in `new Bot('...')`.
   - ❌ NEVER use secret tokens as code fallbacks (`process.env.BOT_TOKEN || 'raw_token'`).

2. **Reply Keyboards Navigation Doctrine (D-03)**:
   - Persistent user navigation (menu, catalog, daily quiz, profile) MUST be placed in `Keyboard` (under the chat input field), not in messages.
   - Prevents chat history pollution and message re-render flickers.

3. **Immediate Inline Callback Acknowledgement**:
   - Every inline button callback handler (`bot.callbackQuery`) MUST immediately execute `await ctx.answerCallbackQuery()`.
   - Prevents infinite loading spinners on the user's Telegram client.

4. **Telegram Error & Rate-Limit Resilience**:
   - Outgoing broadcasts and notifications must catch `403 Forbidden` (`bot was blocked by user`) and deactivate notifications for that user.
   - Outgoing batches must respect Telegram's 30 msg/sec limit and handle `429 Too Many Requests` (retry-after backoff).

5. **Hermetic Bot Testing**:
   - Bot unit/integration tests must NEVER make real Telegram API network requests.
   - Mock Telegram context (`ctx`) and `bot.api.sendMessage` using `vi.fn()`.

---

## 🚫 Forbidden Antipatterns

- ❌ Storing `BOT_TOKEN` in `wrangler.toml` under `[vars]`.
- ❌ Orphaned inline buttons without `ctx.answerCallbackQuery()`.
- ❌ Direct execution of long-running operations without acknowledging callback/message first.
- ❌ Unmocked Telegram fetch calls in test files.
