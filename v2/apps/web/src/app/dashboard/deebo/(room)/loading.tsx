import { AdRoomLoading } from "@/app/_ad/states";
import { DEEBO_LOG_ROOM } from "@/app/_ad/rooms/deebo-log.meta";
import { roomView } from "@/app/_ad/view-server";

/** تحميلُ الغرفة: هيكلُها ينبض بالعرض الذي اختاره العضو (القالب، ٢٠٢٦-١١-٠٢). */
export default async function Loading() {
  return <AdRoomLoading {...DEEBO_LOG_ROOM} view={await roomView(DEEBO_LOG_ROOM.viewKey, DEEBO_LOG_ROOM.defaultView)} />;
}
