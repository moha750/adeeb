import { AdRoomLoading } from "@/app/_ad/states";
import { SPONSORS_ROOM } from "@/app/_ad/rooms/sponsors.meta";
import { roomView } from "@/app/_ad/view-server";

/** تحميلُ الغرفة: هيكلُها ينبض بالعرض الذي اختاره العضو (القالب، ٢٠٢٦-١٠-٣١). */
export default async function Loading() {
  return <AdRoomLoading {...SPONSORS_ROOM} view={await roomView(SPONSORS_ROOM.viewKey, SPONSORS_ROOM.defaultView)} />;
}
