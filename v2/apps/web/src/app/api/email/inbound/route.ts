import { NextResponse, type NextRequest } from "next/server";
import { notificationsDb } from "@/lib/notifications/db";
import { emit } from "@/lib/notifications/emit";
import { verifyWebhook } from "@/lib/email/webhook";
import { messageIdFrom, stripQuoted } from "@/lib/contact/inbound";

/**
 * **البريدُ الوارد** (٢٠٢٦-١٠-١٩) — يطرقه Resend حين يصل بريدٌ إلى نطاق الاستقبال (`CONTACT_REPLY_DOMAIN`):
 * ردُّ مُرسِلٍ على ردّنا في رسائل التواصل (`lib/contact/inbound.ts`). فيُكتب دورًا في محادثة رسالته
 * (`contact_inbound_turn`)، وتعود الرسالةُ «جديدة»، ويُشعَر أهلُ الصندوق.
 *
 * **خطّافٌ مستقلٌّ بسرّه** (`RESEND_INBOUND_WEBHOOK_SECRET`) عن خطّاف ما بعد الإرسال (`/api/email/webhook`):
 * لكلٍّ حدثُه (`email.received` هنا)، فلا يمسّ أحدُهما الآخر. وبلا سرٍّ يُردّ 503 فيعيد Resend الطرقة لاحقًا.
 *
 * والطرقةُ لا تحمل نصَّ البريد، فيُجلب من Resend بمعرّفه (`GET /emails/receiving/{id}`). ويُجاب بـ200 لكلّ ما
 * تحقّق منه ولو لم يتبع رسالةً نعرفها (بريدٌ تائه)، وإلّا ظلّ Resend يعيده. ويُجاب بـ500 إن تعثّر الجلبُ أو
 * الكتابة، فيعيده هو، والدورُ لا يُكتب مرّتين (`provider_id` فريد).
 */

export const dynamic = "force-dynamic";

type Received = { type?: string; data?: { email_id?: string; from?: string; to?: string[]; subject?: string } };

async function fetchText(id: string, key: string): Promise<string | null> {
  const res = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const mail = (await res.json()) as { text?: string | null; html?: string | null };
  if (mail.text?.trim()) return mail.text;
  // بلا نصٍّ صريح: الـHTML بلا وسومه، سطرًا لكلّ كتلة
  if (mail.html) {
    return mail.html
      .replace(/<(br|\/p|\/div|\/li|\/h\d)[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\n{3,}/g, "\n\n");
  }
  return "";
}

export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_INBOUND_WEBHOOK_SECRET?.trim();
  const key = process.env.RESEND_API_KEY?.trim();
  if (!secret || !key) return NextResponse.json({ ok: false, error: "not configured" }, { status: 503 });

  // الجسمُ خامًا كما وصل: التوقيعُ على حروفه.
  const body = await request.text();
  const ok = verifyWebhook(secret, {
    id: request.headers.get("svix-id"),
    timestamp: request.headers.get("svix-timestamp"),
    signature: request.headers.get("svix-signature"),
  }, body);
  if (!ok) return NextResponse.json({ ok: false }, { status: 401 });

  let payload: Received;
  try { payload = JSON.parse(body) as Received; } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  if (payload.type !== "email.received" || !payload.data?.email_id) return NextResponse.json({ ok: true, ignored: true });

  const { email_id: emailId, from = "", to = [] } = payload.data;
  const messageId = messageIdFrom(to);
  if (!messageId) return NextResponse.json({ ok: true, ignored: "not a contact reply" });

  const raw = await fetchText(emailId, key).catch(() => null);
  if (raw === null) return NextResponse.json({ ok: false }, { status: 500 });
  const text = stripQuoted(raw);

  const sb = notificationsDb();
  if (!sb) return NextResponse.json({ ok: false }, { status: 500 });
  const sender = (from.match(/<([^>]+)>/)?.[1] ?? from).trim();
  const { data, error } = await sb.rpc("contact_inbound_turn", {
    p_message_id: messageId,
    p_from: sender,
    p_body: text,
    p_provider_id: emailId,
  });
  if (error) {
    console.error("[contact] inbound write failed", { error: error.message });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  const res = (data ?? {}) as { ok?: boolean; duplicate?: boolean; name?: string; subject?: string | null };
  if (res.ok && !res.duplicate) {
    await emit("contact.received", { name: res.name ?? sender, subject: res.subject ?? null, excerpt: text.slice(0, 80), followUp: true });
  }
  return NextResponse.json({ ok: true, known: !!res.ok });
}
