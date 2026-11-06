# TMA & Security Audit Reference (Telegram Mini Apps + Supabase Auth)

## Table of Contents
1. [InitData Validation](#initdata-validation)
2. [Token Handling](#token-handling)
3. [RLS Policy Gaps](#rls-policy-gaps)
4. [Edge Function Security](#edge-function-security)
5. [Client-Side Secrets](#client-side-secrets)
6. [XSS in WebView](#xss-in-webview)
7. [RPC & SECURITY DEFINER Hardening](#rpc--security-definer-hardening)
8. [Self-Privilege Escalation on User Profiles](#self-privilege-escalation-on-user-profiles)
9. [IDOR: Sequential IDs vs Cryptographic UUID Tokens](#idor-sequential-ids-vs-cryptographic-uuid-tokens)
10. [Master Storage Credentials & Presigned URLs](#master-storage-credentials--presigned-urls)
11. [Brute-Force Protection & Rate Limiting](#brute-force-protection--rate-limiting)

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

---

## RPC & SECURITY DEFINER Hardening

### Constraint
1. Every PostgreSQL function declared `SECURITY DEFINER` bypasses Row Level Security and runs with table-owner privileges. It MUST:
   - Explicitly lock schema path: `SET search_path = public;` to prevent search_path hijacking.
   - Enforce authentication inside function body: `IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;` (or check `is_admin()`).
   - NEVER be granted to `anon` unless strictly serving a public guest endpoint verified by an unguessable cryptographic token.
2. `REVOKE EXECUTE ON FUNCTION ... FROM anon, public;` must be applied to all mutating and sensitive RPCs.

### Bad
```sql
-- ❌ Critical Vulnerability: SECURITY DEFINER with anon grant and sequential integer ID
CREATE FUNCTION save_report_stages(p_report_id bigint, p_stages jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    DELETE FROM report_capacitor_stages WHERE report_id = p_report_id; -- anyone can wipe!
END;
$$;
GRANT EXECUTE ON FUNCTION save_report_stages(bigint, jsonb) TO anon;
```

### Good
```sql
-- ✅ Authenticated execution only with session check and search_path lock
CREATE FUNCTION save_report_stages(p_report_id bigint, p_stages jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Neautorizovaný prístup';
    END IF;
    -- verify immutability or ownership before mutation...
END;
$$;
REVOKE EXECUTE ON FUNCTION save_report_stages(bigint, jsonb) FROM anon, public;
GRANT EXECUTE ON FUNCTION save_report_stages(bigint, jsonb) TO authenticated, service_role;
```

### Self-Correction Rule
Scan all SQL migrations and RPCs: flag any `SECURITY DEFINER` function with `GRANT ... TO anon` that modifies data or queries primary keys by numeric ID without a cryptographic UUID token.

---

## Self-Privilege Escalation on User Profiles

### Constraint
In PostgreSQL, RLS policies for `UPDATE` evaluate row-level criteria, NOT column-level criteria.
A policy like `CREATE POLICY ON profiles FOR UPDATE USING (auth.uid() = id)` allows a user to update **every single column in their row**, including `role`, `is_approved`, `is_admin`, or `balance`.

### Bad
```sql
-- ❌ Privilege Escalation: User can execute supabase.from('profiles').update({ role: 'admin' })
CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE USING (auth.uid() = id);
```

### Good
```sql
-- ✅ Paired with BEFORE UPDATE trigger protecting privileged columns
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF NOT public.is_admin() THEN
        IF NEW.role IS DISTINCT FROM OLD.role OR NEW.is_approved IS DISTINCT FROM OLD.is_approved THEN
            RAISE EXCEPTION 'Permission denied: Cannot modify privileged fields';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_profile_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileged_fields();
```

### Self-Correction Rule
Check `profiles` or user tables: if an `UPDATE` policy allows `auth.uid() = id`, verify that a `BEFORE UPDATE` trigger strictly blocks mutations to `role`, `is_approved`, and admin flags.

---

## IDOR: Sequential IDs vs Cryptographic UUID Tokens

### Constraint
Public URLs, customer-facing signing portals, and guest links MUST NEVER expose or accept sequential integer IDs (`/sign/19`, `/share/report-19`). An attacker can enumerate `1..N` to exfiltrate customer PII or tamper with unsigned resources.
Public access MUST require a 128-bit unguessable UUID token (`signing_token`).

### Bad
```tsx
// ❌ Predictable sequential integer URL leak
const signUrl = `https://app.elconder.sk/sign/protokol-${report.id}`;
```

### Good
```tsx
// ✅ Unguessable UUID token URL
const signUrl = `https://app.elconder.sk/sign/${report.signing_token}`;
```

### Self-Correction Rule
Search frontend and backend code for `/sign/` or public guest links: if the URL embeds `.id` or `protokol-`, flag as **CRITICAL IDOR exposure**; enforce UUID token generation (`gen_random_uuid()`).

---

## Master Storage Credentials & Presigned URLs

### Constraint
1. **NEVER** expose master S3 / Cloudflare R2 access keys (`VITE_CLOUDFLARE_R2_SECRET_ACCESS_KEY`) in client frontend bundles. Any key prefixed with `VITE_` compiles directly into public JavaScript.
2. File uploads MUST use server-side Presigned URLs minted by an authenticated Edge Function or Worker (`r2-presign`).
3. The client requests a presigned `PUT` URL, then uploads the binary Blob directly to the storage bucket without possessing master AWS/Cloudflare credentials.

### Bad
```tsx
// ❌ Exposing master S3 credentials in browser
const s3 = new S3Client({
  credentials: {
    accessKeyId: import.meta.env.VITE_R2_ACCESS_KEY,
    secretAccessKey: import.meta.env.VITE_R2_SECRET_KEY, // ← Compiled into public bundle!
  }
});
```

### Good
```tsx
// ✅ Request ephemeral presigned URL from Edge Function
const { data } = await supabase.functions.invoke('r2-presign', {
  body: { storagePath: `reports/${id}.pdf`, contentType: 'application/pdf' }
});
await fetch(data.uploadUrl, { method: 'PUT', body: pdfBlob });
```

### Self-Correction Rule
Search `src/` for `import.meta.env.VITE_*SECRET*`: if present, flag as **CRITICAL — Master credential exposure in client bundle**.

---

## Brute-Force Protection & Rate Limiting

### Constraint
Sensitive verification endpoints without multi-factor auth (e.g. Waiting Room Daily Security Codes, PIN codes, guest OTPs) MUST enforce rate limiting and temporary account/IP lockout.
A 6-digit numeric space ($10^6$ combinations) can be brute-forced in under 15 minutes without rate limiting.

### Bad
```sql
-- ❌ No attempt tracking or lockout
CREATE FUNCTION validate_code(p_code text) RETURNS boolean AS $$
BEGIN
    RETURN (SELECT code FROM daily_code) = p_code;
END;
$$;
```

### Good
```sql
-- ✅ Rate-limited with 15-minute lockout table
CREATE FUNCTION validate_code(p_code text) RETURNS boolean AS $$
DECLARE
    v_attempts int;
BEGIN
    SELECT count(*) INTO v_attempts FROM daily_code_attempts
    WHERE user_id = auth.uid() AND created_at > now() - interval '15 minutes';
    
    IF v_attempts >= 5 THEN
        RAISE EXCEPTION 'Too many attempts. Locked for 15 minutes.';
    END IF;
    -- validate and record attempt...
END;
$$;
```

### Self-Correction Rule
Audit all numeric or short-code verification functions: if no attempt tracking table or rate-limiter exists, flag as **HIGH — Brute-force vulnerability**.
