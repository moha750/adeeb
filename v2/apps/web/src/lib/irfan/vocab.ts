/**
 * مفرداتُ «عِرفان» — بلا إطار، فيقرؤها الخادمُ والعميلُ معًا.
 *
 * **العنوانُ تاجٌ لا قالب** (قرار المالك ٢٠٢٦-١٠-١٧، بعد نقاش «القالب الجاهز» ثمّ «لماذا لا تكون بدل
 * الافتتاحية هي العنوان»): لو كُتبت الرسالةُ سلفًا لوصلت القائدَ عشرُ رسائل متطابقة. فالمرسلُ يختار
 * عنوانًا قصيرًا من قائمة (أو يكتب عنوانه)، ويكتب المتنَ كلَّه بيده، وللمتن حدٌّ أدنى من الطول.
 *
 * والحدُّ الأدنى ١٥ حرفًا لا ٤٠ (المالك ٢٠٢٦-١٠-١٧: «ليس الجميع يمتلك ملكة التعبير»): يكفي ليمنع رسالةً
 * فارغة، ولا يردّ من عنده سطرٌ صادقٌ قصير. والعنوانُ يحمل عنه ما لا يقوله المتن.
 */
export type Gender = "male" | "female" | null | undefined;

export const BODY_MIN = 15;
export const BODY_MAX = 500;
/** أقصى العنوان الذي يكتبه المرسل: سطرٌ واحدٌ في البطاقة بمقاسٍ يُقرأ من بعيد (والقاعدة تقبل إلى ٤٠). */
export const TITLE_MAX = 30;

const f = (g: Gender, male: string, female: string) => (g === "female" ? female : male);

/**
 * **العناوين** (أقرّها المالك في `/ui/irfan` ٢٠٢٦-١٠-١٧): عباراتٌ تامّة لا أنصافُ جمل، تُرسم أكبرَ ما في
 * البطاقة، بجنس المستلم (وبجنس المرسل حيث يتكلّم عن نفسه). و«بلا عنوان» لمن لا يريده. والنصُّ المصوغُ
 * يُحفظ مع الرسالة (`irfan_messages.title`، بين حرفين وأربعين)، فتغييرُ القائمة لا يغيّر ما أُرسل.
 *
 * و«عنوانٌ أكتبه» لمن لم يجد عنوانه في القائمة (المالك: من يختار «بلا عنوان» قد يحسب أنّه سيكتبه
 * بنفسه). فنصُّه ما كتبه المرسل، ويُتحقَّق منه في الخادم (`customTitle`).
 */
export type Heading = { value: string; text: (to: Gender, from: Gender) => string };
export const HEADINGS: Heading[] = [
  { value: "thanks", text: (to) => f(to, "شكرًا لك", "شكرًا لكِ") },
  { value: "grateful", text: (to, from) => `${f(from, "ممتنٌّ", "ممتنّةٌ")} ${f(to, "لك", "لكِ")}` },
  { value: "learned", text: (to) => f(to, "تعلّمتُ منك", "تعلّمتُ منكِ") },
  { value: "impact", text: (to) => f(to, "أثرُك باقٍ", "أثرُكِ باقٍ") },
  { value: "role", text: () => "قدوتي" },
  { value: "custom", text: () => "" },
  { value: "none", text: () => "" },
];

/** تسميةُ الخيار في القائمة: العنوانُ نفسُه بجنسَي الطرفين، وللخيارين الخاصّين اسماهما. */
export function headingLabel(h: Heading, to: Gender, from: Gender): string {
  if (h.value === "custom") return "عنوانٌ أكتبه";
  return h.text(to, from) || "بلا عنوان";
}

/** العنوانُ الذي كتبه المرسل بعد تنقيته، أو `null` إن قصر عن حرفين أو جاوز `TITLE_MAX`. */
export function customTitle(raw: string | null | undefined): string | null {
  const t = (raw ?? "").replace(/\s+/g, " ").trim();
  return t.length >= 2 && t.length <= TITLE_MAX ? t : null;
}

/**
 * نصُّ العنوان من مفتاحه، أو `null` لـ«بلا عنوان» ولمفتاحٍ غريب. يصوغه الخادمُ عند الحفظ، والعميلُ للمعاينة.
 * و«عنوانٌ أكتبه» نصُّه ما كتبه المرسل (`custom`).
 */
export function headingText(key: string, to: Gender, from: Gender, custom?: string | null): string | null {
  if (key === "custom") return customTitle(custom);
  return HEADINGS.find((h) => h.value === key)?.text(to, from) || null;
}

/** عددُ الأحرف بتمييزه: «حرفٌ واحد» · «حرفان» · «7 أحرف» · «27 حرفًا». */
export function lettersPhrase(n: number): string {
  if (n === 1) return "حرفٌ واحد";
  if (n === 2) return "حرفان";
  if (n >= 3 && n <= 10) return `${n} أحرف`;
  return `${n} حرفًا`;
}
