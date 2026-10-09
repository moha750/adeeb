// مفردات الاستبيانات — لا تعتمد على شيء خادميّ، فيستوردها الخادم والعميل معًا بأمان
// (اللوحة وصفحة الاستجابة العامّة). كلّ قيمة هنا يحرسها قيدٌ مقابل في القاعدة:
// surveys_status_check · surveys_access_type_check · survey_questions_question_type_check.
// لا تُضِف قيمة قبل توسيع القيد بترحيل مقابل.
//
// ونصُّ خطأِ البريد والجوّال يُستورَد من `lib/fieldFormats` ولا يُكتب ههنا: جملةٌ واحدةٌ في
// أبواب الموقع كلِّها، ولا يُبدَّل لفظُها في موضعٍ ويُنسى في آخر.
import { EMAIL_HINT, PHONE_HINT } from "@/lib/fieldFormats";

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

/* ══ الملكيّة والمشاركة ══════════════════════════════════════════════ */

/**
 * دورُ المستخدم في استبيانٍ بعينه. **تحسبه القاعدة وحدها** (`survey_access_list`) وهذا مرآتُه:
 * - `owner`: صاحبه. المنشئُ ما دام يملك صلاحية الاستبيانات، وإلّا حسابُ النادي «أَدِيب»
 *   (انتقالٌ محسوبٌ لحظيًّا: إن عادت الصلاحية لصاحبها عادت إليه استبياناته).
 * - `steward`: حسابُ النادي على استبيانِ غيره **المنشور**: يقرأ نتائجه ويتحكّم فيه كاملًا
 *   ليوقف المسيء (قرار محمد 2026-10-08)، ولا يدير المشاركة: تلك خصوصيّةُ صاحبه.
 * - `edit` / `read`: شريكٌ أذِن له صاحبُه (قيد `survey_shares_access_check`). واللفظان لفظا
 *   شركاء الباركود (`qr_link_shares`) حرفًا: إذنُ الشريك سؤالٌ واحدٌ له جوابٌ واحد في النظام.
 * ومن لا دور له لا يرى الاستبيان أصلًا: لا في القائمة ولا برابطٍ مباشر في اللوحة.
 */
export type SurveyRole = "owner" | "steward" | "edit" | "read";
export type ShareLevel = Extract<SurveyRole, "edit" | "read">;

export const SURVEY_ROLE_VALUES: SurveyRole[] = ["owner", "steward", "edit", "read"];
export const isSurveyRole = (v: unknown): v is SurveyRole =>
  typeof v === "string" && (SURVEY_ROLE_VALUES as string[]).includes(v);
export const isShareLevel = (v: unknown): v is ShareLevel => v === "read" || v === "edit";

/** ما يُفعل باستبيان: كلُّ فعلٍ في الغرفة يسأل عن واحدٍ منها، في الواجهة والخادم معًا. */
export type SurveyCan = "see" | "results" | "edit" | "lifecycle" | "archive" | "delete" | "share";

/**
 * **المصفوفةُ الواحدة: من يفعل ماذا.** الواجهةُ تُخفي بها ما لا يحقّ، والخادمُ يرفض بها ما
 * يصله على كلّ حال (إخفاءُ الزرّ ليس حارسًا). «يقرأ» يرى الاستبيانَ ونتائجه، و«يحرّر» يضيف
 * المحتوى والنشرَ والإيقافَ والإنهاء، والأرشفةُ والحذفُ وإدارةُ المشاركة لصاحبه وحده.
 */
export const SURVEY_CAN: Record<SurveyRole, readonly SurveyCan[]> = {
  owner:   ["see", "results", "edit", "lifecycle", "archive", "delete", "share"],
  steward: ["see", "results", "edit", "lifecycle", "archive", "delete"],
  edit:    ["see", "results", "edit", "lifecycle"],
  read:    ["see", "results"],
};

export const canSurvey = (role: SurveyRole | null | undefined, what: SurveyCan): boolean =>
  !!role && SURVEY_CAN[role].includes(what);

/**
 * **التحريرُ دورٌ وحال:** المؤرشفُ والمحذوفُ مركونان، لا يحرّرهما إلّا من يملك إعادتَهما
 * (صاحبُه وحسابُ النادي). فالشريكُ المحرِّر لا يبدّل استبيانًا ركنه صاحبُه ولا يقدر على ردّه.
 */
export const canEditSurvey = (role: SurveyRole | null | undefined, state: { archived: boolean; deleted: boolean }): boolean =>
  canSurvey(role, "edit") && (!(state.archived || state.deleted) || canSurvey(role, "archive"));

/** ما يحتاجه كلُّ فعلٍ من أفعال دورة الحياة. الحذفُ النهائيّ يحتاج `delete` كالنقل إلى المحذوفات. */
export const OP_NEEDS: Record<StatusOp, SurveyCan> = {
  publish: "lifecycle", pause: "lifecycle", close: "lifecycle", reopen: "lifecycle",
  archive: "archive", unarchive: "archive",
  softDelete: "delete", restore: "delete",
};

/** رموز `survey_share_set`/`survey_share_remove` إلى رسائل عربيّة. */
export const SHARE_ERRORS: Record<string, string> = {
  bad_access: "إذنٌ غير معروف.",
  not_owner: "المشاركة يديرها صاحب الاستبيان وحده.",
  self_share: "لا يُشارَك الاستبيان مع صاحبه.",
  not_manager: "المشاركة لمن يملك صلاحية الاستبيانات وحده.",
  club_account: "حسابُ النادي يرى الاستبيانات المنشورة أصلًا، فلا يُشارَك معه.",
};

export const shareErrorMessage = (raw: string | null | undefined): string => {
  const code = (raw ?? "").split(":")[0].trim();
  return SHARE_ERRORS[code] ?? "تعذّر حفظ المشاركة. حاول مجدّدًا.";
};

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
  members_only: "هذا الاستبيان لأعضاء أدِيب. سجّل دخولك بعضويّة نشطة.",
  already_answered: "سبق أن أجبت على هذا الاستبيان.",
  foreign_question: "تعذّر التحقّق من الإجابات. حدّث الصفحة وأعد المحاولة.",
  required_missing: "سؤال إلزاميّ بلا إجابة.",
  bad_answer: "إجابة غير صالحة لأحد الأسئلة.",
  // صيغتان تُحرسان في القاعدة كما تُحرسان في الشاشة — واللفظ من `lib/fieldFormats` نفسه
  bad_email: `${EMAIL_HINT} في أحد الأسئلة`,
  bad_phone: `${PHONE_HINT} في أحد الأسئلة`,
  empty_response: "لا إجابات لإرسالها.",
  unknown_type: "نوع سؤال غير مدعوم.",
};

export const submitErrorMessage = (raw: string | null | undefined): string => {
  const code = (raw ?? "").split(":")[0];
  return SUBMIT_ERRORS[code] ?? "تعذّر إرسال الإجابات. حاول مجدّدًا.";
};
