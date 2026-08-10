// نموذج هيكلة أديب — بناء الشجرة من صفوف القاعدة (نقيّ، بلا استيراد خادميّ، قابل للاختبار).
//
// كلّ رابطٍ هنا مقروءٌ من عمودٍ مُصرَّح، لا مستنتَج ولا محفور:
//   councils.head_role_name     -> من يرأس المجلس
//   committees.leader_role_name -> من يقود الوحدة   · member_role_name -> من يمثّل عضويّتها
//   committees.council_id       -> أيّ مجلس تتبع     · departments.council_id
//   roles.membership_kind       -> عضوٌ في المجلس (يجلس ويقرّر) أم تابعٌ لفرعه (تحته لا فيه)
//
// الفرق الأخير هو ما يجعل «من في المجلس التنفيذيّ؟» يعطي ٨ لا ١٥١.
// الترتيب بالاسم عبر roleRank — أُعدم role_level، فالهُويّة لا العدد.
import { roleRank } from "@/lib/roleOrder";
// اسم المنصب = الرتبة + وحدته الأمّ. مصدرٌ واحد لا تُركَّب الجملة في كلّ موضع.
import { roleTitle } from "@/lib/positionLabel";

export type RawCouncil = { id: string; name_ar: string | null; head_role_name: string; description: string | null; group_link: string | null };
export type RawDept = { id: number; name_ar: string | null; display_order: number | null; description: string | null; group_link: string | null };
export type RawCommittee = { id: number; committee_name_ar: string | null; department_id: number | null; council_id: string; leader_role_name: string; member_role_name: string; description: string | null; group_link: string | null };
export type RawRole = { id: number; role_name: string; role_name_ar: string | null; council_type: string | null; is_elected: boolean | null; membership_kind: string; vote_weight: number; holder_uniqueness: string; home_committee_id: number | null; prerequisite_role_name: string | null };
export type RawUserRole = { user_id: string; role_name: string; committee_id: number | null; department_id: number | null };
export type RawProfile = { id: string; full_name: string | null; avatar_url: string | null; gender: string | null; account_status: string | null };
// الإشراف: عضو إدارةٍ إداريّة (`unit_id`) يتابع لجنةً تنفيذيّة (`committee_id`) ليس **فيها**.
// جدولٌ مستقلّ منذ 20260731 — كان صفَّ منصبٍ يكذب بأنّه عضوٌ في تلك اللجنة.
export type RawSupervision = { committee_id: number; unit_id: number; supervisor_id: string };

// وحدة تنظيميّة قابلة لتحرير بياناتها الوصفيّة (وصف + رابط قروب)
export type UnitMeta = { kind: "council" | "department" | "committee"; id: string | number; name: string; desc: string | null; link: string | null };

// كلّ ظهور = تعيين واحد (شخص في منصب ضمن نطاق) — لا شخص واحد
export type Holder = {
  userId: string;
  name: string;
  avatar: string | null;
  gender: "male" | "female" | null;
  roleName: string;
  roleAr: string;
  committeeId: number | null;
  departmentId: number | null;
};

export type CommitteeNode = {
  id: number;
  name: string;
  kind: "operational" | "admin";
  desc: string | null;
  link: string | null;
  /** اسم مقعد القيادة كما تُصرّح به الوحدة (`leader_role_name`) — **يُقال شاغرًا كان أو مشغولًا**:
   *  «قائد اللجنة» اسمُ مقعدٍ لا وصفُ شخص، ومن لا يعرف الألقاب لا يتعلّمها من الأسماء وحدها. */
  leaderRoleAr: string;
  /** أمنتخَبٌ مقعدُها أم معيَّن (`roles.is_elected`) — تُقرأ منه لغةُ الشاغر: «لم يُنتخب» أو «لم يُعيَّن». */
  leaderElected: boolean;
  leader: Holder | null;
  deputy: Holder | null;
  // لكلّ لجنة مشرفان مستقلّان — واحد من كلّ إدارة. يفرضه فهرس المقعد في
  // `committee_supervision` (لجنة + إدارة)، لا تفرّدُ منصبٍ في `user_roles`.
  // والمشرف ليس **في** اللجنة: `committeeId` عنده إدارتُه هو (حيث انتماؤه فعلًا).
  hrOverseer: Holder | null;
  qaOverseer: Holder | null;
  members: Holder[];
  total: number;
};

