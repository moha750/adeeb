import { AdRoomLoading } from "@/app/_ad/states";
import { FAQ_ROOM } from "@/app/_ad/rooms/faq.meta";
import { roomView } from "@/app/_ad/view-server";

/** تحميلُ الغرفة: هيكلُها ينبض بالعرض الذي اختاره العضو (القالب، ٢٠٢٦-١٠-٣١). */
export default async function Loading() {
  return <AdRoomLoading {...FAQ_ROOM} view={await roomView(FAQ_ROOM.viewKey, FAQ_ROOM.defaultView)} />;
}
