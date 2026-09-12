import { clubDayKey, fmtDayMonth } from "@/lib/dates";

/**
 * مدى المدّة في «إحصائيّات الزوّار» — **المصدر الواحد** لأسماء الاختصارات وحسابِ حدودها
 * وعبارتِها كما تُقرأ. يقرؤه الخادم (يصدّق ما في العنوان ويحوّله إلى حدود) والعميل
 * (يرسم اللوحة ويكتب العنوان)، فلا يُحسَب مدًى مرّتين بطريقتين.
 *
 * **بمفتاح يوم النادي لا بساعة الجهاز** (Asia/Riyadh عبر `lib/dates`): من يفتح اللوحة من
 * منطقةٍ أخرى يرى «اليوم» يومَ النادي نفسَه الذي تراه القاعدة، فلا يفترق رقمٌ عن عنوانه.
 *
 * وطرفا المدى **داخلان** فيه: «١ إلى ٣١ أغسطس» يشمل الأوّلَ والحاديَ والثلاثين معًا،
 * وهي عينُ ما تفعله الدالّةُ `get_visitor_analytics` بـ`p_from`/`p_to`.
 */

export type DayRange = { from: string; to: string };

/** مفتاحُ اليوم (YYYY-MM-DD) بتوقيت النادي. */
export const todayKey = (): string => clubDayKey(new Date().toISOString());

const at = (key: string) => Date.parse(`${key}T12:00:00Z`);
const shift = (key: string, days: number) => clubDayKey(new Date(at(key) + days * 86400000).toISOString());
const monthStart = (key: string) => `${key.slice(0, 7)}-01`;

/** مفتاحُ يومٍ صالح؟ حارسُ ما يأتي من العنوان قبل أن يبلغ القاعدة. */
export const isDayKey = (v: string | undefined | null): v is string =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(at(v));

export const PRESETS: Array<{ key: string; label: string }> = [
  { key: "today", label: "اليوم" },
  { key: "yesterday", label: "أمس" },
  { key: "7", label: "آخر 7 أيّام" },
  { key: "90", label: "آخر 90 يومًا" },
  { key: "mtd", label: "هذا الشهر" },
  { key: "lastmonth", label: "الشهر الماضي" },
  { key: "ytd", label: "هذه السنة" },
  { key: "all", label: "منذ البداية" },
];

/**
 * الافتراضُ «هذا الشهر». كان «آخر ٣٠ يومًا» **فحُذف بأمر المالك ٢٠٢٦-٠٨-٣١**: يتقارب مع
 * «هذا الشهر» تقاربًا يجعل وجودَهما معًا سؤالًا لا خيارًا (يوم ٣١ أغسطس يفترقان بيومٍ واحد).
 * فخلَفه في مكانه ما هو أوضحُ معنًى: شهرٌ يبدأ من أوّله لا نافذةٌ تتدحرج.
 */
export const DEFAULT_PRESET = "mtd";

/**
 * حدودُ اختصارٍ بعينه. و«منذ البداية» تعود `null` عمدًا: لا حدَّ لها يُكتب، فتُترك
 * للنافذة المتدحرجة الطويلة في القاعدة ولا يُخترع لها تاريخُ بدايةٍ يقادم.
 */
export const presetRange = (key: string, today = todayKey()): DayRange | null => {
  switch (key) {
    case "today": return { from: today, to: today };
    case "yesterday": return { from: shift(today, -1), to: shift(today, -1) };
    case "7": return { from: shift(today, -6), to: today };
    case "90": return { from: shift(today, -89), to: today };
    case "mtd": return { from: monthStart(today), to: today };
    case "lastmonth": { const end = shift(monthStart(today), -1); return { from: monthStart(end), to: end }; }
    case "ytd": return { from: `${today.slice(0, 4)}-01-01`, to: today };
    default: return null;
  }
};

/** أيّامُ «منذ البداية» حين لا حدودَ لها: عشرُ سنينَ تسع كلَّ ما جُمِع وما سيُجمَع. */
export const ALL_DAYS = 3650;

const dm = (key: string) => fmtDayMonth(`${key}T12:00:00Z`);

/** عبارةُ المدى كما تُقرأ: يومٌ واحدٌ يُقال مرّةً، ومدًى يُقال بطرفيه. */
export const rangeLabel = (r: DayRange): string =>
  r.from === r.to ? dm(r.from) : `${dm(r.from)} إلى ${dm(r.to)}`;

/**
 * الفترةُ السابقة بطول المدى نفسِه، ملاصقةً لبدايته. تحسبها القاعدةُ للأرقام الحيّة
 * (`prev` في الحمولة)، وهذه نظيرتُها للعرض حيث لا قاعدة (معرضُ `/ui`).
 */
export const previousRange = (r: DayRange): DayRange => {
  const span = Math.round((at(r.to) - at(r.from)) / 86400000) + 1;
  return { from: shift(r.from, -span), to: shift(r.from, -1) };
};

/** اسمُ ما هو مختارٌ الآن: اسمُ الاختصار، أو «مدّة مخصّصة» لمدًى كتبه صاحبُه بيده. */
export const presetName = (key: string): string =>
  PRESETS.find((p) => p.key === key)?.label ?? "مدّة مخصّصة";

/** حالُ الشاشة كما يحملها العنوان: مدًى (اختصارٌ أو تاريخان) وبابٌ ومقارنة. */
export type AnalyticsUrlState = {
  preset: string;
  from: string;
  to: string;
  source: string | null;
  compare: boolean;
};

/**
 * بناءُ عنوان الشاشة من الحال الجاري وتعديلٍ عليه. يحمل الاختياراتِ كلَّها معًا: تبديلُ
 * المدّة لا يعيدك إلى البابين، وتبديلُ البابِ لا يعيدك إلى الثلاثين، وإطفاءُ المقارنة
 * لا يمسّ واحدًا منهما.
 *
 * **والحكمُ في أيّهما يُكتب (اختصارٌ أم تاريخان) من التعديل نفسِه لا من الحال:** كان
 * الشرطُ يسأل الحالَ الجاري (`preset === "custom"`)، فمن كان على «آخر ٣٠ يومًا» ثمّ كتب
 * تاريخين وضغط «طبّق» عاد إلى «آخر ٣٠» بعينها — تُحدَّث الصفحةُ ولا يتغيّر شيء
 * (بلاغُ المالك ٢٠٢٦-٠٨-٣١). فصار التعديلُ هو الذي يقرّر: تاريخان ⇐ مدًى مخصّص،
 * واختصارٌ ⇐ اختصارٌ يُسقط التاريخين، وما سواهما يُبقي ما كان.
 */
export const analyticsHref = (cur: AnalyticsUrlState, patch: Partial<AnalyticsUrlState>): string => {
  const n = { ...cur, ...patch };
  const useDates = patch.from != null && patch.to != null
    ? true
    : patch.preset != null ? false : cur.preset === "custom";
  const q = new URLSearchParams();
  if (useDates) { q.set("from", n.from); q.set("to", n.to); }
  else if (n.preset !== DEFAULT_PRESET) q.set("preset", n.preset);
  // البابُ يُكتب دائمًا ولو كان «الكلّ» (٢٠٢٦-٠٩-٠٥): صار الافتراضُ يتبع مَن يفتح الشاشة
  // (الموقعُ للمتصفّح والتطبيقُ للتطبيق)، فغيابُ المعامِل لم يعد يعني «الكلّ» بل «اختر لي».
  q.set("src", n.source ?? "all");
  if (!n.compare) q.set("cmp", "0");
  const s = q.toString();
  return `/dashboard/analytics${s ? `?${s}` : ""}`;
};
