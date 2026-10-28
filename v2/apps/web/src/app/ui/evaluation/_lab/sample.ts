/**
 * **بياناتُ المعرض** — مصنوعةٌ تشبه أدِيب الحيّ (سبعةُ قادة، وأربعةُ نوّاب، وثلاثةُ منسّقين، وتسعُ لجان)
 * لا عشوائيّة، فتتكرّر الصورة. والأشكالُ أشكالُ `dashboard/evaluation/data.ts` نفسُها، فما يُرى هنا يُبنى
 * عليه بلا ترجمة. ولا تُقرأ قاعدة: المعرضُ للنظر.
 */
import type { CycleRow, ElectorRow, LogRow, MyResultRow, SheetRow, TargetRow } from "../../../dashboard/evaluation/data";

const CLOSES = "2027-01-23T21:00:00Z";

// ══ المقيِّم: أوراقُ عضوٍ في لجنة التصوير (قائدُه ونائبُه ومنسّقُ قسمه) ══════════════

export const SHEETS: SheetRow[] = [
  { target_id: 11, cycle_id: 1, closes_at: CLOSES, last_day: "2027-01-23", part: "members", full_name: "عبد الرحمن خالد الشيخ", gender: "male", role_name: "committee_leader", unit_name: "لجنة التصوير", done: true },
  { target_id: 12, cycle_id: 1, closes_at: CLOSES, last_day: "2027-01-23", part: "members", full_name: "ريم سعد العتيبي", gender: "female", role_name: "deputy_committee_leader", unit_name: "لجنة التصوير", done: false },
  { target_id: 31, cycle_id: 1, closes_at: CLOSES, last_day: "2027-01-23", part: "members", full_name: "فيصل محمد الحمد", gender: "male", role_name: "department_head", unit_name: "قسم الإنتاج", done: false },
];

/** وأوراقُ رئيس أدِيب: كلُّها من شقّ المجلس، وهي أكثر */
export const COUNCIL_SHEETS: SheetRow[] = [
  { ...SHEETS[0], part: "council", done: true },
  { ...SHEETS[1], part: "council", done: true },
  { ...SHEETS[2], part: "council", done: false },
  { target_id: 13, cycle_id: 1, closes_at: CLOSES, last_day: "2027-01-23", part: "council", full_name: "نورة عبد الله القحطاني", gender: "female", role_name: "committee_leader", unit_name: "لجنة التأليف", done: false },
  { target_id: 14, cycle_id: 1, closes_at: CLOSES, last_day: "2027-01-23", part: "council", full_name: "سلطان فهد الدوسري", gender: "male", role_name: "committee_leader", unit_name: "لجنة التنظيم", done: false },
];

// ══ غرفة الإدارة ══════════════════════════════════════════════════════════

export const CYCLES: CycleRow[] = [
  { id: 2, due_on: "2027-04-21", opens_at: "2027-04-20T21:00:00Z", closes_at: "2027-04-23T21:00:00Z", status: "scheduled", executed_at: null, blocked: false, targets: 0, excluded: 0, raters: 0, ballots: 0, kept: 0, removed: 0, no_result: 0 },
  { id: 1, due_on: "2027-01-21", opens_at: "2027-01-20T21:00:00Z", closes_at: CLOSES, status: "executed", executed_at: "2027-01-23T21:10:00Z", blocked: false, targets: 13, excluded: 1, raters: 61, ballots: 168, kept: 9, removed: 2, no_result: 2 },
];

const T = (
  id: number,
  full_name: string,
  gender: "male" | "female",
  role_name: TargetRow["role_name"],
  unit_name: string,
  department_id: number,
  m: [number, number, number, number] | null, // [sum, ballots, eligible, …ignored]
  c: [number, number, number] | null,
  extra: Partial<TargetRow> = {},
): TargetRow => {
  const members = m ? { members_eligible: m[2], members_ballots: m[1] } : { members_eligible: 0, members_ballots: 0 };
  const council = c ? { council_eligible: c[2], council_ballots: c[1] } : { council_eligible: 4, council_ballots: 0 };
  return {
    id, user_id: `u-${id}`, full_name, gender, role_name, committee_id: role_name === "department_head" ? null : id,
    department_id, unit_name, seat_assigned_at: "2026-03-01T09:00:00Z", excluded: null, cancelled: null,
    ...members, ...council,
    members_quorum: null, branch: null, members_num: null, members_den: null, council_num: null, council_den: null,
    final_num: null, final_den: null, verdict: null, removed_at: null, returned_to: null, awaiting_return: false,
    restored_at: null, ...extra,
  };
};

