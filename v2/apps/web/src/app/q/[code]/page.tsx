import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
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
 * والرمزُ المجهولُ والموقوفُ يخرجان من بابٍ واحد (`notFound`): من يجرّب الرموزَ لا
 * يُخبَر أنّه أصاب رمزًا موقوفًا.
 */
export default async function QrRedirect({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  // شكلُ الرمز يُفحَص قبل أيّ استعلام: الخُردةُ تُردّ بلا أن تلمس القاعدة.
  if (!isQrCode(code)) notFound();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) notFound();

  const h = await headers();
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

  // عطلُ القاعدة لا يبتلع الزائر: يُردّ بصفحة «غير موجود» ولا يُترك في فراغ.
  if (error || !data) notFound();

  redirect(data as string);
}

/** لا فهرسةَ لبابٍ يحوّل: الفهارسُ تتبع الوجهةَ نفسَها لا وكيلَها. */
export const metadata = { robots: { index: false, follow: false } };
