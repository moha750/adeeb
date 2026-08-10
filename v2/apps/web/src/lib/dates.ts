/**
 * تواريخُ أديب المعروضة : مصدرٌ واحد يقرأه الخادم والمتصفّح معًا.
 *
 * وساعةُ النادي **الرياض** لا ساعةُ الجهاز: خادم النشر يعمل بتوقيت UTC، فلو تُرك
 * التنسيق للبيئة لظهر الموعدُ ناقصًا ثلاثَ ساعات على الشبكة وصحيحًا على جهاز المطوّر.
 * ولأنّ المصدر واحدٌ والمنطقةَ مُثبَّتة، يتطابق ما يرسمه الخادم وما يرسمه المتصفّح
 * فلا اختلافَ عند الترطيب.
 */

const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

export const CLUB_TZ = "Asia/Riyadh";

/** أجزاء التاريخ بتوقيت النادي (أرقامٌ لاتينيّة، فالخطّ يعرّبها عند الحاجة). */
function parts(d: Date): { day: number; month: number; year: number; hour: string; minute: string } {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: CLUB_TZ, year: "numeric", month: "numeric", day: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(d);
  const get = (t: string) => f.find((p) => p.type === t)?.value ?? "";
  return { day: Number(get("day")), month: Number(get("month")), year: Number(get("year")), hour: get("hour"), minute: get("minute") };
}

/** تاريخٌ بلا ساعة — للوقائع الماضية (قُدّم · اعتُمد · أُنشئ). */
export const fmtDate = (iso: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = parts(d);
  return `${p.day} ${MONTHS[p.month - 1]} ${p.year}`;
};

/** موعدٌ بساعته — حيث الدقيقة تفرق (بابٌ يُغلق عندها). */
export const fmtStamp = (iso: string | null): string => {
  const day = fmtDate(iso);
  if (!day) return "";
  const p = parts(new Date(iso as string));
  return `${day} الساعة ${p.hour}:${p.minute}`;
};

/* ══ حقلُ `datetime-local` : ما يكتبه المشرف ساعةُ النادي لا ساعةُ جهازه ═════════ */

/** إزاحةُ المنطقة عن UTC عند لحظةٍ بعينها (بالمللي ثانية). */
function offsetMs(at: Date): number {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: CLUB_TZ, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(at);
  const g = (t: string) => Number(f.find((p) => p.type === t)?.value ?? 0);
  return Date.UTC(g("year"), g("month") - 1, g("day"), g("hour") % 24, g("minute"), g("second")) - at.getTime();
}

/** ISO → قيمةُ الحقل بساعة النادي (لتعبئة موعدٍ قائم). */
export const toClubInput = (iso: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = parts(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${p.hour}:${p.minute}`;
};

/**
 * قيمةُ الحقل → ISO، والمكتوبُ **ساعةُ الرياض** مهما كانت ساعةُ الجهاز: يُحسب أوّلًا
 * كأنّه UTC ثمّ تُطرح إزاحةُ المنطقة، وتُعاد الكرّة مرّةً لأنّ الإزاحة قد تختلف عند
 * الحدّ (الرياض بلا توقيتٍ صيفيّ، والحسابُ يبقى صحيحًا لو تغيّرت المنطقة يومًا).
 */
export const fromClubInput = (local: string): string | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local || "");
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number) as unknown as number[];
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const first = offsetMs(new Date(guess));
  let ts = guess - first;
  const second = offsetMs(new Date(ts));
  if (second !== first) ts = guess - second;
  return new Date(ts).toISOString();
};
