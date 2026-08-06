/**
 * سطحُ البطاقة صورةً — يردّ `strip.png` **بالبايتات نفسِها التي تدخل الحزمة**:
 *
 * · `?stamps=7` — أختامُ بطاقة الأختام.
 * · `?points=240` — سُلَّمُ بطاقة النقاط.
 *
 * **ولا وسيطَ ثالثٌ يسمّي النظام**: الوسيطُ الحاضرُ يسمّيه بنفسه، فلا يُطلَب سطحٌ بنظامٍ
 * وعدّادِ نظامٍ آخر.
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
import { CATALOG, GOAL, TOP_COST } from "../demo";
import { pointsLadder, stampStrip } from "../png";

// الرسمُ والضغط يحتاجان `node:zlib` — لا يعملان على الحافة.
export const runtime = "nodejs";

/** عددٌ من وسيطٍ في مدًى — والمعتلُّ صفرٌ لا خطأ، فالسطحُ لا يُفشِل بطاقةً لأجل رابطٍ رديء. */
const clamp = (raw: string | null, max: number): number => {
  const n = Number(raw);
  return Number.isFinite(n) ? Math.min(max, Math.max(0, Math.trunc(n))) : 0;
};

export function GET(req: Request): Response {
  const q = new URL(req.url).searchParams;

  const png = q.has("points")
    ? pointsLadder(
        clamp(q.get("points"), TOP_COST),
        CATALOG.map((r) => r.cost),
        750,
      )
    : stampStrip(clamp(q.get("stamps"), GOAL), GOAL, 750);

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
