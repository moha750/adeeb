// هيكلةُ عالم المحاكي وأهلُه — ثابتةٌ لا تتغيّر بفعلٍ في الشاشة (كجداول `roles` و`committees`
// و`departments` في القاعدة). والأرقامُ والأسماءُ هنا **من عندنا لا من الإنتاج**: المحاكي عالمٌ
// مستقلّ، فلا يُخلَط أحدُ أعضاء النادي بدُميةٍ تُقاد.
//
// وما نُقل من القاعدة نُقل بقيمته: أوزانُ `roles.vote_weight`، و`council_type`، و`is_elected`،
// و`votes_in_all_elections`، وقوائمُ القدرات من `role_permissions` (قُرئت ٢٠٢٦-٠٨-١٥).

/* ══ الأدوار ═════════════════════════════════════════════════════════ */

export type SimRole = {
  roleName: string;
  /** `roles.role_name_ar` — الرتبةُ مجرّدةً؛ وحدتُها تأتي من الإسناد لا من الاسم. */
  ar: string;
  /** `roles.vote_weight` — أعلى وزنٍ لأدوار العضو هو وزنُه (`get_vote_weight`). */
  weight: number;
  /** `roles.council_type` — و`administrative` يمنع الترشّح مطلقًا (البند أ في `is_user_eligible_to_run`). */
  council: "administrative" | "executive";
  /** `roles.is_elected` — الثلاثةُ التي تُفتح لها انتخابات. */
  elected?: boolean;
  /** `roles.votes_in_all_elections` — يصوّت في كلّ مقعدٍ أيًّا كان نطاقُه (`is_top_admin_role`). */
  votesAll?: boolean;
};

export const ROLES: Record<string, SimRole> = {
  club_president:              { roleName: "club_president",              ar: "رئيس نادي أدِيب",     weight: 4.0, council: "administrative", votesAll: true },
  executive_council_president: { roleName: "executive_council_president", ar: "رئيس المجلس التنفيذي", weight: 4.0, council: "administrative", votesAll: true },
  president_advisor:           { roleName: "president_advisor",           ar: "مستشار رئيس النادي",  weight: 4.0, council: "administrative", votesAll: true },
  hr_committee_leader:         { roleName: "hr_committee_leader",         ar: "قائد",                weight: 3.5, council: "administrative", votesAll: true },
  hr_admin_member:             { roleName: "hr_admin_member",             ar: "عضو",                 weight: 3.0, council: "administrative" },
  department_head:             { roleName: "department_head",             ar: "منسّق",               weight: 2.5, council: "executive", elected: true },
  committee_leader:            { roleName: "committee_leader",            ar: "قائد",                weight: 2.0, council: "executive", elected: true },
  deputy_committee_leader:     { roleName: "deputy_committee_leader",     ar: "نائب",                weight: 1.5, council: "executive", elected: true },
  committee_member:            { roleName: "committee_member",            ar: "عضو",                 weight: 1.0, council: "executive" },
};

/** المقاعدُ المنتخَبة — `roles.is_elected` مرتّبةً بالوزن، كما يُخرجها `getElectionCreateOptions`. */
export const ELECTED_ROLES = ["department_head", "committee_leader", "deputy_committee_leader"] as const;
export type ElectedRole = (typeof ELECTED_ROLES)[number];

/* ══ القدرات ═════════════════════════════════════════════════════════ */

/** `role_permissions` — منقولةٌ بقوائمها كما هي في الإنتاج (قُرئت ٢٠٢٦-٠٨-١٥). */
export const CAPS: Record<string, string[]> = {
  manage_elections:         ["club_president", "executive_council_president", "hr_committee_leader"],
  manage_positions:         ["club_president", "executive_council_president", "hr_committee_leader"],
  view_election_candidates: ["club_president", "executive_council_president", "hr_admin_member", "hr_committee_leader"],
  run_for_election:         ["committee_leader", "committee_member", "department_head", "deputy_committee_leader"],
  view_own_membership:      Object.keys(ROLES),
};

/* ══ الوحدات ═════════════════════════════════════════════════════════ */

export type SimCommittee = { id: number; ar: string; departmentId: number };
export type SimDepartment = { id: number; ar: string };

/**
 * قسمان ولجانٌ ثلاث — بهذا القدر تُختبَر كلُّ قاعدة: قسمٌ يحمل **ثلاثة مقاعد** (تنسيقُه
 * وقيادةُ لجنته ونيابتُها) فيُجرَّب الحسمُ الجماعيّ والأفضليّة والوصيف، وقسمٌ ثانٍ يُجرَّب به
 * منعُ الترشّح في «قسمٍ مغاير».
 */
export const DEPARTMENTS: SimDepartment[] = [
  { id: 1, ar: "قسم صناعة المحتوى" },
  { id: 2, ar: "قسم الإنتاج الإعلامي" },
];

export const COMMITTEES: SimCommittee[] = [
  { id: 11, ar: "لجنة الرواة", departmentId: 1 },
  { id: 12, ar: "لجنة التأليف", departmentId: 1 },
  { id: 21, ar: "لجنة التصوير", departmentId: 2 },
];

export const committeeOf = (id: number | null | undefined) => COMMITTEES.find((c) => c.id === id) ?? null;
export const departmentOf = (id: number | null | undefined) => DEPARTMENTS.find((d) => d.id === id) ?? null;

/* ══ الأهل ═══════════════════════════════════════════════════════════ */

