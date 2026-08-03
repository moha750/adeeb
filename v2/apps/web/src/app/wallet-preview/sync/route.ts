/**
 * **المزامنة** — البابُ الذي تطرقه الصفحة كلّما تغيّرت الأختام: يكتب الحالة في القاعدة
 * ثمّ يدفع نبضةً صامتةً إلى كلّ جهازٍ سجّل هذه البطاقة.
 *
 * `POST /wallet-preview/sync` — الجسم `{ member, stamps, cycles }`
 *
 * **ويردّ ما جرى لكلّ جهازٍ بصدق** (`pushed` · `results`): إن رفضت أبل رمزًا ظهر سببُها
 * بالحرف في الصفحة. الدفعةُ الصامتة تفشل صامتةً بطبعها، وأسوأُ ما في عرضٍ حيٍّ أن يضغط
 * المالك ولا يدري: أوصلت أم لا؟
 *
 * **ولا حراسةَ عليه** — والوعيُ بذلك مقصود: بياناتُه أربعُ بطاقاتٍ وهميّة في جدولٍ مؤقّت،
 * وأقصى ما يفعله عابثٌ أن يبدّل عددَ أختامٍ متخيَّلة. حراسةٌ حقيقيّة موضعُها النظامُ
 * الحقيقيّ، وهناك يكون الختمُ فعلًا له قدرةٌ وسجلّ.
 */

import { NextResponse } from "next/server";
import { pushToDevices } from "../apns";
import { GOAL, memberById } from "../demo";
import { setCard, tokensFor } from "../store";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<Response> {
  let body: { member?: string; stamps?: number; cycles?: number };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "جسمٌ غير صالح." }, { status: 400 });
  }

  const member = memberById(body.member ?? "");
  // يُقصّ إلى المدى فلا يصنع طلبٌ مشوَّهٌ بطاقةً مستحيلة (والقاعدة تحرسه ثانيةً بـ`check`).
  const stamps = Math.min(GOAL, Math.max(0, Math.trunc(Number(body.stamps) || 0)));
  const cycles = Math.max(0, Math.trunc(Number(body.cycles) || 0));

  const card = await setCard(member.serial, stamps, cycles);
  if (!card) {
    return NextResponse.json({ error: "تعذّر حفظ الحالة — تحقّق من مفتاح الخدمة." }, { status: 503 });
  }

  const tokens = await tokensFor(member.serial);
  const topic = process.env.WALLET_PASS_TYPE_ID;
  const results = topic ? await pushToDevices(tokens, topic) : [];

  return NextResponse.json(
    {
      serial: card.serial,
      stamps: card.stamps,
      cycles: card.cycles,
      devices: tokens.length,
      pushed: results.filter((r) => r.status === 200).length,
      // الفاشلة وحدها تُعرَض — والناجحة يكفيها عددُها
      failures: results.filter((r) => r.status !== 200).map((r) => ({ status: r.status, reason: r.reason })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
