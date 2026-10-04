import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * بابُ الخروج الخادميّ — **يُمحى الكوكي ثمّ يُردّ صاحبُه** (٢٠٢٦-٠٩-٢٤).
 *
 * لماذا وُجد أصلًا: صار الرمزُ يُصدَّق محلّيًّا (`getClaims`)، فرمزُ جلسةٍ أُبطِلت من
 * جهازٍ آخر يبقى صحيحَ التوقيع حتّى ينتهي عمرُه. تكشفه القاعدةُ في `lib/auth.ts`، لكنّ
 * الشاشةَ لا تستطيع محوَ كوكي (المكوّناتُ الخادميّة لا تكتب كوكيز) — فلو ردّته إلى
 * `/login` لَدار في حلقة: الحارسُ يرى رمزًا صحيحًا فيقذفه إلى اللوحة، واللوحةُ ترى
 * الجلسةَ ميّتةً فتقذفه إلى الدخول. ومُعالِجُ المسار يكتب الكوكيز، فههنا تُقطع الحلقة.
 *
 * و`scope: "local"` بلا نداءِ شبكة: الجلسةُ محذوفةٌ عند GoTrue أصلًا (هي سببُ مجيئنا)،
 * فالمطلوبُ محوُ أثرها من المتصفّح لا إبطالُها مرّةً ثانية.
 *
 * وهو بابٌ عامّ: من زاره بجلسةٍ حيّةٍ خرج منها. وذلك سلوكٌ صحيحٌ لا ثغرة.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });

  const next = request.nextUrl.searchParams.get("next");
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  // `next` يُعاد بناؤه من مسارٍ داخليٍّ فقط — قيمةٌ مطلقةٌ من الخارج تصير تحويلًا مفتوحًا.
  if (next && next.startsWith("/") && !next.startsWith("//")) url.searchParams.set("next", next);

  const response = NextResponse.redirect(url);
  // **وتُمحى الكوكيز على الاستجابة صراحةً**: محوُ `signOut` يمرّ عبر `cookies()`، وهو
  // يسري على استجابةٍ عاديّة؛ والتحويلُ استجابةٌ نبنيها بأنفسنا ههنا، فنضمن المحوَ عليها.
  for (const c of request.cookies.getAll()) {
    if (c.name.startsWith("sb-")) response.cookies.delete(c.name);
  }
  return response;
}
