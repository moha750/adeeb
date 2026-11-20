/**
 * **قطعٌ مشتركةٌ بين شاشات التقييم** — ما يُقال بالطريقة نفسِها أينما ظهر: النسبةُ ومقعدُ المقيَّم واسمُ الدورة.
 * لا هيئةَ هنا تخصّ مقترحًا بعينه: ما يبقى بعد اختيار المالك.
 */
import { percentText, type Fraction } from "@/lib/evaluation/score";
import { cycleName, cycleShort, excludedWhy, frac, lastDay, nextDue, quorumLine, seatLine } from "../shared";
export { cycleName, cycleShort, excludedWhy, frac, lastDay, nextDue, quorumLine, seatLine };

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
