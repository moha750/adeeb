// مفردات الانتخابات — لا تعتمد على شيء خادميّ، فيستوردها الخادم والعميل معًا بأمان.
// كلّ قيمة حالة هنا يحرسها قيدٌ مقابل في القاعدة (elections_status_check).
// لا تُضِف قيمة قبل توسيع القيد بترحيل مقابل.
//
// أمّا المنصب المُنتخَب (منسّق قسم/قائد/نائب) فلا يُحفَر هنا: يُشتقّ من
// `roles.role_name_ar` حيث `is_elected = true` (مصدر واحد) — data.ts يحلّه.

/* ══ الحالة ══════════════════════════════════════════════════════════ */

export type ElectionStatus =
  | "candidacy_open" | "candidacy_closed"
  | "voting_open" | "voting_closed"
  | "completed" | "cancelled";

/**
 * موعدُ الإغلاق التلقائيّ للطور **الجاري** — الترشّح في طوره والتصويت في طوره،
 * وفارغُه بابٌ يُغلق بيد المشرف (كنّاسة القاعدة لا تلمس ما لا موعد له).
 * مصدرٌ واحد يقرؤه الجدول والكرت معًا.
 */
export const deadlineOf = (e: { status: ElectionStatus; candidacyEnd: string | null; votingEnd: string | null }): string | null =>
  e.status === "candidacy_open" ? e.candidacyEnd
    : e.status === "voting_open" ? e.votingEnd
      : null;

/** الموعدُ نفسُه خامًا (ISO) — لسطحٍ يصوغه بمقاسه (خانةُ كرتٍ تسع يومًا وشهرًا لا طابعًا كاملًا). */
export const deadlineRawOf = (e: { status: ElectionStatus; candidacyEndRaw: string | null; votingEndRaw: string | null }): string | null =>
  e.status === "candidacy_open" ? e.candidacyEndRaw
    : e.status === "voting_open" ? e.votingEndRaw
      : null;

/**
 * التسميةُ كاملةٌ ومختصرة: الكاملةُ حيث لا شيءَ يقول الطور (الجدول · صفحة التفاصيل)،
 * والمختصرةُ حيث **يرسمه المسارُ في الكرت نفسِه** — فتقول الشارةُ الحالَ ولا تكرّر الطور،
 * فيتّسع سطرُ المنصب. والاثنتان هنا لا في الشاشات، فلا تفترق تسميةٌ عن أختها.
 *
 * و«تصويت جارٍ» يُستثنى فيبقى كاملًا في الكرت أيضًا: «جارٍ» وحدَه لفظٌ لا يقوم بنفسه.
 */
export const STATUS_META: Record<ElectionStatus, { label: string; short: string; tone: "success" | "warning" | "danger" | "neutral" | "info"; live?: boolean }> = {
  candidacy_open:   { label: "ترشّح مفتوح", short: "مفتوح", tone: "success", live: true },
  candidacy_closed: { label: "ترشّح مغلق",  short: "مغلق",  tone: "warning" },
  voting_open:      { label: "تصويت جارٍ",  short: "تصويت جارٍ", tone: "success", live: true },
  voting_closed:    { label: "تصويت مغلق",  short: "مغلق",  tone: "warning" },
  completed:        { label: "مكتمل",       short: "مكتمل", tone: "neutral" },
  cancelled:        { label: "ملغى",        short: "ملغى",  tone: "danger" },
};

/**
 * انتقالات الحالة المشروعة — مصدر واحد لقائمة إجراءات الصفّ في الواجهة وللتحقّق
 * في الفعل الخادميّ، مطابقةٌ لآلة الحالة في القاعدة (enforce_election_status_transition).
 *
 * لا يُدرَج هنا انتقالان لأنّهما يحملان حمولةً زائدة عن الحالة فيُعالَجان بفعلٍ مخصّص:
 *   • «فتح التصويت» يستلزم موعد إغلاق التصويت (voting_end).
 *   • «إعلان الفائز» يستلزم اختيار مرشّح، والقاعدة تفرض أن يكون الأعلى وزنًا.
 */
export const STATUS_OPS = {
  closeCandidacy:  { from: ["candidacy_open"], to: "candidacy_closed", label: "إغلاق الترشّح" },
  reopenCandidacy: { from: ["candidacy_closed"], to: "candidacy_open", label: "إعادة فتح الترشّح" },
  closeVoting:     { from: ["voting_open"], to: "voting_closed", label: "إغلاق التصويت" },
  cancel:          { from: ["candidacy_open", "candidacy_closed", "voting_open", "voting_closed"], to: "cancelled", label: "إلغاء الانتخاب" },
} as const;
export type StatusOp = keyof typeof STATUS_OPS;

