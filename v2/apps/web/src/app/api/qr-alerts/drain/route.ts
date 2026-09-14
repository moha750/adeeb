import { NextResponse, type NextRequest } from "next/server";
import { createAdeebServiceClient } from "@adeeb/core";
import { qrAlertMail } from "@/lib/qrAlertMail";

/**
 * **حارسُ الوجهات** — يستنزف صادرَ التنبيهات ويُرسله بريدًا.
 *
 * ## لماذا منفذٌ يُنادى لا محفّزٌ يُرسل
 * إرسالُ البريد داخل محفّز القاعدة يعلّق المعاملةَ على شبكةٍ خارجيّة، وفشلُ الطرف الآخر
 * يُسقط تبديلَ الوجهة نفسَه. فالمحفّزُ يكتب صفًّا في `qr_alert_outbox`، وهذا المنفذُ يقرؤه
 * ويرسل ويؤشّر. ومن ناداه: مهمّةٌ مجدولةٌ في Vercel أو نداءٌ يدويّ.
 *
 * ## والإرسالُ مطفأٌ حتى كلمة المالك
 * `QR_ALERTS_ENABLED` غيرُ مضبوطٍ ⇒ لا بريدَ يخرج، وتُؤشَّر الصفوفُ `off` مع بقاء الواقعة
 * في السجلّ. فالبناءُ كاملٌ والزنادُ في يده (قاعدةُ البريد الحقيقيّ في هذا المستودع).
 *
 * ## وحارسُه سرٌّ لا جلسة
 * لا مستخدمَ هنا: النداءُ من مهمّةٍ مجدولة. فالسرُّ في ترويسة `x-cron-secret`، ومن لا يحمله
 * يُردّ ٤٠١ قبل أيّ قراءة.
 *
 * ## وجدولُه مرّةً في اليوم لا كلَّ عشر دقائق (2026-09-14)
 * كُتب أوّلَ مرّةٍ بتكرارِ كلِّ عشر دقائق، فرفض Vercel **النشرَ كلَّه** رفضًا سابقًا للبناء: خطّةُ
 * Hobby تحدّ المهامَّ الدوريّة بمرّةٍ يوميّة. ولم يظهر الرفضُ صفًّا في قائمة النشرات، بل
 * فحصًا أحمرَ على اللقطة في GitHub يشير إلى صفحة تسعير المهامّ. فوقف الموقعُ على لقطة
 * ٢٨ أغسطس نحوَ أسبوعين بلا أثرٍ ظاهر. **فلا تُعِد التكرارَ إلى ما دون اليوم** ما دامت
 * الخطّةُ Hobby. ومن أراد العشرَ دقائق فبابُ `x-cron-secret` أعلاه مفتوحٌ لمُجدوِلٍ خارجيّ
 * (pg_cron في Supabase مثلًا) بلا مساسٍ بهذا الملفّ ولا بالخطّة.
 */

export const dynamic = "force-dynamic";

/** لا يُرسَل أكثرُ من هذا في النداء الواحد: نداءٌ واحدٌ لا يعلَق في طابورٍ طويل. */
const BATCH = 20;

type Row = {
  id: number;
  link_id: string;
  qr_link_events: { actor_id: string | null; old_value: string | null; new_value: string | null; at: string } | null;
};

/**
 * **بابان لنداءٍ واحد**: مهمّةُ Vercel المجدولة تنادي بـ`GET` وترويسةِ
 * `Authorization: Bearer <CRON_SECRET>`، والنداءُ اليدويُّ للتجربة بـ`POST` وترويسةِ
 * `x-cron-secret`. وكلاهما يمرّ بالحارس نفسِه.
 */
function guard(request: NextRequest): boolean {
  const ours = process.env.QR_ALERTS_CRON_SECRET?.trim();
  const vercel = process.env.CRON_SECRET?.trim();
  const header = request.headers.get("x-cron-secret");
  const auth = request.headers.get("authorization");
  if (ours && header === ours) return true;
  if (vercel && auth === `Bearer ${vercel}`) return true;
  return false;
}

