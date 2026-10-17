/**
 * مفرداتُ «عِرفان» — بلا إطار، فيقرؤها الخادمُ والعميلُ معًا.
 *
 * **الافتتاحيّةُ بابٌ لا رسالة** (قرار المالك ٢٠٢٦-١٠-١٧، بعد نقاش «القالب الجاهز»): لو كُتبت
 * الرسالةُ سلفًا لوصلت القائدَ عشرُ رسائل متطابقة. فالقالبُ جملةٌ تُفتتح بها، وما بعدها يكتبه
 * المرسلُ بيده، ولها حدٌّ أدنى من الطول.
 */
export type Gender = "male" | "female" | null | undefined;

export const BODY_MIN = 40;
export const BODY_MAX = 500;

const f = (g: Gender, male: string, female: string) => (g === "female" ? female : male);

export type Opening = { value: string; label: string; text: (to: Gender, from: Gender) => string };

/** الافتتاحيّات بجنس المستلم (والمرسل حيث يتكلّم عن نفسه). و«بلا افتتاحيّة» لمن يكتب من أوّل حرف. */
export const OPENINGS: Opening[] = [
  { value: "thanks", label: "شكرًا لك على…", text: (to) => f(to, "شكرًا لك على ", "شكرًا لكِ على ") },
  { value: "learned", label: "تعلّمتُ منك…", text: (to) => f(to, "تعلّمتُ منك ", "تعلّمتُ منكِ ") },
  {
    value: "grateful",
    label: "ممتنٌّ لك لأنّك…",
    text: (to, from) => `${f(from, "ممتنٌّ", "ممتنّةٌ")} ${f(to, "لك لأنّك ", "لكِ لأنّكِ ")}`,
  },
  { value: "remember", label: "لن أنسى…", text: () => "لن أنسى " },
  { value: "free", label: "بلا افتتاحيّة", text: () => "" },
];

/** عددُ الأحرف بتمييزه: «حرفٌ واحد» · «حرفان» · «7 أحرف» · «27 حرفًا». */
export function lettersPhrase(n: number): string {
  if (n === 1) return "حرفٌ واحد";
  if (n === 2) return "حرفان";
  if (n >= 3 && n <= 10) return `${n} أحرف`;
  return `${n} حرفًا`;
}

/**
 * **ما كتبه المرسلُ بيده** — الرسالةُ بلا افتتاحيّتها. والحدُّ الأدنى يُقاس عليه لا على الرسالة كلِّها:
 * الافتتاحيّةُ ليست من كلامه، فلو حُسبت لكفاه أن يضيف كلمتين.
 */
export function ownWords(body: string, opening: string): string {
  const b = body.trim();
  const o = opening.trim();
  return (o && b.startsWith(o) ? b.slice(o.length) : b).trim();
}
