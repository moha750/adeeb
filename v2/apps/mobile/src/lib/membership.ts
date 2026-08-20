import { fmtDate, fmtDateOnly } from "@adeeb/core/dates";
import { MEMBER_STATUS, MEMBER_STATUS_OF, type MemberStatus } from "@adeeb/core/member-status";
import { membershipDuration } from "@adeeb/core/membership";
import { positionLine, positionParts } from "@adeeb/core/position-label";
import { roleRank } from "@adeeb/core/role-order";

import { supabase } from "./supabase";

/**
 * عضويّةُ صاحب الجلسة في التطبيق.
 *
 * **وتُقرأ بجلسته لا بمفتاح خدمة.** الويبُ يقرأ هذه الغرفةَ بمفتاح الخدمة لأنّه يقرؤها
 * لغير صاحبها أيضًا؛ والتطبيقُ لا يقرأ إلّا نفسَه، وقد فُحصت الحرّاسُ في القاعدة
 * (٢٠٢٦-٠٨-٢٠) فإذا أوّلُ شرطٍ في كلٍّ منها `p_actor = p_target`:
 *   · `profiles_select` — صفُّه هو.
 *   · `user_roles_select_own` — تعييناتُه هو.
 *   · `can_view_warnings_of` و`can_view_certificate_of` — «لكلٍّ إنذاراتُ وشهاداتُ نفسه».
 * فلا طبقةَ واجهةٍ جديدة، ولا سرَّ يُحمَل في جهاز.
 *
 * وحسابُ المدّة وتركيبُ الجملة والرتبةُ ومفرداتُ الحالة كلُّها من النواة، فما يقرؤه العضوُ
 * ههنا هو نفسُه حرفًا بحرفٍ ما يقرؤه في اللوحة.
 */

export type JourneyStop = {
  key: string;
  kind: "join" | "role";
  title: string;
  scope: string | null;
  date: string;
  at: number;
  current: boolean;
};

export type Membership = {
  name: string;
  avatar: string | null;
  gender: "male" | "female" | null;
  status: MemberStatus;
  statusLabel: string;
  role: string | null;
  joined: string;
  duration: string;
  journey: JourneyStop[];
  warnings: { id: string; ordinal: number; category: string; reason: string; date: string }[];
  warningLimit: number;
  certificates: {
    id: string;
    serial: string;
    holderName: string;
    positionTitle: string;
    periodFrom: string;
    periodTo: string;
    date: string;
  }[];
};

type Assignment = {
  role_name: string;
  department_id: number | null;
  committee_id: number | null;
  assigned_at: string | null;
  is_active: boolean | null;
};

