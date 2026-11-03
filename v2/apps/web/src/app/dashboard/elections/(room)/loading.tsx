import { AdRoomLoading } from "@/app/_ad/states";
import { ELECTIONS_ROOM } from "@/app/_ad/rooms/elections.meta";
import { roomView } from "@/app/_ad/view-server";

/** تحميلُ الغرفة: هيكلُها ينبض بالعرض الذي اختاره العضو (القالب، ٢٠٢٦-١١-٠٢). */
export default async function Loading() {
  return <AdRoomLoading {...ELECTIONS_ROOM} view={await roomView(ELECTIONS_ROOM.viewKey, ELECTIONS_ROOM.defaultView)} />;
}
