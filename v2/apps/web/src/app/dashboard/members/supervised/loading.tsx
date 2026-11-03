import { AdRoomLoading } from "@/app/_ad/states";
import { SUPERVISED_ROOM } from "@/app/_ad/rooms/supervised.meta";
import { roomView } from "@/app/_ad/view-server";

/** تحميلُ الغرفة: هيكلُها ينبض بالعرض الذي اختاره العضو (القالب، ٢٠٢٦-١٠-٣١). */
export default async function Loading() {
  return <AdRoomLoading {...SUPERVISED_ROOM} view={await roomView(SUPERVISED_ROOM.viewKey, SUPERVISED_ROOM.defaultView)} />;
}
