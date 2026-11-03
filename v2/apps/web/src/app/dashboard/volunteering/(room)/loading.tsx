import { AdRoomLoading } from "@/app/_ad/states";
import { VOLUNTEERING_ROOM } from "@/app/_ad/rooms/volunteering.meta";
import { roomView } from "@/app/_ad/view-server";

/** تحميلُ الغرفة: هيكلُها ينبض بالعرض الذي اختاره العضو (القالب، ٢٠٢٦-١٠-٣١). */
export default async function Loading() {
  return <AdRoomLoading {...VOLUNTEERING_ROOM} view={await roomView(VOLUNTEERING_ROOM.viewKey, VOLUNTEERING_ROOM.defaultView)} />;
}
