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
export const fmtDate = (iso: string | null | undefined): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = parts(d);
  return `${p.day} ${MONTHS[p.month - 1]} ${p.year}`;
};

/**
 * «١٦ يناير ٢٠٢٦» من عمود **`date`** (بلا وقت) — ولا يمرّ بـ`Date` عمدًا:
 * `new Date("2026-01-16")` يُفسَّر منتصفَ ليلٍ **بتوقيت غرينتش**، ثمّ تُقرأ أجزاؤه بمنطقةٍ
 * أخرى فينقص التاريخ يومًا. والشطرُ النصّيّ يُنجيه من ذلك: يومٌ بلا وقتٍ لا منطقةَ له أصلًا.
 * (نُقل من `lib/date.ts` يوم أُعدم في ٢٠٢٦-٠٨-١٦، وهو الوحيد فيه الذي كان سليمًا.)
 */
export const fmtDateOnly = (iso: string | null | undefined): string => {
  const [y, m, d] = (iso ?? "").split("-").map(Number);
  return y && m && d ? `${d} ${MONTHS[m - 1]} ${y}` : "";
};

/** يومٌ وشهرٌ بلا سنة — لخانةٍ ضيّقةٍ في كرت، والسنةُ معلومةٌ من سياقها فلا تُزاحم. */
export const fmtDayMonth = (iso: string | null | undefined): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = parts(d);
  return `${p.day} ${MONTHS[p.month - 1]}`;
};

/**
 * «١٥ أغسطس ٢٠٢٦، ١٤:٣٠» — حين تلزم الساعةُ بأربعٍ وعشرين (تلميحاتُ مواعيد الاستبيانات).
 * وهي غيرُ `fmtStamp` عمدًا: تلك اثنتا عشرةَ بصباحٍ ومساءٍ لعرضِ العضو، وهذه لسطرٍ إداريٍّ مضغوط.
 * (نُقلت من `lib/date.ts` في ٢٠٢٦-٠٨-١٦ وكانت تقرأ **ساعة الجهاز** فتكذب على الخادم.)
 */
export const fmtDateAndTime = (iso: string | null | undefined): string => {
  const day = fmtDate(iso);
  if (!day) return "";
  const p = parts(new Date(iso as string));
  return `${day}، ${p.hour}:${p.minute}`;
};

/** شهرٌ وسنةٌ بلا يوم — اسمُ الدورة الانتخابيّة («أغسطس 2026»)، فاليومُ لا يميّز دورةً عن دورة. */
export const fmtMonthYear = (iso: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = parts(d);
  return `${MONTHS[p.month - 1]} ${p.year}`;
};

/**
 * موعدٌ بساعته — حيث الدقيقة تفرق (بابٌ يُغلق عندها).
 *
 * والساعةُ **اثنتا عشرةَ بصباحٍ ومساء** (قرار المالك): «11:59 م» لا «23:59» — هكذا يقرأ
 * الناسُ الوقتَ عندنا. والحسابُ هنا لا بـ`hour12` من `Intl`، إذ يُخرج «PM» أو «م» بحسب
 * اللغة المطلوبة، والصيغةُ يجب أن تكون واحدةً لا تتبدّل بلغة التنسيق.
 */
