/**
 * **تسجيلُ جهازٍ لبطاقة** وإلغاؤه — أوّلُ مسارَي خدمة الويب التي تفرضها أبل.
 *
 * حين يُضيف المستخدم بطاقةً تحمل `webServiceURL`، يطرق الجهازُ هذا الباب من تلقاء نفسه
 * ويسلّمنا **رمزَ دفعه**. وهو الرمز الذي نُنبّهه به لاحقًا أنّ في بطاقته جديدًا — فلولا
 * هذا المسار لَما عرفنا إلى أين ندفع.
 *
 * وحين يحذف البطاقة يطرقه ثانيةً بـ`DELETE`.
 *
 * `POST   /wallet-preview/w/v1/devices/{deviceId}/registrations/{passTypeId}/{serial}`
 * `DELETE` نفسُه.
 *
 * والمصادقة ترويسةٌ واحدة: `Authorization: ApplePass <token>` — الرمزُ الذي كتبناه في
 * البطاقة نفسها، فلا يسجّل أحدٌ بطاقةً لا يحملها.
 */

import { NextResponse } from "next/server";
import { authOk, registerDevice, unregisterDevice } from "@/app/wallet-preview/store";

export const runtime = "nodejs";

type Params = { params: Promise<{ deviceId: string; passTypeId: string; serial: string }> };

export async function POST(req: Request, { params }: Params): Promise<Response> {
  const { deviceId, serial } = await params;
  if (!authOk(serial, req.headers.get("authorization"))) {
    return new NextResponse(null, { status: 401 });
  }

  let pushToken = "";
  try {
    pushToken = ((await req.json()) as { pushToken?: string }).pushToken ?? "";
  } catch {
    /* جسمٌ غير صالح — يُعامَل كرمزٍ مفقود أدناه */
  }
  if (!pushToken) return new NextResponse(null, { status: 400 });

  const fresh = await registerDevice(deviceId, serial, pushToken);
  // أبل تفرّق: ٢٠١ تسجيلٌ جديد · ٢٠٠ كان مسجَّلًا سلفًا (وقد حُدّث رمزُه).
  return new NextResponse(null, { status: fresh ? 201 : 200 });
}

export async function DELETE(req: Request, { params }: Params): Promise<Response> {
  const { deviceId, serial } = await params;
  if (!authOk(serial, req.headers.get("authorization"))) {
    return new NextResponse(null, { status: 401 });
  }
  await unregisterDevice(deviceId, serial);
  return new NextResponse(null, { status: 200 });
}