export async function getMyMembership(): Promise<{ data: Membership | null; error: string | null }> {
  const { data: sess } = await supabase.auth.getSession();
  const uid = sess.session?.user?.id;
  if (!uid) return { data: null, error: null };

  const [pRes, urRes, rRes, dRes, cRes, coRes, wRes, wlRes, certRes] = await Promise.all([
    supabase.from("profiles").select("full_name, avatar_url, gender, account_status, joined_date").eq("id", uid).maybeSingle(),
    supabase.from("user_roles").select("role_name, department_id, committee_id, assigned_at, is_active").eq("user_id", uid),
    supabase.from("roles").select("role_name, role_name_ar, council_type"),
    supabase.from("departments").select("id, name_ar"),
    supabase.from("committees").select("id, committee_name_ar"),
    supabase.from("councils").select("id, name_ar"),
    supabase.from("member_warnings").select("id, category, reason, created_at").eq("user_id", uid).eq("status", "active").order("created_at"),
    supabase.rpc("warning_limit"),
    supabase
      .from("experience_certificates")
      .select("id, serial, holder_name, position_title, period_from, period_to, created_at")
      .eq("user_id", uid)
      .eq("status", "valid")
      .order("created_at", { ascending: false }),
  ]);

  const err = pRes.error || urRes.error || rRes.error || dRes.error || cRes.error || coRes.error || wRes.error || certRes.error;
  if (err) return { data: null, error: err.message };
  const p = pRes.data as {
    full_name: string | null;
    avatar_url: string | null;
    gender: string | null;
    account_status: string;
    joined_date: string | null;
  } | null;
  if (!p) return { data: null, error: "لا سجلّ لحسابك في الأعضاء." };

  const roleAr = new Map((rRes.data ?? []).map((r) => [r.role_name as string, (r.role_name_ar as string | null) ?? (r.role_name as string)]));
  const roleCouncil = new Map((rRes.data ?? []).map((r) => [r.role_name as string, r.council_type as string | null]));
  const councilName = new Map((coRes.data ?? []).map((c) => [c.id as string, c.name_ar as string | null]));
  const deptName = new Map((dRes.data ?? []).map((d) => [d.id as number, d.name_ar as string | null]));
  const committeeName = new Map((cRes.data ?? []).map((c) => [c.id as number, c.committee_name_ar as string | null]));

  const assignments = (urRes.data ?? []) as Assignment[];

  // منصبٌ واحدٌ لا صفوفٌ عدّة: من أُسنِد باللحظة نفسها إلى أكثرَ من وحدةٍ تُجمَع صفوفُه محطّةً
  // واحدةً نطاقُها وحداتُها كلُّها — وهي قسمةُ اللوحة نفسُها لا قسمةٌ ثانية.
  const groups = new Map<string, { roleName: string; at: string | null; active: boolean; items: Assignment[] }>();
  for (const a of assignments) {
    const k = `${a.role_name}|${a.assigned_at ?? ""}|${a.is_active ? "1" : "0"}`;
    const g = groups.get(k);
    if (g) g.items.push(a);
    else groups.set(k, { roleName: a.role_name, at: a.assigned_at, active: !!a.is_active, items: [a] });
  }

  const unitOf = (a: Assignment): string | null =>
    a.committee_id != null
      ? committeeName.get(a.committee_id) ?? null
      : a.department_id != null
        ? deptName.get(a.department_id) ?? null
        : null;
  const councilOf = (roleName: string): string | null => {
    const c = roleCouncil.get(roleName);
    return c ? councilName.get(c) ?? null : null;
  };

  const groupList = [...groups.values()];
  const current = groupList.filter((g) => g.active).sort((a, b) => roleRank(a.roleName) - roleRank(b.roleName))[0] ?? null;
  const curUnits = current ? [...new Set(current.items.map(unitOf).filter(Boolean) as string[])] : [];
  const currentUnit = curUnits.length === 1 ? curUnits[0] : null;

  const journey: JourneyStop[] = [
    ...(p.joined_date
      ? [{
          key: "join",
          kind: "join" as const,
          title: "انضمامك إلى أديب",
          scope: null,
          date: fmtDateOnly(p.joined_date),
          at: Date.parse(`${p.joined_date}T00:00:00Z`),
          current: false,
        }]
      : []),
    ...groupList.map((g, i) => {
      const units = [...new Set(g.items.map(unitOf).filter(Boolean) as string[])];
      const title = roleAr.get(g.roleName) ?? g.roleName;
      const rawScope = units.length ? units.join("، ") : councilOf(g.roleName);
      return {
        key: `role-${i}`,
        kind: "role" as const,
        ...positionParts(title, rawScope),
        date: fmtDate(g.at),
        at: Date.parse(g.at ?? "") || 0,
        current: g.active,
      };
    }),
  ].sort((a, b) => a.at - b.at);

  const status = MEMBER_STATUS_OF[p.account_status] ?? "inactive";

  return {
    data: {
      name: p.full_name ?? "",
      avatar: p.avatar_url ?? null,
      gender: p.gender === "male" || p.gender === "female" ? p.gender : null,
      status,
      statusLabel: MEMBER_STATUS[status].label,
      role: current ? positionLine(roleAr.get(current.roleName) ?? current.roleName, currentUnit) : null,
      joined: fmtDateOnly(p.joined_date),
      duration: membershipDuration(p.joined_date, Date.now()),
      journey,
      warnings: ((wRes.data ?? []) as { id: string; category: string; reason: string; created_at: string }[]).map((w, i) => ({
        id: w.id,
        ordinal: i + 1,
        category: w.category,
        reason: w.reason,
        date: fmtDate(w.created_at),
      })),
      warningLimit: typeof wlRes.data === "number" ? wlRes.data : 3,
      certificates: ((certRes.data ?? []) as {
        id: string; serial: string; holder_name: string; position_title: string;
        period_from: string; period_to: string; created_at: string;
      }[]).map((c) => ({
        id: c.id,
        serial: c.serial,
        holderName: c.holder_name,
        positionTitle: c.position_title,
        periodFrom: fmtDateOnly(c.period_from),
        periodTo: fmtDateOnly(c.period_to),
        date: fmtDate(c.created_at),
      })),
    },
    error: null,
  };
}
