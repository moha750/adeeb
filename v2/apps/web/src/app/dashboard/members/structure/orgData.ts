import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";
import type { RawCouncil, RawDept, RawCommittee, RawRole, RawUserRole, RawProfile, RawSupervision } from "./model";

export type OrgData = {
  councils: RawCouncil[];
  departments: RawDept[];
  committees: RawCommittee[];
  roles: RawRole[];
  userRoles: RawUserRole[];
  profiles: RawProfile[];
  supervision: RawSupervision[];
  members: { id: string; name: string; avatar: string | null; gender: "male" | "female" | null }[]; // لمنتقي الإسناد (بأفتار) — النشطون بلا منصب
  error: string | null;
};

/** جلب هيكلة أديب كاملةً (خادميّ، عبر مفتاح الخدمة) — يُشارَك بين عارض الهيكلة وتبويب التعيينات. */
export async function getOrgData(): Promise<OrgData> {
  const empty = { councils: [], departments: [], committees: [], roles: [], userRoles: [], profiles: [], supervision: [], members: [] };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) {
    return { ...empty, error: "أضِف SUPABASE_SERVICE_ROLE_KEY إلى apps/web/.env.local ثمّ أعِد تشغيل الخادم." };
  }
  const sb = createAdeebServiceClient(url, key);

  const [c, d, com, r, ur, p, sup] = await Promise.all([
    sb.from("councils").select("id, name_ar, head_role_name, description, group_link"),
    sb.from("departments").select("id, name_ar, display_order, description, group_link").eq("is_active", true),
    sb.from("committees").select("id, committee_name_ar, department_id, council_id, leader_role_name, member_role_name, description, group_link").eq("is_active", true),
    sb.from("roles").select("id, role_name, role_name_ar, council_type, is_elected, membership_kind, vote_weight, holder_uniqueness, home_committee_id"),
    sb.from("user_roles").select("user_id, role_name, committee_id, department_id").eq("is_active", true),
    sb.from("profiles").select("id, full_name, avatar_url, gender, account_status"),
    // الإشراف جدولُه — لا صفوفُ المناصب. عضو الإدارة مُسنَدٌ إلى إدارته، وإشرافُه على
    // لجان التنفيذيّ علاقةٌ أخرى (20260731).
    sb.from("committee_supervision").select("committee_id, unit_id, supervisor_id"),
  ]);

  const error = c.error || d.error || com.error || r.error || ur.error || p.error || sup.error;
  if (error) return { ...empty, error: error.message };

  // بِركةُ الإسناد **النشطون وحدهم** — القاعدة تردّ ما سواهم (تريغر `enforce_assignment_status`:
  // المعلَّق يُضمّ إلى لجنةٍ عضوًا ولا يُسنَد منصبًا، والموقوف لا شيء). وكانت تعرض ١٨١ اسمًا
  // فيها ٢٠ قيد الإكمال و٢٨ موقوفًا — فيَعِد المنتقي بما تردّه القاعدة، وذاك أسوأ من ألّا يعرض.
  //
  // ولا تُطرح منها شاغلو المناصب: عضويّة اللجنة نفسها منصب (١٣٢ من ١٥٣ صفًّا نشطًا)، فطرحُهم
  // يُبقي اسمين من ١٣٣ ويُخفي كلّ من يُرقَّى. النقل يُقال في المنتقي لا يُحذف منه.
  //
  // ومن أراد **ضمّ** معلَّقٍ إلى لجنته فبِركتُه أوسع من هذه بحكم القاعدة — تُبنى في شاشتها
  // من `profiles` مباشرةً بحالتها، لا تُوسَّع هذه فتصير بِركةً واحدةً لقاعدتين.
  const members = (p.data ?? [])
    .filter((x) => x.full_name && x.account_status === "active")
    .map((x) => ({ id: x.id, name: x.full_name as string, avatar: x.avatar_url ?? null, gender: x.gender === "male" || x.gender === "female" ? x.gender : null }))
    .sort((a, b) => a.name.localeCompare(b.name, "ar"));

  return {
    councils: c.data ?? [],
    departments: d.data ?? [],
    committees: com.data ?? [],
    roles: r.data ?? [],
    userRoles: ur.data ?? [],
    profiles: p.data ?? [],
    supervision: sup.data ?? [],
    members,
    error: null,
  };
}
