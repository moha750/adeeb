import { AdRoomLoading } from "@/app/_ad/states";
import { TICKER_ROOM } from "@/app/_ad/rooms/ticker.meta";
import { roomView } from "@/app/_ad/view-server";

/** تحميلُ الغرفة: هيكلُها ينبض بالعرض الذي اختاره العضو (القالب، ٢٠٢٦-١٠-٣١). */
export default async function Loading() {
  return <AdRoomLoading {...TICKER_ROOM} view={await roomView(TICKER_ROOM.viewKey, TICKER_ROOM.defaultView)} />;
}
