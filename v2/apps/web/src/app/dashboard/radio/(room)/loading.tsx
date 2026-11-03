import { AdRoomLoading } from "@/app/_ad/states";
import { RADIO_ROOM } from "@/app/_ad/rooms/radio.meta";
import { roomView } from "@/app/_ad/view-server";

/** تحميلُ الغرفة: هيكلُها ينبض بالعرض الذي اختاره العضو (القالب، ٢٠٢٦-١٠-٣١). */
export default async function Loading() {
  return <AdRoomLoading {...RADIO_ROOM} view={await roomView(RADIO_ROOM.viewKey, RADIO_ROOM.defaultView)} />;
}
