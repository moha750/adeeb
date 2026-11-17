import { AdRoomLoading } from "@/app/_ad/states";
import { RUN_ROOM } from "@/app/_ad/rooms/member-elections.meta";
import { roomView } from "@/app/_ad/view-server";

/** تحميلُ الغرفة: هيكلُها ينبض بالعرض الذي اختاره العضو (القالب، ٢٠٢٦-١٠-٣١). */
export default async function Loading() {
  return <AdRoomLoading {...RUN_ROOM} view={await roomView(RUN_ROOM.viewKey, RUN_ROOM.defaultView)} />;
}
