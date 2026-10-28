import { NextResponse, type NextRequest } from "next/server";
import { cronAllowed } from "@/lib/cronGuard";
import { executeClosedCycles } from "@/lib/evaluation/execute";
import { dispatchPending } from "@/lib/notifications/dispatch";

/**
 * **منفذُ الحكم في تقييم القيادات** — يطرقه `pg_cron` كلَّ عشر دقائق ما دامت دورةٌ مغلقةٌ تنتظر حكمها
 * (المؤقّت `evaluation-execute`، `supabase/migrations/20261027195251_evaluation_03_execution.sql`).
 *
 * **وحارسُه سرٌّ لا جلسة** (`lib/cronGuard.ts`): `HMAC-SHA256(SUPABASE_SERVICE_ROLE_KEY,
 * "adeeb-evaluation-execute")`، محفوظٌ في Vault باسم `evaluation_execute_secret`. وبلاه يُردّ كلُّ نداءٍ ٤٠١.
 *
 * الحسابُ هنا لا في القاعدة (قرار محمد ٢٠٢٦-١٠-٢٠): الدالّةُ النقيّة `lib/evaluation/score.ts` مصدرُه
 * الواحدُ المحروسُ باختبار. وبعد الحكم يُوزَّع ما ولّده من إشعاراتٍ في النداء نفسِه.
 */

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!cronAllowed(request, "adeeb-evaluation-execute")) return NextResponse.json({ ok: false }, { status: 401 });
  const summary = await executeClosedCycles();
  if (summary.cycles > 0) await dispatchPending(50);
  return NextResponse.json({ ok: summary.errors.length === 0, ...summary });
}
