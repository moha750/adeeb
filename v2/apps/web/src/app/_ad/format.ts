/**
 * أرقامُ الأساس الجديد وتواريخه — لاتينيّةٌ دائمًا (`nu-latn`) بقرار محمد، فلا يُحوَّل رقمٌ إلى
 * الهنديّ في أيّ موضع. (أحدَ عشر ملفًّا قديمًا يفعل ذلك، والسقّاطةُ تعدّها حتى تخرج.)
 */
const NUM = new Intl.NumberFormat("ar-u-nu-latn");
/**
 * **ساعةُ النادي لا ساعةُ الجهاز** (المراجعة المستقلّة ٢٠٢٦-١٠-٣١): الخادمُ يعمل بتوقيت غرينتش والمتصفّحُ بالرياض، فكانت التواريخُ
 * بلا منطقةٍ تُرسم يومًا في الخادم ويومًا بعد الإماهة (خبرُ 22:30 غرينتش «30» ثمّ «31»)، وتنقلب حالُ الفعاليّة قرب العتبة.
 */
const TZ = "Asia/Riyadh";
const YEAR_ONLY = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { year: "numeric", timeZone: TZ });
const REL = new Intl.RelativeTimeFormat("ar-u-nu-latn", { numeric: "auto" });
const DAY = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { day: "numeric", month: "long", timeZone: TZ });
const DAY_Y = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { day: "numeric", month: "long", year: "numeric", timeZone: TZ });

export const fmtNum = (n: number): string => NUM.format(n);

/**
 * «62%» — بعلامة «%» لا «٪»: الرقمُ لاتينيٌّ يُرسم بـEras، و«٪» العربيّةُ في Lyon صغيرةٌ مائلةٌ تُقرأ لطخةً بجانبه
 * (جُرّبت ٢٠٢٦-١٠-٣٠). و«%» تلتصق بالرقم في السطر العربيّ بلا علامات اتّجاه (يضعها `Intl` حولها، فلا يُستعمل هنا).
 */
export const fmtPct = (n: number): string => `${NUM.format(n)}%`;

/** «بعد 3 أيام»، «قبل ساعتين»، «غدًا» — أقربُ وحدةٍ تُقرأ. */
export function relTime(iso: string, now: number): string {
  const diff = new Date(iso).getTime() - now;
  const abs = Math.abs(diff);
  const m = 60_000, h = 60 * m, d = 24 * h;
  if (abs < h) return REL.format(Math.round(diff / m), "minute");
  if (abs < d) return REL.format(Math.round(diff / h), "hour");
  if (abs < 45 * d) return REL.format(Math.round(diff / d), "day");
  if (abs < 365 * d) return REL.format(Math.round(diff / (30 * d)), "month");
  return REL.format(Math.round(diff / (365 * d)), "year");
}

/** «9 مايو» في السنة الجارية، و«9 مايو 2025» فيما سواها. */
export function fmtDay(iso: string, now: number): string {
  const d = new Date(iso);
  return (YEAR_ONLY.format(d) === YEAR_ONLY.format(new Date(now)) ? DAY : DAY_Y).format(d);
}

/**
 * اليومُ منفصلًا عن شهره وسنته لكعب التذكرة: «6» ثمّ «مايو 2026» — **والسنةُ دائمًا** (محمد ٢٠٢٦-١٠-٣١): الكعبُ في كرت
 * الخبر هو تاريخُه الوحيد، و«6 مايو» وحدها لا تقول أيَّ عام. والكعبُ قطعةٌ واحدةٌ في كلّ الغرف، فقاعدتُه واحدة.
 */
const DAY_ONLY = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { day: "numeric", timeZone: TZ });
const MONTH_ONLY = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { month: "long", timeZone: TZ });
export function dayParts(iso: string): { day: string; month: string } {
  const d = new Date(iso);
  return { day: DAY_ONLY.format(d), month: `${MONTH_ONLY.format(d)} ${YEAR_ONLY.format(d)}` };
}

/** «2026-10-31» بيوم النادي (الرياض) لا بيوم الجهاز ولا بـUTC — لمقارنة تاريخ الفعاليّة (`YYYY-MM-DD`) باليوم. */
const ISO_DAY = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: TZ });
export const localDay = (t: number): string => ISO_DAY.format(new Date(t));

/** نهايةُ يومٍ (`YYYY-MM-DD`) بساعة النادي — لا بساعة الجهاز (`T23:59:59` بلا منطقةٍ يُقرأ محلّيًّا). */
export const endOfClubDay = (day: string): number => +new Date(`${day}T23:59:59+03:00`);

/** «6 مايو 2026» بسنته دائمًا — لسطر موعدٍ هو التاريخُ الكامل للسجلّ (الكعبُ لمحةٌ تتبع قاعدةَ `fmtDay`). */
export const fmtDayFull = (iso: string): string => DAY_Y.format(new Date(iso));

/** الأيامُ الكاملة بين تاريخين. */
export const daysSince = (iso: string, now: number): number => Math.floor((now - new Date(iso).getTime()) / 86_400_000);

/** «10:41 ص» بساعة النادي — وقتُ الواقعة في سجلّ الأحداث، ويومُها في رأس مجموعتها (`dayHead`). */
const CLOCK = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { hour: "numeric", minute: "2-digit", timeZone: TZ });
export const fmtClock = (iso: string): string => CLOCK.format(new Date(iso));

/**
 * اسمُ يومٍ في سجلّ الأحداث بجانب كعبه (الكعبُ يقول التاريخ): «اليوم»، «أمس»، ثمّ اسمُ اليوم «الخميس» — لأنّ السجلَّ يُقرأ
 * بالأسبوع («ماذا جرى يومَ الخميس؟»).
 */
const WEEKDAY = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { weekday: "long", timeZone: TZ });
export function dayName(iso: string, now: number): string {
  const k = localDay(+new Date(iso));
  if (k === localDay(now)) return "اليوم";
  if (k === localDay(now - 86_400_000)) return "أمس";
  return WEEKDAY.format(new Date(iso));
}