export type DepartmentNode = {
  id: number;
  name: string;
  desc: string | null;
  link: string | null;
  /** اسم مقعد التنسيق وحالُه — كنظيرَيه في اللجنة (المقعد يُسمّى ولو خلا). */
  headRoleAr: string;
  headElected: boolean;
  head: Holder | null;
  committees: CommitteeNode[];
  total: number;
};

export type CouncilInfo = { id: string; name: string; desc: string | null; link: string | null };

// مقعدٌ في هيئة المجلس: دورٌ عضويّته member — شاغرًا كان أو مشغولًا.
// (الشاغر يُعرض أيضًا: «المستشار» منصبٌ قائم لا شاغل له، وإخفاؤه يكذب.)
export type CouncilSeat = {
  roleName: string;
  roleAr: string;
  isHead: boolean;
  isElected: boolean;
  voteWeight: number;
  holders: Holder[];
};

// المجلس هيئةٌ لا حاوية: له رئيسٌ وأعضاءٌ يجلسون، وفرعٌ يقع تحته.
export type CouncilBody = CouncilInfo & {
  headRoleName: string;
  headRoleAr: string;
  head: Holder | null;
  seats: CouncilSeat[];
  memberCount: number;      // من يجلس في المجلس
  subordinateCount: number; // من يقع تحت فرعه
};

// لا حقل `president` هنا: رئيس النادي عضوٌ في المجلس الإداريّ ورئيسُه، تقوله
// القاعدة (council_type + membership_kind + head_role_name) — فيظهر في مقاعده
// لا في قسمٍ محفورٍ فوق الشجرة. مصدرٌ واحد لا اثنان.
export type StructureModel = {
  administrative: CouncilBody & { committees: CommitteeNode[] };
  executive: CouncilBody & { departments: DepartmentNode[] };
  // الإدارة ليست لجنة — وإن سكنت جدولها. تُعدّ على حدة أو نكذب بالرقم.
  stats: { councils: number; administrations: number; departments: number; committees: number; assignments: number; people: number };
  anomalies: string[];
};

// ما بقي من الأسماء المحفورة. ذاب سبعةٌ منها حين صارت القاعدة تقول ما كانت
// تقوله: الرئاسة في head_role_name، والقيادة في leader_role_name، والعضويّة في
// member_role_name، والمجلس في council_type + membership_kind.
// والباقيان دورٌ لا تُصرّح به وحدةٌ بعد:
//   deptHead — القسم لا يحمل عمود «دور منسّقه» (يُشتقّ من department_id في التعيين)
//   deputy   — نائب اللجنة لا عمود له في committees
// لو أضيف departments.head_role_name وcommittees.deputy_role_name، ذابا أيضًا.
const R = {
  deptHead: "department_head",
  deputy: "deputy_committee_leader",
} as const;

/**
 * اسم المنصب بالعربيّة: الرتبة + وحدته الأمّ إن كانت له (`roles.home_committee_id`).
 * دالّةٌ واحدة يستعملها بناة الشجرة والمناصب والمقاعد — فلا تُركَّب الجملة في سبعة مواضع.
 */
function roleTitler(roles: RawRole[], committees: RawCommittee[]): (roleName: string) => string {
  const roleByName = new Map(roles.map((r) => [r.role_name, r]));
  const committeeName = new Map(committees.map((c) => [c.id, c.committee_name_ar]));
  return (roleName: string) => {
    const r = roleByName.get(roleName);
    if (!r) return roleName;
    return roleTitle({
      roleAr: r.role_name_ar ?? r.role_name,
      homeCommitteeId: r.home_committee_id,
      homeName: r.home_committee_id != null ? committeeName.get(r.home_committee_id) ?? null : null,
    });
  };
}

function buildHolders(roles: RawRole[], committees: RawCommittee[], userRoles: RawUserRole[], profiles: RawProfile[]): Holder[] {
  const roleByName = new Map(roles.map((r) => [r.role_name, r]));
  const titleOf = roleTitler(roles, committees);
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const holders: Holder[] = [];
  for (const ur of userRoles) {
    const role = roleByName.get(ur.role_name);
    if (!role) continue;
    const prof = profileById.get(ur.user_id);
    holders.push({
      userId: ur.user_id,
      name: prof?.full_name ?? "—",
      avatar: prof?.avatar_url ?? null,
      gender: prof?.gender === "male" || prof?.gender === "female" ? prof.gender : null,
      roleName: role.role_name,
      roleAr: titleOf(role.role_name),
      committeeId: ur.committee_id,
      departmentId: ur.department_id,
    });
  }
  return holders;
}

