import { AdRoomLoading } from "@/app/_ad/states";
import { FRIENDS_ROOM } from "@/app/_ad/rooms/friends.meta";
import { roomView } from "@/app/_ad/view-server";

/** تحميلُ الغرفة: هيكلُها ينبض بالعرض الذي اختاره العضو (القالب، ٢٠٢٦-١٠-٣١). */
export default async function Loading() {
  return <AdRoomLoading {...FRIENDS_ROOM} view={await roomView(FRIENDS_ROOM.viewKey, FRIENDS_ROOM.defaultView)} />;
}