export async function GET(request: NextRequest) {
  return POST(request);
}

export async function POST(request: NextRequest) {
  if (!guard(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // مفتاحُ الخدمة يُقرأ هنا لا يُستورَد جاهزًا: بلا بيئةٍ يُردّ الطلبُ ولا يُبنى عميلٌ أعمى.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return NextResponse.json({ ok: false, error: "no-service-key" }, { status: 500 });
  const sb = createAdeebServiceClient(url, key);

  const { data, error } = await sb
    .from("qr_alert_outbox")
    .select("id, link_id, qr_link_events(actor_id, old_value, new_value, at)")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(BATCH);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const rows = (data ?? []) as unknown as Row[];
  if (!rows.length) return NextResponse.json({ ok: true, drained: 0 });

  const enabled = !!process.env.QR_ALERTS_ENABLED?.trim() && !!process.env.RESEND_API_KEY?.trim();

  // أسماءُ الباركودات والفاعلين في نداءين، لا نداءٍ لكلّ صفّ.
  const linkIds = [...new Set(rows.map((r) => r.link_id))];
  const actorIds = [...new Set(rows.map((r) => r.qr_link_events?.actor_id).filter((v): v is string => !!v))];
  const { data: links } = await sb.from("qr_links").select("id, title, code").in("id", linkIds);
  const { data: actors } = actorIds.length
    ? await sb.from("profiles").select("id, full_name").in("id", actorIds)
    : { data: [] as { id: string; full_name: string }[] };
  const linkById = new Map((links ?? []).map((l) => [l.id as string, l as { id: string; title: string; code: string }]));
  const actorById = new Map((actors ?? []).map((p) => [p.id as string, p.full_name as string]));

  const to = await overseerEmails(sb);

  let sent = 0;
  for (const row of rows) {
    const ev = row.qr_link_events;
    const link = linkById.get(row.link_id);
    if (!ev || !link) {
      await sb.from("qr_alert_outbox").update({ status: "failed", error: "no-event-or-link" }).eq("id", row.id);
      continue;
    }

    if (!enabled || !to.length) {
      await sb
        .from("qr_alert_outbox")
        .update({ status: "off", error: to.length ? null : "no-recipients" })
        .eq("id", row.id);
      continue;
    }

    const res = await sendMail(to, link, ev, actorById.get(ev.actor_id ?? "") ?? null);
    await sb
      .from("qr_alert_outbox")
      .update(
        res.ok
          ? { status: "sent", sent_at: new Date().toISOString(), attempts: 1 }
          : { status: "failed", error: res.error, attempts: 1 },
      )
      .eq("id", row.id);
    if (res.ok) sent += 1;
  }

  return NextResponse.json({ ok: true, drained: rows.length, sent, enabled, recipients: to.length });
}

/** المُنبَّهون: حاملو قدرة الإشراف. تُقرأ قدرتُهم من مصدرها لا من قائمةٍ محفورة. */
async function overseerEmails(sb: ReturnType<typeof createAdeebServiceClient>): Promise<string[]> {
  const { data } = await sb.from("profiles").select("id, email");
  const people = (data ?? []) as { id: string; email: string | null }[];
  const out: string[] = [];
  for (const p of people) {
    if (!p.email) continue;
    const { data: can } = await sb.rpc("check_user_permission", { p_user_id: p.id, p_permission_key: "oversee_qr" });
    if (can === true) out.push(p.email);
  }
  return out;
}

async function sendMail(
  to: string[],
  link: { id: string; title: string; code: string },
  ev: { old_value: string | null; new_value: string | null; at: string },
  actor: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const mail = qrAlertMail({ link, ev, actor });
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: "أَدِيب <no-reply@adeeb.club>", to, subject: mail.subject, html: mail.html }),
    });
    if (!res.ok) return { ok: false, error: `resend-${res.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "send-failed" };
  }
}
