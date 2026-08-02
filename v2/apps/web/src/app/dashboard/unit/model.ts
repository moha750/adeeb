// نموذج «إدارتي» — نقيّ، بلا استيراد خادميّ.
//
// كلّ رابطٍ هنا مقروءٌ من عمودٍ مُصرَّح كسائر نموذج الهيكلة، لا مستنتَجٍ من فراغ:
//   committees.leader_role_name -> من يقود الإدارة (فمَن يقودها يعرفها من صفّه الحيّ)
//   committees.member_role_name -> أيّ دورٍ يضمّه قائدُها ويوزّعه
//   committees.council_id       -> إدارةٌ إداريّة أم لجنةٌ تنفيذيّة
//
// **حقيقتان لا واحدة** (20260731): الانتماءُ إلى الإدارة صفٌّ في `user_roles` عليها هي،
// والإشرافُ على لجنةٍ تنفيذيّة صفٌّ في `committee_supervision`. فالعضو يوجد قبل أن يُوزَّع،
// وسحبُ آخر لجنةٍ لا يُخرجه من إدارته. (كانا صفًّا واحدًا، فكان أحدُهما يُخفي الآخر.)
//
// **والشاشة للإدارات الإداريّة وحدها** (20260801): كانت «وحدتي» تخدم قائد اللجنة معها
// فتُقرضه ضمًّا وإخراجًا؛ فصار للجنة تبويبُها «لجنتي» عرضًا محضًا، وبقي هنا مَن يضمّ
// **ويوزّع** — الفعلان اللذان لا وجود لهما خارج الإدارة. فلا فرعَ في الشاشة يسأل «أإدارةٌ
// هذه أم لجنة».
import type { Holder, Position, RawCommittee, RawProfile, RawRole, RawSupervision, RawUserRole } from "../members/structure/model";
import { roleTitle } from "@/lib/positionLabel";

/** الإدارة التي يقودها صاحبُ الجلسة — بدور عضوها الذي تُصرّح به هي. */
export type Unit = {
  id: number;
  name: string;
  desc: string | null;
  link: string | null;
  memberRoleName: string;
  memberRoleAr: string;
  /** شرطُ مقعد العضو: منصبٌ يجب أن يشغله المرشّح قبل الضمّ (عضو الإدارة ← عضو لجنة). */
  memberPrerequisite: string | null;
  memberPrerequisiteAr: string | null;
};

/** لجنةٌ تشغيليّة يجوز توزيع الإشراف عليها. */
export type Target = { id: number; name: string };

/** عضوٌ في الوحدة، ومعه لجانُ إشرافه إن كانت وحدتُه إدارةً (وإلّا فقائمةٌ فارغة). */
export type UnitMember = {
  userId: string;
  name: string;
  avatar: string | null;
  gender: "male" | "female" | null;
  committees: Target[];
};

// الجنس يصل من القاعدة نصًّا حرًّا؛ يُضيَّق هنا إلى ما تعرفه أيقونة الأفتار وحده.
const asGender = (g: string | null | undefined): "male" | "female" | null =>
  g === "male" ? "male" : g === "female" ? "female" : null;

/**
 * الإدارة بمعرّفها — **مَن يقودها لا يُسأل هنا**: النطاق يُحسم في `lib/myScope.ts` (مصدرٌ
 * واحد تقرؤه القائمة والصفحة)، وهذه تُلبس المعرّفَ اسمَه ودورَ عضوه.
 *
 * وشرطُ النطاق هناك هو **الشرط نفسه** الذي تفحصه `can_assign_role` في القاعدة (صفٌّ حيّ
 * بـ`role_name = leader_role_name` على الوحدة) — فما تعرضه الشاشة هو ما تسمح به، لا أوسع.
 */
export function adminUnit(
  committeeId: number,
  committees: RawCommittee[],
  roles: RawRole[],
): Unit | null {
  const byId = new Map(committees.map((c) => [c.id, c]));
  const c = byId.get(committeeId);
  if (!c || !c.member_role_name) return null;
  return {
    id: c.id,
    name: c.committee_name_ar ?? `إدارة #${c.id}`,
    desc: c.description ?? null,
    link: c.group_link ?? null,
    memberRoleName: c.member_role_name,
    // «عضو» + وحدته الأمّ = «عضو إدارة الضمان والجودة» — الرتبة وحدها لا تقول من أيّ إدارة
    memberRoleAr: (() => {
      const r = roles.find((x) => x.role_name === c.member_role_name);
      if (!r) return c.member_role_name;
      const home = r.home_committee_id != null ? byId.get(r.home_committee_id)?.committee_name_ar ?? null : null;
      return roleTitle({ roleAr: r.role_name_ar ?? r.role_name, homeCommitteeId: r.home_committee_id, homeName: home });
    })(),
    memberPrerequisite: roles.find((x) => x.role_name === c.member_role_name)?.prerequisite_role_name ?? null,
    memberPrerequisiteAr: (() => {
      const req = roles.find((x) => x.role_name === c.member_role_name)?.prerequisite_role_name;
      if (!req) return null;
      const r = roles.find((x) => x.role_name === req);
      return r?.role_name_ar ?? req;
    })(),
  };
}

