import { NextResponse, type NextRequest } from "next/server";
import { notificationsDb } from "@/lib/notifications/db";
import { readDeliveryEvent, verifyWebhook } from "@/lib/email/webhook";

/**
 * **خطّافُ Resend** (٢٠٢٦-١٠-١٩) — يطرقه Resend بما جرى للرسالة بعد خروجها: وصلت، تأخّرت، ارتدّت، شكا صاحبُها.
 * فيُكتب على صفّها في الصادر (`email_delivery_event`)، ويُوقَف العنوانُ إن ارتدّ ارتدادًا دائمًا أو شكا.
 *
 * **حارسُه توقيعُ Resend** بسرّ `RESEND_WEBHOOK_SECRET` (`lib/email/webhook.ts`). وبلا سرٍّ يُردّ 503: الطرقةُ
 * لا تُقبَل بلا تحقّق، وResend يعيدها بعد ساعاتٍ فلا تضيع إن ضُبط السرُّ متأخّرًا.
 *
 * ويُجاب بـ200 لكلّ ما تحقّق منه ولو لم تُعرف رسالتُه (رسالةٌ أُرسلت من لوحة Resend مثلًا)، وإلّا ظلّ Resend
 * يعيد طرقتَه أيّامًا. ويُجاب بـ500 إن تعثّرت الكتابةُ في القاعدة، فيعيدها هو.
 */

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!secret) return NextResponse.json({ ok: false, error: "not configured" }, { status: 503 });

  // الجسمُ خامًا كما وصل: التوقيعُ على حروفه، وإعادةُ تسلسل الـJSON تكسره.
  const body = await request.text();
  const ok = verifyWebhook(secret, {
    id: request.headers.get("svix-id"),
    timestamp: request.headers.get("svix-timestamp"),
    signature: request.headers.get("svix-signature"),
  }, body);
  if (!ok) return NextResponse.json({ ok: false }, { status: 401 });

  let payload: unknown;
  try { payload = JSON.parse(body); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  const event = readDeliveryEvent(payload);
  if (!event) return NextResponse.json({ ok: true, ignored: true });

  const sb = notificationsDb();
  if (!sb) return NextResponse.json({ ok: false }, { status: 500 });
  const { data, error } = await sb.rpc("email_delivery_event", {
    p_provider_id: event.providerId,
    p_type: event.type,
    p_note: event.note,
    p_permanent: event.permanent,
  });
  if (error) {
    console.error("[email] webhook write failed", { type: event.type, error: error.message });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true, known: data === true });
}
