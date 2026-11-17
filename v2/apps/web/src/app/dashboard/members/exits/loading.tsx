import { AdRoomLoading } from "@/app/_ad/states";
import { EXITS_ROOM } from "@/app/_ad/rooms/exits.meta";
import { roomView } from "@/app/_ad/view-server";

/** تحميلُ الغرفة: هيكلُها ينبض بالعرض الذي اختاره العضو (القالب، ٢٠٢٦-١٠-٣١). */
export default async function Loading() {
  return <AdRoomLoading {...EXITS_ROOM} view={await roomView(EXITS_ROOM.viewKey, EXITS_ROOM.defaultView)} />;
}
