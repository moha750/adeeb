/**
 * **صورةُ واجهة بطاقة قوقل** (`heroImage`) — نظيرةُ `strip.png` عند أبل، وبالرسّامَين
 * أنفسِهما: أختامٌ أو سُلَّمُ نقاط.
 *
 * · `?stamps=7` — أختامُ بطاقة الأختام.
 * · `?points=240` — سُلَّمُ بطاقة النقاط.
 *
 * **والمقاس ١٠٣٢×٣٣٦** — نسبةُ صورة الواجهة عند قوقل (٣:١ تقريبًا)، وهي أعرضُ من شريط
 * أبل (٣٧٥×١٤٤ ≈ ٢٫٦:١). فالرسّامُ واحدٌ والنسبةُ نسبتان، ولذلك يقبل الرسّامان ارتفاعًا
 * صريحًا لا يشتقّانه من العرض.
 *
 * **ومن يجلبها خوادمُ قوقل لا الجهاز**: فالرابط علنيٌّ بلا مصادقة، ويحمل الحالة في
 * وسائطه — لو ثبت الرابطُ لَثبتت الصورةُ في مخزنها ولم تتبع الأختام.
 */

import { NextResponse } from "next/server";
import { CATALOG, GOAL, TOP_COST } from "../demo";
import { pointsLadder, stampStrip } from "../png";

// الرسمُ والضغط يحتاجان `node:zlib` — لا يعملان على الحافة.
export const runtime = "nodejs";

/** مقاسُ صورة الواجهة كما توصي به قوقل. */
const W = 1032;
const H = 336;

/** عددٌ من وسيطٍ في مدًى — والمعتلُّ صفرٌ لا خطأ، فالصورةُ لا تُفشِل بطاقةً لأجل رابطٍ رديء. */
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
        W,
        H,
      )
    : stampStrip(clamp(q.get("stamps"), GOAL), GOAL, W, H);

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      // الصورة دالّةٌ في العدّاد وحده، فرابطُها لا يكذب أبدًا
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
