import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * يجدّد جلسة Supabase على مستوى الـmiddleware ويحرس مسارات اللوحة.
 * - يُنعِش الرمز ويعيد كتابة الكوكيز على الاستجابة.
 * - `/dashboard/*` بلا جلسة → تحويل إلى `/login?next=…`.
 * - `/login` مع جلسة → تحويل إلى `/dashboard`.
 * ملاحظة: هنا نتحقّق من **وجود جلسة** فقط (رخيص). التحقّق من الصلاحية (قدرة view_members)
 * يتمّ في تخطيط اللوحة عبر requireAdmin (تفويض لا مصادقة).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // مهمّ: لا تُدرج منطقًا بين createServerClient وقراءة الجلسة (يمنع أخطاء تجديد الجلسة العشوائية).
  //
  // و`getClaims` بدل `getUser` (٢٠٢٦-٠٩-٢٤): هذا الحارسُ يعمل في **كلّ** طلبٍ تقريبًا،
  // و`getUser` رحلةٌ كاملةٌ إلى خادم المصادقة في كلّ مرّة (قِيست ٢١٦–٨٧٣ مللي في السجلّ).
  // و`getClaims` يتحقّق من توقيع الرمز محلّيًّا، ويجدّده عند انتهائه كما كان — فالكوكيز
  // تُكتب على الاستجابة كما هي أدناه بلا تغيير.
  //
  // وقرارُ هذا الموضع **وجودُ جلسةٍ فقط**، لا صلاحيّتُها ولا حياتُها: من أُبطِلت جلستُه
  // يمرّ من هنا ثمّ تكشفه القاعدةُ في `lib/auth.ts` فيُردّ إلى `/logout`. انظر `SessionState`.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims ?? null;

  const { pathname } = request.nextUrl;
  const isDashboard = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const isLogin = pathname === "/login";

  if (!user && isDashboard) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