/* ══ بيان الترشّح ════════════════════════════════════════════════════ */

/** حدّا طول البيان — مصدرٌ واحد يقرؤه النموذج (عدّادًا وقفلًا ونغمةً) والفعل الخادميّ (تحقّقًا). */
export const STATEMENT_MIN = 100;
export const STATEMENT_MAX = 4000;

const ar = (n: number) => String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);

/** رسالةُ عطب البيان أو `null` إن استقام — نصٌّ واحد لا يفترق بين العميل والخادم. */
export function statementError(s: string): string | null {
  if (s.length < STATEMENT_MIN) return `بيان الترشّح قصيرٌ جدًّا (${ar(STATEMENT_MIN)} حرفٍ على الأقلّ).`;
  if (s.length > STATEMENT_MAX) return `بيان الترشّح طويلٌ جدًّا (${ar(STATEMENT_MAX)} حرفٍ حدًّا أقصى).`;
  return null;
}

/* ══ حالة المرشّح ════════════════════════════════════════════════════ */

export type CandidateStatus = "pending" | "approved" | "rejected" | "needs_edit" | "withdrawn";

export const CANDIDATE_STATUS_META: Record<CandidateStatus, { label: string; tone: "success" | "warning" | "danger" | "neutral" | "info" }> = {
  pending:    { label: "قيد المراجعة",  tone: "warning" },
  approved:   { label: "معتمَد",        tone: "success" },
  needs_edit: { label: "يحتاج تعديلًا", tone: "warning" },
  rejected:   { label: "مرفوض",         tone: "danger" },
  withdrawn:  { label: "منسحب",         tone: "neutral" },
};

/**
 * الحكمُ **فعلًا مبنيًّا للمجهول** («اعتُمد بواسطة فلانة» — صيغةُ المالك ٢٠٢٦-٠٨-١٤): والفعلُ
 * هنا يتبع الترشّحَ لا المراجع، فيستوي فيه الرجلُ والمرأة — والجنسُ هنا جنسُ المراجع، وهو ما
 * لا تحمله صفوفُ المراجعة أصلًا. وما لا حكمَ فيه لا يُنسَب إلى أحد.
 */
export const DECISION_VERB: Partial<Record<CandidateStatus, string>> = {
  approved: "اعتُمد",
  rejected: "رُفض",
  needs_edit: "طُلب تعديله",
};

/** سطرُ القرار في مرشّح: ما الحكمُ ومَن أصدره، أو لماذا لا حكمَ فيه بعد. */
export function decisionLine(status: CandidateStatus, by: string | null): string {
  const verb = DECISION_VERB[status];
  // حكمٌ قائمٌ بلا صاحبٍ معروف: صفٌّ قديمٌ سبق تسجيلَ المراجع — يُقال الحكمُ ولا يُخترَع له فاعل
  if (verb) return by ? `${verb} بواسطة ${by}` : verb;
  if (status === "withdrawn") return "انسحب قبل أن يُقرَّر فيه";
  return "لم يُقرَّر فيه بعد";
}

/**
 * نغمةُ كرت المرشّح — من حالته لا من شيءٍ آخر، فيتّفق سطحُ الكرت مع شارته ولا يقولان قولين.
 * و«يحتاج تعديلًا» يلبس التحذير: نغمةُ `info` لا وجود لها في الكروت، وحالُه حالُ فعلٍ منتظَر.
 */
export const CANDIDATE_CARD_TONE: Record<CandidateStatus, "success" | "warning" | "danger" | "neutral"> = {
  pending: "warning",
  approved: "success",
  needs_edit: "warning",
  rejected: "danger",
  withdrawn: "neutral",
};

/* ══ التذكير والتأنيث ════════════════════════════════════════════════ */

/**
 * لفظٌ يتبع جنسَ صاحبه («الفائز» · «الفائزة»). **القاعدةُ هنا واللفظُ في موضعه**: هذا الملفّ يملك
 * أنّ `female` هي الأنثى وأنّ **المجهولَ يُذكَّر** (الأصلُ في العربيّة، ومن لم يُسجَّل جنسُه لا يُخترَع له)،
 * ولا يملك معجمًا لكلّ جملةٍ في اللوحة — فمن أراد لفظين كتبهما عند استعماله ولم يبحث عنهما هنا.
 *
 * ومصدرُ الجنس `profiles.gender` كما في كلّ اللوحة (سابقةُ أيقونة الأفتار).
 */
export const byGender = (gender: string | null | undefined, male: string, female: string): string =>
  gender === "female" ? female : male;
