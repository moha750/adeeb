/**
 * **المزامنة** — البابُ الذي يُكتب منه كلُّ تغييرٍ في الأختام: يحفظ الحالة في القاعدة ثمّ
 * يدفع نبضةً صامتةً إلى كلّ جهازٍ سجّل هذه البطاقة.
 *
 * `POST /wallet-preview/sync` — **وله لسانان يخدمان مستدعِيَين**:
 *
 * | الجسم | مَن يستعمله | لماذا |
 * |---|---|---|
 * | `{ member, stamps, cycles }` | لوحُ التجربة في الصفحة | يضبط **قيمةً مطلقة** (اقفز · صفّر) |
 * | `{ serial, action }` | صفحةُ المسح عند الباب | يطلب **فعلًا** (`stamp` أو `claim`) |
 *
 * **والفرق ليس ترفًا**: الماسحُ لا يعرف الحالة الراهنة ولا ينبغي أن يرسلها — لو أرسل
 * «اجعلها ٦» وكان ماسحٌ آخرُ قد ختم قبله بثانية، لَمحا ختمَه. فالفعلُ يُقرأ من القاعدة
 * ويُطبَّق عليها، فلا يضيع ختمٌ بين ماسحَين.
 *
 * **ويردّ ما جرى لكلّ جهازٍ بصدق** (`devices` · `pushed` · `failures`): الدفعةُ الصامتة
 * تفشل صامتةً بطبعها، وأسوأُ ما في عرضٍ حيٍّ أن يضغط المالك ولا يدري: أوصلت أم لا؟
 *
 * **ولا حراسةَ عليه** — والوعيُ بذلك مقصود: بياناتُه أربعُ بطاقاتٍ وهميّة في جدولٍ مؤقّت،
 * وأقصى ما يفعله عابثٌ أن يبدّل عددَ أختامٍ متخيَّلة. حراسةٌ حقيقيّة موضعُها النظامُ
 * الحقيقيّ، وهناك يكون الختمُ فعلًا له قدرةٌ وسجلّ.
 */

import { NextResponse } from "next/server";
import { pushToDevices } from "../apns";
import { GOAL, isComplete, memberById, memberBySerial } from "../demo";
import { getCard, setCard, tokensFor } from "../store";

export const runtime = "nodejs";

type Body = { member?: string; stamps?: number; cycles?: number; serial?: string; action?: "stamp" | "claim" };

export async function POST(req: Request): Promise<Response> {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "جسمٌ غير صالح." }, { status: 400 });
  }

  let serial: string;
  let stamps: number;
  let cycles: number;

  if (body.serial) {
    // ── لسانُ الفعل (صفحة المسح) ──
    const holder = memberBySerial(body.serial);
    if (!holder) return NextResponse.json({ error: "بطاقةٌ غير معروفة." }, { status: 404 });
    serial = holder.serial;

    // الحالةُ تُقرأ الآن لا تُؤخَذ من المستدعي — انظر رأس الملفّ.
    const card = await getCard(serial);
    const now = { stamps: card?.stamps ?? holder.stamps, cycles: card?.cycles ?? holder.cycles };

    if (body.action === "claim") {
      // لا تُصرَف مكافأةُ بطاقةٍ لم تكتمل — والحارسُ هنا لا في الواجهة وحدها.
      if (!isComplete(now.stamps)) {
        return NextResponse.json({ error: "البطاقة لم تكتمل بعد." }, { status: 409 });
      }
      stamps = 0;
      cycles = now.cycles + 1;
    } else {
      // الختمُ عند الاكتمال لا يزيد شيئًا — العاشرةُ سقفٌ حتى تُصرَف المكافأة.
      stamps = Math.min(GOAL, now.stamps + 1);
      cycles = now.cycles;
    }
  } else {
    // ── لسانُ القيمة المطلقة (لوح التجربة) ──
    serial = memberById(body.member ?? "").serial;
    // يُقصّ إلى المدى فلا يصنع طلبٌ مشوَّهٌ بطاقةً مستحيلة (والقاعدة تحرسه ثانيةً بـ`check`).
    stamps = Math.min(GOAL, Math.max(0, Math.trunc(Number(body.stamps) || 0)));
    cycles = Math.max(0, Math.trunc(Number(body.cycles) || 0));
  }

  const card = await setCard(serial, stamps, cycles);
  if (!card) {
    return NextResponse.json({ error: "تعذّر حفظ الحالة — تحقّق من مفتاح الخدمة." }, { status: 503 });
  }

  const tokens = await tokensFor(serial);
  const topic = process.env.WALLET_PASS_TYPE_ID;
  const results = topic ? await pushToDevices(tokens, topic) : [];

  return NextResponse.json(
    {
      serial: card.serial,
      stamps: card.stamps,
      cycles: card.cycles,
      // زمنُ التغيير — به تعرف الصفحةُ أنّ هذا أحدثُ ممّا عندها (`useLiveCards`)
      updatedAt: card.updatedAt,
      devices: tokens.length,
      pushed: results.filter((r) => r.status === 200).length,
      // الفاشلة وحدها تُعرَض — والناجحة يكفيها عددُها
      failures: results.filter((r) => r.status !== 200).map((r) => ({ status: r.status, reason: r.reason })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
