import { AdRoomLoading } from "@/app/_ad/states";
import { MEMBERS_ROOM } from "@/app/_ad/rooms/members.meta";
import { roomView } from "@/app/_ad/view-server";

/** تحميلُ الغرفة: هيكلُها ينبض بالعرض الذي اختاره العضو (القالب، ٢٠٢٦-١١-٠٣). */
export default async function Loading() {
  return <AdRoomLoading {...MEMBERS_ROOM} view={await roomView(MEMBERS_ROOM.viewKey, MEMBERS_ROOM.defaultView)} />;
}
