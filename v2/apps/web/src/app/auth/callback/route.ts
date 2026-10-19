import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safeNext";
import { logSignin } from "@/lib/signinEvents";
import { createAdeebServiceClient } from "@adeeb/core";
import { LOGIN_OAUTH_COOKIE, NO_ACCOUNT } from "@/lib/oauthIntent";

/**
 * **بابُ العودة من قوقل/أبل** — يبدّل الرمزَ المؤقّت بجلسةٍ ثمّ يسوق العضوَ إلى وجهته.
 *
 * ولم يكن للموقع بابُ عودةٍ قبل اليوم: الدخولُ كان كلمةَ مرورٍ تُبدَّل في المتصفّح، والاستعادةُ
 * تلتقط رمزَها في الشاشة نفسِها. فهذا أوّلُ مسارٍ يكتب جلسةً من الخادم.
 *
 * **ولا يُعرَض هنا نصٌّ قادمٌ من الرابط**: المزوّد (والخطّاف من ورائه) يردّ رسالتَه في
 * `error_description`، ولو مُرِّرت إلى الشاشة لصار الرابطُ يكتب فيها ما يشاء. فتُترجَم إلى
 * **رمزٍ من قائمةٍ مغلقة** وتُقرأ عبارتُه من `lib/authErrors.ts` — مصدرِ نصوص المصادقة الواحد.
 *
 * **وبوّابةُ أدِيب لا تفتح حسابًا** (قرار المالك ٢٠٢٦-١٠-١٨): من ضغط قوقل أو أبل في `/login`
 * وليس له حساب، أنشأ له المزوّدُ حسابًا قبل أن نعرف (لا خطّافَ يرى من أيّ بابٍ جاء). فيُعرَف
 * هنا: رحلةٌ نيّتُها `login`، وميلادُ الحساب بعد علامة الضغط (`markLoginOAuth`) — فيُخرَج
 * ويُمحى الحسابُ الوليد، ويعود إلى البوّابة بـ«لا حسابَ لك» وزرٍّ يُكمل الإنشاءَ بضغطة.
 * **ومن لا علامةَ له لا يُمحى حسابُه** (كوكي محجوب، أو رحلةٌ بدأت قبل هذا القرار): الخطأُ
 * في هذا الاتّجاه حسابٌ زائد، وفي الاتّجاه الآخر حسابٌ حقيقيٌّ ضائع.
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
  const next = safeNext(searchParams.get("next"));
  const marked = Number(request.cookies.get(LOGIN_OAUTH_COOKIE)?.value);
  const done = (res: NextResponse) => {
    res.cookies.set(LOGIN_OAUTH_COOKIE, "", { path: "/auth", maxAge: 0 });
    return res;
  };

  if (searchParams.get("intent") === "login" && Number.isFinite(marked) && marked > 0) {
    const { data: { user } } = await supabase.auth.getUser();
    // ثوانٍ خمسٌ سماحةٌ لفارق ساعتَي الخادمين (Vercel وقاعدة Supabase)
    if (user && Date.parse(user.created_at) >= marked - 5000) {
      await supabase.auth.signOut();
      if (via) logSignin(supabase, via, "fail", "oauth", NO_ACCOUNT);
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
      if (url && key) await createAdeebServiceClient(url, key).auth.admin.deleteUser(user.id);
      const p = via ? `&p=${via}` : "";
      return done(NextResponse.redirect(`${base}/login?e=${NO_ACCOUNT}${p}&next=${encodeURIComponent(next)}`));
    }
  }

  if (via) logSignin(supabase, via, "success", "oauth");

  return done(NextResponse.redirect(`${base}${next}`));
}
