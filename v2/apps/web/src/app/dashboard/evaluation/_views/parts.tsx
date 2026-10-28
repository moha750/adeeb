/**
 * **قطعٌ مشتركةٌ بين شاشات التقييم** — ما يُقال بالطريقة نفسِها أينما ظهر: النسبةُ ومقعدُ المقيَّم واسمُ الدورة.
 * لا هيئةَ هنا تخصّ مقترحًا بعينه: ما يبقى بعد اختيار المالك.
 */
import { fmtDateOnly, fmtMonthYear } from "@/lib/dates";
import { percentText, type Fraction } from "@/lib/evaluation/score";
import { positionLine, rankFor } from "@/lib/positionLabel";
import { RANK, type EvaluatedRole } from "../vocab";

/** «نائبة لجنة التصوير» بجنس صاحبها (`rankFor`) ووحدته (`positionLine`). */
export function seatLine(role: EvaluatedRole, unit: string, gender: "male" | "female" | null): string {
  return positionLine(rankFor(RANK[role], gender), unit) ?? RANK[role];
}

/** الكسرُ من صفّ القاعدة، أو لا شيء. */
export function frac(num: number | null | undefined, den: number | null | undefined): Fraction | null {
  return num == null || !den ? null : { num, den };
}

/** النسبةُ بالخطّ اللاتينيّ وعلامتُها، مقطوعةً لا مقرَّبة (`percentText`). */
export function Pct({ f, className }: { f: Fraction | null; className?: string }) {
  if (!f) return <span className={className}>—</span>;
  return (
    <span className={["font-latin", className].filter(Boolean).join(" ")} dir="ltr">
      {percentText(f)}%
    </span>
  );
}

/** النسبةُ رقمًا (0 إلى 100) لرسم الأشرطة والأقواس وحدها، لا للعرض ولا للحكم. */
export const pctNumber = (f: Fraction | null): number => (f ? (f.num / f.den) * 100 : 0);

/**
 * «التقييم الربعي، يناير 2027»: الدورةُ تُسمّى بشهر موعدها، و«الربعي» يقول إنّها تعود كلَّ ربع (محمد ٢٠٢٦-١٠-٢٧).
 * و`cycleShort` («يناير 2027») حيث الصفحةُ كلُّها عن التقييم: أزرارُ التبديل وسطورُ الدورات.
 */
export const cycleName = (dueOn: string) => `التقييم الربعي، ${fmtMonthYear(dueOn)}`;
export const cycleShort = (dueOn: string) => fmtMonthYear(dueOn);

/** آخرُ يومٍ يُقبل فيه التقييم («23 يناير 2027»): الإغلاقُ منتصفُ الليل التالي. */
export const lastDay = (d: string) => fmtDateOnly(d);

/**
 * «3 من 7» بالخطّ اللاتينيّ. **بـ«من» لا بالشَّرطة** (محمد ٢٠٢٦-١٠-٢٧): «3/7» تُقرأ في الصفحة العربيّة من اليمين
 * فيسبق المجموعُ ما أُنجز، و«من» تحسم الاتّجاه فيقع المُنجَزُ أوّلًا حيث تبدأ العين.
 */
export function Of({ n, of, className }: { n: number; of: number; className?: string }) {
  return (
    <span className={["font-latin", className].filter(Boolean).join(" ")}>
      {n} من {of}
    </span>
  );
}

/** موعدُ الدورة التالية: بعد ثلاثة أشهر من موعد هذه (21 من يناير وأبريل ويوليو وأكتوبر، م٢/2). */
export function nextDue(dueOn: string): string {
  const [y, m] = dueOn.slice(0, 10).split("-").map(Number);
  const nm = m + 3 > 12 ? m - 9 : m + 3;
  return `${m + 3 > 12 ? y + 1 : y}-${String(nm).padStart(2, "0")}-21`;
}

/** لماذا خرج من الدورة (م١/4) بجنس صاحبه، ومتى يُقيَّم. */
export function excludedWhy(g: "male" | "female" | null, dueOn: string): string {
  const f = g === "female";
  return `${f ? "عُيّنت" : "عُيّن"} قبل الموعد بأقلّ من أربعة أسابيع، ${f ? "فتُقيَّم" : "فيُقيَّم"} في ${cycleName(nextDue(dueOn))}.`;
}

/**
 * حالُ النصاب جملةً (م٥/1): «اكتمل النصاب»، أو ما بقي له ما دامت الدورةُ مفتوحة، أو «لم يكتمل» بعدها.
 * النصابُ نصفُ المؤهّلين وورقةٌ على الأقل (`membersQuorum`)، فالباقي يُحسب بالسقف.
 */
export function quorumLine(n: number, of: number, closed: boolean): { met: boolean; text: string } {
  const need = Math.max(1, Math.ceil(of / 2));
  // بلا كلمة «النصاب» في الواجهة: تُقرأ «النصّاب» (محمد ٢٠٢٦-١٠-٢٨)
  if (n >= need) return { met: true, text: "شارك النصف" };
  return { met: false, text: closed ? "لم يشارك النصف" : `بقي ${need - n} لبلوغ النصف` };
}
