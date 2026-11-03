import { AdRoomLoading } from "@/app/_ad/states";
import { QR_CAMPAIGN_ROOM } from "@/app/_ad/rooms/qr-campaign.meta";
import { roomView } from "@/app/_ad/view-server";

/** تحميلُ الغرفة: هيكلُها ينبض بالعرض الذي اختاره العضو (القالب، ٢٠٢٦-١٠-٣١) — باسمٍ عامّ حتى يُعرف اسمُ الحملة. */
export default async function Loading() {
  return <AdRoomLoading {...QR_CAMPAIGN_ROOM} view={await roomView(QR_CAMPAIGN_ROOM.viewKey, QR_CAMPAIGN_ROOM.defaultView)} />;
}
