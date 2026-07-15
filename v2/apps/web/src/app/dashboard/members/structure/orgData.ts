import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";
import type { RawCouncil, RawDept, RawCommittee, RawRole, RawUserRole, RawProfile } from "./model";

export type OrgData = {
  councils: RawCouncil[];
  departments: RawDept[];
  committees: RawCommittee[];
  roles: RawRole[];
  userRoles: RawUserRole[];
  profiles: RawProfile[];
  members: { id: string; name: string }[]; // لمنتقي الإسناد
  error: string | null;
};

/** جلب هيكلة أديب كاملةً (خادميّ، عبر مفتاح الخدمة) — يُشارَك بين عارض الهيكلة وتبويب التعيينات. */
export async function getOrgData(): Promise<OrgData> {
  const empty = { councils: [], departments: [], committees: [], roles: [], userRoles: [], profiles: [], members: [] };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) {
    return { ...empty, error: "أضِف SUPABASE_SERVICE_ROLE_KEY إلى apps/web/.env.local ثمّ أعِد تشغيل الخادم." };
  }
  const sb = createAdeebServiceClient(url, key);

  const [c, d, com, r, ur, p] = await Promise.all([
    sb.from("councils").select("id, name_ar, description, group_link"),
    sb.from("departments").select("id, name_ar, display_order, description, group_link").eq("is_active", true),
    sb.from("committees").select("id, committee_name_ar, department_id, council_id, leader_role_name, description, group_link").eq("is_active", true),
    sb.from("roles").select("id, role_name, role_name_ar, role_level, council_type, is_elected"),
    sb.from("user_roles").select("user_id, role_id, committee_id, department_id").eq("is_active", true),
    sb.from("profiles").select("id, full_name, avatar_url"),
  ]);

  const error = c.error || d.error || com.error || r.error || ur.error || p.error;
  if (error) return { ...empty, error: error.message };

  const members = (p.data ?? [])
    .filter((x) => x.full_name)
    .map((x) => ({ id: x.id, name: x.full_name as string }))
    .sort((a, b) => a.name.localeCompare(b.name, "ar"));

  return {
    councils: c.data ?? [],
    departments: d.data ?? [],
    committees: com.data ?? [],
    roles: r.data ?? [],
    userRoles: ur.data ?? [],
    profiles: p.data ?? [],
    members,
    error: null,
  };
}
