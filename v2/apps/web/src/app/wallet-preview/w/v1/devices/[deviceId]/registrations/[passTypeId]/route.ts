/**
 * **ما الذي تغيّر؟** — الجهاز يسأل هذا المسار بعد أن تصله دفعتُنا الصامتة، فيعرف أيّ
 * بطاقاته يذهب يجلبها.
 *
 * `GET /wallet-preview/w/v1/devices/{deviceId}/registrations/{passTypeId}?passesUpdatedSince={tag}`
 *
 * **و`passesUpdatedSince` وسمٌ معتِمٌ عند أبل**: هي تحمله ذهابًا وإيابًا ولا تفسّره — نحن
 * من نعطيه ونحن من نقرؤه. وجعلناه **زمنَ آخر تغيير**، فالسؤالُ التالي يطلب ما بعده وحده.
 *
 * **ولا مصادقةَ هنا** — وهذا موافقٌ للمواصفة لا سهوٌ: الجواب أرقامُ بطاقاتٍ سجّلها هذا
 * الجهازُ بنفسه، لا بيانات فيه. والبطاقة نفسُها لا تُسلَّم إلّا بالرمز في المسار التالي.
 */

import { NextResponse } from "next/server";
import { changedFor } from "@/app/wallet-preview/store";

export const runtime = "nodejs";

type Params = { params: Promise<{ deviceId: string; passTypeId: string }> };

export async function GET(req: Request, { params }: Params): Promise<Response> {
  const { deviceId } = await params;
  const since = new URL(req.url).searchParams.get("passesUpdatedSince");

  const { serials, lastUpdated } = await changedFor(deviceId, since);

  // ٢٠٤ = «لا جديد». وهي **ليست** خطأً: الجهاز يسأل كثيرًا، وأكثرُ الأسئلة جوابُها هذا.
  if (serials.length === 0) return new NextResponse(null, { status: 204 });

  return NextResponse.json({ lastUpdated, serialNumbers: serials }, { headers: { "Cache-Control": "no-store" } });
}
