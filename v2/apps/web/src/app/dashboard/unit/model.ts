// نموذج «وحدتي» — نقيّ، بلا استيراد خادميّ.
//
// كلّ رابطٍ هنا مقروءٌ من عمودٍ مُصرَّح كسائر نموذج الهيكلة، لا مستنتَجٍ من فراغ:
//   committees.leader_role_name -> من يقود الوحدة (فمَن يقودها يعرفها من صفّه الحيّ)
//   committees.member_role_name -> أيّ دورٍ يضمّه قائدُها ويوزّعه
//   committees.council_id       -> إدارةٌ إداريّة أم لجنةٌ تنفيذيّة
//
// **حقيقتان لا واحدة** (20260731): الانتماءُ إلى الوحدة صفٌّ في `user_roles` عليها هي،
// والإشرافُ على لجنةٍ تنفيذيّة صفٌّ في `committee_supervision`. فالعضو يوجد قبل أن يُوزَّع،
// وسحبُ آخر لجنةٍ لا يُخرجه من إدارته. (كانا صفًّا واحدًا، فكان أحدُهما يُخفي الآخر.)
//
// والشاشة تخدم **كلّ قائد وحدة** (20260731): قائدُ اللجنة يضمّ أعضاءه ويُخرجهم، وقائدُ
// الإدارة يزيد على ذلك توزيعَ الإشراف — بُعدُ الإدارات وحدها. لا شرطَ محفورًا يفرّقهما
// سوى `council_id`، وهو التفريق الذي تفعله القاعدة نفسها.
import type { Holder, Position, RawCommittee, RawProfile, RawRole, RawSupervision, RawUserRole } from "../members/structure/model";
import { roleTitle } from "@/lib/positionLabel";

/** الوحدة التي يقودها صاحبُ الجلسة — إدارةً كانت أو لجنة، ما دامت تُصرّح بدور عضوها. */
export type Unit = {
  id: number;
  name: string;
  /** إدارةٌ إداريّة (لها إشرافٌ توزّعه) أم لجنةٌ تنفيذيّة (أعضاؤها فيها). */
  kind: "admin" | "operational";
  desc: string | null;
  link: string | null;
  memberRoleName: string;
  memberRoleAr: string;
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
 * الوحدة التي يقودها هذا المستخدم — يُطابَق صفُّه الحيّ بدور الوحدة القياديّ وعليها هي
 * (`role_name = leader_role_name` و`committee_id = id`)، وهو **الشرط نفسه** الذي تفحصه
 * `can_assign_role` في القاعدة. فما تعرضه الشاشة هو ما تسمح به القاعدة، لا أوسع.
 *
 * ولا يُشترط مجلسٌ بعينه: قائد اللجنة يقودها كما يقود قائد الإدارة إدارته، والفرقُ في
 * **ما يفعله بأعضائه** لا في حقّه بهم. يقوله `kind` أدناه.
 */
export function ledUnit(
  userId: string,
  committees: RawCommittee[],
  userRoles: RawUserRole[],
  roles: RawRole[],
): Unit | null {
  const byId = new Map(committees.map((c) => [c.id, c]));
  for (const ur of userRoles) {
    if (ur.user_id !== userId || ur.committee_id == null) continue;
    const c = byId.get(ur.committee_id);
    if (!c) continue;
    if (c.leader_role_name !== ur.role_name || !c.member_role_name) continue;
    return {
      id: c.id,
      name: c.committee_name_ar ?? `وحدة #${c.id}`,
      kind: c.council_id === "administrative" ? "admin" : "operational",
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
    };
  }
  return null;
}

/**
 * كشفُ الوحدة — **أعضاؤها** أوّلًا، ولكلٍّ لجانُ إشرافه إن كانت إدارة.
 *
 * يُبنى من الانتماء لا من الإشراف: من ضُمّ ولم يُوزَّع بعدُ يظهر بلا لجان (يطلب توزيعًا)،
 * ومن سُحبت لجانُه يبقى في إدارته. حالتان لم تكونا تُمثَّلان أصلًا.
 *
 * وهو نفسه كشفُ اللجنة بلا حرفٍ زائد: `member_role_name` يقول أيّ دورٍ يُعدّ عضوًا،
 * ولا صفَّ إشرافٍ على لجنةٍ فتخرج القائمة بلا شرائح. وحدةٌ واحدة تخدم الحالتين.
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
    }));
}
