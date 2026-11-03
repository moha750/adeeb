import { AdRoomLoading } from "@/app/_ad/states";
import { WORKS_ROOM } from "@/app/_ad/rooms/works.meta";
import { roomView } from "@/app/_ad/view-server";

/** تحميلُ الغرفة: هيكلُها ينبض بالعرض الذي اختاره العضو (القالب، ٢٠٢٦-١٠-٣١). */
export default async function Loading() {
  return <AdRoomLoading {...WORKS_ROOM} view={await roomView(WORKS_ROOM.viewKey, WORKS_ROOM.defaultView)} />;
}