export const fmtStamp = (iso: string | null): string => {
  const day = fmtDate(iso);
  if (!day) return "";
  const p = parts(new Date(iso as string));
  const h24 = Number(p.hour);
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${day} الساعة ${h12}:${p.minute} ${h24 < 12 ? "ص" : "م"}`;
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

/* ══ «منذ متى» : زمنٌ نسبيٌّ لقارئٍ يريد الفارق لا التاريخ ══════════════════════ */

/**
 * «الآن» · «منذ ٤ دقائق» · «منذ ساعتين» · «منذ ٣ أيّام» — ثمّ يستسلم للتاريخ الكامل بعد أسبوع.
 *
 * **ويُحسَب على الخادم مرّةً ويُمرَّر نصًّا** (كسائر ما في `data.ts`): لو حُسب في المتصفّح
 * لاختلف عمّا رسمه الخادمُ لحظةَ الترطيب، والفرقُ ثانيةٌ واحدةٌ تكفي ليصير «الآن» «منذ دقيقة».
 * فهو صادقٌ عند الرسم، ويشيخ إلى أن تُحدَّث الصفحة — وذلك مقبولٌ في سطرٍ يقول «آخر نشاط».
 *
 * والصيغةُ عربيّةٌ بمثنّاها وجمعِ قلّتها: «دقيقتان» لا «٢ دقائق»، و«٣ أيّام» لا «٣ يوم».
 */
const UNITS: [seconds: number, one: string, two: string, few: string, many: string][] = [
  [60, "دقيقة", "دقيقتين", "دقائق", "دقيقة"],
  [3600, "ساعة", "ساعتين", "ساعات", "ساعة"],
  [86400, "يوم", "يومين", "أيّام", "يومًا"],
];

/**
 * مفتاحُ اليوم بتوقيت النادي (`YYYY-MM-DD`) — للتجميع لا للعرض.
 *
 * ولا يُشتقّ من `getDate()` ولا من `toISOString()`: الأوّل يقرأ ساعةَ الجهاز، والثاني يقرأ
 * غرينتش — فمحادثةٌ جرت الحاديةَ عشرة ليلًا بالرياض تُحسَب «أمس» على خادمٍ يعمل بـUTC.
 */
export const clubDayKey = (iso: string | null | undefined): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = parts(d);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
};

/**
 * كم يومًا بين مفتاحَي يومٍ (بتوقيت النادي). يُحسَب بالظهيرة لا بمنتصف الليل، فلا يُزحزحه
 * تبديلُ التوقيت الصيفيّ في مناطقَ أخرى إن قُرئ مفتاحٌ قادمٌ منها.
 */
export const daysBetweenKeys = (a: string, b: string): number => {
  const at = Date.parse(`${a}T12:00:00Z`);
  const bt = Date.parse(`${b}T12:00:00Z`);
  if (Number.isNaN(at) || Number.isNaN(bt)) return 0;
  return Math.round((bt - at) / 86400000);
};

export const fmtSince = (iso: string | null | undefined): string => {
  if (!iso) return "";
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";

  const secs = Math.floor((Date.now() - then.getTime()) / 1000);
  if (secs < 0 || secs < 60) return "الآن";
  // ما جاوز الأسبوعَ لا يُقاس بالأيّام: «منذ ٤١ يومًا» أثقلُ على القارئ من «١٦ يناير ٢٠٢٦»
  if (secs >= 604800) return fmtDate(iso);

  // أكبرُ وحدةٍ تُعطي عددًا ≥ ١ — تُقرأ من الأعلى فتقع على «يوم» قبل «ساعة» قبل «دقيقة»
  for (let i = UNITS.length - 1; i >= 0; i--) {
    const [size, one, two, few, many] = UNITS[i];
    const n = Math.floor(secs / size);
    if (n < 1) continue;
    if (n === 1) return `منذ ${one}`;
    if (n === 2) return `منذ ${two}`;
    return n <= 10 ? `منذ ${n} ${few}` : `منذ ${n} ${many}`;
  }
  return "الآن";
};

/**
 * ساعةُ النادي الآن (٠..٢٣) بتوقيت الرياض : **للاختيار لا للعرض**.
 *
 * وُضعت ٢٠٢٦-٠٨-٢٠ لتحيّة ديبو (صباحٌ أم مساء)، وهي من هذا الملفّ لا من `getHours()`
 * للسبب نفسِه الذي أعدم `lib/date.ts`: خادمُ النشر يعمل بغرينتش، فتحيّةُ العاشرة مساءً
 * بالرياض تُقال «صباح الخير» لأنّ الساعةَ هناك السابعة.
 *
 * **وكونُها من مصدرٍ واحدٍ يجعلها آمنةً عند الترطيب**: الخادمُ والمتصفّح يقرآن المنطقةَ
 * نفسَها، فلا يختلف رسمُهما.
 */
export const clubHour = (iso?: string | null): number => {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return 12;
  // «٢٤» تخرج من بعض إصدارات ICU عند منتصف الليل (hourCycle h24)، فتُردّ إلى صفرها.
  return Number(parts(d).hour) % 24;
};
