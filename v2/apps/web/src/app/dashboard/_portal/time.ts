import { clubDayKey, dateOnlyParts, daysBetweenKeys } from "@/lib/dates";

/**
 * **أوقاتُ غرف البوّابة** — ما يُقال للمرء عن موعده: «بعد 7 أيام»، و«الثلاثاء 20 أكتوبر».
 * والأيّامُ بتوقيت النادي (`clubDayKey`) لا بساعة الجهاز ولا بغرينتش.
 */

/** يومُ النادي اليوم (YYYY-MM-DD). */
export const today = (): string => clubDayKey(new Date().toISOString());

/** كم يومًا من اليوم إلى يومٍ (سالبٌ لما مضى). */
export const daysUntil = (day: string): number => daysBetweenKeys(today(), day);

/**
 * «اليوم»، «غدًا»، «بعد يومين»، «بعد 7 أيام»، «بعد 16 يومًا» — والعددُ يتبع قاعدتَه العربيّة:
 * الجمعُ من ثلاثة إلى عشرة، والمفردُ المنصوبُ بعدها.
 */
export function soonLabel(day: string): string {
  const n = daysUntil(day);
  if (n <= 0) return "اليوم";
  if (n === 1) return "غدًا";
  if (n === 2) return "بعد يومين";
  if (n <= 10) return `بعد ${n} أيام`;
  return `بعد ${n} يومًا`;
}

/** «الثلاثاء 20 أكتوبر» — بلا سنة: الموعدُ في موسمه. */
export function dayLabel(day: string): string {
  const p = dateOnlyParts(day);
  return p ? `${p.weekday} ${p.day} ${p.month}` : "";
}

/** رقمُ اليوم وحده — لقرص رأس الحجز. */
export function dayNumber(day: string): string {
  return String(dateOnlyParts(day)?.day ?? "");
}

/** العددُ ومعدودُه: «ساعة»، «ساعتان»، «3 ساعات»، «11 ساعة». */
export function counted(n: number, one: string, two: string, few: string, many = one): string {
  if (n === 1) return one;
  if (n === 2) return two;
  if (n >= 3 && n <= 10) return `${n} ${few}`;
  return `${n} ${many}`;
}

/** ما بقي من مقاعد فعاليّة: «باقٍ 6 مقاعد»، «باقٍ مقعدٌ واحد»، «مفتوحٌ بلا عدد». */
export function seatsLeft(n: number | null, unlimited: boolean): string {
  if (unlimited || n == null) return "مفتوحٌ بلا عدد";
  if (n === 1) return "باقٍ مقعدٌ واحد";
  if (n === 2) return "باقٍ مقعدان";
  return n <= 10 ? `باقٍ ${n} مقاعد` : `باقٍ ${n} مقعدًا`;
}
