// حقول العضويّة المشتركة — المصدر الواحد لقواعد الحقول التي تتكرّر عبر النظام:
// إكمال سجلّ العضو (/complete) · تحرير العضو في اللوحة · ملفّه الشخصيّ.
// لا تعتمد على شيء خادميّ، فيستوردها الخادم والعميل معًا بأمان.
// (رُفعت من dashboard/members/vocab.ts ليشاركها مسار المتقدّم العامّ دون استيرادٍ عابرٍ من مجلّد اللوحة؛
//  ذاك الملفّ يعيد تصديرها الآن، فلا يُكسَر أيّ مستورد.)

/**
 * مفردات الدرجة الأكاديميّة — مصدر واحد مرتّب.
 * القيمة رمزٌ إنجليزيّ يحرسه القيد member_details_academic_degree_check في القاعدة (والعمود NOT NULL)،
 * والتسمية عربيّة للعرض فقط. لا تُضِف قيمة هنا قبل توسيع القيد، ولا تكتب التسمية في العمود.
 */
export const DEGREES: { value: string; label: string }[] = [
  { value: "high_school", label: "ثانوية عامة" },
  { value: "employee", label: "موظف" },
  { value: "diploma", label: "دبلوم" },
  { value: "bachelor", label: "بكالوريوس" },
  { value: "master", label: "ماجستير" },
  { value: "phd", label: "دكتوراه" },
];

export const DEGREE_VALUES: string[] = DEGREES.map((d) => d.value);

/**
 * هل تصحب الدرجةَ كلّيةٌ وتخصّصٌ ورقمٌ أكاديميّ؟ — مصدر واحد للطبقات الثلاث:
 * النموذج (يُظهر الحقول ويُلزمها) · الفعل الخادميّ (يكتب أو يمحو) · القيد member_details_academic_fields_check.
 *
 * القاعدة ثنائيّة لا ثلاثيّة: من له درجة جامعيّة تلزمه الثلاثة، ومن لا (ثانوية عامة · موظف) يُمنع منها.
 * لا منزلة بين المنزلتين — القيد يرفض الفارغ في الأولى، ويرفض الممتلئ في الثانية.
 */
const ACADEMIC_DEGREES = new Set(["diploma", "bachelor", "master", "phd"]);
export const hasAcademicFields = (degree: string | null | undefined): boolean =>
  !!degree && ACADEMIC_DEGREES.has(degree);

/**
 * صيغة الجوّال — **انتقلت إلى `lib/fieldFormats`** وتُعاد من هنا فلا يُكسَر مستورد:
 * الجوّال يُكتب في أبوابٍ لا علاقة لها بالعضويّة (التسجيل · حجز فعاليّة · إجابة استبيان)،
 * فلا يليق أن يكون مصدرُه ملفَّ «حقول العضويّة».
 */
export { PHONE_RE, PHONE_HINT, PHONE_PREFIX } from "./fieldFormats";

/* ══ أطوال الحقول الرقميّة ═══════════════════════════════════════════════════════
 * الرقمُ الأقصى لكلّ حقلٍ رقميّ — **مصدرٌ واحد يخدم طبقتين**: `maxLength` على المُدخَل
 * (فيتوقّف الحقل عند الحدّ بدل أن يبتلع ما لا يُقبل)، والتعابيرُ التي تُبنى منه أدناه
 * (فيردّ المخطّطُ ما جاء من غير النموذج).
 *
 * وبلا الحدّ على المُدخَل كان الحقلُ يقبل عشرين رقمًا صامتًا ثمّ يردّها عند الحفظ —
 * والحارسُ الذي يمنع بعد الفعل أسوأ من الذي يمنع قبله. */
export { PHONE_LEN } from "./fieldFormats";
export const NATIONAL_ID_LEN = 10;
/** الرقم الأكاديميّ يتفاوت بين الجامعات — فحدُّه مدًى لا رقمٌ واحد. */
export const RECORD_NO_MIN = 6;
export const RECORD_NO_MAX = 12;

export const NATIONAL_ID_RE = new RegExp(`^[0-9]{${NATIONAL_ID_LEN}}$`);
export const NATIONAL_ID_HINT = `رقم الهويّة ${NATIONAL_ID_LEN} أرقام`;
export const RECORD_NO_RE = new RegExp(`^[0-9]{${RECORD_NO_MIN},${RECORD_NO_MAX}}$`);
export const RECORD_NO_HINT = `الرقم الأكاديميّ مطلوب (${RECORD_NO_MIN}–${RECORD_NO_MAX} رقمًا)`;

