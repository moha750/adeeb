/**
 * **معجمُ تقييم القيادات** — بلا إطار، فيستورده الخادمُ والعميلُ والدليلُ سواءً.
 *
 * كلُّ قيمةٍ هنا تقابل قيدًا في القاعدة (`supabase/migrations/20261027195239_evaluation_01_schema.sql`): من أضاف قيمةً
 * بلا ترحيلٍ يقابلها سقط الإدراجُ وقتَ التشغيل لا وقتَ البناء. ونصوصُ البنود من اللائحة حرفًا
 * (لائحة تقييم القيادات، المادتان السادسة والسابعة): لا تُعاد صياغتُها هنا.
 */
import { MEMBER_ITEMS, COUNCIL_ITEMS } from "@/lib/evaluation/score";

// ══ البنود ═══════════════════════════════════════════════════════════════

export type Item = { key: string; label: string; hint: string };

/** بنودُ تقييم الأعضاء (م٦/2)، بترتيبها في اللائحة. والترتيبُ هو ترتيبُ الدرجات في الورقة. */
export const MEMBER_ITEM_LIST: readonly Item[] = [
  { key: "interaction", label: "التفاعل", hint: "حاضر معنا ومتجاوب، ولا تمرّ مدة طويلة دون أن نسمع منه." },
  { key: "activation", label: "التفعيل", hint: "يحرّك لجنته أو قسمه بالأنشطة والمهام، ولا يتركها خاملة." },
  { key: "communication", label: "التواصل", hint: "يوضّح المطلوب، ويُطلعنا على ما يخصّنا في وقته." },
  { key: "fairness", label: "عدالة التوزيع", hint: "يوزّع المهام بعدل، ولا يحمّلها فئة دون أخرى." },
  { key: "followup", label: "المتابعة", hint: "يتابع سير المهام، ويساند من يتعثّر." },
  { key: "conduct", label: "التعامل", hint: "يحترم الأعضاء، ويتقبّل آراءهم ونقدهم." },
  { key: "example", label: "القدوة", hint: "يلتزم بما يطلبه منّا." },
];

/** بنودُ تقييم المجلس (م٧/2). */
export const COUNCIL_ITEM_LIST: readonly Item[] = [
  { key: "activation", label: "التفعيل", hint: "أقام النشاط الشهري ووثّقه، وفق المادة الرابعة من لائحة الضمان والجودة." },
  { key: "quality", label: "جودة المخرجات", hint: "مستوى ما تقدّمه وحدته، والتزامها بالمواعيد." },
  { key: "responsiveness", label: "التجاوب", hint: "تجاوبه مع الإدارة، والتزامه بالأنظمة." },
  { key: "team", label: "إدارة الفريق", hint: "استقرار وحدته، وتفاعل أعضائها." },
  { key: "cooperation", label: "التعاون", hint: "تنسيقه مع بقية اللجان والأقسام." },
];

/** المقياس (م٦/1). ولا خيارَ «لم أتعامل معه» (م٦/3): غيابُ القائد عن أعضائه ممّا يقيسه التقييم. */
export const SCALE_LABELS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "ضعيف جدًا",
  2: "ضعيف",
  3: "مقبول",
  4: "جيد",
  5: "ممتاز",
};

/** السؤالُ المفتوح (م٦/4)، لا يدخل الحساب. شقّاه حقلان في الورقة. */
export const OPEN_QUESTION = {
  keep: "ما الذي تريد أن يستمر عليه؟",
  change: "وما الذي يحتاج إلى تغيير؟",
} as const;
export const OPEN_MAX = 1000;

// ══ الشقّان ══════════════════════════════════════════════════════════════

