import { AdRoomLoading } from "@/app/_ad/states";
import { TASKS_ROOM } from "@/app/_ad/rooms/tasks.meta";
import { roomView } from "@/app/_ad/view-server";

/** تحميلُ الغرفة: هيكلُها ينبض بالعرض الذي اختاره العضو (القالب، ٢٠٢٦-١٠-٣١). */
export default async function Loading() {
  return <AdRoomLoading {...TASKS_ROOM} view={await roomView(TASKS_ROOM.viewKey, TASKS_ROOM.defaultView)} />;
}
