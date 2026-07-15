// نموذج هيكلة أديب — بناء الشجرة من صفوف القاعدة (نقيّ، بلا استيراد خادميّ، قابل للاختبار).
// الحقيقة كما في القاعدة: كتالوج أدوار + تعيينات. تبعيّة المجلس مُشتقّة من council_type لا FK.

export type RawCouncil = { id: string; name_ar: string | null; description: string | null; group_link: string | null };
export type RawDept = { id: number; name_ar: string | null; display_order: number | null; description: string | null; group_link: string | null };
export type RawCommittee = { id: number; committee_name_ar: string | null; department_id: number | null; council_id: string; leader_role_name: string; member_role_name: string; description: string | null; group_link: string | null };
export type RawRole = { id: number; role_name: string; role_name_ar: string | null; role_level: number; council_type: string | null; is_elected: boolean | null };
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

export type StructureModel = {
  president: Holder | null;
  advisors: Holder[];
  executive: CouncilInfo & { president: Holder | null; departments: DepartmentNode[] };
  administrative: CouncilInfo & { leaders: Holder[]; committees: CommitteeNode[] };
  stats: { councils: number; departments: number; committees: number; assignments: number; people: number };
  anomalies: string[];
};

const R = {
  president: "club_president",
  advisor: "president_advisor",
  execPresident: "executive_council_president",
  hrLeader: "hr_committee_leader",
  qaLeader: "qa_committee_leader",
  deptHead: "department_head",
  leader: "committee_leader",
  deputy: "deputy_committee_leader",
  member: "committee_member",
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
  const councilOf = (id: string, fallback: string): CouncilInfo => {
    const c = councils.find((x) => x.id === id);
    return { id, name: c?.name_ar ?? fallback, desc: c?.description ?? null, link: c?.group_link ?? null };
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

  const anomalies: string[] = [];
  for (const d of departmentNodes) if (!d.head) anomalies.push(`قسم «${d.name}» بلا منسّق قسم`);
  for (const d of departmentNodes) for (const c of d.committees) if (!c.leader) anomalies.push(`لجنة «${c.name}» بلا قائد`);
  if (byRole(R.advisor).length === 0) anomalies.push("منصب «مستشار رئيس النادي» شاغر تمامًا");
  // كلّ إدارة تغطّي اللجان بمشرفيها — فالنقص يُحسب لكلٍّ منهما على حدة
  const allCommittees = departmentNodes.flatMap((d) => d.committees);
  const noHr = allCommittees.filter((c) => !c.hrOverseer).length;
  const noQa = allCommittees.filter((c) => !c.qaOverseer).length;
  if (noHr > 0) anomalies.push(`${noHr} لجنة بلا مشرف من إدارة الموارد البشرية`);
  if (noQa > 0) anomalies.push(`${noQa} لجنة بلا مشرف من إدارة الضمان والجودة`);

  return {
    president: firstOf(R.president),
    advisors: byRole(R.advisor),
    executive: { ...councilOf("executive", "المجلس التنفيذي"), president: firstOf(R.execPresident), departments: departmentNodes },
    administrative: { ...councilOf("administrative", "المجلس الإداري"), leaders: [firstOf(R.hrLeader), firstOf(R.qaLeader)].filter((h): h is Holder => h != null), committees: adminCommittees },
    stats: {
      councils: councils.length,
      departments: departments.length,
      committees: committees.length,
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
  council: "leadership" | "executive" | "administrative";
  committeeId: number | null;
  departmentId: number | null;
  holder: Holder | null;
  singleton: boolean; // منصب مفرد (يُستبدَل لا يُضاف)
  elected: boolean; // منتخَب (منسّق قسم/قائد/نائب) مقابل معيَّن
  adminSlot?: boolean; // مشرف إداريّ (عضو إداري) — يُختار عند الإسناد من إحدى الإدارتين (HR/QA)
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

  const findHolder = (rn: string, opts?: { committeeId?: number; departmentId?: number }) =>
    holders.find((h) =>
      h.roleName === rn &&
      (opts?.committeeId == null || h.committeeId === opts.committeeId) &&
      (opts?.departmentId == null || h.departmentId === opts.departmentId),
    ) ?? null;

  const out: Position[] = [];
  const top: Array<[string, Position["council"], string]> = [
    ["club_president", "leadership", "قيادة النادي"],
    ["president_advisor", "leadership", "قيادة النادي"],
    ["executive_council_president", "executive", "المجلس التنفيذي"],
    ["hr_committee_leader", "administrative", "المجلس الإداري"],
    ["qa_committee_leader", "administrative", "المجلس الإداري"],
  ];
  for (const [rn, council, scope] of top) {
    out.push({ key: rn, roleName: rn, roleAr: ar(rn), level: lvl(rn), scope, council, committeeId: null, departmentId: null, holder: findHolder(rn), singleton: true, elected: el(rn) });
  }

  const sortedDepts = [...departments].sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999));
  for (const d of sortedDepts) {
    const name = d.name_ar ?? `قسم #${d.id}`;
    out.push({ key: `head-${d.id}`, roleName: "department_head", roleAr: ar("department_head"), level: lvl("department_head"), scope: name, council: "executive", committeeId: null, departmentId: d.id, holder: findHolder("department_head", { departmentId: d.id }), singleton: true, elected: el("department_head") });
  }

  const operational = committees.filter((c) => c.council_id !== "administrative").sort((a, b) => a.id - b.id);
  for (const c of operational) {
    const name = c.committee_name_ar ?? `لجنة #${c.id}`;
    out.push({ key: `lead-${c.id}`, roleName: "committee_leader", roleAr: ar("committee_leader"), level: lvl("committee_leader"), scope: name, council: "executive", committeeId: c.id, departmentId: null, holder: findHolder("committee_leader", { committeeId: c.id }), singleton: true, elected: el("committee_leader") });
    out.push({ key: `dep-${c.id}`, roleName: "deputy_committee_leader", roleAr: ar("deputy_committee_leader"), level: lvl("deputy_committee_leader"), scope: name, council: "executive", committeeId: c.id, departmentId: null, holder: findHolder("deputy_committee_leader", { committeeId: c.id }), singleton: true, elected: el("deputy_committee_leader") });
    // مقعدان مستقلّان: لكلّ إدارة مشرفها على هذه اللجنة. assign_position تفرض
    // التفرّد لكلّ (دور + لجنة)، فمقعد الموارد لا يزاحم مقعد الضمان.
    out.push({ key: `hr-${c.id}`, roleName: "hr_admin_member", roleAr: ar("hr_admin_member"), level: lvl("hr_admin_member"), scope: name, council: "administrative", committeeId: c.id, departmentId: null, holder: findHolder("hr_admin_member", { committeeId: c.id }), singleton: true, elected: false, adminSlot: true });
    out.push({ key: `qa-${c.id}`, roleName: "qa_admin_member", roleAr: ar("qa_admin_member"), level: lvl("qa_admin_member"), scope: name, council: "administrative", committeeId: c.id, departmentId: null, holder: findHolder("qa_admin_member", { committeeId: c.id }), singleton: true, elected: false, adminSlot: true });
  }

  return out;
}
