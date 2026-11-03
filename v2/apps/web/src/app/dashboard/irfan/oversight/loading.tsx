import { AdRoomLoading } from "@/app/_ad/states";
import { IRFAN_OVERSIGHT_ROOM } from "@/app/_ad/rooms/irfan-oversight.meta";
import { roomView } from "@/app/_ad/view-server";

/** تحميلُ الغرفة: هيكلُها ينبض بالعرض الذي اختاره العضو (القالب، ٢٠٢٦-١١-٠٢). */
export default async function Loading() {
  return <AdRoomLoading {...IRFAN_OVERSIGHT_ROOM} view={await roomView(IRFAN_OVERSIGHT_ROOM.viewKey, IRFAN_OVERSIGHT_ROOM.defaultView)} />;
}
