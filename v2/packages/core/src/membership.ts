/**
 * مدّةُ العضويّة وجمعُها العربيّ — **مصدرٌ واحدٌ للويب والجوّال**.
 *
 * نُقل من `dashboard/_membership/data.ts` في ٢٠٢٦-٠٨-٢٠ يوم صار للعضو بابٌ ثانٍ يرى منه
 * عضويّتَه؛ ولو نُسخ الحسابُ هناك لافترق الرقمان يومًا بلا سببٍ يُرى.
 */

/** جمعُ العربيّة: مفرد · مثنّى · جمع قلّة (٣–١٠) · تمييزٌ مفردٌ منصوب (١١+). */
const plural = (n: number, one: string, two: string, few: string, many: string): string =>
  n === 1 ? one : n === 2 ? two : n <= 10 ? `${n} ${few}` : `${n} ${many}`;

/**
 * «٦ أشهر و١٠ أيام» — مدّة العضويّة بالتقويم لا بقسمة الأيام (فالشهور متفاوتة).
 * تُحسب خادميًّا بتاريخ اليوم فتخرج جاهزةً في HTML — لا ساعةَ متصفّحٍ تُخالف الخادم فتُهشّم الترطيب.
 * وتُقال بوحدتين لا ثلاث: «سنة و٣ أشهر» أبلغ من «سنة و٣ أشهر و١٢ يومًا».
 */
export function membershipDuration(isoDate: string | null, todayMs: number): string {
  const [y, m, d] = (isoDate ?? "").split("-").map(Number);
  if (!y || !m || !d) return "";
  const t = new Date(todayMs);
  const [ty, tm, td] = [t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()];
  if (Date.UTC(ty, tm - 1, td) < Date.UTC(y, m - 1, d)) return ""; // تاريخُ انضمامٍ في المستقبل — لا مدّة تُقال

  let years = ty - y;
  let months = tm - m;
  let days = td - d;
  // الاستلاف: أيّامُ الشهر **السابق ليوم اليوم** (يوم 0 من شهر اليوم = آخر أيّام ما قبله)
  if (days < 0) { months -= 1; days += new Date(Date.UTC(ty, tm - 1, 0)).getUTCDate(); }
  if (months < 0) { years -= 1; months += 12; }

  const parts = [
    years ? plural(years, "سنة", "سنتان", "سنوات", "سنة") : null,
    months ? plural(months, "شهر", "شهران", "أشهر", "شهرًا") : null,
    days ? plural(days, "يوم", "يومان", "أيام", "يومًا") : null,
  ].filter(Boolean) as string[];
  return parts.length ? parts.slice(0, 2).join(" و") : "اليوم";
}

