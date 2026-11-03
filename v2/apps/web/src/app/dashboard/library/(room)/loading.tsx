import { AdRoomLoading } from "@/app/_ad/states";
import { LIBRARY_ROOM } from "@/app/_ad/rooms/library.meta";
import { roomView } from "@/app/_ad/view-server";

/** تحميلُ الغرفة: هيكلُها ينبض بالعرض الذي اختاره العضو (القالب، ٢٠٢٦-١١-٠١). */
export default async function Loading() {
  return <AdRoomLoading {...LIBRARY_ROOM} view={await roomView(LIBRARY_ROOM.viewKey, LIBRARY_ROOM.defaultView)} />;
}
