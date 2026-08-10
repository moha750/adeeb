/**
 * وحدةُ العدّ في المخطّطات — **مصدرٌ واحد** لقائمة الأشرطة والحلقة معًا.
 *
 * الرقمُ وحده غامض، ورقمان متلاصقان (عددٌ ونسبة) يُقرآن كتلةً واحدة. فالوحدةُ توضّح وتفصل.
 * وتُصرَّف عربيًّا بـ`Intl.PluralRules` لا تُلصَق كلمةً واحدة: «زيارة» للواحد، و«زيارتان»
 * للاثنين، و«زيارات» للثلاث إلى العشر، ثمّ يعود المفرد (١١ فأكثر).
 */
export type ChartUnit = { one: string; two: string; few: string };

const AR_PLURAL = new Intl.PluralRules("ar");

/** الصيغةُ المناسبة لعددٍ بعينه (والصفر مع الجمع: «لا زيارات»). */
export function unitWord(n: number, unit?: ChartUnit): string | null {
  if (!unit) return null;
  const c = AR_PLURAL.select(n);
  return c === "two" ? unit.two : c === "few" || c === "zero" ? unit.few : unit.one;
}
