import { NextResponse, type NextRequest } from "next/server";
import { cronAllowed } from "@/lib/cronGuard";
import { drainEmails } from "@/lib/email/outbox";

/**
 * **منفذُ المُرسِل** — يستنزف `email_outbox` (`v2/EMAIL-SYSTEM.md`).
 *
 * تطرقه القاعدةُ عند كلّ إدراجٍ في الصادر (محفّزٌ عبر `pg_net`، فيصل رمزُ الدخول في ثوانٍ)، وكلَّ
 * دقيقةٍ إن بقي ما حان (`pg_cron`: إعادةُ المحاولات وطَرقةٌ ضاعت). وحارسُه سرٌّ مشتقٌّ (`cronGuard`)
 * محفوظٌ في Vault باسم `email_drain_secret`.
 *
 * ويقول في جوابه أمهيّأٌ المزوّدُ أم لا (`configured`)، فيُعرف من الخارج أنّ المفتاح غائب.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BATCH = 25;
const ROUNDS = 4;

export async function POST(request: NextRequest) {
  if (!cronAllowed(request, "adeeb-email-drain")) return NextResponse.json({ ok: false }, { status: 401 });
  const total = { configured: true, claimed: 0, sent: 0, retrying: 0, dead: 0 };
  for (let i = 0; i < ROUNDS; i++) {
    const r = await drainEmails(BATCH);
    total.configured = r.configured;
    total.claimed += r.claimed;
    total.sent += r.sent;
    total.retrying += r.retrying;
    total.dead += r.dead;
    if (!r.configured || r.claimed < BATCH) break;
  }
  return NextResponse.json({ ok: true, ...total });
}
