import { AdRoomLoading } from "@/app/_ad/states";
import { QR_OVERSIGHT_ROOM } from "@/app/_ad/rooms/qr-oversight.meta";
import { roomView } from "@/app/_ad/view-server";

/** تحميلُ الغرفة: هيكلُها ينبض بالعرض الذي اختاره العضو (القالب، ٢٠٢٦-١١-٠٢). */
export default async function Loading() {
  return <AdRoomLoading {...QR_OVERSIGHT_ROOM} view={await roomView(QR_OVERSIGHT_ROOM.viewKey, QR_OVERSIGHT_ROOM.defaultView)} />;
}