/**
 * عضوٌ في العالم = صفُّ `profiles` وصفُّ `user_roles` معًا. و**منصبٌ واحدٌ حيّ لكلٍّ**
 * (`trg_enforce_position_uniqueness`)، فالدورُ حقلٌ لا قائمة.
 */
export type SimMember = {
  id: string;
  name: string;
  gender: "male" | "female" | null;
  roleName: string;
  committeeId: number | null;
  departmentId: number | null;
};

/**
 * الأهلُ — تسعُ وجهاتِ نظرٍ تُبدَّل من غرفة التحكّم، ومعها ناخبون يملأون الصندوق.
 * والاسمُ يقول المنصبَ صراحةً كي يُعرَف صاحبُ الشاشة بلمحة.
 */
export const MEMBERS: SimMember[] = [
  { id: "u-pres",    name: "سعد الرئيس",       gender: "male",   roleName: "club_president",              committeeId: null, departmentId: null },
  { id: "u-exec",    name: "ريم التنفيذيّة",    gender: "female", roleName: "executive_council_president", committeeId: null, departmentId: null },
  { id: "u-advisor", name: "بدر المستشار",      gender: "male",   roleName: "president_advisor",           committeeId: null, departmentId: null },
  { id: "u-hrlead",  name: "هند قائدة الموارد", gender: "female", roleName: "hr_committee_leader",         committeeId: 11,   departmentId: null },
  { id: "u-hrmem",   name: "فهد عضو الموارد",   gender: "male",   roleName: "hr_admin_member",             committeeId: 11,   departmentId: null },
  { id: "u-coord",   name: "منال المنسّقة",      gender: "female", roleName: "department_head",             committeeId: null, departmentId: 2 },
  { id: "u-leader",  name: "طلال قائد اللجنة",  gender: "male",   roleName: "committee_leader",            committeeId: 12,   departmentId: null },
  { id: "u-deputy",  name: "لمياء النائبة",     gender: "female", roleName: "deputy_committee_leader",     committeeId: 12,   departmentId: null },
  { id: "u-m1",      name: "أحمد بن سالم",      gender: "male",   roleName: "committee_member",            committeeId: 11,   departmentId: null },
  { id: "u-m2",      name: "نورة العتيبي",      gender: "female", roleName: "committee_member",            committeeId: 11,   departmentId: null },
  { id: "u-m3",      name: "خالد الدوسري",      gender: "male",   roleName: "committee_member",            committeeId: 11,   departmentId: null },
  { id: "u-m4",      name: "سارة القحطاني",     gender: "female", roleName: "committee_member",            committeeId: 11,   departmentId: null },
  { id: "u-m5",      name: "عبد الله الحربي",   gender: "male",   roleName: "committee_member",            committeeId: 12,   departmentId: null },
  { id: "u-m6",      name: "جواهر الشمري",      gender: "female", roleName: "committee_member",            committeeId: 12,   departmentId: null },
  { id: "u-m7",      name: "يوسف الزهراني",     gender: "male",   roleName: "committee_member",            committeeId: 21,   departmentId: null },
];

export const memberOf = (id: string | null | undefined) => MEMBERS.find((m) => m.id === id) ?? null;

/** الاسمُ من المعرّف — و«عضوٌ محذوف» لمن لا وجودَ له (كما تقول شاشةُ تفصيل الأصوات). */
export const nameOf = (id: string | null | undefined) => memberOf(id)?.name ?? "عضوٌ محذوف";

/* ══ وجهاتُ النظر ═══════════════════════════════════════════════════ */

/** وجهةُ نظرٍ في غرفة التحكّم: عضوٌ بعينه، وسطرٌ يقول لماذا هو في القائمة. */
export type Viewpoint = { id: string; label: string; why: string };

export const VIEWPOINTS: Viewpoint[] = [
  { id: "u-pres",    label: "رئيس النادي",           why: "يدير الانتخابات، ووزنُه ٤، ويصوّت في كلّ مقعد" },
  { id: "u-exec",    label: "رئيس المجلس التنفيذي",  why: "يدير الانتخابات، ووزنُه ٤، ويصوّت في كلّ مقعد" },
  { id: "u-hrlead",  label: "قائدة الموارد البشرية", why: "تدير الانتخابات، ووزنُها ٣٫٥، وتصوّت في كلّ مقعد" },
  { id: "u-advisor", label: "مستشار الرئيس",         why: "ناخبٌ بوزن ٤ في كلّ مقعد، ولا يدير ولا يترشّح" },
  { id: "u-hrmem",   label: "عضو الموارد البشرية",   why: "مطّلِعٌ للقراءة على غرفة الإدارة، بلا تصريفٍ ولا ترشّح" },
  { id: "u-coord",   label: "منسّقة قسم",            why: "وزنُها ٢٫٥، وتترشّح في قسمها، وتُحجَب عن مقاعد لجانه" },
  { id: "u-leader",  label: "قائد لجنة",             why: "وزنُه ٢، ويُحجَب عن قيادة لجنته ونيابتها" },
  { id: "u-deputy",  label: "نائبة قائد لجنة",       why: "وزنُها ١٫٥، وتُحجَب عن نيابة لجنتها لا عن قيادتها" },
  { id: "u-m1",      label: "عضو لجنة",              why: "وزنُه ١، وهو المرشّح المعتاد وناخبُ لجنته" },
];
