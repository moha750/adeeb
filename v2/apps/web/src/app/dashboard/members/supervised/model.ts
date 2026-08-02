// نموذج «من أشرف عليهم» — نقيّ، بلا استيراد خادميّ.
//
// **الشاشة تُبنى على الإشراف لا على السلطة.** كانت صفوفُها مرشَّحةً بـ`canEnd` وحدها — جوابِ
// `members_in_my_reach` — فكانت تجيب عن سؤالٍ آخر: «من أملك عليه سلطة» لا «من أشرف عليه».
// ومشرف الضمان بلا سلطةٍ أصلًا فكانت شاشتُه ستُولد فارغة.
//
// (وقائد اللجنة ونائبها كانا يومَها **خارج** السلطة، ثمّ صحّح المالك ذلك في 20260802: الإشراف
//  يشمل من في اللجنة كلَّهم — قائدًا ونائبًا وعضوًا — إنذارًا وإنهاءً. والبناءُ على الإشراف يبقى
//  هو الصواب: السؤالان مختلفان وإن تقاربت إجابتهما اليوم.)
//
// فالإشراف يُقرأ من مصدره الواحد `committee_supervision` (20260731)، والسلطة تبقى طبقةً
// **فوقه** تحكم الأفعال وحدها — عرضٌ فوق منعٍ لا بدلًا منه.
import type { Holder, RawCommittee, RawDept, RawProfile, RawRole, RawSupervision, RawUserRole } from "../structure/model";
import { roleTitle } from "@/lib/positionLabel";

/** وحدة المشرف — إدارتُه في المجلس الإداريّ (انتماؤه، لا لجانه). */
export type MyUnit = { id: number; name: string };

/** لجنةٌ تنفيذيّة يشرف عليها صاحبُ الجلسة، بكلّ ما يلزمه معرفتُه عنها. */
export type MyCommittee = {
  id: number;
  name: string;
  dept: string | null;
  desc: string | null;
  link: string | null;
  leader: Holder | null;
  deputy: Holder | null;
  /** مشرف الإدارة الأخرى على اللجنة نفسها — نظيرٌ لا تابع (لكلّ لجنةٍ مشرفان مستقلّان). */
  peer: { unitName: string; holder: Holder | null } | null;
  /** أعضاء اللجنة العاديّون — عددًا وأفتارًا (لا سجلًّا؛ السجلّ في الجدول). */
  members: Holder[];
};

const asGender = (g: string | null | undefined): "male" | "female" | null =>
  g === "male" ? "male" : g === "female" ? "female" : null;

const R = { deputy: "deputy_committee_leader" } as const;

/** دورُ عضو الإدارة كما تُصرّح به هي — لا اسمٌ محفور. */
const unitOwnerRole = (c: RawCommittee | undefined): string => c?.member_role_name ?? "";

/**
 * لجان صاحب الجلسة — من `committee_supervision` وحدها، مرتّبةً بمعرّف اللجنة.
 *
 * وإدارتُه من انتمائه (صفُّه على لجنةٍ إداريّة) لا من إشرافه: فمن ضُمّ ولم يُوزَّع بعد
 * تُعرَف إدارتُه ويُقال له «لا لجان بعد» — بدل أن يُظنّ أنّه ليس من الإدارة أصلًا.
 */
