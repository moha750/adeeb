/**
 * **سجلُّ الجهاز** — أبل تُرسل إلى هنا كلّ ما يعترضها في التحديث: رمزٌ مرفوض، توقيعٌ لم
 * يُقبَل، ردٌّ لم تفهمه.
 *
 * `POST /wallet-preview/w/v1/log` — الجسم `{ "logs": ["…", "…"] }`
 *
 * **وهو أنفعُ مسارٍ في الخدمة كلّها عند العطل**، ولذلك بُني وإن كان اختياريًّا: بدونه لو
 * رفض الجهازُ بطاقتَنا لَصمت، ولَبقينا نخمّن السبب. وبه تقوله أبل بالحرف في سجلّ Vercel.
 */

import { NextResponse } from "next/server";
import { appendLog } from "@/app/wallet-preview/store";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as { logs?: unknown };
    const logs = (Array.isArray(body.logs) ? body.logs : [body.logs]).map((l) => String(l));
    // **يُحفَظ صفوفًا لا في سجلّ الخادم وحده**: سجلُّ Vercel لا يُقرأ من حيث نشخّص،
    // وهذا أنفعُ ما تقوله أبل حين ترفض بطاقتَنا.
    await appendLog(logs);
    for (const line of logs) console.warn("[wallet-preview، سجلّ أبل]", line);
  } catch {
    /* لا نردّ خطأً على مسارِ سجلّ — أبل تُهمله وتُعيد المحاولة بلا فائدة */
  }
  return new NextResponse(null, { status: 200 });
}
