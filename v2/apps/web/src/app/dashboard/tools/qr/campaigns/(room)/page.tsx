import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getMyQrCampaigns } from "../data";
import { QrCampaignsRoom } from "@/app/_ad/rooms/QrCampaignsRoom";
import { AdRoomError } from "@/app/_ad/states";
import { QR_CAMPAIGNS_ROOM } from "@/app/_ad/rooms/qr-campaigns.meta";
import { roomView } from "@/app/_ad/view-server";
import { requestNow } from "@/app/_ad/now";
import { roomMetadata } from "@/app/_ad/metadata";

/**
 * **بابُ الحملات** — القفلُ قفلُ الغرفة نفسِه (`use_qr_generator`)، لا قدرةَ جديدة:
 * الحاويةُ ترتيبُ باركوداتِك أنت، ومن ملك المولّدَ ملك ترتيبَ ما يصنع.
 *
 * وعلى قالب «قائمة السجلّات» (٢٠٢٦-١١-٠٢). المجموعةُ `(room)` تحصر حالتَي التحميل والخطأ في القائمة وحدها: غرفةُ
 * الحملة (`[id]`) شقيقتُها، فلا ترى هيكلَ القائمة وهي تُفتح.
 */
export const metadata = roomMetadata(QR_CAMPAIGNS_ROOM);

export default async function QrCampaignsPage() {
  const denied = await denyUnless("/dashboard/tools/qr");
  if (denied) return denied;

  const { rows, error } = await getMyQrCampaigns();
  if (error) return <AdRoomError {...QR_CAMPAIGNS_ROOM} message={error} />;

  return <QrCampaignsRoom rows={rows} serverNow={await requestNow()} view={await roomView(QR_CAMPAIGNS_ROOM.viewKey, QR_CAMPAIGNS_ROOM.defaultView)} />;
}