/**
 * عقدةُ كلّ لجنةٍ (وإدارة) بمعرّفها — **مصدرٌ واحد لشكل اللجنة** تقرؤه الشجرةُ الكاملة
 * وتبويبا «لجنتي» و«قسمي». يُستخرَج من `buildStructure` لا يُنسَخ عنه: من أراد لجنةً
 * واحدة لا يبني الهرم كلَّه ثمّ يفتّش فيه — ولا تسقط منه لجنةٌ بلا قسم (تلك تسقط من
 * التعشيش لا من هذه الخريطة).
 */
export function committeeNodes(
  committees: RawCommittee[],
  roles: RawRole[],
  userRoles: RawUserRole[],
  profiles: RawProfile[],
  supervision: RawSupervision[],
): Map<number, CommitteeNode> {
  const holders = buildHolders(roles, committees, userRoles, profiles);
  const titleOf = roleTitler(roles, committees);
  const roleByName = new Map(roles.map((r) => [r.role_name, r]));
  const inCommittee = (cid: number) => holders.filter((h) => h.committeeId === cid);

  // مقاعد الإشراف: (اللجنة + دورُ عضو الإدارة المُشرِفة) ← مشرفُها. الدور يُقرأ من
  // `member_role_name` لإدارته، فلا اسمَ محفورًا هنا.
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const committeeById = new Map(committees.map((c) => [c.id, c]));
  const overseers = new Map<string, Holder>();
  for (const s of supervision) {
    const unit = committeeById.get(s.unit_id);
    if (!unit) continue;
    const prof = profileById.get(s.supervisor_id);
    overseers.set(`${s.committee_id}|${unit.member_role_name}`, {
      userId: s.supervisor_id,
      name: prof?.full_name ?? "—",
      avatar: prof?.avatar_url ?? null,
      gender: prof?.gender === "male" || prof?.gender === "female" ? prof.gender : null,
      roleName: unit.member_role_name,
      roleAr: titleOf(unit.member_role_name),
      committeeId: unit.id, // إدارتُه هو — لا اللجنة التي يشرف عليها
      departmentId: null,
    });
  }
  const overseerOf = (committeeId: number, memberRoleName: string): Holder | null =>
    overseers.get(`${committeeId}|${memberRoleName}`) ?? null;

  const node = (c: RawCommittee): CommitteeNode => {
    const inside = inCommittee(c.id);
    // القائد = من يشغل الدور الذي تُصرّح الوحدة بأنه يقودها (committees.leader_role_name).
    // يعمل للإدارتين واللجان سواءً — لا حالة خاصّة ولا مطابقة اسم.
    const leader = inside.find((h) => h.roleName === c.leader_role_name) ?? null;
    const deputy = inside.find((h) => h.roleName === R.deputy) ?? null;
    // مشرفان مستقلّان: الموارد والضمان — لكلّ إدارة مشرفها على هذه اللجنة. يُقرآن من
    // جدول الإشراف: المشرف عضوٌ في إدارته لا في هذه اللجنة، فلا يُعدّ في أعضائها.
    const hrOverseer = overseerOf(c.id, "hr_admin_member");
    const qaOverseer = overseerOf(c.id, "qa_admin_member");
    const skip = new Set<string>([c.leader_role_name, R.deputy]);
    const exclude = new Set([leader?.userId, deputy?.userId].filter(Boolean) as string[]);
    // `committee_id` واحدٌ في معناه لكلّ صفّ: الوحدة التي هذا المقعد فيها. فأعضاء الإدارة
    // مُسنَدون إليها كأعضاء اللجنة إلى لجنتهم — لا فرعَ ولا إزالةَ تكرار.
    const members = inside.filter((h) => !skip.has(h.roleName) && !exclude.has(h.userId));
    return {
      id: c.id,
      name: c.committee_name_ar ?? `لجنة #${c.id}`,
      kind: c.council_id === "administrative" ? "admin" : "operational",
      desc: c.description ?? null,
      link: c.group_link ?? null,
      leaderRoleAr: titleOf(c.leader_role_name),
      leaderElected: !!roleByName.get(c.leader_role_name)?.is_elected,
      leader,
      deputy,
      hrOverseer,
      qaOverseer,
      members,
      total: (leader ? 1 : 0) + (deputy ? 1 : 0) + members.length,
    };
  };

  return new Map(committees.map((c) => [c.id, node(c)]));
}

