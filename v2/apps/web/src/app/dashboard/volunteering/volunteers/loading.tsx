import { AdRoomLoading } from "@/app/_ad/states";
import { VOLUNTEERS_ROOM } from "@/app/_ad/rooms/volunteers.meta";
import { roomView } from "@/app/_ad/view-server";

/** تحميلُ الغرفة: هيكلُها ينبض بالعرض الذي اختاره العضو (القالب، ٢٠٢٦-١٠-٣١). */
export default async function Loading() {
  return <AdRoomLoading {...VOLUNTEERS_ROOM} view={await roomView(VOLUNTEERS_ROOM.viewKey, VOLUNTEERS_ROOM.defaultView)} />;
}