/** دورةٌ منتهية بأحكامها: باقون، ومستبعَدٌ نُفّذ، ومنسّقٌ ينتظر لجنة، ومن لا نتيجةَ له، ومستثنى */
export const TARGETS_DONE: TargetRow[] = [
  T(11, "عبد الرحمن خالد الشيخ", "male", "committee_leader", "لجنة التصوير", 1, [0, 6, 8, 0], [0, 5, 6], { members_quorum: true, branch: "both", members_num: 26, members_den: 35, council_num: 4, council_den: 5, final_num: 191, final_den: 250, verdict: "kept" }),
  T(12, "ريم سعد العتيبي", "female", "deputy_committee_leader", "لجنة التصوير", 1, [0, 5, 8, 0], [0, 4, 6], { members_quorum: true, branch: "both", members_num: 22, members_den: 35, council_num: 7, council_den: 10, final_num: 227, final_den: 350, verdict: "kept" }),
  T(13, "نورة عبد الله القحطاني", "female", "committee_leader", "لجنة التأليف", 1, [0, 4, 6, 0], [0, 4, 4], { members_quorum: true, branch: "both", members_num: 4, members_den: 5, council_num: 17, council_den: 20, final_num: 163, final_den: 200, verdict: "kept" }),
  T(15, "تركي ناصر السبيعي", "male", "deputy_committee_leader", "لجنة التأليف", 1, [0, 2, 6, 0], [0, 3, 4], { members_quorum: false, branch: "council_only", council_num: 3, council_den: 5, final_num: 3, final_den: 5, verdict: "kept" }),
  T(31, "فيصل محمد الحمد", "male", "department_head", "قسم الإنتاج", 1, [0, 9, 14, 0], [0, 3, 4], { members_quorum: true, branch: "both", members_num: 25, members_den: 63, council_num: 2, council_den: 5, final_num: 191, final_den: 500, verdict: "removed", awaiting_return: true }),
  T(14, "سلطان فهد الدوسري", "male", "committee_leader", "لجنة التنظيم", 2, [0, 3, 5, 0], [0, 4, 4], { members_quorum: true, branch: "both", members_num: 13, members_den: 35, council_num: 9, council_den: 20, final_num: 13, final_den: 35, verdict: "removed", removed_at: "2027-01-23T21:10:00Z", returned_to: 14 }),
  T(16, "لمى إبراهيم الزهراني", "female", "committee_leader", "لجنة الضيافة", 2, [0, 4, 7, 0], [0, 4, 4], { members_quorum: true, branch: "both", members_num: 31, members_den: 35, council_num: 9, council_den: 10, final_num: 89, final_den: 100, verdict: "kept" }),
  T(17, "هيا ماجد الشمري", "female", "deputy_committee_leader", "لجنة الضيافة", 2, [0, 0, 7, 0], [0, 0, 4], { members_quorum: false, branch: "none", verdict: "no_result" }),
  T(32, "مها سليمان العنزي", "female", "department_head", "قسم الفعاليات", 2, [0, 7, 12, 0], [0, 4, 4], { members_quorum: true, branch: "both", members_num: 59, members_den: 84, council_num: 3, council_den: 4, final_num: 0.0, final_den: 1, verdict: "kept" }),
  T(18, "يزيد عمر المالكي", "male", "committee_leader", "لجنة الإعلام", 3, [0, 5, 9, 0], [0, 4, 6], { members_quorum: true, branch: "both", members_num: 4, members_den: 7, council_num: 13, council_den: 20, final_num: 299, final_den: 500, verdict: "kept" }),
  T(19, "أسيل حمد الغامدي", "female", "deputy_committee_leader", "لجنة الإعلام", 3, [0, 6, 9, 0], [0, 4, 6], { cancelled: "seat_ended", verdict: "no_result" }),
  T(33, "خالد عبد العزيز البقمي", "male", "department_head", "قسم التواصل", 3, [0, 5, 9, 0], [0, 4, 4], { members_quorum: true, branch: "both", members_num: 27, members_den: 35, council_num: 7, council_den: 10, final_num: 159, final_den: 200, verdict: "kept" }),
  T(20, "جود فارس الحربي", "female", "committee_leader", "لجنة التطوّع", 3, null, null, { excluded: "recent", seat_assigned_at: "2027-01-05T09:00:00Z" }),
];
/** النهائيّةُ تُشتقّ من الشقّين بالقاعدة نفسِها (م٨)، فلا يكذب المعرضُ في رقمٍ كُتب باليد */
function withFinal(t: TargetRow): TargetRow {
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const red = (n: number, d: number) => ({ final_num: n / gcd(n, d), final_den: d / gcd(n, d) });
  if (t.branch === "both" && t.members_num != null && t.council_num != null) {
    return { ...t, ...red(7 * t.members_num * t.council_den! + 3 * t.council_num * t.members_den!, 10 * t.members_den! * t.council_den!) };
  }
  if (t.branch === "members_only" && t.members_num != null) return { ...t, ...red(t.members_num, t.members_den!) };
  if (t.branch === "council_only" && t.council_num != null) return { ...t, ...red(t.council_num, t.council_den!) };
  return t;
}
for (let i = 0; i < TARGETS_DONE.length; i++) TARGETS_DONE[i] = withFinal(TARGETS_DONE[i]);