export function buildStructure(
  councils: RawCouncil[],
  departments: RawDept[],
  committees: RawCommittee[],
  roles: RawRole[],
  userRoles: RawUserRole[],
  profiles: RawProfile[],
  supervision: RawSupervision[],
): StructureModel {
  const holders = buildHolders(roles, committees, userRoles, profiles);
  const byRole = (name: string) => holders.filter((h) => h.roleName === name);
  const firstOf = (name: string) => byRole(name)[0] ?? null;
  const roleByName = new Map(roles.map((r) => [r.role_name, r]));
  const titleOf = roleTitler(roles, committees);
  const nodes = committeeNodes(committees, roles, userRoles, profiles, supervision);

  // هيئة المجلس تُبنى من القاعدة: رئيسه من head_role_name، وأعضاؤه كلّ دورٍ
  // عضويّته member في هذا المجلس. لا قائمة محفورة — أضِف دورًا عضوًا غدًا فيظهر.
  const councilBody = (id: string, fallback: string): CouncilBody => {
    const c = councils.find((x) => x.id === id);
    const headRole = c ? roleByName.get(c.head_role_name) : undefined;
    const seats: CouncilSeat[] = roles
      .filter((r) => r.council_type === id && r.membership_kind === "member")
      .sort((a, b) => roleRank(a.role_name) - roleRank(b.role_name))
      .map((r) => ({
        roleName: r.role_name,
        roleAr: titleOf(r.role_name),
        isHead: r.role_name === c?.head_role_name,
        isElected: !!r.is_elected,
        voteWeight: r.vote_weight,
        holders: byRole(r.role_name),
      }));
    return {
      id,
      name: c?.name_ar ?? fallback,
      desc: c?.description ?? null,
      link: c?.group_link ?? null,
      headRoleName: c?.head_role_name ?? "",
      headRoleAr: headRole ? titleOf(headRole.role_name) : c?.head_role_name ?? "—",
      head: c ? firstOf(c.head_role_name) : null,
      seats,
      memberCount: new Set(seats.flatMap((s) => s.holders.map((h) => h.userId))).size,
      subordinateCount: new Set(
        roles
          .filter((r) => r.council_type === id && r.membership_kind === "subordinate")
          .flatMap((r) => byRole(r.role_name).map((h) => h.userId)),
      ).size,
    };
  };

  const nodeOf = (c: RawCommittee): CommitteeNode => nodes.get(c.id) as CommitteeNode;

  const operational = committees.filter((c) => c.council_id !== "administrative");
  const adminCommittees = committees
    .filter((c) => c.council_id === "administrative")
    .map(nodeOf);

  const sortedDepts = [...departments].sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999));
  const departmentNodes: DepartmentNode[] = sortedDepts.map((d) => {
    const head = holders.find((h) => h.roleName === R.deptHead && h.departmentId === d.id) ?? null;
    const comNodes = operational.filter((c) => c.department_id === d.id).map(nodeOf);
    return {
      id: d.id,
      name: d.name_ar ?? `قسم #${d.id}`,
      desc: d.description ?? null,
      link: d.group_link ?? null,
      headRoleAr: titleOf(R.deptHead),
      headElected: !!roleByName.get(R.deptHead)?.is_elected,
      head,
      committees: comNodes,
      total: comNodes.reduce((s, c) => s + c.total, 0),
    };
  });

  const administrative = councilBody("administrative", "المجلس الإداري");
  const executive = councilBody("executive", "المجلس التنفيذي");

  const anomalies: string[] = [];
  for (const d of departmentNodes) if (!d.head) anomalies.push(`قسم «${d.name}» بلا منسّق قسم`);
  for (const d of departmentNodes) for (const c of d.committees) if (!c.leader) anomalies.push(`لجنة «${c.name}» بلا قائد`);
  // المقاعد الشاغرة تُقرأ من الهيئة لا من قائمة محفورة
  for (const body of [administrative, executive])
    for (const s of body.seats)
      if (s.holders.length === 0) anomalies.push(`مقعد «${s.roleAr}» في ${body.name} شاغر`);
  // كلّ إدارة تغطّي اللجان بمشرفيها — فالنقص يُحسب لكلٍّ منهما على حدة
  const allCommittees = departmentNodes.flatMap((d) => d.committees);
  const noHr = allCommittees.filter((c) => !c.hrOverseer).length;
  const noQa = allCommittees.filter((c) => !c.qaOverseer).length;
  if (noHr > 0) anomalies.push(`${noHr} لجنة بلا مشرف من إدارة الموارد البشرية`);
  if (noQa > 0) anomalies.push(`${noQa} لجنة بلا مشرف من إدارة الضمان والجودة`);

  return {
    administrative: { ...administrative, committees: adminCommittees },
    executive: { ...executive, departments: departmentNodes },
    stats: {
      councils: councils.length,
      administrations: adminCommittees.length,
      departments: departments.length,
      committees: operational.length,
      assignments: holders.length,
      people: new Set(holders.map((h) => h.userId)).size,
    },
    anomalies,
  };
}

