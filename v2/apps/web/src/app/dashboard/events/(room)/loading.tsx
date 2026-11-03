import { AdRoomLoading } from "@/app/_ad/states";
import { EVENTS_ROOM } from "@/app/_ad/rooms/meta";
import { roomView } from "@/app/_ad/view-server";

/** تحميلُ الغرفة: هيكلُها ينبض بالعرض الذي اختاره العضو (القالب، ٢٠٢٦-١٠-٣١). */
export default async function Loading() {
  return <AdRoomLoading {...EVENTS_ROOM} view={await roomView(EVENTS_ROOM.viewKey, EVENTS_ROOM.defaultView)} />;
}
