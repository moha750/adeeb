/**
 * **تسليمُ النسخة المحدَّثة** — آخرُ حلقةٍ في السلسلة: الجهاز عرف أنّ بطاقته تغيّرت، فجاء
 * يطلبها. نبنيها بحالتها الراهنة من القاعدة، نوقّعها، ونردّها — فتتبدّل في المحفظة أمام
 * صاحبها.
 *
 * `GET /wallet-preview/w/v1/passes/{passTypeId}/{serial}`
 *
 * **وهنا المصادقة لازمة** (بخلاف مسار «ما الذي تغيّر؟»): هذا يسلّم البطاقة نفسَها.
 *
 * **و`If-Modified-Since` يُحترَم**: الجهاز يرسل زمنَ نسختِه، فإن لم نُحدِث شيئًا بعده
 * رددنا ٣٠٤ بلا توقيعٍ ولا بناء. وبناءُ حزمةٍ لنُلقيَها إسرافٌ في كلّ سؤالٍ لا جديد فيه.
 */

import { NextResponse } from "next/server";
import { buildPkpass, missingEnv } from "@/app/wallet-preview/build";
import { memberBySerial } from "@/app/wallet-preview/demo";
import { authOk, getCard } from "@/app/wallet-preview/store";

export const runtime = "nodejs";

type Params = { params: Promise<{ passTypeId: string; serial: string }> };

export async function GET(req: Request, { params }: Params): Promise<Response> {
  const { serial } = await params;
  if (!authOk(serial, req.headers.get("authorization"))) {
    return new NextResponse(null, { status: 401 });
  }

  const base = memberBySerial(serial);
  if (!base) return new NextResponse(null, { status: 404 });
  if (missingEnv().length > 0) return new NextResponse(null, { status: 500 });

  const card = await getCard(serial);
  const member = { ...base, stamps: card?.stamps ?? base.stamps, cycles: card?.cycles ?? base.cycles };

  // زمنُ آخر تغييرٍ بدقّة الثانية — ترويسات HTTP لا تحمل أدقّ منها، والمقارنة بغيرها
  // تجعل نسخةً حديثةً تبدو أقدمَ من نفسها فتُعاد بلا داعٍ.
  const modified = new Date(card?.updatedAt ?? 0);
  modified.setMilliseconds(0);
  const since = req.headers.get("if-modified-since");
  if (since) {
    const seen = new Date(since);
    if (!Number.isNaN(seen.getTime()) && modified <= seen) return new NextResponse(null, { status: 304 });
  }

  let archive: Buffer;
  try {
    archive = await buildPkpass(member, new URL(req.url).origin);
  } catch {
    return new NextResponse(null, { status: 500 });
  }

  return new NextResponse(new Uint8Array(archive), {
    headers: {
      "Content-Type": "application/vnd.apple.pkpass",
      "Last-Modified": modified.toUTCString(),
      "Cache-Control": "no-store",
    },
  });
}
