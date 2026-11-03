import { AdRoomLoading } from "@/app/_ad/states";
import { SURVEYS_ROOM } from "@/app/_ad/rooms/meta";
import { roomView } from "@/app/_ad/view-server";

/** تحميلُ الغرفة: هيكلُها ينبض بالعرض الذي اختاره العضو (القالب، ٢٠٢٦-١٠-٣١). */
export default async function Loading() {
  return <AdRoomLoading {...SURVEYS_ROOM} view={await roomView(SURVEYS_ROOM.viewKey, SURVEYS_ROOM.defaultView)} />;
}
