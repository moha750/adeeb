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

export const STATUS_META: Record<ElectionStatus, { label: string; tone: "success" | "warning" | "danger" | "neutral" | "info"; live?: boolean }> = {
  candidacy_open:   { label: "ترشّح مفتوح", tone: "info",    live: true },
  candidacy_closed: { label: "ترشّح مغلق",  tone: "warning" },
  voting_open:      { label: "تصويت جارٍ",  tone: "success", live: true },
  voting_closed:    { label: "تصويت مغلق",  tone: "warning" },
  completed:        { label: "مكتمل",       tone: "neutral" },
  cancelled:        { label: "ملغى",        tone: "danger" },
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

/* ══ حالة المرشّح ════════════════════════════════════════════════════ */

export type CandidateStatus = "pending" | "approved" | "rejected" | "needs_edit" | "withdrawn";

export const CANDIDATE_STATUS_META: Record<CandidateStatus, { label: string; tone: "success" | "warning" | "danger" | "neutral" | "info" }> = {
  pending:    { label: "قيد المراجعة",  tone: "warning" },
  approved:   { label: "معتمَد",        tone: "success" },
  needs_edit: { label: "يحتاج تعديلًا", tone: "info" },
  rejected:   { label: "مرفوض",         tone: "danger" },
  withdrawn:  { label: "منسحب",         tone: "neutral" },
};
