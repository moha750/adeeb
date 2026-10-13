import "server-only";
import type { createAdeebServiceClient } from "@adeeb/core";
import { positionLine, rankFor } from "@/lib/positionLabel";

/** مرشّحُ التكليف بموضعه الأصيل (20261010) — يُسمّى به خيارا «استمرار منصبه» و«تجميده» في النافذة. */
export type ActingCandidate = { id: string; name: string; avatar: string | null; gender: "male" | "female" | null; held: string | null };

type Service = NonNullable<ReturnType<typeof createAdeebServiceClient>>;

/**
 * يصف قائمةَ أعضاءٍ للتكليف: اسمٌ وأفتار وجنس، وموضعُه **الأصيل** بجنسه («نائبة قائد لجنة التصوير»).
 * مصدرٌ واحد لنافذتَي التكليف: «تعيين المناصب» (بِركة `actable_members`) و«تكليف شاغل» في الانتخابات
 * (أعضاء نطاق المقعد). والتكليفُ القائم لا يُعدّ موضعًا: الموضعُ صفٌّ حيٌّ ليس تكليفًا.
 */
export async function describeCandidates(sb: Service, ids: string[]): Promise<{ members: ActingCandidate[]; error: string | null }> {
  if (ids.length === 0) return { members: [], error: null };
  const [people, seats, roles, coms, depts] = await Promise.all([
    sb.from("members").select("id, full_name, avatar_url, gender").in("id", ids),
    sb.from("user_roles").select("user_id, role_name, committee_id, department_id").in("user_id", ids).eq("is_active", true).eq("is_acting", false),
    sb.from("roles").select("role_name, role_name_ar"),
    sb.from("committees").select("id, committee_name_ar"),
    sb.from("departments").select("id, name_ar"),
  ]);
  const error = people.error || seats.error || roles.error || coms.error || depts.error;
  if (error) return { members: [], error: error.message };

  const roleAr = new Map((roles.data ?? []).map((r) => [r.role_name, r.role_name_ar || r.role_name]));
  const comAr = new Map((coms.data ?? []).map((c) => [c.id, c.committee_name_ar]));
  const deptAr = new Map((depts.data ?? []).map((d) => [d.id, d.name_ar]));
  const genderOf = new Map((people.data ?? []).map((x) => [x.id, x.gender]));
  const held = new Map((seats.data ?? []).map((u) => [u.user_id, positionLine(
    rankFor(roleAr.get(u.role_name) ?? u.role_name, genderOf.get(u.user_id)),
    u.committee_id != null ? comAr.get(u.committee_id) ?? null : u.department_id != null ? deptAr.get(u.department_id) ?? null : null,
  )]));

  const members = (people.data ?? [])
    .filter((x) => x.full_name)
    .map((x) => ({
      id: x.id as string,
      name: x.full_name as string,
      avatar: x.avatar_url ?? null,
      gender: x.gender === "male" || x.gender === "female" ? x.gender : null,
      held: held.get(x.id) ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "ar"));
  return { members, error: null };
}
