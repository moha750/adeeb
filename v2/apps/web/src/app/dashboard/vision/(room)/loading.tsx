import { AdRoomLoading } from "@/app/_ad/states";
import { VISION_ROOM } from "@/app/_ad/rooms/vision.meta";
import { roomView } from "@/app/_ad/view-server";

/** تحميلُ الغرفة: هيكلُها ينبض بالعرض الذي اختاره العضو (القالب، ٢٠٢٦-١٠-٣١). */
export default async function Loading() {
  return <AdRoomLoading {...VISION_ROOM} view={await roomView(VISION_ROOM.viewKey, VISION_ROOM.defaultView)} />;
}