// ============================================================
// المناصب — قائمة مسطّحة لكلّ منصب قياديّ (لتبويب «تعيين المناصب» الغنيّ)
// ============================================================
export type Position = {
  key: string;
  roleName: string;
  roleAr: string;
  scope: string; // نصّ النطاق: «قيادة النادي» / «قسم …» / «لجنة …»
  // المجلس كما تقوله القاعدة (roles.council_type). لا «قيادة النادي» — كانت
  // تصنيفًا محفورًا لا وجود له في القاعدة، ورئيسُ النادي والمستشار كلاهما
  // عضوٌ في المجلس الإداريّ.
  council: "executive" | "administrative";
  committeeId: number | null;
  departmentId: number | null;
  // الشاغلون — جمعٌ لا مفرد: منصبٌ كـ«مستشار رئيس النادي» يقبل أكثر من شاغل،
  // ولو حُفظ مفردًا لاختفى الثاني بلا أثر (وهو ما كان يقع).
  holders: Holder[];
  // منصب مفرد (يُستبدَل لا يُضاف). لا يُحفر هنا: مصدره `roles.holder_uniqueness`
  // في القاعدة — يقرؤه `assign_position` وحارسُ الجدول والواجهة من مكانٍ واحد.
  singleton: boolean;
  elected: boolean; // منتخَب (منسّق قسم/قائد/نائب) مقابل معيَّن
  // وزن صوت شاغل المنصب في الانتخابات (roles.vote_weight). قرارٌ يُرى وأنت تُسنِد،
  // لا يُكتشف في انتخاب: قائدة الموارد تزن 3.0 ونظيرتها في الضمان 1.0 — سياسةٌ مقصودة.
  voteWeight: number;
  councilMember: boolean; // يجلس في المجلس ويقرّر (membership_kind='member') لا تابعٌ لفرعه
  // شرطُ المقعد: منصبٌ يجب أن يشغله المرشّح قبله (العضو الإداريّ ← عضو لجنة).
  // مصدره `roles.prerequisite_role_name`، تقرؤه القاعدة والمنتقي من مكانٍ واحد.
  prerequisite: string | null;
  prerequisiteAr: string | null;
};

