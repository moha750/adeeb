import { AdRoomLoading } from "@/app/_ad/states";
import { UNIT_ROOM } from "@/app/_ad/rooms/unit.meta";
import { roomView } from "@/app/_ad/view-server";

/** تحميلُ الغرفة: هيكلُها ينبض بالعرض الذي اختاره العضو (القالب، ٢٠٢٦-١٠-٣١). */
export default async function Loading() {
  return <AdRoomLoading {...UNIT_ROOM} view={await roomView(UNIT_ROOM.viewKey, UNIT_ROOM.defaultView)} />;
}
