// نموذج هيكلة أديب — بناء الشجرة من صفوف القاعدة (نقيّ، بلا استيراد خادميّ، قابل للاختبار).
//
// كلّ رابطٍ هنا مقروءٌ من عمودٍ مُصرَّح، لا مستنتَج ولا محفور:
//   councils.head_role_name     -> من يرأس المجلس
//   committees.leader_role_name -> من يقود الوحدة   · member_role_name -> من يمثّل عضويّتها
//   committees.council_id       -> أيّ مجلس تتبع     · departments.council_id
//   roles.membership_kind       -> عضوٌ في المجلس (يجلس ويقرّر) أم تابعٌ لفرعه (تحته لا فيه)
//
// الفرق الأخير هو ما يجعل «من في المجلس التنفيذيّ؟» يعطي ٨ لا ١٥١.

export type RawCouncil = { id: string; name_ar: string | null; head_role_name: string; description: string | null; group_link: string | null };
export type RawDept = { id: number; name_ar: string | null; display_order: number | null; description: string | null; group_link: string | null };
export type RawCommittee = { id: number; committee_name_ar: string | null; department_id: number | null; council_id: string; leader_role_name: string; member_role_name: string; description: string | null; group_link: string | null };
export type RawRole = { id: number; role_name: string; role_name_ar: string | null; role_level: number; council_type: string | null; is_elected: boolean | null; membership_kind: string; vote_weight: number };
export type RawUserRole = { user_id: string; role_name: string; committee_id: number | null; department_id: number | null };
export type RawProfile = { id: string; full_name: string | null; avatar_url: string | null };

// وحدة تنظيميّة قابلة لتحرير بياناتها الوصفيّة (وصف + رابط قروب)
export type UnitMeta = { kind: "council" | "department" | "committee"; id: string | number; name: string; desc: string | null; link: string | null };

// كلّ ظهور = تعيين واحد (شخص في منصب ضمن نطاق) — لا شخص واحد
export type Holder = {
  userId: string;
  name: string;
  avatar: string | null;
  roleName: string;
  roleAr: string;
  level: number;
  committeeId: number | null;
  departmentId: number | null;
};

export type CommitteeNode = {
  id: number;
  name: string;
  kind: "operational" | "admin";
  desc: string | null;
  link: string | null;
  leader: Holder | null;
  deputy: Holder | null;
  // لكلّ لجنة مشرفان مستقلّان — واحد من كلّ إدارة. تفرضه assign_position
  // (التفرّد لكلّ دور+لجنة)، وليس مشرفًا واحدًا من أيّهما.
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
  level: number;
  isHead: boolean;
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

// عضو الإدارة يشرف على عدّة لجان، فله صفّ لكلّ لجنة — ويُعرض مرّة واحدة في إدارته.
function dedupeByUser(hs: Holder[]): Holder[] {
  const seen = new Set<string>();
  return hs.filter((h) => (seen.has(h.userId) ? false : (seen.add(h.userId), true)));
}

function buildHolders(roles: RawRole[], userRoles: RawUserRole[], profiles: RawProfile[]): Holder[] {
  const roleByName = new Map(roles.map((r) => [r.role_name, r]));
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
      roleName: role.role_name,
      roleAr: role.role_name_ar ?? role.role_name,
      level: role.role_level,
      committeeId: ur.committee_id,
      departmentId: ur.department_id,
    });
  }
  return holders;
}

