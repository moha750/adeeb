/**
 * نافذةُ استعادة كلمة المرور — **مصدرٌ واحد** لشاشتَي الطلب والتعيين.
 *
 * المهلةُ واحدةٌ لا اثنتان: تبدأ من **إرسال البريد** لا من فتح الصفحة، فتطابق
 * `Email OTP expiration` في Supabase (٦٠٠ ثانية). ولمّا كان الخادم لا يُطلع العميلَ
 * على لحظة الإصدار، تُسجَّل لحظةُ الإرسال في `localStorage` عند الطلب وتُقرأ عند التعيين.
 *
 * **وحدُّ هذه الحيلة معلوم:** التخزين محلّيٌّ بالمتصفّح، فمن طلب الرابط في جهازٍ وفتحه
 * في آخر لا يجد ختمًا — فيرتدّ إلى النافذة كاملةً من لحظة الفتح. وهو ارتدادٌ آمن:
 * الرابط نفسُه يكون قد ماتَ عند الخادم إن تأخّر، فلا يُفتح أصلًا.
 */
const KEY = "adeeb:reset-sent-at";

/** طولُ النافذة بالثواني — يطابق `Email OTP expiration`. غيّرهما معًا. */
export const RESET_WINDOW_SEC = 600;

/** يختم لحظةَ إرسال الرابط (تُستدعى عند نجاح الطلب). */
export function markResetSent(): void {
  try {
    localStorage.setItem(KEY, String(Date.now()));
  } catch {
    // تصفّحٌ خاصٌّ أو تخزينٌ ممنوع — تسقط المهلة إلى النافذة الكاملة، ولا يتعطّل التدفّق.
  }
}

/** يمحو الختم بعد أن تُؤدّى مهمّته (نجاحٌ أو انتهاء). */
export function clearResetSent(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* لا شيء */
  }
}

/** الثواني الباقية من النافذة، أو النافذة كاملةً إن لم يوجد ختمٌ صالح. */
export function resetSecondsLeft(): number {
  try {
    const at = Number(localStorage.getItem(KEY));
    if (!at || Number.isNaN(at)) return RESET_WINDOW_SEC;
    const left = RESET_WINDOW_SEC - Math.floor((Date.now() - at) / 1000);
    // ختمٌ متقادمٌ من طلبٍ قديم لا يُصادَر به الحاضر: يُهمَل ويُعطى المستخدم النافذة كاملة.
    if (left <= 0 || left > RESET_WINDOW_SEC) return RESET_WINDOW_SEC;
    return left;
  } catch {
    return RESET_WINDOW_SEC;
  }
}