export function myCommittees(
  actorId: string,
  committees: RawCommittee[],
  departments: RawDept[],
  roles: RawRole[],
  userRoles: RawUserRole[],
  supervision: RawSupervision[],
  profiles: RawProfile[],
): { unit: MyUnit | null; list: MyCommittee[] } {
  const comById = new Map(committees.map((c) => [c.id, c]));
  const deptName = new Map(departments.map((d) => [d.id, d.name_ar ?? `قسم #${d.id}`]));
  const profile = new Map(profiles.map((p) => [p.id, p]));
  const roleByName = new Map(roles.map((r) => [r.role_name, r]));

  const titleOf = (roleName: string): string => {
    const r = roleByName.get(roleName);
    if (!r) return roleName;
    const home = r.home_committee_id != null ? comById.get(r.home_committee_id)?.committee_name_ar ?? null : null;
    return roleTitle({ roleAr: r.role_name_ar ?? r.role_name, homeCommitteeId: r.home_committee_id, homeName: home });
  };

  const holderOf = (userId: string, roleName: string, committeeId: number | null): Holder => {
    const p = profile.get(userId);
    return {
      userId,
      name: p?.full_name ?? "عضو غير معروف",
      avatar: p?.avatar_url ?? null,
      gender: asGender(p?.gender),
      roleName,
      roleAr: titleOf(roleName),
      committeeId,
      departmentId: null,
    };
  };

  // الإدارة من الانتماء: صفٌّ حيّ على لجنةٍ مجلسُها إداريّ
  let unit: MyUnit | null = null;
  for (const ur of userRoles) {
    if (ur.user_id !== actorId || ur.committee_id == null) continue;
    const c = comById.get(ur.committee_id);
    if (!c || c.council_id !== "administrative") continue;
    unit = { id: c.id, name: c.committee_name_ar ?? `وحدة #${c.id}` };
    break;
  }

  // اسمُ الإدارة الأخرى (لتسمية النظير) — مقروءٌ من الجدول لا محفورًا
  const unitName = new Map(
    committees.filter((c) => c.council_id === "administrative").map((c) => [c.id, c.committee_name_ar ?? `وحدة #${c.id}`]),
  );

  const mine = supervision.filter((s) => s.supervisor_id === actorId);

  const list = mine
    .map((s) => comById.get(s.committee_id))
    .filter((c): c is RawCommittee => !!c)
    .sort((a, b) => a.id - b.id)
    .map((c): MyCommittee => {
      const inside = userRoles.filter((ur) => ur.committee_id === c.id);
      const leaderRow = inside.find((ur) => ur.role_name === c.leader_role_name);
      const deputyRow = inside.find((ur) => ur.role_name === R.deputy);
      // النظير: مشرفُ الإدارة الأخرى على هذه اللجنة — المقعد يُذكر ولو شغَر (خلوّه خبر)
      const otherUnitId = [...unitName.keys()].find((id) => id !== unit?.id) ?? null;
      const peerRow = otherUnitId == null ? null : supervision.find((x) => x.committee_id === c.id && x.unit_id === otherUnitId);
      return {
        id: c.id,
        name: c.committee_name_ar ?? `لجنة #${c.id}`,
        dept: c.department_id != null ? deptName.get(c.department_id) ?? null : null,
        desc: c.description ?? null,
        link: c.group_link ?? null,
        leader: leaderRow ? holderOf(leaderRow.user_id, leaderRow.role_name, c.id) : null,
        deputy: deputyRow ? holderOf(deputyRow.user_id, deputyRow.role_name, c.id) : null,
        peer:
          otherUnitId == null
            ? null
            : {
                unitName: unitName.get(otherUnitId) ?? `وحدة #${otherUnitId}`,
                holder: peerRow ? holderOf(peerRow.supervisor_id, unitOwnerRole(comById.get(otherUnitId)), c.id) : null,
              },
        members: inside
          .filter((ur) => ur.role_name === c.member_role_name)
          .map((ur) => holderOf(ur.user_id, ur.role_name, c.id)),
      };
    });

  return { unit, list };
}

/** «٣ لجان» لا «3 لجنة» — التمييز العربيّ (مصدرٌ واحد يشاركه كرت المشرف). */
export function committeesLabel(n: number): string {
  if (n === 0) return "بلا لجان";
  if (n === 1) return "لجنة واحدة";
  if (n === 2) return "لجنتان";
  if (n <= 10) return `${n} لجان`;
  return `${n} لجنة`;
}

/** «٣٦ عضوًا» — التمييز نفسه للأعضاء. */
export function membersLabel(n: number): string {
  if (n === 0) return "بلا أعضاء";
  if (n === 1) return "عضوٌ واحد";
  if (n === 2) return "عضوان";
  if (n <= 10) return `${n} أعضاء`;
  return `${n} عضوًا`;
}
