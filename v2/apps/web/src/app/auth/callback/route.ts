import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safeNext";
import { logSignin } from "@/lib/signinEvents";

/**
 * **بابُ العودة من قوقل/أبل** — يبدّل الرمزَ المؤقّت بجلسةٍ ثمّ يسوق العضوَ إلى وجهته.
 *
 * ولم يكن للموقع بابُ عودةٍ قبل اليوم: الدخولُ كان كلمةَ مرورٍ تُبدَّل في المتصفّح، والاستعادةُ
 * تلتقط رمزَها في الشاشة نفسِها. فهذا أوّلُ مسارٍ يكتب جلسةً من الخادم.
 *
 * **ولا يُعرَض هنا نصٌّ قادمٌ من الرابط**: المزوّد (والخطّاف من ورائه) يردّ رسالتَه في
 * `error_description`، ولو مُرِّرت إلى الشاشة لصار الرابطُ يكتب فيها ما يشاء. فتُترجَم إلى
 * **رمزٍ من قائمةٍ مغلقة** وتُقرأ عبارتُه من `lib/authErrors.ts` — مصدرِ نصوص المصادقة الواحد.
 */

/** رمزٌ من قائمةٍ مغلقة، أو `null` إن لم يكن في الرابط رفضٌ أصلًا. */
function rejection(params: URLSearchParams): string | null {
  const raw = params.get("error_description") ?? params.get("error_code") ?? params.get("error");
  if (!raw) return null;
  if (raw.includes("adeeb_oauth_hidden_email")) return "adeeb_oauth_hidden_email";
  if (raw.includes("adeeb_oauth_no_account")) return "adeeb_oauth_no_account";
  return "oauth_failed";
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  // **الأصلُ من الرأس لا من الطلب خلف وكيل:** على Vercel يصل الطلبُ من الموازن الداخليّ،
  // فـ`origin` مضيفُه هو لا `adeeb.club` — فيقع العضو على نطاقٍ غريبٍ بلا كوكيز جلسته.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const base = process.env.NODE_ENV === "development" || !forwardedHost ? origin : `https://${forwardedHost}`;
  const supabase = await createClient();
  // قياسُ طُرق الدخول (`lib/signinEvents.ts`): المزوّدُ يعبر في الرابط من `OAuthButtons`،
  // ولا يُقبل منه إلّا الاثنان. ومن جاء بلا `via` (رابطٌ قديم) لا يُقاس، ولا يُعطَّل دخولُه.
  const viaRaw = searchParams.get("via");
  const via = viaRaw === "google" || viaRaw === "apple" ? viaRaw : null;
  const back = (code: string) => {
    if (via) logSignin(supabase, via, "fail", "oauth", code);
    return NextResponse.redirect(`${base}/login?e=${code}`);
  };

  const refused = rejection(searchParams);
  if (refused) return back(refused);

  const code = searchParams.get("code");
  if (!code) return back("oauth_failed"); // بلا رمزٍ ولا خطأ: رابطٌ بُتر أو زيارةٌ مباشرة

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return back("oauth_failed");
  if (via) logSignin(supabase, via, "success", "oauth");

  return NextResponse.redirect(`${base}${safeNext(searchParams.get("next"))}`);
}
