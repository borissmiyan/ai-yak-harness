# TMA & Security Audit Reference (Telegram Mini Apps + Supabase Auth)

## Table of Contents
1. [InitData Validation](#initdata-validation)
2. [Token Handling](#token-handling)
3. [RLS Policy Gaps](#rls-policy-gaps)
4. [Edge Function Security](#edge-function-security)
5. [Client-Side Secrets](#client-side-secrets)
6. [XSS in WebView](#xss-in-webview)

---

## InitData Validation

### Constraint
`initData` from Telegram MUST be validated server-side (in Edge Function) using the bot token HMAC. NEVER trust `initData` from the client without server verification.

### Bad
```tsx
// ❌ Trusting initData client-side without server validation
const tg = window.Telegram?.WebApp;
const userId = JSON.parse(tg.initData).user.id; // ← can be spoofed
await supabase.from('profiles').select('*').eq('telegram_id', userId);
```

### Good
```tsx
// ✅ Send raw initData to Edge Function for HMAC validation
const { data, error } = await supabase.functions.invoke('telegram-auth', {
  body: { initData: tg.initData },
  method: 'POST',
});
// Edge Function validates HMAC, returns signed JWT only if valid
```

### Self-Correction Rule
Search codebase for `tg.initData` or `window.Telegram`. If ANY field from initData is used directly (user.id, user.username) without first passing through an Edge Function, flag as **CRITICAL — authentication bypass**.

---

## Token Handling

### Constraint
1. JWTs MUST have an expiration (`exp` claim). Tokens without expiration are permanent backdoors.
2. Refresh tokens MUST NOT be the same as access tokens (indicates no real refresh flow).
3. Tokens MUST NOT be stored in `localStorage` in production — use Supabase's built-in session management.

### Known Issue Pattern
```tsx
// ⚠️ refresh_token is identical to access_token — no real refresh mechanism
await supabase.auth.setSession({
  access_token: data.token,
  refresh_token: data.token, // ← same token!
});
```

This means:
- Token expiration = permanent session death (no refresh possible)
- If token leaks, attacker has permanent access until token expires

### Self-Correction Rule
Search for `setSession`. If `refresh_token` equals `access_token`, flag as **WARNING — no real token refresh**.

---

## RLS Policy Gaps

### Constraint
Every Supabase table with user data MUST have Row Level Security (RLS) enabled and policies that filter by `auth.uid()` or `auth.jwt()->>'sub'`.

### Common Gaps
1. **Missing `DELETE` policy** — user can insert/update but not delete their own data (or vice versa: anyone can delete)
2. **Missing `SELECT` policy** — data readable by anyone with a valid JWT
3. **Policy references wrong column** — policy checks `user_id` but table uses `telegram_user_id`

### Self-Correction Rule
For each Supabase table listed in `db.ts` or services:
1. Verify RLS is ON
2. Verify SELECT, INSERT, UPDATE, DELETE policies exist
3. Verify policies filter by the correct user identifier column

If ANY table lacks RLS or has a policy gap → **CRITICAL — unauthorized data access**.

---

## Edge Function Security

### Constraint
1. Edge Functions MUST validate the Authorization header (JWT) unless explicitly public
2. CORS headers MUST NOT use `*` in production
3. Environment variables (bot tokens, API keys) MUST use `Deno.env.get()`, never hardcoded
4. Request body MUST be validated/parsed with proper error handling

### Bad
```tsx
// ❌ No input validation, no auth check
Deno.serve(async (req) => {
  const { initData } = await req.json(); // ← can throw, not caught
  // process directly...
});
```

### Good
```tsx
// ✅ Proper validation
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  let body: { initData?: string };
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }
  if (!body.initData || typeof body.initData !== 'string') {
    return new Response('Missing initData', { status: 400 });
  }
  // ... HMAC validation, JWT minting ...
});
```

---

## Client-Side Secrets

### Constraint
1. **NEVER** expose `SUPABASE_SERVICE_ROLE_KEY` in frontend code
2. `VITE_` prefixed env vars are embedded in the build — only use for public keys (anon key, project URL)
3. Bot tokens, webhook secrets, API keys MUST only exist in Edge Functions

### Self-Correction Rule
Search for:
- `service_role` or `SERVICE_ROLE` in `src/` → **CRITICAL**
- Any non-`VITE_` env var access (like `process.env.SECRET`) → **WARNING** (won't work in Vite anyway, but indicates a mistake)
- Hardcoded UUIDs, tokens, or keys in source → **CRITICAL**

---

## XSS in WebView

### Constraint
Telegram Mini Apps run in a WebView. Injected HTML/JS can:
1. Steal `initData` and forge authentication
2. Access IndexedDB (Dexie) directly
3. Call `window.Telegram.WebApp.close()` or `sendData()` to exfiltrate data

### Areas to Audit
1. **`dangerouslySetInnerHTML`** — NEVER use with user-provided content
2. **`react-markdown`** — Ensure `allowedElements` is restricted, no raw HTML pass-through
3. **URL parameters** — If reading `window.location.search` and rendering values, ensure sanitization
4. **Supabase text fields** — If rendering `description`, `analysis_text` etc. from DB, ensure they are text-only (no HTML interpretation)

### Self-Correction Rule
Search for `dangerouslySetInnerHTML`, `innerHTML`, `document.write`. If found, flag as **CRITICAL — XSS risk** unless explicitly sanitized.
