import { dateOnlyParts, fmtTimeRange, toClubInput } from "@/lib/dates";

/**
 * **فتراتُ الفرصة التطوّعيّة** — صورتُها في الشاشات، ومصدرُ تسمياتها الواحد (٢٠٢٦-١٠-٠١).
 *
 * الفترةُ يومٌ وساعتان ومقاعد (`volunteer_opportunity_periods`)، والمتطوّعُ يقدّم على فترةٍ أو أكثر،
 * ولكلّ فترةٍ مقاعدُها وطلباتُها وحضورُها. ويقرأ هذا الملفَّ الكرتُ (عميليّ) والقارئان (خادميّان)،
 * فلا `server-only` فيه: تسميةُ الفترة لا تفترق بين اللوحة وحساب المتطوّع.
 */
export type OppPeriod = {
  id: string;
  /** «YYYY-MM-DD» */
  day: string;
  /** «HH:MM» */
  from: string;
  to: string;
  /** `null` = بلا سقف */
  seats: number | null;
  accepted: number;
  pending: number;
};

/** صفُّ الفترة كما يعود من القاعدة. */
export type PeriodRaw = {
  id: string; opportunity_id: string; day: string; starts_at: string; ends_at: string; seats: number | null;
};

/** «الخميس 8 أكتوبر» — بلا سنة: الفترةُ في موسمها. */
export function periodDay(day: string): string {
  const p = dateOnlyParts(day);
  return p ? `${p.weekday} ${p.day} ${p.month}` : "";
}

/** «الخميس 8 أكتوبر، من 8 ص إلى 12 م» */
export function periodLabel(p: Pick<OppPeriod, "day" | "from" | "to">): string {
  return [periodDay(p.day), fmtTimeRange(p.from, p.to)].filter(Boolean).join("، ");
}

/** مرتّبةً بيومها ثمّ ساعتها، كما تُقرأ. */
export function sortPeriods<T extends Pick<OppPeriod, "day" | "from">>(ps: T[]): T[] {
  return [...ps].sort((a, b) => a.day.localeCompare(b.day) || a.from.localeCompare(b.from));
}

/** من صفّ القاعدة إلى صورة الشاشة، والأعدادُ ممّا يحسبه القارئ. */
export function toPeriod(r: PeriodRaw, counts?: { accepted: number; pending: number }): OppPeriod {
  return {
    id: r.id,
    day: r.day,
    // عمودُ `time` يعود «16:00:00»، وحقلُ الوقت يريد «16:00»
    from: r.starts_at.slice(0, 5),
    to: r.ends_at.slice(0, 5),
    seats: r.seats,
    accepted: counts?.accepted ?? 0,
    pending: counts?.pending ?? 0,
  };
}

/** سقفُ الفرصة كلِّها: مجموعُ مقاعد فتراتها إن سقفت كلُّها، وإلّا `null` (فترةٌ بلا سقفٍ تجعلها بلا سقف). */
export function periodsSeats(ps: OppPeriod[]): number | null {
  if (ps.length === 0 || ps.some((p) => p.seats == null)) return null;
  return ps.reduce((n, p) => n + (p.seats ?? 0), 0);
}

/** «الآن» بساعة النادي: يومُه (`YYYY-MM-DD`) وساعتُه (`HH:MM`). */
export type ClubNow = { day: string; time: string };

/**
 * **الآن بساعة الرياض لا بساعة الجهاز ولا بغرينتش** (`toClubInput`): الخادمُ يعمل بـUTC، فالحاديةَ عشرة ليلًا
 * بالرياض «أمسُ» عنده. و«24» تخرج من بعض إصدارات ICU عند منتصف الليل فتُردّ إلى صفرها (سابقةُ `clubHour`).
 */
export function clubNow(at: Date = new Date()): ClubNow {
  const [day = "", time = ""] = toClubInput(at.toISOString()).split("T");
  return { day, time: time.replace(/^24/, "00") };
}

/**
 * **أبدأت الفترةُ قبل الآن؟** يومُها مضى، أو هو اليومُ وساعةُ بدئها مضت (أمرُ المالك ٢٠٢٦-١٠-٠٢: «التاريخُ
 * والساعة لا يقبلان أقلَّ من الوقت الفعليّ»). والفارغُ لم يبدأ: نقصُه يُسأل عنه في موضعه لا هنا.
 */
export function periodStarted(p: { day: string; from: string }, now: ClubNow): boolean {
  if (!p.day) return false;
  if (p.day !== now.day) return p.day < now.day;
  return !!p.from && p.from.slice(0, 5) < now.time;
}

/** اليومُ التالي لمفتاح يوم (`YYYY-MM-DD`)، محسوبًا بالظهيرة فلا يُزحزحه توقيتٌ صيفيّ. */
const nextDay = (day: string) => new Date(Date.parse(`${day}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);

/**
 * **أانتهت الفترة؟** بانتهاء آخر ساعةٍ منها (أمرُ المالك ٢٠٢٦-١٠-٠٣: «التقديمُ يُغلق بانتهاء آخر ساعة»)، والعابرةُ
 * منتصفَ الليل تنتهي في غدها. وهو حكمُ القاعدة نفسُه (`volunteer_period_ends`) لتُخفي صفحةُ المتطوّع ما تردّه.
 */
export function periodEnded(p: { day: string; from: string; to: string }, now: ClubNow): boolean {
  const from = p.from.slice(0, 5);
  const to = p.to.slice(0, 5);
  const endDay = to <= from ? nextDay(p.day) : p.day;
  return endDay < now.day || (endDay === now.day && to <= now.time);
}
