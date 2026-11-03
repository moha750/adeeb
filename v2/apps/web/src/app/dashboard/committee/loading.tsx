import { AdRoomLoading } from "@/app/_ad/states";
import { COMMITTEE_ROOM } from "@/app/_ad/rooms/committee.meta";
import { roomView } from "@/app/_ad/view-server";

/** تحميلُ الغرفة: هيكلُها ينبض بالعرض الذي اختاره العضو (القالب، ٢٠٢٦-١٠-٣١). */
export default async function Loading() {
  return <AdRoomLoading {...COMMITTEE_ROOM} view={await roomView(COMMITTEE_ROOM.viewKey, COMMITTEE_ROOM.defaultView)} />;
}
