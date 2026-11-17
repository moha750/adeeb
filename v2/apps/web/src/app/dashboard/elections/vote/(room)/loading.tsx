import { AdRoomLoading } from "@/app/_ad/states";
import { VOTE_ROOM } from "@/app/_ad/rooms/member-elections.meta";
import { roomView } from "@/app/_ad/view-server";

/** تحميلُ الغرفة: هيكلُها ينبض بالعرض الذي اختاره العضو (القالب، ٢٠٢٦-١٠-٣١). */
export default async function Loading() {
  return <AdRoomLoading {...VOTE_ROOM} view={await roomView(VOTE_ROOM.viewKey, VOTE_ROOM.defaultView)} />;
}
