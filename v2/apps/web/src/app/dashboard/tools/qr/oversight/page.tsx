import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getQrOversight } from "./data";
import { QrOversightRoom } from "@/app/_ad/rooms/QrOversightRoom";
import { AdRoomError } from "@/app/_ad/states";
import { QR_OVERSIGHT_ROOM } from "@/app/_ad/rooms/qr-oversight.meta";
import { roomView } from "@/app/_ad/view-server";
import { requestNow } from "@/app/_ad/now";
import { roomMetadata } from "@/app/_ad/metadata";

export const metadata = roomMetadata(QR_OVERSIGHT_ROOM);

/**
 * غرفةُ الإشراف. قفلُها `oversee_qr` — قدرةٌ يحملها دورُ «أَدِيب» وحدَه اليوم، ولا تُغني
 * عنها قدرةُ الأداة (`use_qr_generator`): من يصنع ملصقَه ليس من يُشرف على ملصقات الناس.
 *
 * وعلى قالب «قائمة السجلّات» (٢٠٢٦-١١-٠٢)، ولا مساراتٍ أبناءَ للمجلّد فحالتا التحميل والخطأ بجانب الصفحة.
 * **والقراءةُ قد تنقص ولا تسقط**: إن تعذّرت قراءةُ الباركودات نفسِها فلا صفَّ يُعرض، وذاك خطأُ الغرفة؛ وإن تعذّرت قراءةُ
 * السجلّ وحدها بقيت الباركوداتُ وقيل النقصُ فوقها، كما كانت القديمة («نقصٌ في القراءة»).
 */
export default async function QrOversightPage() {
  const denied = await denyUnless("/dashboard/tools/qr/oversight");
  if (denied) return denied;

  const data = await getQrOversight();
  if (data.error && data.rows.length === 0) return <AdRoomError {...QR_OVERSIGHT_ROOM} message={data.error} />;

  return <QrOversightRoom data={data} serverNow={await requestNow()} view={await roomView(QR_OVERSIGHT_ROOM.viewKey, QR_OVERSIGHT_ROOM.defaultView)} />;
}