export type Part = "members" | "council";
export const PART_LABEL: Record<Part, string> = { members: "الأعضاء", council: "المجلس" };
export const PART_WEIGHT: Record<Part, number> = { members: 70, council: 30 };
/**
 * اسمُ الشقّ كاملًا حيث يُقرأ وحدَه (محمد ٢٠٢٦-١٠-٢٧): «المجلس» مبهمٌ في منصّةٍ فيها مجلسان، والمقيِّمون في الشقّ
 * الثاني هم المجلسُ الإداريّ (رئيس أدِيب والرئيس التنفيذي وقائدا الإدارتين، م٤). والأعضاءُ أعضاءُ لجنة القائد
 * ونائبه، أو أعضاءُ لجان قسم المنسّق (م٣). و`PART_LABEL` القصيرةُ تبقى لأشرطة الغرفة حيث الوحدةُ ظاهرة.
 */
export function partName(p: Part, role: EvaluatedRole): string {
  if (p === "council") return "المجلس الإداري";
  return role === "department_head" ? "أعضاء القسم" : "أعضاء اللجنة";
}
export const itemsFor = (p: Part): readonly Item[] => (p === "members" ? MEMBER_ITEM_LIST : COUNCIL_ITEM_LIST);

// ══ الدورة والحكم ══════════════════════════════════════════════════════════

export type CycleStatus = "scheduled" | "open" | "closed" | "executed";
export const CYCLE_STATUS_LABEL: Record<CycleStatus, string> = {
  scheduled: "قادمة",
  open: "مفتوحة",
  closed: "مغلقة",
  executed: "منتهية",
};

export type Verdict = "kept" | "removed" | "no_result";
export const VERDICT_LABEL: Record<Verdict, string> = {
  kept: "باقٍ",
  removed: "مستبعَد",
  no_result: "بلا نتيجة",
};

export type Branch = "both" | "members_only" | "council_only" | "none";
/** كيف حُسبت النتيجة (م٥): يُقرأ في الغرفة وفي «نتيجتي». */
export const BRANCH_LABEL: Record<Branch, string> = {
  // بلا أرقام: النسبةُ في آخر سطرٍ عربيٍّ تنقلب علامتُها، والوزنان مكتوبان عند كلّ شقّ
  both: "الأعضاء والمجلس",
  members_only: "الأعضاء وحدهم",
  council_only: "المجلس وحده",
  none: "لم يشارك أحد",
};

export type Excluded = "recent";
export const EXCLUDED_LABEL: Record<Excluded, string> = {
  recent: "شغل منصبه قبل الموعد بأقل من 4 أسابيع",
};

export type Cancelled = "seat_ended" | "membership_ended";
export const CANCELLED_LABEL: Record<Cancelled, string> = {
  seat_ended: "ترك منصبه أثناء التقييم",
  membership_ended: "انتهت عضويته أثناء التقييم",
};

/** لماذا لم يُعَد المستبعَد إلى مقعده بعد التصحيح (`_evaluation_restore`). */
export const RESTORE_SKIP_LABEL: Record<string, string> = {
  occupied: "شُغل المقعد بغيره",
  election: "على المقعد انتخابٌ قائم",
  moved: "انتقل إلى منصبٍ آخر",
  gone: "لم يعد عضوًا",
};

/** أيّامُ مهلة التصحيح قبل أن يُفتح انتخابُ المقعد (قرار محمد ٢٠٢٦-١٠-٢٠، `evaluation_hold_election`). */
export const ELECTION_HOLD_DAYS = 7;

// حارسٌ يقرأه المِعيار: عددُ البنود هنا عددُها في الحساب وفي قيد القاعدة
export const ITEM_COUNTS_AGREE = MEMBER_ITEM_LIST.length === MEMBER_ITEMS && COUNCIL_ITEM_LIST.length === COUNCIL_ITEMS;

// ══ المناصب المقيَّمة (م١/1) ═══════════════════════════════════════════════

export type EvaluatedRole = "committee_leader" | "deputy_committee_leader" | "department_head";
/** الرتبةُ العارية كما في `roles.role_name_ar`، وتُؤنَّث بـ`rankFor` وتُضمّ إلى وحدتها بـ`positionLine`. */
export const RANK: Record<EvaluatedRole, string> = {
  committee_leader: "قائد",
  deputy_committee_leader: "نائب",
  department_head: "منسّق",
};
