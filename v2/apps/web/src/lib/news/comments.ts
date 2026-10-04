// قواعدُ تعليق الخبر — **مصدرٌ واحد** يقرأه العميلُ (ليُعطّل الزرّ) والخادمُ (ليردّ).
// بلا "server-only" عمدًا: ما يتحقّق منه المتصفّح تجربةٌ، وما يتحقّق منه الفعلُ أمنٌ،
// والنصُّ واحدٌ فلا يفترق الحكمان.

export const COMMENT_MIN = 2;
export const COMMENT_MAX = 1000;
export const NAME_MIN = 2;
export const NAME_MAX = 60;

/**
 * تنقيةُ المُدخَل قبل الحكم عليه: تُسوّى المسافاتُ وتُقلَّم الأطراف، وتُحصَر الأسطرُ
 * الفارغةُ المتتالية في سطرين — تعليقٌ من ثلاثين سطرًا فارغًا يُمدّد الصفحةَ بلا معنًى.
 */
export function cleanComment(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * يردّ رسالةً عربيّةً بما امتنع، أو `null` إن صحّ.
 *
 * واسمُ الزائر **لا يُلزَم بالعربيّة**: حارسُ `lib/personName` لأسماء أهل أدِيب في
 * السجلّ، وهذا زائرٌ يسمّي نفسَه كيف شاء — وأحدُهم سمّى نفسَه «تقبلوا مروري».
 */
export function commentError(text: string, guestName: string | null, signedIn: boolean): string | null {
  if (text.length < COMMENT_MIN) return "اكتب تعليقًا أطول.";
  if (text.length > COMMENT_MAX) return `تعليقُك أطولُ من ${COMMENT_MAX} حرفًا.`;
  if (signedIn) return null;
  if (!guestName || guestName.length < NAME_MIN) return "اكتب اسمَك، أو سجّل دخولك.";
  if (guestName.length > NAME_MAX) return "الاسمُ أطولُ ممّا ينبغي.";
  return null;
}
