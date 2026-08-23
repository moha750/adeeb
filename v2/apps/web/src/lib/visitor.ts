/**
 * بصمةُ الزائر المجهول — **المصدر الواحد**.
 *
 * كانت تعيش في `lib/deebo/limits.ts` وحدها، ثمّ طلبها عدُّ مسحات الباركود. ونسخُها
 * نسختان يعني ملحَين وتاريخَين وطريقتَي حسابٍ تفترق إحداهما عن الأخرى يومًا بلا أن
 * ينتبه أحد. فرُفعت إلى هنا، وديبو يستوردها من موضعها الجديد ولا يعرف أنّها انتقلت.
 *
 * ⚠️ خادميٌّ محض: يقرأ الملح، فلا يُستورد في كودٍ عميليّ أبدًا.
 */

import { createHash } from "node:crypto";
import { clubDayKey } from "@/lib/dates";

/**
 * تاريخُ اليوم بتوقيت النادي. لا `getDate()` هنا: خادمُ Vercel يعمل بـUTC.
 *
 * وكان هنا حسابٌ ثانٍ بـ`Intl` مباشرةً، فأُسقط إلى `clubDayKey` في `@adeeb/core/dates`:
 * ساعةُ النادي مصدرٌ واحدٌ لا اثنان، ولو تطابقا اليوم.
 */
export function clubDay(now = new Date()): string {
  return clubDayKey(now.toISOString());
}

/**
 * بصمةُ الزائر: `sha256(ip ‖ salt ‖ يومُ النادي)`.
 *
 * **وإقحامُ اليوم هو بيت القصيد.** السجلّاتُ تبقى بلا أجل، فلو ثبتت البصمةُ لصارت
 * مُعرِّفًا دائمًا يصل زياراتِ شخصٍ عبر السنين. ودورانُها اليوميّ يُبقي ما يلزم (تمييزُ
 * زائرَين اليوم، ومنعُ استنزافٍ خلال ساعة) ويُسقط ما لا يلزم (وصلُ أمسِ باليوم).
 * فالسجلُّ يحفظ **ما جرى** ولا يحفظ **من فعله**.
 *
 * **والملحُ اسمان لمُسمًّى واحد**: `VISITOR_SALT` هو الاسمُ الصحيح بعد أن خرجت البصمةُ
 * من ديبو، و`DEEBO_SALT` يبقى مقروءًا لأنّه المضبوطُ في بيئة الإنتاج اليوم. ونزعُه
 * قبل ضبطِ خلَفه يُسقط ديبو في الإنتاج ولا يُظهر عطلًا في التطوير.
 *
 * وغيابُ الملحِ لا يُسكَت عنه في الإنتاج: بصمةٌ بلا ملحٍ تُخمَّن بجدول عناوين.
 */
export function visitorHash(ip: string): string {
  const salt = process.env.VISITOR_SALT?.trim() || process.env.DEEBO_SALT?.trim();
  if (!salt) {
    if (process.env.NODE_ENV === "production") throw new Error("VISITOR_SALT ناقص");
    return createHash("sha256").update(`${ip}|dev|${clubDay()}`).digest("hex");
  }
  return createHash("sha256").update(`${ip}|${salt}|${clubDay()}`).digest("hex");
}

/** عنوانُ الطالب من ترويسات الوكيل. يُستعمل للبصمة فورًا ولا يُخزَّن أبدًا. */
export function clientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}
