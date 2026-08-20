// مفردات غرفة التحرير — لا تعتمد على شيء خادميّ، فيستوردها الخادم والعميل معًا بأمان.
// كلّ قيمة هنا يحرسها قيدٌ مقابل في القاعدة:
//   news_workflow_status_check · news_category_check · news_assigned_fields_known ·
//   news_writer_assignments_status_check.
// لا تُضِف قيمة قبل توسيع القيد بترحيل مقابل.

/* ══ الحالة التحريريّة ═══════════════════════════════════════════════ */

/**
 * ستّ مراحل تقطعها المادّة من فكرةٍ إلى منشور:
 *
 *   مسودّة ──تكليف──► مُكلَّف ──أوّل تحرير──► قيد الكتابة ──رفع──► جاهز للمراجعة
 *                                     ▲                              │
 *                                     └──────── إعادة بملاحظة ◄──────┘
 *                                                     نشر ◄──────────┘
 */
export type Workflow =
  | "draft" | "assigned" | "in_progress" | "ready_for_review" | "published" | "archived";

/** نغمات الشارة كما تعرفها المكتبة — لا «brand» فيها (انظر `Badge.tsx`). */
export type Tone = "neutral" | "info" | "warning" | "success" | "danger";

export const WORKFLOW_META: Record<Workflow, { label: string; tone: Tone; hint: string }> = {
  draft:            { label: "مسودّة",          tone: "neutral", hint: "فكرةٌ لم يُكلَّف بها أحد بعد." },
  assigned:         { label: "مُكلَّف",           tone: "info",    hint: "كُلِّف كاتبها ولم يبدأ." },
  in_progress:      { label: "قيد الكتابة",     tone: "info",    hint: "الكاتب يعمل عليها الآن." },
  ready_for_review: { label: "جاهز للمراجعة",   tone: "warning", hint: "رفعها الكاتب وتنتظر رئيس التحرير." },
  published:        { label: "منشور",           tone: "success", hint: "على الموقع." },
  archived:         { label: "مؤرشف",           tone: "neutral", hint: "أُخرج من الواجهة ويبقى في السجلّ." },
};

export const WORKFLOW_VALUES = Object.keys(WORKFLOW_META) as Workflow[];
export const WORKFLOW_OPTIONS = WORKFLOW_VALUES.map((v) => ({ value: v, label: WORKFLOW_META[v].label }));

/** المراحل التي تعني «العمل جارٍ» — تُعدّ في لوحة الإحصاء وتُبرز في القائمة. */
export const IN_FLIGHT: readonly Workflow[] = ["assigned", "in_progress", "ready_for_review"];

/* ══ القسم ═══════════════════════════════════════════════════════════ */

// القسمُ ودقائقُ القراءة **في النواة** (`@adeeb/core/news`) منذ ٢٠٢٦-٠٨-٢٠: يقرأهما الزائرُ
// في الويب والتطبيقُ في الجوّال، وما دون ذلك في هذا الملفّ تحريريٌّ لا يعرفه إلّا المحرّر.
export { CATEGORY_META, CATEGORY_OPTIONS, CATEGORY_VALUES, readingMinutes, wordCount } from "@adeeb/core/news";
export type { Category } from "@adeeb/core/news";

/* ══ حقول التكليف ════════════════════════════════════════════════════ */

/**
 * ما الذي يملك الكاتب تحريره؟ **مصدرٌ واحد**: `news_writer_assignments.assigned_fields`.
 * (كان المعنى مكرّرًا في `news.available_fields` وجدول `news_field_permissions` —
 * وكلاهما مهجورٌ لم يُستعمل قطّ، ومسجَّلٌ في قائمة موت V1.)
 */
export type FieldKey =
  | "title" | "summary" | "content" | "tags" | "category" | "authors"
  | "image_url" | "gallery_images" | "cover_photographer" | "gallery_photographers";

export const FIELD_META: Record<FieldKey, { label: string; group: "نصّ" | "وسائط" }> = {
  title:                 { label: "العنوان",          group: "نصّ" },
  summary:               { label: "الملخّص",           group: "نصّ" },
  content:               { label: "المتن",            group: "نصّ" },
  tags:                  { label: "الوسوم",           group: "نصّ" },
  category:              { label: "القسم",            group: "نصّ" },
  authors:               { label: "الكتّاب",           group: "نصّ" },
  image_url:             { label: "صورة الغلاف",      group: "وسائط" },
  gallery_images:        { label: "معرض الصور",       group: "وسائط" },
  cover_photographer:    { label: "مصوّر الغلاف",      group: "وسائط" },
  gallery_photographers: { label: "مصوّرو المعرض",     group: "وسائط" },
};

export const FIELD_VALUES = Object.keys(FIELD_META) as FieldKey[];

/** ما يُكلَّف به الكاتب افتراضًا: الكلمة له، والصورة لأهلها. */
export const DEFAULT_FIELDS: FieldKey[] = ["title", "summary", "content", "tags", "authors"];

/* ══ حالة التكليف ════════════════════════════════════════════════════ */

export type AssignmentStatus = "pending" | "accepted" | "declined" | "in_progress" | "completed";

export const ASSIGNMENT_META: Record<AssignmentStatus, { label: string; tone: Tone }> = {
  pending:     { label: "لم يبدأ",   tone: "neutral" },
  accepted:    { label: "قَبِل",      tone: "info" },
  declined:    { label: "اعتذر",     tone: "danger" },
  in_progress: { label: "يكتب",      tone: "info" },
  completed:   { label: "أنهى",      tone: "success" },
};

/* ══ ما ينقص الخبر قبل النشر ═════════════════════════════════════════ */

export type Publishable = {
  summary: string | null;
  imageUrl: string | null;
  authors: string[];
  content: string | null;
};

/**
 * أسماء ما ينقص الخبر ليصلح للنشر — **بالمرآة نفسها** التي يحرس بها القيد
 * `news_publish_guard` في القاعدة. الواجهة تقولها قبل الضغط، والقاعدة تردّها بعده.
 */
export function missingForPublish(n: Publishable): string[] {
  const gaps: string[] = [];
  if (!n.content?.trim()) gaps.push("المتن");
  if (!n.summary?.trim()) gaps.push("الملخّص");
  if (!n.imageUrl?.trim()) gaps.push("صورة الغلاف");
  if (!n.authors.length) gaps.push("اسم الكاتب");
  return gaps;
}

