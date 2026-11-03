import { AdRoomLoading } from "@/app/_ad/states";
import { DEPARTMENT_ROOM } from "@/app/_ad/rooms/department.meta";
import { roomView } from "@/app/_ad/view-server";

/** تحميلُ الغرفة: هيكلُها ينبض بالعرض الذي اختاره العضو (القالب، ٢٠٢٦-١٠-٣١). */
export default async function Loading() {
  return <AdRoomLoading {...DEPARTMENT_ROOM} view={await roomView(DEPARTMENT_ROOM.viewKey, DEPARTMENT_ROOM.defaultView)} />;
}