export function buildStructure(
  councils: RawCouncil[],
  departments: RawDept[],
  committees: RawCommittee[],
  roles: RawRole[],
  userRoles: RawUserRole[],
  profiles: RawProfile[],
): StructureModel {
  const holders = buildHolders(roles, userRoles, profiles);
  const byRole = (name: string) => holders.filter((h) => h.roleName === name);
  const firstOf = (name: string) => byRole(name)[0] ?? null;
  const inCommittee = (cid: number) => holders.filter((h) => h.committeeId === cid);
  const roleByName = new Map(roles.map((r) => [r.role_name, r]));

  // هيئة المجلس تُبنى من القاعدة: رئيسه من head_role_name، وأعضاؤه كلّ دورٍ
  // عضويّته member في هذا المجلس. لا قائمة محفورة — أضِف دورًا عضوًا غدًا فيظهر.
  const councilBody = (id: string, fallback: string): CouncilBody => {
    const c = councils.find((x) => x.id === id);
    const headRole = c ? roleByName.get(c.head_role_name) : undefined;
    const seats: CouncilSeat[] = roles
      .filter((r) => r.council_type === id && r.membership_kind === "member")
      .sort((a, b) => b.role_level - a.role_level)
      .map((r) => ({
        roleName: r.role_name,
        roleAr: r.role_name_ar ?? r.role_name,
        level: r.role_level,
        isHead: r.role_name === c?.head_role_name,
        voteWeight: r.vote_weight,
        holders: byRole(r.role_name),
      }));
    return {
      id,
      name: c?.name_ar ?? fallback,
      desc: c?.description ?? null,
      link: c?.group_link ?? null,
      headRoleName: c?.head_role_name ?? "",
      headRoleAr: headRole?.role_name_ar ?? c?.head_role_name ?? "—",
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

  const committeeNode = (c: RawCommittee, kind: "operational" | "admin"): CommitteeNode => {
    const inside = inCommittee(c.id);
    // القائد = من يشغل الدور الذي تُصرّح الوحدة بأنه يقودها (committees.leader_role_name).
    // يعمل للإدارتين واللجان سواءً — لا حالة خاصّة ولا مطابقة اسم.
    const leader = inside.find((h) => h.roleName === c.leader_role_name) ?? null;
    const deputy = inside.find((h) => h.roleName === R.deputy) ?? null;
    // مشرفان مستقلّان: الموارد والضمان — لكلّ إدارة مشرفها على هذه اللجنة
    const hrOverseer = inside.find((h) => h.roleName === "hr_admin_member") ?? null;
    const qaOverseer = inside.find((h) => h.roleName === "qa_admin_member") ?? null;
    const skip = new Set<string>([c.leader_role_name, R.deputy, "hr_admin_member", "qa_admin_member"]);
    const exclude = new Set([leader?.userId, deputy?.userId, hrOverseer?.userId, qaOverseer?.userId].filter(Boolean) as string[]);
    // أعضاء الإدارة يشرفون على لجان أخرى، فـ committee_id عندهم يشير إلى
    // اللجنة المُشرَف عليها لا إلى إدارتهم — انتماؤهم يقوله الدور وحده.
    // أمّا أعضاء اللجنة فيشيرون إليها بـ committee_id.
    const members =
      c.council_id === "administrative"
        ? dedupeByUser(holders.filter((h) => h.roleName === c.member_role_name))
        : inside.filter((h) => !skip.has(h.roleName) && !exclude.has(h.userId));
    return {
      id: c.id,
      name: c.committee_name_ar ?? `لجنة #${c.id}`,
      kind,
      desc: c.description ?? null,
      link: c.group_link ?? null,
      leader,
      deputy,
      hrOverseer,
      qaOverseer,
      members,
      total: (leader ? 1 : 0) + (deputy ? 1 : 0) + members.length,
    };
  };

  const operational = committees.filter((c) => c.council_id !== "administrative");
  const adminCommittees = committees
    .filter((c) => c.council_id === "administrative")
    .map((c) => committeeNode(c, "admin"));

  const sortedDepts = [...departments].sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999));
  const departmentNodes: DepartmentNode[] = sortedDepts.map((d) => {
    const head = holders.find((h) => h.roleName === R.deptHead && h.departmentId === d.id) ?? null;
    const comNodes = operational.filter((c) => c.department_id === d.id).map((c) => committeeNode(c, "operational"));
    return {
      id: d.id,
      name: d.name_ar ?? `قسم #${d.id}`,
      desc: d.description ?? null,
      link: d.group_link ?? null,
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
  level: number;
  scope: string; // نصّ النطاق: «قيادة النادي» / «قسم …» / «لجنة …»
  // المجلس كما تقوله القاعدة (roles.council_type). لا «قيادة النادي» — كانت
  // تصنيفًا محفورًا لا وجود له في القاعدة، ورئيسُ النادي والمستشار كلاهما
  // عضوٌ في المجلس الإداريّ.
  council: "executive" | "administrative";
  committeeId: number | null;
  departmentId: number | null;
  holder: Holder | null;
  singleton: boolean; // منصب مفرد (يُستبدَل لا يُضاف)
  elected: boolean; // منتخَب (منسّق قسم/قائد/نائب) مقابل معيَّن
  adminSlot?: boolean; // مشرف إداريّ (عضو إداري) — يُختار عند الإسناد من إحدى الإدارتين (HR/QA)
  // وزن صوت شاغل المنصب في الانتخابات (roles.vote_weight). قرارٌ يُرى وأنت تُسنِد،
  // لا يُكتشف في انتخاب: قائدة الموارد تزن 3.0 ونظيرتها في الضمان 1.0 — سياسةٌ مقصودة.
  voteWeight: number;
  councilMember: boolean; // يجلس في المجلس ويقرّر (membership_kind='member') لا تابعٌ لفرعه
};

export function buildPositions(
  councils: RawCouncil[],
  departments: RawDept[],
  committees: RawCommittee[],
  roles: RawRole[],
  userRoles: RawUserRole[],
  profiles: RawProfile[],
): Position[] {
  const holders = buildHolders(roles, userRoles, profiles);
  const roleByName = new Map(roles.map((r) => [r.role_name, r]));
  const ar = (rn: string) => roleByName.get(rn)?.role_name_ar ?? rn;
  const lvl = (rn: string) => roleByName.get(rn)?.role_level ?? 0;
  const el = (rn: string) => !!roleByName.get(rn)?.is_elected;
  // صفات الدور تُقرأ من الكتالوج لا تُحفر في كلّ موضع إنشاء
  const traits = (rn: string) => ({
    voteWeight: roleByName.get(rn)?.vote_weight ?? 1,
    councilMember: roleByName.get(rn)?.membership_kind === "member",
  });

  const findHolder = (rn: string, opts?: { committeeId?: number; departmentId?: number }) =>
    holders.find((h) =>
      h.roleName === rn &&
      (opts?.committeeId == null || h.committeeId === opts.committeeId) &&
      (opts?.departmentId == null || h.departmentId === opts.departmentId),
    ) ?? null;

  const out: Position[] = [];

  // مقاعد المجالس تُقرأ من القاعدة لا من جدولٍ محفور. الجدول القديم كان يكذب
  // في ثلاثة صفوف من خمسة: يضع الرئيس والمستشار في «قيادة النادي» (تصنيفٌ لا
  // وجود له)، ورئيسَ التنفيذيّ في المجلس التنفيذيّ — وهو عضوٌ في الإداريّ
  // ويرأس التنفيذيّ (head_role_name). فالعضويّة والمجلس يقولهما العمودان.
  const councilName = (id: string) => councils.find((c) => c.id === id)?.name_ar ?? id;
  for (const r of roles.filter((x) => x.membership_kind === "member" && x.council_type).sort((a, b) => b.role_level - a.role_level)) {
    // المقاعد ذات النطاق (منسّق قسم/قائد/نائب) تُبنى أدناه بنطاقها، لا هنا
    if (["department_head", "committee_leader", "deputy_committee_leader"].includes(r.role_name)) continue;
    const council = r.council_type as Position["council"];
    out.push({
      key: r.role_name, roleName: r.role_name, roleAr: ar(r.role_name), level: lvl(r.role_name),
      scope: councilName(council), council, committeeId: null, departmentId: null,
      holder: findHolder(r.role_name), singleton: true, elected: el(r.role_name), ...traits(r.role_name),
    });
  }

  const sortedDepts = [...departments].sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999));
  for (const d of sortedDepts) {
    const name = d.name_ar ?? `قسم #${d.id}`;
    out.push({ key: `head-${d.id}`, roleName: "department_head", roleAr: ar("department_head"), level: lvl("department_head"), scope: name, council: "executive", committeeId: null, departmentId: d.id, holder: findHolder("department_head", { departmentId: d.id }), singleton: true, elected: el("department_head"), ...traits("department_head") });
  }

  const operational = committees.filter((c) => c.council_id !== "administrative").sort((a, b) => a.id - b.id);
  for (const c of operational) {
    const name = c.committee_name_ar ?? `لجنة #${c.id}`;
    out.push({ key: `lead-${c.id}`, roleName: "committee_leader", roleAr: ar("committee_leader"), level: lvl("committee_leader"), scope: name, council: "executive", committeeId: c.id, departmentId: null, holder: findHolder("committee_leader", { committeeId: c.id }), singleton: true, elected: el("committee_leader"), ...traits("committee_leader") });
    out.push({ key: `dep-${c.id}`, roleName: "deputy_committee_leader", roleAr: ar("deputy_committee_leader"), level: lvl("deputy_committee_leader"), scope: name, council: "executive", committeeId: c.id, departmentId: null, holder: findHolder("deputy_committee_leader", { committeeId: c.id }), singleton: true, elected: el("deputy_committee_leader"), ...traits("deputy_committee_leader") });
    // مقعدان مستقلّان: لكلّ إدارة مشرفها على هذه اللجنة. assign_position تفرض
    // التفرّد لكلّ (دور + لجنة)، فمقعد الموارد لا يزاحم مقعد الضمان.
    out.push({ key: `hr-${c.id}`, roleName: "hr_admin_member", roleAr: ar("hr_admin_member"), level: lvl("hr_admin_member"), scope: name, council: "administrative", committeeId: c.id, departmentId: null, holder: findHolder("hr_admin_member", { committeeId: c.id }), singleton: true, elected: el("hr_admin_member"), adminSlot: true, ...traits("hr_admin_member") });
    out.push({ key: `qa-${c.id}`, roleName: "qa_admin_member", roleAr: ar("qa_admin_member"), level: lvl("qa_admin_member"), scope: name, council: "administrative", committeeId: c.id, departmentId: null, holder: findHolder("qa_admin_member", { committeeId: c.id }), singleton: true, elected: el("qa_admin_member"), adminSlot: true, ...traits("qa_admin_member") });
  }

  return out;
}
