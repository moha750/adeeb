/**
 * ثوابتُ تتبّع الزيارات — **مصدرٌ واحدٌ للويب والجوّال**.
 *
 * الوجهةُ دالّةُ الحافّة `track-pageview` نفسُها التي يخاطبها الموقعُ منذ V1 بمفاتيحها
 * نفسِها، فمن زار الموقعَ ثمّ فتح التطبيقَ لا يصير زائرَين في جدولٍ واحد بغير سبب.
 *
 * وهذه الأرقامُ كانت مكتوبةً في `VisitTracker` وحده؛ نزلت هنا يوم صار للتطبيق تتبُّعٌ
 * مثلُه (٢٠٢٦-٠٨-٢٠)، كي لا تفترق نبضةُ الويب عن نبضة الجوّال كما افترقت قفزةُ الإذاعة.
 */

/** مسارُ الدالّة تحت أصل Supabase. والخاتمةُ `/end` والنبضةُ `/heartbeat` تحتها. */
export const TRACK_FN = "/functions/v1/track-pageview";

/** الزائرُ يبقى ما بقي الجهاز، والجلسةُ تنتهي بانتهاء التصفّح. */
export const VISITOR_KEY = "adeeb_visitor_id";
export const SESSION_KEY = "adeeb_session_id";

/**
 * بابُ الاختبار المقصود: التطويرُ لا يُسجَّل في إحصاء الموقع الحيّ إلّا بهذا المفتاح.
 * والاسمُ واحدٌ في الموضعين: `sessionStorage` في المتصفّح، وقرصُ التفضيلات في التطبيق.
 */
export const TRACK_DEV_KEY = "adeeb_track_dev";

/** نبضةٌ كلّ خمس عشرة ثانية: فإن ضاعت الخاتمةُ لم تكن المدّةُ صفرًا. */
export const HEARTBEAT_MS = 15_000;

/** سقفُ الدالّة نفسِه: أربعُ ساعات. */
export const TRACK_MAX_SECONDS = 14_400;

/**
 * مُعرّفٌ رباعيُّ الإصدار.
 *
 * والبديلُ ليس ترفًا: `crypto.randomUUID` غائبةٌ عن Hermes (محرّك التطبيق) وعن سياقاتٍ
 * غيرِ آمنةٍ في المتصفّح، والعمودُ في القاعدة `uuid` يرفض ما ليس على صورته.
 */
export function randomUuid(): string {
  try {
    const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
    if (c?.randomUUID) return c.randomUUID();
  } catch {
    /* يسقط إلى البديل */
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}
