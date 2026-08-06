/**
 * **رابطُ «أضِف إلى Google Wallet»** — `GET /wallet-preview/gwallet?member=m2&mode=points`.
 *
 * يردّ `{ url }` لا يُحوّل: الصفحةُ تفتحه بنفسها، فتملك أن تعرض خطأً مفهومًا إن تعذّر
 * التوقيع — بخلاف تحويلٍ يقذف المستخدم إلى صفحة قوقل بخطإٍ لا يفهمه.
 *
 * **ويردّ ٥٠٣ يسمّي الناقصَ بعينه** كنظيره عند أبل: بياناتُ اعتماد قوقل لا تُنشَأ إلّا من
 * حساب المالك، فالبابُ يُبنى مُعطَّلًا ويقول ما ينقصه بدل أن يفشل غامضًا.
 */

import { NextResponse } from "next/server";
import { memberById, type Mode, serialFor } from "../demo";
import { missingGoogleEnv, saveUrl } from "../google";
import { getCard } from "../store";

export const runtime = "nodejs";

export async function GET(req: Request): Promise<Response> {
  const missing = missingGoogleEnv();
  if (missing.length > 0) {
    return NextResponse.json(
      {
        error: "لم تُضبَط بيانات Google Wallet بعد، فلا يمكن توقيع الرابط.",
        missing,
        hint: "أنشئ حساب مُصدِر في لوحة Google Pay & Wallet ومفتاحَ حساب خدمة، ثمّ ضع المتغيّرات في .env.local.",
      },
      { status: 503 },
    );
  }

  const url = new URL(req.url);
  const base = memberById(url.searchParams.get("member") ?? "");
  const mode: Mode = url.searchParams.get("mode") === "points" ? "points" : "stamps";

  // القاعدة هي الحقيقة؛ وقيمُ `demo.ts` ارتدادٌ إن تعذّرت القراءة فلا تسقط المعاينة.
  const card = await getCard(serialFor(base, mode));
  const member = {
    ...base,
    stamps: card?.stamps ?? base.stamps,
    cycles: card?.cycles ?? base.cycles,
    points: card?.points ?? base.points,
    redemptions: card?.redemptions ?? base.redemptions,
  };

  try {
    return NextResponse.json({ url: saveUrl(member, mode, url.origin) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "تعذّر توقيع الرابط." }, { status: 500 });
  }
}
