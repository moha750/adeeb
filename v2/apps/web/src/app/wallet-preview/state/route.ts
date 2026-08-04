/**
 * **حالةُ البطاقات لحظةً بلحظة** — `GET /wallet-preview/state`، تسألها الصفحتان كي تتبع
 * إحداهما الأخرى: تختم في صفحة المسح فيتغيّر العدّاد في صفحة المعاينة بلا تحديث.
 *
 * **وسؤالٌ متكرّرٌ لا تدفقٌ مفتوح** (`SSE`/WebSocket): الدوالُّ الخادميّة على Vercel لها سقفُ
 * مدّةٍ يقطع الاتّصال الطويل، فيصير التدفّقُ وعدًا يُخلَف. والسؤالُ كلّ ثلاثِ ثوانٍ عن ثلاثةِ
 * صفوفٍ أرخصُ من محاولةِ إبقاء قناةٍ حيّة — والفرقُ في التجربة لا يُدرَك.
 *
 * **والحمولة صغيرةٌ قصدًا**: ثلاثةُ أرقامٍ لكلّ بطاقة. ولا يُردّ منها ما يخصّ التشخيص
 * (`last_fetch_note` وأخواته) — لا حاجةَ للصفحة به.
 */

import { NextResponse } from "next/server";
import { getAllCards } from "../store";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  return NextResponse.json(
    { cards: await getAllCards() },
    // حالةٌ تتغيّر بكلّ ختم — لا تُخزَّن في وسيطٍ ولا في المتصفّح.
    { headers: { "Cache-Control": "no-store" } },
  );
}