/* ══ التواصل الاجتماعيّ ══════════════════════════════════════════════════════════
 * الصيغة المعياريّة للتخزين: **المعرّف مجرّدًا** — بلا @ ولا رابط ولا مضيف.
 * مصدر واحد للطبقات الأربع: النموذج · الفعل الخادميّ · قيد member_details_social_handle_check · باني الرابط.
 * قبلها كانت الأعمدة تخزّن ثلاث صيغ معًا (@معرّف · رابط كامل بمعاملات تتبّع · معرّف مجرّد)،
 * فكان كلّ قارئ يرقّع وحده — وروابط لينكدإن تُعرض بمعاملاتها كأنّها أسماء حسابات.
 */

export type SocialKey = "twitter" | "instagram" | "tiktok" | "linkedin";

/** شكل المعرّف المقبول. `%` مسموح لسبيكة لينكدإن العربيّة المُرمَّزة (`%D8%B1…`) — رابطها يعمل بها كما هي. */
export const SOCIAL_HANDLE_RE = /^[A-Za-z0-9._%-]+$/;

/**
 * لكلّ منصّة: مضيفها · مسار معرّفها · بانـي رابطها · هل تُزيَّن بـ@ عند العرض.
 * لينكدإن بلا @ — لا عرف له بها (صفر من ٣٦ قيمة تحملها)، ومعرّفه سبيكة في ‎/in/‎.
 */
