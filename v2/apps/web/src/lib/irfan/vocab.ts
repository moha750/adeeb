/**
 * مفرداتُ «عِرفان» — بلا إطار، فيقرؤها الخادمُ والعميلُ معًا.
 *
 * **العنوانُ تاجٌ لا قالب** (قرار المالك ٢٠٢٦-١٠-١٧، بعد نقاش «القالب الجاهز» ثمّ «لماذا لا تكون بدل
 * الافتتاحية هي العنوان»): لو كُتبت الرسالةُ سلفًا لوصلت القائدَ عشرُ رسائل متطابقة. فالمرسلُ يختار
 * عنوانًا قصيرًا من قائمة، ويكتب المتنَ كلَّه بيده، وللمتن حدٌّ أدنى من الطول.
 */
export type Gender = "male" | "female" | null | undefined;

export const BODY_MIN = 40;
export const BODY_MAX = 500;

const f = (g: Gender, male: string, female: string) => (g === "female" ? female : male);

/**
 * **العناوين** (أقرّها المالك في `/ui/irfan` ٢٠٢٦-١٠-١٧): عباراتٌ تامّة لا أنصافُ جمل، تُرسم أكبرَ ما في
 * البطاقة، بجنس المستلم (وبجنس المرسل حيث يتكلّم عن نفسه). و«بلا عنوان» لمن لا يريده. والنصُّ المصوغُ
 * يُحفظ مع الرسالة (`irfan_messages.title`، بين حرفين وأربعين)، فتغييرُ القائمة لا يغيّر ما أُرسل.
 */
export type Heading = { value: string; text: (to: Gender, from: Gender) => string };
export const HEADINGS: Heading[] = [
  { value: "thanks", text: (to) => f(to, "شكرًا لك", "شكرًا لكِ") },
  { value: "grateful", text: (to, from) => `${f(from, "ممتنٌّ", "ممتنّةٌ")} ${f(to, "لك", "لكِ")}` },
  { value: "learned", text: (to) => f(to, "تعلّمتُ منك", "تعلّمتُ منكِ") },
  { value: "impact", text: (to) => f(to, "أثرُك باقٍ", "أثرُكِ باقٍ") },
  { value: "role", text: () => "قدوتي" },
  { value: "none", text: () => "" },
];

/** نصُّ العنوان من مفتاحه، أو `null` لـ«بلا عنوان» ولمفتاحٍ غريب. يصوغه الخادمُ عند الحفظ، والعميلُ للمعاينة. */
export function headingText(key: string, to: Gender, from: Gender): string | null {
  return HEADINGS.find((h) => h.value === key)?.text(to, from) || null;
}

/** عددُ الأحرف بتمييزه: «حرفٌ واحد» · «حرفان» · «7 أحرف» · «27 حرفًا». */
export function lettersPhrase(n: number): string {
  if (n === 1) return "حرفٌ واحد";
  if (n === 2) return "حرفان";
  if (n >= 3 && n <= 10) return `${n} أحرف`;
  return `${n} حرفًا`;
}
