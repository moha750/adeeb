// مفردات الاستبيانات — لا تعتمد على شيء خادميّ، فيستوردها الخادم والعميل معًا بأمان
// (اللوحة وصفحة الاستجابة العامّة). كلّ قيمة هنا يحرسها قيدٌ مقابل في القاعدة:
// surveys_status_check · surveys_access_type_check · survey_questions_question_type_check.
// لا تُضِف قيمة قبل توسيع القيد بترحيل مقابل.

/* ══ الحالة ══════════════════════════════════════════════════════════ */

// الحالة **الحقيقيّة** رباعيّة؛ والأرشفةُ والحذفُ عَلَمان متعامدان (archived_at/deleted_at) لا حالتان.
export type SurveyStatus = "draft" | "active" | "paused" | "closed";

export const STATUS_META: Record<SurveyStatus, { label: string; tone: "success" | "warning" | "danger" | "neutral" | "info" }> = {
  draft: { label: "مسودّة", tone: "info" },
  active: { label: "نشط", tone: "success" },
  paused: { label: "متوقّف مؤقّتًا", tone: "warning" },
  closed: { label: "منتهٍ", tone: "neutral" },
};

/**
 * حالة دورة الحياة المرئيّة — الحالة الحقيقيّة (٤) + عَلَما الأرشفة والحذف المتعامدان.
 * يقرؤها حارسُ الأفعال في الواجهة (بناء القائمة) والفعلِ الخادميّ (التحقّق) معًا.
 */
export type LifecycleState = { status: SurveyStatus; archived: boolean; deleted: boolean };

/**
 * الأفعال المشروعة — مصدرٌ واحد للقائمة وللتحقّق الخادميّ. لكلٍّ حارسٌ (`when`) يقرأ الحالة والعلمين.
 * **الأثر** (أيّ أعمدة تُكتب) يملكه الفعل الخادميّ `setSurveyStatus` — إذ يلزمه طوابع الوقت والفاعل.
 * الأرشفة/الحذف عَلَمان (لا يمسّان الحالة)؛ و«إعادة الفتح» تعيد للنشط مباشرةً **وتمسح موعد النهاية** (سببَ الإغلاق).
 */
type Op = { when: (s: LifecycleState) => boolean; label: string };
export const STATUS_OPS = {
  publish:    { when: (s) => !s.deleted && !s.archived && (s.status === "draft" || s.status === "paused"), label: "نشر الاستبيان" },
  pause:      { when: (s) => !s.deleted && !s.archived && s.status === "active", label: "إيقاف مؤقّت" },
  close:      { when: (s) => !s.deleted && !s.archived && (s.status === "active" || s.status === "paused"), label: "إنهاء الاستبيان" },
  reopen:     { when: (s) => !s.deleted && !s.archived && s.status === "closed", label: "إعادة فتح" },
  archive:    { when: (s) => !s.deleted && !s.archived && s.status === "closed", label: "أرشفة" },
  unarchive:  { when: (s) => !s.deleted && s.archived, label: "إلغاء الأرشفة" },
  softDelete: { when: (s) => !s.deleted, label: "نقل إلى المحذوفات" },
  restore:    { when: (s) => s.deleted, label: "استعادة" },
} satisfies Record<string, Op>;
export type StatusOp = keyof typeof STATUS_OPS;

/* ══ الوصول ══════════════════════════════════════════════════════════ */

export type AccessType = "public" | "members_only";

export const ACCESS_TYPES: { value: AccessType; label: string }[] = [
  { value: "public", label: "عامّ: يجيب أيّ زائر" },
  { value: "members_only", label: "للأعضاء فقط: يتطلّب عضويّة نشطة" },
];
export const ACCESS_LABEL: Record<AccessType, string> = { public: "عامّ", members_only: "للأعضاء" };

/* ══ أنواع الأسئلة ══════════════════════════════════════════════════ */

export type QuestionType =
  | "short_text" | "long_text" | "single_choice" | "multiple_choice" | "dropdown"
  | "yes_no" | "rating_stars" | "linear_scale" | "number"
  | "date" | "time" | "datetime" | "email" | "phone" | "url";

