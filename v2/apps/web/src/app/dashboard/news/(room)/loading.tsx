import { AdRoomLoading } from "@/app/_ad/states";
import { NEWS_ROOM } from "@/app/_ad/rooms/meta";
import { roomView } from "@/app/_ad/view-server";

/** تحميلُ الغرفة: هيكلُها ينبض بالعرض الذي اختاره العضو (القالب، ٢٠٢٦-١٠-٣١). */
export default async function Loading() {
  return <AdRoomLoading {...NEWS_ROOM} view={await roomView(NEWS_ROOM.viewKey, NEWS_ROOM.defaultView)} />;
}
