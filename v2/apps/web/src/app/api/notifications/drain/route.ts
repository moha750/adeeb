import { NextResponse, type NextRequest } from "next/server";
import { cronAllowed } from "@/lib/cronGuard";
import { dispatchPending } from "@/lib/notifications/dispatch";

/**
 * **منفذُ الاستنزاف** — يوزّع ما بقي في طابور الوقائع (`v2/NOTIFICATIONS-SYSTEM.md` §٤).
 *
 * الواقعةُ التي يطلقها إجراءٌ خادميّ تُوزَّع في طلبها (`kickDispatch`). وهذا لما يولد بلا طلب:
 * وقائعُ المهامّ المجدولة في القاعدة (كنّاسُ الانتخابات، ونوافذُ التطوّع، والتكليف). ومناديه
 * `pg_cron` كلَّ دقيقة عبر `pg_net`، وهو امتدادٌ لم يُثبَّت بعد: يُطلب إذنُ محمد حين يصل أوّلُ
 * إشعارٍ مجدول. ولا تُستعمل مهامُّ Vercel: خطّةُ Hobby لا تقبل أقلَّ من مرّةٍ يوميًّا (درسُ
 * `qr-alerts/drain`).
 *
 * **وحارسُه سرٌّ لا جلسة**: `x-cron-secret` يساوي `NOTIFICATIONS_DRAIN_SECRET`. وبلا سرٍّ مضبوط
 * يُردّ كلُّ نداءٍ ٤٠١ — البابُ مغلقٌ حتّى يُفتح عمدًا.
 *
 * **أو سرًّا مشتقًّا من مفتاح الخدمة** (٢٠٢٦-١٠-١٧، `lib/cronGuard.ts`): المحفوظُ في Vault باسم
 * `notifications_drain_secret`، ويحمله `pg_cron`.
 */

export const dynamic = "force-dynamic";

const BATCH = 50;
const ROUNDS = 5;

export async function POST(request: NextRequest) {
  if (!cronAllowed(request, "adeeb-notifications-drain", "NOTIFICATIONS_DRAIN_SECRET")) return NextResponse.json({ ok: false }, { status: 401 });
  let events = 0;
  let recipients = 0;
  let failed = 0;
  for (let i = 0; i < ROUNDS; i++) {
    const r = await dispatchPending(BATCH);
    events += r.events;
    recipients += r.recipients;
    failed += r.failed;
    // دفعةٌ ناقصة = فرغ الطابور؛ ودفعةٌ فيها سقوط = عطلٌ لا يُطارَد في النداء نفسِه.
    if (r.events < BATCH || r.failed > 0) break;
  }
  return NextResponse.json({ ok: true, events, recipients, failed });
}
