# Supabase Admin Management — Edge Functions & SQL

This document stores the full reference for managing Admins via Supabase:

- SQL schema and RLS policies for `public.admins`
- Edge Functions code for:
  - `list-admins` — list admins with emails
  - `toggle-admin` — grant/revoke admin by user_id
  - `invite-admin` — send email invitation and grant admin by email
- Deployment notes

Keep this file for future updates.

---

## 1) SQL: Admins table + RLS

```sql
-- Admins table: who can access Admin Dashboard
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_admin boolean not null default true,
  created_at timestamp with time zone not null default now()
);

-- Enable RLS
alter table public.admins enable row level security;

-- Read-own policy: users can read only their own admin row
-- Used by the frontend to verify access safely under RLS
drop policy if exists "Read own admin row" on public.admins;
create policy "Read own admin row"
on public.admins for select
  to authenticated
  using (user_id = auth.uid());

-- Block direct writes from frontend (all writes go through Edge Functions using Service Role)
drop policy if exists "No direct writes" on public.admins;
create policy "No direct writes"
on public.admins for all
  to authenticated
  using (false)
  with check (false);
```

Seed first admin (manual, one-time):
```sql
insert into public.admins (user_id, is_admin)
values ('<FIRST_ADMIN_UUID>', true)
on conflict (user_id) do update set is_admin = excluded.is_admin;
```

---

## 2) Edge Function: list-admins

- Method: GET
- Auth: Bearer user access_token
- Checks caller is admin, then returns array of `{ user_id, email, is_admin, created_at }`.

```ts
// supabase/functions/list-admins/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const frontendUrl = Deno.env.get("FRONTEND_URL") || "https://www.adeeb.club";

    const authHeader = req.headers.get("Authorization") ?? "";
    const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!accessToken) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${accessToken}` } } });
    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });

    const { data: adminRow, error: adminErr } = await userClient.from("admins").select("user_id,is_admin").eq("user_id", caller.id).maybeSingle();
    if (adminErr || !adminRow || adminRow.is_admin !== true) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const { data: rows, error: listErr } = await adminClient
      .from("admins").select("user_id, is_admin, created_at").eq("is_admin", true).order("created_at", { ascending: false });
    if (listErr) return new Response(JSON.stringify({ error: listErr.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });

    const result: Array<{ user_id: string; email: string | null; is_admin: boolean; created_at: string } > = [];
    for (const r of rows ?? []) {
      try {
        const { data: userData } = await adminClient.auth.admin.getUserById(r.user_id);
        result.push({ user_id: r.user_id, email: userData?.user?.email ?? null, is_admin: r.is_admin, created_at: r.created_at });
      } catch {
        result.push({ user_id: r.user_id, email: null, is_admin: r.is_admin, created_at: r.created_at });
      }
    }

    return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err?.message || err) }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
```

---

## 3) Edge Function: toggle-admin

- Method: POST
- Body: `{ user_id: string, make_admin: boolean }`
- Auth: Bearer user access_token
- Checks caller is admin, then upserts into `public.admins`.

```ts
// supabase/functions/toggle-admin/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!accessToken) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${accessToken}` } } });
    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });

    const { data: adminRow } = await userClient.from("admins").select("user_id, is_admin").eq("user_id", caller.id).maybeSingle();
    if (!adminRow || adminRow.is_admin !== true) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const body = await req.json();
    const { user_id, make_admin } = body || {};
    if (!user_id || typeof make_admin !== "boolean") {
      return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const { error } = await adminClient.from("admins").upsert({ user_id, is_admin: make_admin }).eq("user_id", user_id);
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err?.message || err) }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
```

---

## 4) Edge Function: invite-admin

- Method: POST
- Body: `{ email: string }`
- Auth: Bearer user access_token
- Checks caller is admin, then sends an email invitation and ensures `public.admins` has `is_admin=true` for that user.

```ts
// supabase/functions/invite-admin/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!accessToken) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${accessToken}` } } });
    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });

    const { data: adminRow } = await userClient.from("admins").select("user_id, is_admin").eq("user_id", caller.id).maybeSingle();
    if (!adminRow || adminRow.is_admin !== true) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "Invalid email" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Try to send an invitation email. This creates the user if not exists (requires SMTP configured).
    let invitedUserId: string | null = null;
    let invitationSent = false;
    try {
      const { data: inviteRes, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${frontendUrl}/admin/onboarding.html`
      });
      if (inviteErr) throw inviteErr;
      invitedUserId = inviteRes?.user?.id ?? null;
      invitationSent = true;
    } catch (inviteError) {
      // Fallback: generate a magic link and send via anon client for existing users
      const { data: gen, error: genErr } = await adminClient.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: { redirectTo: `${frontendUrl}/admin/onboarding.html` }
      });
      if (genErr) return new Response(JSON.stringify({ error: genErr.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
      invitedUserId = gen?.user?.id ?? null;
      // Send the magic link email using anon client (server-side) so the user still receives an email
      const anonClient = createClient(supabaseUrl, anonKey);
      const { error: otpErr } = await anonClient.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${frontendUrl}/admin/onboarding.html` }
      });
      if (otpErr) return new Response(JSON.stringify({ error: otpErr.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
      invitationSent = true;
    }

    // Ensure admin role is granted
    if (!invitedUserId) return new Response(JSON.stringify({ error: "Could not determine user id" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    const { error: upErr } = await adminClient.from("admins").upsert({ user_id: invitedUserId, is_admin: true }).eq("user_id", invitedUserId);
    if (upErr) return new Response(JSON.stringify({ error: upErr.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });

    return new Response(
      JSON.stringify({ ok: true, user_id: invitedUserId, email, invitation_sent: invitationSent }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err?.message || err) }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
```

---

## 5) Deployment notes

- Variables to set for each function in Supabase Dashboard → Edge Functions → Settings:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `FRONTEND_URL` (e.g. `https://www.adeeb.club`)
- CORS is enabled with `Access-Control-Allow-Origin: *`.
- Frontend calls functions using the user access token via `Authorization: Bearer <token>`.

## 6) Frontend integration

- `admin/admin.js` defines:
  - `FUNCTIONS_BASE = SUPABASE_URL.replace('.supabase.co', '.functions.supabase.co')`
  - `callFunction(name, { method, body })`
  - `fetchAdmins()`, `renderAdmins()` and click handlers for add/remove.
- `admin/admin.html` contains `#section-admins` UI.
- Make sure `supabase-config.js` exposes `window.SUPABASE_URL`.

---

## 7) Troubleshooting

- 403 Forbidden from functions: ensure caller is already inserted in `public.admins` with `is_admin = true`.
- 401 Unauthorized: ensure you pass `Authorization: Bearer <access_token>` and that a session exists in the browser.
- Table not found errors: confirm table `public.admins` exists and RLS is enabled with the read policy above.