export const QUESTION_TYPES: { value: QuestionType; label: string; group: string }[] = [
  { value: "short_text", label: "نصّ قصير", group: "نصّ" },
  { value: "long_text", label: "نصّ طويل", group: "نصّ" },
  { value: "single_choice", label: "اختيار واحد", group: "اختيار" },
  { value: "multiple_choice", label: "اختيارات متعدّدة", group: "اختيار" },
  { value: "dropdown", label: "قائمة منسدلة", group: "اختيار" },
  { value: "yes_no", label: "نعم / لا", group: "اختيار" },
  { value: "rating_stars", label: "تقييم بالنجوم", group: "تقييم" },
  { value: "linear_scale", label: "مقياس خطّيّ", group: "تقييم" },
  { value: "number", label: "رقم", group: "قيمة" },
  { value: "date", label: "تاريخ", group: "قيمة" },
  { value: "time", label: "وقت", group: "قيمة" },
  { value: "datetime", label: "تاريخ ووقت", group: "قيمة" },
  { value: "email", label: "بريد إلكترونيّ", group: "قيمة" },
  { value: "phone", label: "رقم جوّال", group: "قيمة" },
  { value: "url", label: "رابط", group: "قيمة" },
];

export const QUESTION_TYPE_LABEL: Record<string, string> = Object.fromEntries(QUESTION_TYPES.map((t) => [t.value, t.label]));
export const QUESTION_TYPE_VALUES: string[] = QUESTION_TYPES.map((t) => t.value);

/** الأنواع ذات الخيارات — تخزّن `options.choices` وتُجاب بهُويّة الخيار لا نصّه. */
export const hasChoices = (t: string): boolean => t === "single_choice" || t === "multiple_choice" || t === "dropdown";
/** الأنواع ذات المقياس — تخزّن `options.scale = {min,max}` وتُجاب برقم ضمنه. */
export const hasScale = (t: string): boolean => t === "rating_stars" || t === "linear_scale";

/**
 * خيار سؤال — الهُويّة ثابتة (`c1`, `c2`, …) والتسمية حرّة التعديل:
 * إعادة تسمية خيارٍ لا تمسّ الإجابات المخزّنة بهُويّته.
 * `retired` = خيار أُزيل من النموذج وله إجابات تاريخيّة — لا يُعرض للمجيب ويبقى في التجميع.
 */
export type Choice = { id: string; label: string; retired?: boolean };

/** شكل عمود options في survey_questions. */
export type QuestionOptions = {
  choices?: Choice[];
  scale?: { min: number; max: number };
} | null;

/** حدود المقياس المقبولة — يتحقّق منها النموذج والفعل الخادميّ معًا. */
export const SCALE_MIN = 0;
export const SCALE_MAX = 10;

/** أطول إجابة نصيّة يقبلها الخادم (تطابق حدّ submit_survey_response في القاعدة). */
export const MAX_TEXT_ANSWER = 10000;

/* ══ رسائل أخطاء الإرسال ═════════════════════════════════════════════ */

/**
 * رموز أخطاء submit_survey_response → رسائل عربيّة.
 * الدالّة ترفع برمز ثابت (وقد يلحقه `:qid`) — الخادم يترجمه هنا قبل عرضه.
 */
export const SUBMIT_ERRORS: Record<string, string> = {
  invalid_answers: "تعذّر قراءة الإجابات. أعد المحاولة.",
  not_found: "هذا الاستبيان غير موجود.",
  not_active: "هذا الاستبيان غير متاح حاليًّا.",
  not_started: "لم يبدأ استقبال الإجابات بعد.",
  ended: "انتهت مدّة هذا الاستبيان.",
  members_only: "هذا الاستبيان لأعضاء أديب. سجّل دخولك بعضويّة نشطة.",
  already_answered: "سبق أن أجبت على هذا الاستبيان.",
  foreign_question: "تعذّر التحقّق من الإجابات. حدّث الصفحة وأعد المحاولة.",
  required_missing: "سؤال إلزاميّ بلا إجابة.",
  bad_answer: "إجابة غير صالحة لأحد الأسئلة.",
  empty_response: "لا إجابات لإرسالها.",
  unknown_type: "نوع سؤال غير مدعوم.",
};

export const submitErrorMessage = (raw: string | null | undefined): string => {
  const code = (raw ?? "").split(":")[0];
  return SUBMIT_ERRORS[code] ?? "تعذّر إرسال الإجابات. حاول مجدّدًا.";
};
