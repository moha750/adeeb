# Supabase Admin Management — Edge Functions & SQL

This document stores the full reference for managing Admins via Supabase:

- SQL schema and RLS policies for `public.admins`
- Edge Functions code for:
  - `list-admins` — list admins with emails
  - `toggle-admin` — grant/revoke admin by user_id
  - `invite-admin` — send email invitation and grant admin by email
  - `set-admin-perms` — update an admin user's section permissions
  - `set-admin-level` — update an admin user's hierarchy level
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

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }
  if (req.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405, headers: cors });
  }

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { "Content-Type": "application/json", ...cors }
      });
    }

    // userClient للتحقق من هوية وصلاحية المستدعي تحت RLS
    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });
    // adminClient لتجاوز RLS في قراءة قائمة الإداريين
    const adminClient = createClient(url, service);

    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { "Content-Type": "application/json", ...cors }
      });
    }

    const { data: selfRow } = await userClient
      .from("admins")
      .select("user_id,is_admin")
      .eq("user_id", caller.id)
      .maybeSingle();

    if (!selfRow?.is_admin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { "Content-Type": "application/json", ...cors }
      });
    }

    // القراءة عبر Service Role لتجاوز سياسة RLS
    const { data: rows, error } = await adminClient
      .from("admins")
      .select("user_id, is_admin, created_at")
      .eq("is_admin", true)
      .order("created_at", { ascending: false });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { "Content-Type": "application/json", ...cors }
      });
    }

    // إلحاق البريد الإلكتروني لكل مستخدم عبر Admin API
    const result: Array<{ user_id: string; email?: string; is_admin: boolean; created_at: string; }> = [];
    for (const r of rows || []) {
      let email: string | undefined = undefined;
      try {
        const { data: u } = await adminClient.auth.admin.getUserById(r.user_id);
        email = u?.user?.email || undefined;
      } catch {}
      result.push({
        user_id: r.user_id,
        email,
        is_admin: r.is_admin,
        created_at: r.created_at
      });
    }

    return new Response(JSON.stringify(result), {
      status: 200, headers: { "Content-Type": "application/json", ...cors }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { "Content-Type": "application/json", ...cors }
    });
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
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
const ADMIN = {
  president: 1,
  vice: 2,
  manager: 3
};
function normalizeAr(s) {
  if (!s) return '';
  let t = String(s);
  t = t.replace(/[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED]/g, '').replace(/\u0640/g, '');
  t = t.replace(/[أإآ]/g, 'ا');
  t = t.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  return t;
}
function levelFromPositionAr(position) {
  const p = normalizeAr(position);
  if (p.includes('رئيس') && p.includes('اديب')) return ADMIN.president;
  if (p.includes('نائب') && p.includes('الرئيس')) return ADMIN.vice;
  return ADMIN.manager;
}
async function getEffectiveLevel(adminClient, userId) {
  const { data: u } = await adminClient.auth.admin.getUserById(userId);
  const mdLv = Number(u?.user?.user_metadata?.admin_level);
  let pos = null;
  try {
    const { data: row } = await adminClient.from("admins").select("position").eq("user_id", userId).maybeSingle();
    pos = row?.position || null;
  } catch  {}
  const posLv = levelFromPositionAr(pos);
  const eff = posLv === ADMIN.president || posLv === ADMIN.vice ? posLv : Number.isFinite(mdLv) ? mdLv : ADMIN.manager;
  if (u?.user && eff !== mdLv && (eff === ADMIN.president || eff === ADMIN.vice)) {
    await adminClient.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...u.user.user_metadata || {},
        admin_level: eff
      }
    });
  }
  return eff;
}
serve(async (req)=>{
  if (req.method === "OPTIONS") return new Response("ok", {
    headers: cors
  });
  if (req.method !== "POST") return new Response("Method Not Allowed", {
    status: 405,
    headers: cors
  });
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return new Response(JSON.stringify({
      error: "Unauthorized"
    }), {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
    const userClient = createClient(url, anon, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });
    const adminClient = createClient(url, service);
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) return new Response(JSON.stringify({
      error: "Unauthorized"
    }), {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
    const { data: adminRow } = await userClient.from("admins").select("user_id,is_admin").eq("user_id", caller.id).maybeSingle();
    if (!adminRow?.is_admin) return new Response(JSON.stringify({
      error: "Forbidden"
    }), {
      status: 403,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
    const body = await req.json();
    const user_id = String(body?.user_id || "");
    const make_admin = body?.make_admin === true;
    if (!user_id || typeof body?.make_admin !== "boolean") {
      return new Response(JSON.stringify({
        error: "Invalid payload"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...cors
        }
      });
    }
    const callerLv = await getEffectiveLevel(adminClient, caller.id);
    const targetLv = await getEffectiveLevel(adminClient, user_id);
    const isSelf = caller.id === user_id;
    if (isSelf) return new Response(JSON.stringify({
      error: "Cannot change own admin status"
    }), {
      status: 403,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
    if (make_admin) {
      if (callerLv !== ADMIN.president) {
        return new Response(JSON.stringify({
          error: "Only president can grant admin"
        }), {
          status: 403,
          headers: {
            "Content-Type": "application/json",
            ...cors
          }
        });
      }
    } else {
      if (targetLv === ADMIN.president) return new Response(JSON.stringify({
        error: "Cannot remove president"
      }), {
        status: 403,
        headers: {
          "Content-Type": "application/json",
          ...cors
        }
      });
      if (callerLv === ADMIN.manager) return new Response(JSON.stringify({
        error: "Insufficient role"
      }), {
        status: 403,
        headers: {
          "Content-Type": "application/json",
          ...cors
        }
      });
      if (callerLv === ADMIN.vice && targetLv !== ADMIN.manager) {
        return new Response(JSON.stringify({
          error: "Vice can only remove managers"
        }), {
          status: 403,
          headers: {
            "Content-Type": "application/json",
            ...cors
          }
        });
      }
    }
    const { error } = await adminClient.from("admins").upsert({
      user_id,
      is_admin: make_admin
    }).eq("user_id", user_id);
    if (error) return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
    return new Response(JSON.stringify({
      ok: true
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({
      error: String(e?.message || e)
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
  }
});
```

---

## 4) Edge Function: invite-admin

- Method: POST
- Body: `{ email: string, name?: string, position?: string, admin_level?: number, redirectTo?: string }`
- Auth: Bearer user access_token
- Checks caller is admin, then sends an email invitation, grants admin access, and sets initial `user_metadata` for the invited user (display name, position, role).

```ts
// supabase/functions/invite-admin/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const ADMIN = { president: 1, vice: 2, manager: 3 };

function normalizeAr(s?: string | null) {
  if (!s) return "";
  let t = String(s);
  t = t.replace(/[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED]/g, "").replace(/\u0640/g, "");
  t = t.replace(/[أإآ]/g, "ا");
  t = t.replace(/-/g, " ").replace(/\s+/g, " ").trim();
  return t;
}
function levelFromPositionAr(position?: string | null) {
  const p = normalizeAr(position);
  if (p.includes("رئيس") && p.includes("اديب")) return ADMIN.president;
  if (p.includes("نائب") && p.includes("الرئيس")) return ADMIN.vice;
  return ADMIN.manager;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: cors });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { "Content-Type": "application/json", ...cors }
      });
    }

    // تحقق من أن المستدعي إداري عبر RLS
    const userClient = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const admin = createClient(url, service);

    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { "Content-Type": "application/json", ...cors }
      });
    }
    const { data: selfRow } = await userClient
      .from("admins")
      .select("user_id,is_admin")
      .eq("user_id", caller.id)
      .maybeSingle();
    if (!selfRow?.is_admin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { "Content-Type": "application/json", ...cors }
      });
    }

    // حمولة الطلب
    const body = await req.json();
    const email = String(body?.email || "");
    const position = body?.position ?? null;
    const redirectTo = String(body?.redirectTo || "");
    let admin_level = Number(body?.admin_level);
    if (![1, 2, 3].includes(admin_level)) admin_level = levelFromPositionAr(position);
    if (!email || !redirectTo) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400, headers: { "Content-Type": "application/json", ...cors }
      });
    }

    // إرسال الدعوة
    const { data: invited, error: invErr } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: { position }
    });
    if (invErr) {
      return new Response(JSON.stringify({ error: invErr.message }), {
        status: 500, headers: { "Content-Type": "application/json", ...cors }
      });
    }

    const userId = invited?.user?.id;
    if (userId) {
      // تحديث ميتاداتا المستخدم
      const oldMeta = invited.user?.user_metadata || {};
      const newMeta = { ...oldMeta, position, role: "admin", admin_level };
      const { error: updErr } = await admin.auth.admin.updateUserById(userId, { user_metadata: newMeta });
      if (updErr) {
        return new Response(JSON.stringify({ error: updErr.message }), {
          status: 500, headers: { "Content-Type": "application/json", ...cors }
        });
      }

      // منح صلاحية إداري فعليًا في جدول admins (تجاوز RLS عبر Service Role)
      // محاولة مع عمود position ثم fallback بدونه إذا لم يكن موجودًا
      let upErr: any = null;
      let res = await admin.from("admins").upsert({ user_id: userId, is_admin: true, position }).eq("user_id", userId);
      if (res.error) {
        const res2 = await admin.from("admins").upsert({ user_id: userId, is_admin: true }).eq("user_id", userId);
        upErr = res2.error || null;
      }
      if (upErr) {
        return new Response(JSON.stringify({ error: upErr.message || "Failed to upsert admin row" }), {
          status: 500, headers: { "Content-Type": "application/json", ...cors }
        });
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { "Content-Type": "application/json", ...cors }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { "Content-Type": "application/json", ...cors }
    });
  }
});
```

---

## 5) Edge Function: set-admin-perms

- Method: POST
- Body: `{ user_id: string, perms: { works: boolean, sponsors: boolean, achievements: boolean, board: boolean, faq: boolean, blog: boolean, schedule: boolean, todos: boolean, admins: boolean } }`
- Auth: Bearer user access_token
- Logic: Caller must be an admin. Hierarchy rules enforced:
  - President (1) can edit others' permissions (not self). President target cannot be edited.
  - Vice (2) can edit only Managers (3), not self.
  - Manager (3) cannot edit anyone.
  - Managers can never have `admins: true`; the function forces it to `false`.

```ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
const ADMIN = {
  president: 1,
  vice: 2,
  manager: 3
};
const ALLOWED = [
  'works',
  'sponsors',
  'achievements',
  'board',
  'faq',
  'blog',
  'schedule',
  'todos',
  'admins'
];
function normalizeAr(s) {
  if (!s) return '';
  let t = String(s);
  t = t.replace(/[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED]/g, '').replace(/\u0640/g, '');
  t = t.replace(/[أإآ]/g, 'ا');
  t = t.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  return t;
}
function levelFromPositionAr(position) {
  const p = normalizeAr(position);
  if (p.includes('رئيس') && p.includes('اديب')) return ADMIN.president;
  if (p.includes('نائب') && p.includes('الرئيس')) return ADMIN.vice;
  return ADMIN.manager;
}
async function getEffectiveLevel(adminClient, userId) {
  const { data: u } = await adminClient.auth.admin.getUserById(userId);
  const mdLv = Number(u?.user?.user_metadata?.admin_level);
  let pos = null;
  try {
    const { data: row } = await adminClient.from("admins").select("position").eq("user_id", userId).maybeSingle();
    pos = row?.position || null;
  } catch  {}
  const posLv = levelFromPositionAr(pos);
  const eff = posLv === ADMIN.president || posLv === ADMIN.vice ? posLv : Number.isFinite(mdLv) ? mdLv : ADMIN.manager;
  if (u?.user && eff !== mdLv && (eff === ADMIN.president || eff === ADMIN.vice)) {
    await adminClient.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...u.user.user_metadata || {},
        admin_level: eff
      }
    });
  }
  return eff;
}
function sanitizePerms(obj) {
  const o = {};
  for (const k of ALLOWED)o[k] = !!obj?.[k];
  return o;
}
serve(async (req)=>{
  if (req.method === "OPTIONS") return new Response("ok", {
    headers: cors
  });
  if (req.method !== "POST") return new Response("Method Not Allowed", {
    status: 405,
    headers: cors
  });
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return new Response(JSON.stringify({
      error: "Unauthorized"
    }), {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
    const userClient = createClient(url, anon, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });
    const adminClient = createClient(url, service);
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) return new Response(JSON.stringify({
      error: "Unauthorized"
    }), {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
    const { data: adminRow } = await userClient.from("admins").select("user_id,is_admin").eq("user_id", caller.id).maybeSingle();
    if (!adminRow?.is_admin) return new Response(JSON.stringify({
      error: "Forbidden"
    }), {
      status: 403,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
    const body = await req.json();
    const user_id = String(body?.user_id || "");
    const rawPerms = body?.perms;
    if (!user_id || typeof rawPerms !== "object") {
      return new Response(JSON.stringify({
        error: "Invalid payload"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...cors
        }
      });
    }
    const perms = sanitizePerms(rawPerms);
    const callerLevel = await getEffectiveLevel(adminClient, caller.id);
    const targetLevel = await getEffectiveLevel(adminClient, user_id);
    const isSelf = caller.id === user_id;
    if (targetLevel === ADMIN.president) return new Response(JSON.stringify({
      error: "Cannot manage president"
    }), {
      status: 403,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
    if (callerLevel === ADMIN.manager) return new Response(JSON.stringify({
      error: "Insufficient role"
    }), {
      status: 403,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
    if (callerLevel === ADMIN.vice && (isSelf || targetLevel !== ADMIN.manager)) {
      return new Response(JSON.stringify({
        error: "Vice can only manage managers"
      }), {
        status: 403,
        headers: {
          "Content-Type": "application/json",
          ...cors
        }
      });
    }
    if (callerLevel === ADMIN.president && isSelf) {
      return new Response(JSON.stringify({
        error: "President cannot change own perms"
      }), {
        status: 403,
        headers: {
          "Content-Type": "application/json",
          ...cors
        }
      });
    }
    if (targetLevel === ADMIN.manager) perms.admins = false;
    const { data: tgt } = await adminClient.auth.admin.getUserById(user_id);
    if (!tgt?.user) return new Response(JSON.stringify({
      error: "Target not found"
    }), {
      status: 404,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
    const newMeta = {
      ...tgt.user.user_metadata || {},
      admin_perms: perms
    };
    const { error: updErr } = await adminClient.auth.admin.updateUserById(user_id, {
      user_metadata: newMeta
    });
    if (updErr) return new Response(JSON.stringify({
      error: updErr.message
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
    return new Response(JSON.stringify({
      ok: true
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({
      error: String(e?.message || e)
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
  }
});
```

---

## 6) Edge Function: set-admin-level

- Method: POST
- Body: `{ user_id: string, admin_level: 2 | 3 }`
- Auth: Bearer user access_token
- Logic: Only President (1) can set levels for others (not self). President target cannot be modified. Level 1 (President) cannot be set via this function.

```ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
const ADMIN = {
  president: 1,
  vice: 2,
  manager: 3
};
serve(async (req)=>{
  if (req.method === "OPTIONS") return new Response("ok", {
    headers: cors
  });
  if (req.method !== "POST") return new Response("Method Not Allowed", {
    status: 405,
    headers: cors
  });
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return new Response(JSON.stringify({
      error: "Unauthorized"
    }), {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
    const userClient = createClient(url, anon, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });
    const adminClient = createClient(url, service);
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) return new Response(JSON.stringify({
      error: "Unauthorized"
    }), {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
    const { data: adminRow } = await userClient.from("admins").select("user_id,is_admin").eq("user_id", caller.id).maybeSingle();
    if (!adminRow?.is_admin) return new Response(JSON.stringify({
      error: "Forbidden"
    }), {
      status: 403,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
    const body = await req.json();
    const user_id = String(body?.user_id || "");
    const newLevel = Number(body?.admin_level);
    if (!user_id || ![
      ADMIN.vice,
      ADMIN.manager
    ].includes(newLevel)) {
      return new Response(JSON.stringify({
        error: "Invalid level"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...cors
        }
      });
    }
    const callerLevel = Number(caller.user_metadata?.admin_level ?? ADMIN.manager);
    if (callerLevel !== ADMIN.president) return new Response(JSON.stringify({
      error: "Only president can change levels"
    }), {
      status: 403,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
    if (caller.id === user_id) return new Response(JSON.stringify({
      error: "Cannot change own level"
    }), {
      status: 403,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
    const { data: tgt } = await adminClient.auth.admin.getUserById(user_id);
    if (!tgt?.user) return new Response(JSON.stringify({
      error: "Target not found"
    }), {
      status: 404,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
    const targetLv = Number(tgt.user.user_metadata?.admin_level ?? ADMIN.manager);
    if (targetLv === ADMIN.president) return new Response(JSON.stringify({
      error: "Cannot change president level"
    }), {
      status: 403,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
    const meta = {
      ...tgt.user.user_metadata || {},
      admin_level: newLevel
    };
    const { error: updErr } = await adminClient.auth.admin.updateUserById(user_id, {
      user_metadata: meta
    });
    if (updErr) return new Response(JSON.stringify({
      error: updErr.message
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
    return new Response(JSON.stringify({
      ok: true
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({
      error: String(e?.message || e)
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...cors
      }
    });
  }
});
```

---

## 7) Deployment notes

- Variables to set for each function in Supabase Dashboard → Edge Functions → Settings:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `FRONTEND_URL` (e.g. `https://www.adeeb.club`)
- CORS is enabled with `Access-Control-Allow-Origin: *`.
- Frontend calls functions using the user access token via `Authorization: Bearer <token>`.

## 8) Frontend integration

- `admin/admin.js` defines:
  - `FUNCTIONS_BASE = SUPABASE_URL.replace('.supabase.co', '.functions.supabase.co')`
  - `callFunction(name, { method, body })`
  - `fetchAdmins()`, `renderAdmins()` and click handlers for add/remove.
  - `showAdminDetails()` uses `set-admin-perms` (save section permissions) and `set-admin-level` (change hierarchy level for Vice/Manager).
- `admin/admin.html` contains `#section-admins` UI.
- Make sure `supabase-config.js` exposes `window.SUPABASE_URL`.

---

## 9) Troubleshooting

- 403 Forbidden from functions: ensure caller is already inserted in `public.admins` with `is_admin = true`.
- 401 Unauthorized: ensure you pass `Authorization: Bearer <access_token>` and that a session exists in the browser.
- Table not found errors: confirm table `public.admins` exists and RLS is enabled with the read policy above.
