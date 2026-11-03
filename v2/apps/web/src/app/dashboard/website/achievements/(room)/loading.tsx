import { AdRoomLoading } from "@/app/_ad/states";
import { ACHIEVEMENTS_ROOM } from "@/app/_ad/rooms/achievements.meta";
import { roomView } from "@/app/_ad/view-server";

/** تحميلُ الغرفة: هيكلُها ينبض بالعرض الذي اختاره العضو (القالب، ٢٠٢٦-١٠-٣١). */
export default async function Loading() {
  return <AdRoomLoading {...ACHIEVEMENTS_ROOM} view={await roomView(ACHIEVEMENTS_ROOM.viewKey, ACHIEVEMENTS_ROOM.defaultView)} />;
}
