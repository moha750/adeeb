/**
 * هويّةُ الزائر المجهول في الأخبار — **المصدر الواحد**: كيف تُولَّد، وأين تسكن،
 * وكيف تُختزَل إلى بصمةٍ تُخزَّن في `news_likes.guest_identifier`.
 *
 * ⚠️ خادميٌّ محض: يقرأ الملحَ ويكتب الكوكيز، فلا يُستورد في كودٍ عميليّ أبدًا.
 *
 * ## لماذا كوكيز `httpOnly` لا `localStorage`
 * V1 ولّد `guest_<الطابع>_<عشوائيّ>` في المتصفّح وحفظه في `localStorage` وأرسله
 * مُدخَلًا إلى `toggle_news_like`. ومعناه أنّ من قرأ القيمةَ **نزع إعجابَ غيره**،
 * وأنّ أيَّ سكربتٍ في الصفحة يبلغها. والكوكيز `httpOnly` لا تبلغها سكربتاتُ الصفحة،
 * ولا تُرسَل إلّا مع فعلِ الخادم. (ولا يُنقَل عن V1 إلّا ما صحّ.)
 *
 * ## ولماذا لا `visitorHash`
 * تلك بصمةُ عنوانٍ **تدور مع اليوم** عمدًا، كي لا تصير مُعرِّفًا دائمًا في أرشيفٍ
 * لا يُكنَس. وإعجابٌ مفتاحُه يدور يعني أنّ من أعجبه خبرٌ أمسِ يُعجبه ثانيةً اليوم
 * فيتضاعف العدّاد، وأنّ قاعةً تشترك في عنوانٍ واحدٍ يُعجب أوّلُها عن آخرها.
 *
 * ## وكوكيزٌ واحدةٌ للأخبار كلِّها
 * خلافًا للُّعبة (كوكيزٌ لكلّ غرفةٍ كي لا تطرد إحداها الأخرى)، الزائرُ ههنا **شخصٌ
 * واحدٌ في كلّ الأخبار**: القيدُ في القاعدة على `(news_id, guest_identifier)`، فالصفُّ
 * يفرّق بين خبرَين، والهويّةُ لا تحتاج أن تتعدّد. ومسارُها `/` لأنّ المقالَ وسطُره
 * العلويَّ وأفعالَه قد تُنادى من أكثر من مسار.
 */
import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

/** سنةٌ: الإعجابُ رأيٌ يدوم، ولا يُراد أن يعود الزائرُ فيُعجب بالخبر نفسِه بعد شهر. */
const MAX_AGE = 365 * 24 * 60 * 60;
const COOKIE = "adeeb_reader";

/** رمزٌ خامٌّ من عشوائيّة التعمية — سرٌّ حقيقيّ لا مولّدُ أكوادٍ قصيرة. */
export const newReaderToken = (): string => randomBytes(32).toString("hex");

/**
 * بصمةُ الرمز: `sha256("news" ‖ الرمز ‖ الملح)`.
 *
 * والبادئةُ `news` تفصل المجال: الملحُ نفسُه يخدم بصماتٍ أخرى وبصمةَ الزائر،
 * ولولا الفصلُ لأمكن حملُ ناتج إحداها على الأخرى.
 *
 * ولا تدور مع اليوم: هي مفتاحُ هويّةٍ لا سجلُّ زيارة.
 */
export function hashReaderToken(token: string): string {
  const salt = process.env.VISITOR_SALT?.trim() || process.env.DEEBO_SALT?.trim();
  if (!salt) {
    if (process.env.NODE_ENV === "production") throw new Error("VISITOR_SALT ناقص");
    return createHash("sha256").update(`news|${token}|dev`).digest("hex");
  }
  return createHash("sha256").update(`news|${token}|${salt}`).digest("hex");
}

/** رمزُ هذا الجهاز إن سبق أن تفاعل، أو `null`. */
export async function readReaderToken(): Promise<string | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  return raw && /^[0-9a-f]{64}$/.test(raw) ? raw : null;
}

/**
 * يردّ بصمةَ الزائر، ويُنشئ له رمزًا إن لم يكن له.
 *
 * **والكتابةُ تقع قبل أن يُقبَل الفعل** خلافًا لسابقة اللعبة، ولها سبب: هناك الرمزُ
 * يعني «لاعبٌ في القاعة» فلا يُكتَب قبل أن تقبله، وههنا الرمزُ **هويّةٌ لا عضويّة**،
 * وإعجابٌ يُرفض لا يُبطل كونَ صاحبه هو هو. ولو أُخّرت الكتابةُ لَما صحّ نزعُ إعجابٍ
 * أُضيف للتوّ — إذ لا تُكتَب الكوكيزُ إلّا من فعلٍ خادميّ، ولا يصحّ كتابتُها مرّتين
 * بقيمتين في طلبٍ واحد.
 */
export async function ensureReaderId(): Promise<string> {
  const existing = await readReaderToken();
  if (existing) return hashReaderToken(existing);

  const token = newReaderToken();
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
  return hashReaderToken(token);
}

/** بصمةُ الزائر إن وُجدت **بلا إنشاء** — للقراءة في مسارٍ لا يملك كتابةَ كوكيز. */
export async function peekReaderId(): Promise<string | null> {
  const token = await readReaderToken();
  return token ? hashReaderToken(token) : null;
}