const SOCIAL: Record<SocialKey, { label: string; host: RegExp; path: RegExp; url: (h: string) => string; at: boolean }> = {
  twitter: { label: "منصّة X", host: /(?:twitter|x)\.com/i, path: /(?:twitter|x)\.com\/@?([^/?#]+)/i, url: (h) => `https://x.com/${h}`, at: true },
  instagram: { label: "إنستغرام", host: /instagram\.com/i, path: /instagram\.com\/@?([^/?#]+)/i, url: (h) => `https://instagram.com/${h}`, at: true },
  tiktok: { label: "تيك توك", host: /tiktok\.com/i, path: /tiktok\.com\/@?([^/?#]+)/i, url: (h) => `https://tiktok.com/@${h}`, at: true },
  linkedin: { label: "لينكدإن", host: /linkedin\.com/i, path: /linkedin\.com\/(?:in|pub)\/([^/?#]+)/i, url: (h) => `https://linkedin.com/in/${h}`, at: false },
};

/** ترتيب المنصّات المعتمَد — يحكم النموذج وبطاقة العرض معًا. */
export const SOCIAL_KEYS: SocialKey[] = ["twitter", "instagram", "tiktok", "linkedin"];

/** عمود المعرّف في member_details — الاشتقاق مقصود: الأعمدة الأربعة على نسقٍ واحد. */
export const socialColumn = (key: SocialKey): string => `${key}_account`;

/** تسمية المنصّة العربيّة. */
export const socialLabelOf = (key: SocialKey): string => SOCIAL[key].label;

/** هل يبدو المُدخَل رابطًا/مضيفًا؟ — يطابق تعبير الترحيل حرفًا بحرف، فلا تفترق الطبقتان. */
const URLISH = /^https?:\/\//i;
const HOSTISH = /[a-z0-9-]+\.(com|co|me|net)/i;

export type SocialResult =
  | { ok: true; handle: string | null } // null = الحقل فارغ (مقبول)
  | { ok: false; reason: string }; // رسالة عربيّة تُعرض للمستخدم

/**
 * يُطبّع مُدخَل حقل التواصل إلى معرّف مجرّد — يقبل ما اعتاد الناس لصقه:
 * رابطًا كاملًا بمعاملات تتبّع · `@معرّف` · `معرّف@` (شائع: ٦ قيم) · المعرّف وحده.
 *
 * ويردّ ما ليس معرّفًا: رابط منصّة أخرى (عضوة لصقت رابط X في أعمدتها الأربعة)،
 * واسم الشخص بدل معرّفه (`Hawra ALFARHAN` — يبني رابطًا مكسورًا)، والحشو (`لا يوجد` · `برايفت`).
 * الردّ رسالةٌ لا محوٌ صامت: النموذج يقول للمدير ما الخطب، ولا يبتلع ما كتبه.
 */
export function socialHandle(key: SocialKey, raw: string | null | undefined): SocialResult {
  // محارف الاتّجاه الخفيّة تلتصق عند اللصق العربيّ فتُفسد المطابقة — تُنزع أوّلًا
  const t = raw?.replace(/[‎‏‪-‮]/g, "").trim();
  if (!t) return { ok: true, handle: null };

  const s = SOCIAL[key];
  let h: string;
  if (URLISH.test(t) || HOSTISH.test(t)) {
    if (!s.host.test(t)) return { ok: false, reason: "هذا رابط منصّة أخرى. الصق رابط هذا الحساب أو اكتب معرّفه." };
    const m = s.path.exec(t);
    if (!m?.[1]) return { ok: false, reason: "تعذّر استخراج المعرّف من الرابط. اكتبه مباشرةً." };
    h = m[1];
  } else {
    h = t.replace(/^@+|@+$/g, ""); // @ في الطرفين: الناس يكتبونها هنا وهناك
  }

  if (!h) return { ok: true, handle: null };
  if (!SOCIAL_HANDLE_RE.test(h)) return { ok: false, reason: "معرّف غير صالح. اكتب معرّف الحساب لا اسم صاحبه." };
  return { ok: true, handle: h };
}

/** المعرّف المجرّد → رابط الحساب. يفترض التخزين المعياريّ، فلا يرقّع صيغًا أخرى. */
export const socialUrl = (key: SocialKey, handle: string): string => SOCIAL[key].url(handle);

/** المعرّف المجرّد → نصّ العرض: `@معرّف` للثلاث، ومجرّدًا للينكدإن. */
export const socialLabel = (key: SocialKey, handle: string): string => (SOCIAL[key].at ? `@${handle}` : handle);

/** الرمز → التسمية؛ يرتدّ إلى الرمز الخام إن ورد ما ليس في المفردات (فلا يختفي الحقل صامتًا). */
export const DEGREE_LABEL: Record<string, string> = Object.fromEntries(DEGREES.map((d) => [d.value, d.label]));
export const formatDegree = (v: string | null | undefined): string | null => (v ? DEGREE_LABEL[v] ?? v : null);

/**
 * **أسبابُ إنهاء العضوية المتكرّرة** — بألفاظ المالك (٢٠٢٦-٠٨-٠٧): تُختار من قائمةٍ بدل أن
 * تُكتب كلَّ مرّة، فيتّحد لفظُ السبب في السجلّ ويُقرأ كشفُ السابقين مجموعًا لا تسعَ صياغاتٍ
 * لمعنًى واحد (وفي القاعدة اليوم «خروج… دون إبلاغ إدارة الموارد» و«…لجنة الموارد» سببان
 * مختلفان لواقعةٍ واحدة).
 *
 * **والنصّ هو القيمة، لا رمزٌ يُترجَم عند العرض:** `termination_reason` عمودُ نصٍّ حرّ فيه
 * ثلاثٌ وأربعون واقعةً قديمة كُتبت بأيدي أصحابها، فلو صارت الأسباب رموزًا لانقسم الكشف
 * نصفَين: نصفًا يُترجَم ونصفًا خامًا. والقائمةُ توحّد ما يأتي ولا تُعيد كتابة ما مضى.
 *
 * **وهي تُعين الكتابة ولا تحلّ محلّها:** الاختيار يملأ صندوقَ السبب، والصندوقُ يبقى ظاهرًا
 * يُحرَّر بعده (يُزاد عليه تفصيلُ الواقعة أو يُكتب سببٌ ليس فيها). فالمحفوظُ دائمًا ما في
 * الصندوق لا ما في القائمة.
 */
export const TERMINATION_REASONS: readonly string[] = [
  "الغياب المُستمر عن مهام اللجنة الموكلة",
  "مُخالفة أنظمة وسياسات النادي المذكورة بالدستور",
  "إساءة التعامل أو التطاول على الإدارة",
  "طلب العضو إنهاء العضوية",
  "عدم استكمال مُتطلبات الانضمام",
  "عدم تفعيل الحساب خلال المُهلة المُحددة",
  "لأسباب أكاديمية أو شخصية",
  "تسريب معلومات أو ملفات داخلية",
  "عدم التجاوب مع قادة اللجنة أو الإدارة",
];

/** هل هذا النصّ سببٌ من القائمة كما هو؟ — تُسأل ليُعرَف أيُّ خيارٍ يظهر مختارًا بعد التحرير. */
export const isPresetReason = (v: string): boolean => TERMINATION_REASONS.includes(v.trim());
