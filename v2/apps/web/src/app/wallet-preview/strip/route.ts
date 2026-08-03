/**
 * سطحُ البطاقة صورةً — `GET /wallet-preview/strip?stamps=7` يردّ `strip.png` **بالبايتات
 * نفسِها التي تدخل الحزمة**.
 *
 * وهذا هو ما يجعل المعاينة معاينةً حقًّا: الصفحة لا تحاكي السطحَ بـCSS ثمّ يرسمه الخادم
 * مرّةً أخرى للجهاز (فيفترقان يومًا في تفصيلٍ صغير)، بل **تعرض الصورة عينَها**. فما على
 * الشاشة هو ما في الجيب، لا شبيهُه.
 *
 * **والمقاس ٧٥٠ دائمًا** (`@2x`): البطاقة تُعرَض بعرض ٣٤٠px على شاشةٍ مضاعفة، فالمضاعفُ
 * هو الذي يُقرأ حادًّا. أمّا `@1x` فيبقى للحزمة وحدها.
 *
 * **والردّ خالدٌ في الذاكرة**: الصورة دالّةٌ في عدد الأختام لا غير، فرابطُها لا يكذب أبدًا.
 * وبهذا يصير الختمُ التالي فوريًّا بلا وميض — والصفحة تسبق إليه (انظر `WalletPreview`).
 */

import { NextResponse } from "next/server";
import { GOAL } from "../demo";
import { stampStrip } from "../png";

// الرسمُ والضغط يحتاجان `node:zlib` — لا يعملان على الحافة.
export const runtime = "nodejs";

export function GET(req: Request): Response {
  const raw = Number(new URL(req.url).searchParams.get("stamps"));
  const stamps = Number.isFinite(raw) ? Math.min(GOAL, Math.max(0, Math.trunc(raw))) : 0;

  return new NextResponse(new Uint8Array(stampStrip(stamps, GOAL, 750)), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
