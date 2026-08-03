/**
 * مُخرِج الحزمة — `GET /wallet-preview/pkpass?member=m1` يردّ ملفّ `.pkpass` موقَّعًا،
 * يفتحه أيفون فيُضيف البطاقة إلى المحفظة.
 *
 * **والحالةُ من القاعدة لا من الطلب**: البطاقةُ التي تنزل هي التي في `wallet_preview_cards`
 * الآن — نفسُ ما ستردّه خدمةُ التحديث بعد قليل. ولو أخذنا العدد من الرابط لَخرجت بطاقةٌ
 * تخالف ما يعرفه الخادم، فيصحّحها أوّلُ تحديثٍ ويظنّ الناظرُ أنّها تراجعت.
 *
 * وبناءُ الحزمة نفسُه في `build.ts` — يشترك فيه هذا المسار وخدمةُ الويب.
 */

import { NextResponse } from "next/server";
import { buildPkpass, missingEnv } from "../build";
import { memberById } from "../demo";
import { getCard } from "../store";

// التوقيع والضغط يحتاجان `node:crypto` و`node:zlib` — لا تعمل على الحافة.
export const runtime = "nodejs";

export async function GET(req: Request): Promise<Response> {
  const missing = missingEnv();
  if (missing.length > 0) {
    return NextResponse.json(
      {
        error: "لم تُضبَط شهادة المحفظة بعد، فلا يمكن توقيع البطاقة.",
        missing,
        hint: "أنشئ Pass Type ID certificate من حساب مطوّر أبل، ثمّ ضع المتغيّرات في .env.local.",
      },
      { status: 503 },
    );
  }

  const url = new URL(req.url);
  const base = memberById(url.searchParams.get("member") ?? "");
  // القاعدة هي الحقيقة؛ وقيمُ `demo.ts` ارتدادٌ إن تعذّرت القراءة فلا تسقط المعاينة.
  const card = await getCard(base.serial);
  const member = { ...base, stamps: card?.stamps ?? base.stamps, cycles: card?.cycles ?? base.cycles };

  let archive: Buffer;
  try {
    archive = await buildPkpass(member, url.origin);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "تعذّر توقيع البطاقة." }, { status: 500 });
  }

  return new NextResponse(new Uint8Array(archive), {
    headers: {
      "Content-Type": "application/vnd.apple.pkpass",
      "Content-Disposition": `attachment; filename="${member.serial}.pkpass"`,
      // معاينةٌ ببياناتٍ متغيّرة — لا تُخزَّن في وسيطٍ ولا في المتصفّح.
      "Cache-Control": "no-store",
    },
  });
}
