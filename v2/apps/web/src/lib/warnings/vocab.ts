/**
 * مفردات الإنذارات — **المصدر الواحد** بوجهه العميليّ. وجهُه الآخر قيدُ `category` في
 * `member_warnings`؛ فمن زاد تصنيفًا زاده في القيد وهنا معًا (والقاعدة تردّ ما لم يُزَد).
 */

export const WARNING_CATEGORIES = [
  { value: "absence", label: "غياب" },
  { value: "lateness", label: "تأخّر" },
  { value: "task_neglect", label: "تقصير في مهمّة" },
  { value: "unresponsive", label: "انقطاع تواصل" },
  { value: "conduct", label: "مخالفة سلوك" },
  { value: "policy", label: "مخالفة الدستور" },
  { value: "other", label: "أخرى" },
] as const;

export type WarningCategory = (typeof WARNING_CATEGORIES)[number]["value"];

const LABEL = new Map<string, string>(WARNING_CATEGORIES.map((c) => [c.value, c.label]));

/** اسم التصنيف عربيًّا — والمجهول يُقال كما هو لا يُخفى (خبرٌ خيرٌ من فراغ). */
export const categoryLabel = (value: string): string => LABEL.get(value) ?? value;

/**
 * **جملة الملاحظة** — التصنيف مقولًا بلسان الخطاب لا وسمًا في جدول.
 *
 * أصلُها جملةُ البوست الذي كان يُكتب يدويًّا («لوحظ عدم وجود تفاعل مع المهام المسندة إليك»)،
 * وقد تبيّن أنّها **هي التصنيف نفسه** — فصار لكلّ تصنيفٍ جملتُه، ويبقى ما يكتبه المُصدِر
 * تفصيلًا بعدها. (قرار المالك 20260802.)
 */
// **ولا تُذكَر اللجنة في النصّ** (قرار المالك 20260802): الخطاب من إدارة الموارد إلى العضو،
// ولجنتُه معروفةٌ له ومكتوبةٌ في السجلّ — فذكرُها في كلّ جملةٍ حشوٌ يُقحِم «ضمن لجنة كذا»
// حيث لا تستقيم. والغيابُ وحده قُيِّد بـ«ضمن مهامك» لأنّ الغياب عن شيءٍ يحتاج متعلَّقًا.
const OBSERVATION: Record<string, string> = {
  absence: "من خلال المتابعة خلال الفترة الماضية لوحظ تكرّر غيابك عن الاجتماعات والأعمال ضمن مهامك",
  lateness: "من خلال المتابعة خلال الفترة الماضية لوحظ تكرّر التأخّر عن المواعيد المتّفق عليها",
  task_neglect: "من خلال المتابعة خلال الفترة الماضية لوحظ عدم وجود تفاعل مع المهام المسندة إليك",
  unresponsive: "من خلال المتابعة خلال الفترة الماضية لوحظ انقطاع تواصلك داخل أدِيب",
  conduct: "قد وردنا ما يخالف السلوك والآداب العامة وفق دستور أدِيب",
  policy: "قد لوحظت مخالفة لدستور أدِيب",
  other: "قد لوحظ ما يستوجب التنبيه",
};

/** جملةُ الملاحظة تامّةً — تلي «نودّ إشعارك بأنّه…» في الخطاب والرسالة. */
export const observationSentence = (category: string): string => OBSERVATION[category] ?? OBSERVATION.other;

/** اسمُ اللائحة عندنا — **دستور أدِيب** (لا «لائحة الالتزام»). مصدرٌ واحد يقوله الخطاب والرسالة. */
export const CHARTER = "دستور أدِيب";

/**
 * رتبةُ الإنذار كلمةً: «الإنذار الأوّل». ولا تُكتب الأرقام بعد الثالث لأنّ الحدّ ثلاثة —
 * وما جاوزه (لو رُفع الحدّ يومًا) يُقال رقمًا لا اجتهادًا في الصرف.
 */
export function ordinalWord(n: number): string {
  return n === 1 ? "الأوّل" : n === 2 ? "الثاني" : n === 3 ? "الثالث" : `رقم ${n}`;
}

/** «الإنذار الثاني» — الوصف الكامل كما يُقرأ في الشاشة وفي الخطاب والرسالة. */
export const warningTitle = (n: number): string => `الإنذار ${ordinalWord(n)}`;

/** «إنذارٌ أوّل» — الرتبة نكرةً لعنوان الخطاب (لا تُشتقّ بقصّ «ال» من المعرّفة). */
export function ordinalBare(n: number): string {
  return n === 1 ? "أوّل" : n === 2 ? "ثانٍ" : n === 3 ? "ثالث" : `رقم ${n}`;
}

/** ما بقي قبل سحب العضويّة — بتمييزٍ عربيّ صحيح، ومصدرُه الحدّ لا رقمٌ محفور. */
export function remainingText(activeCount: number, limit: number): string {
  const left = Math.max(0, limit - activeCount);
  if (left === 0) return "بلغ الحدّ";
  if (left === 1) return "بقي إنذارٌ واحد";
  if (left === 2) return "بقي إنذاران";
  return `بقي ${left} إنذارات`;
}

/** الحدُّ كلمةً لا رقمًا في نصّ الخطاب («ثلاثة إنذارات» لا «3 إنذارات») — والكبيرُ يُقال رقمًا. */
const WORDS = ["صفر", "واحد", "اثنين", "ثلاثة", "أربعة", "خمسة", "ستّة", "سبعة", "ثمانية", "تسعة", "عشرة"];
export const countWord = (n: number): string => WORDS[n] ?? String(n);

/** «●●○» — الحدّ نقاطٌ تُملأ بالسواري. حروفٌ لا أنماط: تُقرأ في الجدول وفي رأس الطيّ سواء. */
export function dots(activeCount: number, limit: number): string {
  const filled = Math.min(activeCount, limit);
  return "●".repeat(filled) + "○".repeat(Math.max(0, limit - filled));
}

/** نغمةُ الصفّ تتبع قربَه من الحدّ — لا رقمًا محفورًا: آخرُ إنذارٍ قبل السحب أحمر. */
export function toneOf(ordinal: number, limit: number): "warning" | "danger" {
  return ordinal >= limit ? "danger" : "warning";
}
