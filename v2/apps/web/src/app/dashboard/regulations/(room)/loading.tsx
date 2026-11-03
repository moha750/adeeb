import { AdRoomLoading } from "@/app/_ad/states";
import { REGULATIONS_ROOM } from "@/app/_ad/rooms/regulations.meta";
import { roomView } from "@/app/_ad/view-server";

/** تحميلُ الغرفة: هيكلُها ينبض بالعرض الذي اختاره العضو (القالب، ٢٠٢٦-١٠-٣١). */
export default async function Loading() {
  return <AdRoomLoading {...REGULATIONS_ROOM} view={await roomView(REGULATIONS_ROOM.viewKey, REGULATIONS_ROOM.defaultView)} />;
}