/**
 * كشفُ الإدارة — **أعضاؤها** أوّلًا، ولكلٍّ لجانُ إشرافه.
 *
 * يُبنى من الانتماء لا من الإشراف: من ضُمّ ولم يُوزَّع بعدُ يظهر بلا لجان (يطلب توزيعًا)،
 * ومن سُحبت لجانُه يبقى في إدارته. حالتان لم تكونا تُمثَّلان أصلًا.
 */
export function buildRoster(
  unit: Unit,
  committees: RawCommittee[],
  userRoles: RawUserRole[],
  supervision: RawSupervision[],
  profiles: RawProfile[],
): UnitMember[] {
  const name = new Map(committees.map((c) => [c.id, c.committee_name_ar ?? `لجنة #${c.id}`]));
  const byUser = new Map<string, Target[]>();

  for (const s of supervision) {
    if (s.unit_id !== unit.id) continue;
    const list = byUser.get(s.supervisor_id) ?? [];
    list.push({ id: s.committee_id, name: name.get(s.committee_id) ?? `لجنة #${s.committee_id}` });
    byUser.set(s.supervisor_id, list);
  }

  const profile = new Map(profiles.map((p) => [p.id, p]));
  return userRoles
    .filter((ur) => ur.role_name === unit.memberRoleName && ur.committee_id === unit.id)
    .map((ur) => {
      const p = profile.get(ur.user_id);
      return {
        userId: ur.user_id,
        name: p?.full_name ?? "عضو غير معروف",
        avatar: p?.avatar_url ?? null,
        gender: asGender(p?.gender),
        committees: (byUser.get(ur.user_id) ?? []).sort((a, b) => a.id - b.id),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "ar"));
}

/**
 * مقاعد الإشراف — مقعدُ إدارتك في كلّ لجنةٍ تنفيذيّة، مشغولًا كان أو شاغرًا؛ فيُرى ما لم
 * يُغطَّ. تُبنى هنا لا في `buildPositions`: الإشراف ليس منصبًا في تلك اللجنة.
 *
 * شكلُها `Position` لأنّ كرت المقعد واحدٌ في اللوحة (`PositionCard`) — والمقعد مفردٌ
 * بحكم فهرس `committee_supervision` (لجنة + إدارة).
 */
export function buildSeats(
  unit: Unit,
  committees: RawCommittee[],
  supervision: RawSupervision[],
  profiles: RawProfile[],
): Position[] {
  const profile = new Map(profiles.map((p) => [p.id, p]));
  const holderOf = (committeeId: number): Holder[] => {
    const s = supervision.find((x) => x.unit_id === unit.id && x.committee_id === committeeId);
    if (!s) return [];
    const p = profile.get(s.supervisor_id);
    return [{
      userId: s.supervisor_id,
      name: p?.full_name ?? "عضو غير معروف",
      avatar: p?.avatar_url ?? null,
      gender: asGender(p?.gender),
      roleName: unit.memberRoleName,
      roleAr: unit.memberRoleAr,
      committeeId: unit.id, // إدارتُه هو — لا اللجنة التي يشرف عليها
      departmentId: null,
    }];
  };

  return committees
    .filter((c) => c.council_id === "executive")
    .sort((a, b) => a.id - b.id)
    .map((c) => ({
      key: `sup-${unit.id}-${c.id}`,
      roleName: unit.memberRoleName,
      roleAr: unit.memberRoleAr,
      scope: c.committee_name_ar ?? `لجنة #${c.id}`,
      council: "administrative" as const,
      committeeId: c.id,
      departmentId: null,
      holders: holderOf(c.id),
      singleton: true,
      elected: false,
      voteWeight: 1,
      councilMember: false,
      // مقعدُ إشرافٍ لا مقعدُ منصب — والشرط يخصّ الضمّ إلى الإدارة لا التوزيع عليها.
      prerequisite: null,
      prerequisiteAr: null,
    }));
}