export function buildPositions(
  councils: RawCouncil[],
  departments: RawDept[],
  committees: RawCommittee[],
  roles: RawRole[],
  userRoles: RawUserRole[],
  profiles: RawProfile[],
): Position[] {
  const holders = buildHolders(roles, committees, userRoles, profiles);
  const roleByName = new Map(roles.map((r) => [r.role_name, r]));
  const ar = roleTitler(roles, committees);
  const el = (rn: string) => !!roleByName.get(rn)?.is_elected;
  // صفات الدور تُقرأ من الكتالوج لا تُحفر في كلّ موضع إنشاء
  const traits = (rn: string) => ({
    voteWeight: roleByName.get(rn)?.vote_weight ?? 1,
    councilMember: roleByName.get(rn)?.membership_kind === "member",
    prerequisite: roleByName.get(rn)?.prerequisite_role_name ?? null,
    prerequisiteAr: roleByName.get(rn)?.prerequisite_role_name ? ar(roleByName.get(rn)!.prerequisite_role_name as string) : null,
  });

  // كلّ من يشغل هذا الدور في هذا النطاق — لا أوّلُهم. المفرد يعطي واحدًا بطبعه
  // (تحرسه القاعدة)، والمتعدّد يعطي ما عنده كاملًا.
  const holdersOf = (rn: string, opts?: { committeeId?: number; departmentId?: number }) =>
    holders.filter((h) =>
      h.roleName === rn &&
      (opts?.committeeId == null || h.committeeId === opts.committeeId) &&
      (opts?.departmentId == null || h.departmentId === opts.departmentId),
    );

  // التفرّد يقوله الكتالوج: 'multi' وحدها تقبل أكثر من شاغل.
  const isSingle = (rn: string) => (roleByName.get(rn)?.holder_uniqueness ?? "multi") !== "multi";

  const out: Position[] = [];

  // مقاعد المجالس تُقرأ من القاعدة لا من جدولٍ محفور. الجدول القديم كان يكذب
  // في ثلاثة صفوف من خمسة: يضع الرئيس والمستشار في «قيادة النادي» (تصنيفٌ لا
  // وجود له)، ورئيسَ التنفيذيّ في المجلس التنفيذيّ — وهو عضوٌ في الإداريّ
  // ويرأس التنفيذيّ (head_role_name). فالعضويّة والمجلس يقولهما العمودان.
  const councilName = (id: string) => councils.find((c) => c.id === id)?.name_ar ?? id;
  for (const r of roles.filter((x) => x.membership_kind === "member" && x.council_type).sort((a, b) => roleRank(a.role_name) - roleRank(b.role_name))) {
    // المقاعد ذات النطاق (منسّق قسم/قائد/نائب) تُبنى أدناه بنطاقها، لا هنا
    if (["department_head", "committee_leader", "deputy_committee_leader"].includes(r.role_name)) continue;
    const council = r.council_type as Position["council"];
    out.push({
      key: r.role_name, roleName: r.role_name, roleAr: ar(r.role_name),
      scope: councilName(council), council, committeeId: null, departmentId: null,
      holders: holdersOf(r.role_name), singleton: isSingle(r.role_name), elected: el(r.role_name), ...traits(r.role_name),
    });
  }

  const sortedDepts = [...departments].sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999));
  for (const d of sortedDepts) {
    const name = d.name_ar ?? `قسم #${d.id}`;
    out.push({ key: `head-${d.id}`, roleName: "department_head", roleAr: ar("department_head"), scope: name, council: "executive", committeeId: null, departmentId: d.id, holders: holdersOf("department_head", { departmentId: d.id }), singleton: isSingle("department_head"), elected: el("department_head"), ...traits("department_head") });
  }

  const operational = committees.filter((c) => c.council_id !== "administrative").sort((a, b) => a.id - b.id);
  for (const c of operational) {
    const name = c.committee_name_ar ?? `لجنة #${c.id}`;
    out.push({ key: `lead-${c.id}`, roleName: "committee_leader", roleAr: ar("committee_leader"), scope: name, council: "executive", committeeId: c.id, departmentId: null, holders: holdersOf("committee_leader", { committeeId: c.id }), singleton: isSingle("committee_leader"), elected: el("committee_leader"), ...traits("committee_leader") });
    out.push({ key: `dep-${c.id}`, roleName: "deputy_committee_leader", roleAr: ar("deputy_committee_leader"), scope: name, council: "executive", committeeId: c.id, departmentId: null, holders: holdersOf("deputy_committee_leader", { committeeId: c.id }), singleton: isSingle("deputy_committee_leader"), elected: el("deputy_committee_leader"), ...traits("deputy_committee_leader") });
    // ولا مقعدَ إشرافٍ هنا: الإشراف ليس منصبًا يُسنَد في هذه اللجنة، بل تكليفٌ لعضو إدارةٍ
    // أخرى — مقاعدُه في «توزيع الإشراف» ومصدرُها `committee_supervision` (20260731).
  }

  return out;
}
