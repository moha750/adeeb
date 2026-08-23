import { NextResponse, type NextRequest } from "next/server";
import { createAdeebServiceClient } from "@adeeb/core";
import { deviceFrom, isBotAgent, isQrCode, referrerHost } from "@/lib/qrLinks";
import { clientIp, visitorHash } from "@/lib/visitor";

/**
 * **بابُ الرمز** — الرابطُ المحفور في كلّ رمزٍ ديناميكيّ.
 *
 * لا يعرض شيئًا: يقرأ الوجهة، ويكتب المسحة، ويحوّل. وهو في طريق الزائر بين كاميرته
 * والموقعِ المقصود، فكلُّ عملٍ زائدٍ هنا تأخيرٌ يراه بعينه. ولذلك:
 *
 * · **نداءٌ واحدٌ للقاعدة** (`qr_resolve`) يقرأ ويكتب ويزيد العدّاد في معاملةٍ واحدة،
 *   لا ثلاثةُ ذهابٍ وإياب.
 * · **ولا جلسةَ تُقرأ**: الماسحُ مجهولٌ بطبيعته، وقراءةُ الكوكيز لا تفيد وتُكلّف.
 *   والكتابةُ بمفتاح الخدمة لأنّه لا سياسةَ إدراجٍ لأحدٍ على `qr_scans` (درسُ ديبو:
 *   ما دامت سياسةٌ تسمح بإدراجٍ من المتصفّح فالحارسُ زينة).
 *
 * **ولمَ `route.ts` لا `page.tsx`** (قِيس ٢٠٢٦-٠٨-٢٣): كان صفحةً تنادي `redirect()`،
 * فكان جوابُها **‏200 وصفحةً كاملةً** بالتخطيط والأنماط، وفيها `meta refresh` بمهلة
 * **ثانية**. علّتُه أنّ التحويل يقع بعد أن يكون الهيكلُ قد تدفّق، فيسقط Next إلى
 * تحويل المتصفّح. فالماسحُ يرى بياضًا ثمّ ينتقل — وهو عينُ ما بُني هذا البابُ لينفيه.
 * ومنفذُ الطريق يردّ **‏307 بلا جسد**: لا تخطيطَ يُرسَم ولا مهلةَ تُنتظَر.
 *
 * والرمزُ المجهولُ والموقوفُ يخرجان من بابٍ واحد (‏404): من يجرّب الرموزَ لا يُخبَر
 * أنّه أصاب رمزًا موقوفًا. ولا فهرسةَ لبابٍ يحوّل — الفهارسُ تتبع الوجهةَ نفسَها لا
 * وكيلَها، و`robots.ts` يحجب `‎/q`‎ أصلًا.
 */

const gone = () =>
  new NextResponse(null, { status: 404, headers: { "x-robots-tag": "noindex, nofollow" } });

export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  // شكلُ الرمز يُفحَص قبل أيّ استعلام: الخُردةُ تُردّ بلا أن تلمس القاعدة.
  if (!isQrCode(code)) return gone();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return gone();

  const h = request.headers;
  const ua = h.get("user-agent");

  // البصمةُ تُحسب ولا تُخزَّن خامًا، وتدور كلّ يوم (انظر `lib/visitor`).
  let visitor: string | null = null;
  try {
    visitor = visitorHash(clientIp(h));
  } catch {
    // الملحُ ناقصٌ في الإنتاج: تُسجَّل المسحةُ بلا بصمة ولا يُمنَع الزائرُ من وجهته.
    visitor = null;
  }

  const sb = createAdeebServiceClient(url, key);
  const { data, error } = await sb.rpc("qr_resolve", {
    p_code: code,
    p_visitor: visitor,
    p_referrer: referrerHost(h.get("referer")),
    p_device: deviceFrom(ua),
    p_is_bot: isBotAgent(ua),
  });

  // عطلُ القاعدة لا يبتلع الزائر: يُردّ بـ«غير موجود» ولا يُترك في فراغ.
  if (error || typeof data !== "string" || !data) return gone();

  // 307 لا 308: التحويلُ حالٌ تتبدّل بتبديل الوجهة، فلا يُحفظ في ذاكرة المتصفّح دائمًا.
  return NextResponse.redirect(data, { status: 307, headers: { "cache-control": "no-store" } });
}
