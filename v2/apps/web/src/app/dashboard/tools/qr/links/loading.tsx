import { AdRoomLoading } from "@/app/_ad/states";
import { QR_LINKS_ROOM } from "@/app/_ad/rooms/qr-links.meta";
import { roomView } from "@/app/_ad/view-server";

/** تحميلُ الغرفة: هيكلُها ينبض بالعرض الذي اختاره العضو (القالب، ٢٠٢٦-١٠-٣١). */
export default async function Loading() {
  return <AdRoomLoading {...QR_LINKS_ROOM} view={await roomView(QR_LINKS_ROOM.viewKey, QR_LINKS_ROOM.defaultView)} />;
}
