import { AdRoomLoading } from "@/app/_ad/states";
import { QR_CAMPAIGNS_ROOM } from "@/app/_ad/rooms/qr-campaigns.meta";
import { roomView } from "@/app/_ad/view-server";

/** تحميلُ الغرفة: هيكلُها ينبض بالعرض الذي اختاره العضو (القالب، ٢٠٢٦-١٠-٣١). */
export default async function Loading() {
  return <AdRoomLoading {...QR_CAMPAIGNS_ROOM} view={await roomView(QR_CAMPAIGNS_ROOM.viewKey, QR_CAMPAIGNS_ROOM.defaultView)} />;
}