/** والدورةُ نفسُها وهي مفتوحة: مشاركةٌ تتقدّم ولا نتائج */
export const TARGETS_OPEN: TargetRow[] = TARGETS_DONE.map((t, i) => ({
  ...t,
  members_ballots: Math.max(0, t.members_ballots - (i % 3) - 1),
  council_ballots: Math.max(0, t.council_ballots - (i % 2) - 1),
  members_quorum: null, branch: null, members_num: null, members_den: null, council_num: null, council_den: null,
  final_num: null, final_den: null, verdict: t.excluded ? null : null, removed_at: null, returned_to: null,
  awaiting_return: false, cancelled: null,
}));

export const CYCLE_OPEN: CycleRow = { ...CYCLES[1], status: "open", executed_at: null, ballots: 121, kept: 0, removed: 0, no_result: 0 };

export const ELECTORATE: ElectorRow[] = [
  { rater_id: "a", full_name: "محمد إسماعيل المطر", part: "council", added_by_correction: false, removed: false },
  { rater_id: "b", full_name: "بشائر الحداد", part: "council", added_by_correction: false, removed: false },
  { rater_id: "c", full_name: "سارة يوسف الراشد", part: "council", added_by_correction: false, removed: false },
  { rater_id: "d", full_name: "مشاعل حسن البلوي", part: "council", added_by_correction: false, removed: false },
  { rater_id: "s", full_name: "نوف عبد الله الدوسري", part: "council", added_by_correction: false, removed: false, supervisor: true },
  { rater_id: "e", full_name: "ريم سعد العتيبي", part: "members", added_by_correction: false, removed: false },
  { rater_id: "f", full_name: "فيصل محمد الحمد", part: "members", added_by_correction: false, removed: false },
  { rater_id: "g", full_name: "عبير ناصر القرني", part: "members", added_by_correction: false, removed: false },
  { rater_id: "h", full_name: "أحمد صالح الجهني", part: "members", added_by_correction: false, removed: true },
  { rater_id: "i", full_name: "لين عادل المطيري", part: "members", added_by_correction: true, removed: false },
  { rater_id: "j", full_name: "مازن طلال الشهري", part: "members", added_by_correction: false, removed: false },
];

export const LOG: LogRow[] = [
  { at: "2027-01-24T08:40:00Z", event: "rater_removed", target_id: 11, actor_name: "سارة يوسف الراشد", reason: "لم يكن عضوًا في اللجنة يوم الفتح، نُقل قبلها بيومين", details: {} },
  { at: "2027-01-23T21:10:00Z", event: "results_recorded", target_id: null, actor_name: null, reason: null, details: { kept: 10, removed: 2, no_result: 2 } },
  { at: "2027-01-23T21:03:00Z", event: "cycle_closed", target_id: null, actor_name: null, reason: null, details: {} },
  { at: "2027-01-20T21:03:00Z", event: "cycle_opened", target_id: null, actor_name: null, reason: null, details: {} },
];

export const RETURN_COMMITTEES = [
  { id: 11, name: "لجنة التصوير", department_id: 1 },
  { id: 13, name: "لجنة التأليف", department_id: 1 },
  { id: 14, name: "لجنة التنظيم", department_id: 2 },
];

// ══ نتيجتي ═══════════════════════════════════════════════════════════════

export const MY_RESULTS: MyResultRow[] = [
  { target_id: 12, due_on: "2027-04-21", role_name: "deputy_committee_leader", unit_name: "لجنة التصوير", verdict: "kept", branch: "both", final_num: 13, final_den: 20, members_num: 22, members_den: 35, members_ballots: 5, members_eligible: 8, council_num: 7, council_den: 10, council_ballots: 4, comments: 4, removed_at: null, restored_at: null, cancelled: null },
  { target_id: 2, due_on: "2027-01-21", role_name: "deputy_committee_leader", unit_name: "لجنة التصوير", verdict: "kept", branch: "both", final_num: 11, final_den: 25, members_num: 1, members_den: 2, members_ballots: 6, members_eligible: 8, council_num: null, council_den: null, council_ballots: 2, comments: 3, removed_at: null, restored_at: null, cancelled: null },
];

export const MY_REMOVED: MyResultRow = { target_id: 14, due_on: "2027-04-21", role_name: "committee_leader", unit_name: "لجنة التنظيم", verdict: "removed", branch: "both", final_num: 79, final_den: 200, members_num: 13, members_den: 35, members_ballots: 3, members_eligible: 5, council_num: 9, council_den: 20, council_ballots: 4, comments: 2, removed_at: "2027-04-23T21:10:00Z", restored_at: null, cancelled: null };

export const MY_COMMENTS = [
  { keep_text: "متابعتها الأسبوعية لكل مهمة، وتذكيرها لنا قبل المواعيد.", change_text: "نحتاج اجتماعًا شهريًا نعرف فيه خطة اللجنة كاملة." },
  { keep_text: "طريقة توزيع المهام عادلة، والكل يشارك.", change_text: null },
  { keep_text: "حضورها في الفعاليات ودعمها للأعضاء الجدد.", change_text: "الردّ في القروب يتأخر أحيانًا يومين أو أكثر." },
  { keep_text: null, change_text: "إشراك الأعضاء في اختيار الأنشطة بدل أن تأتي جاهزة." },
];
