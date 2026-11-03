import { AdRoomLoading } from "@/app/_ad/states";
import { CONTACT_ROOM } from "@/app/_ad/rooms/contact.meta";
import { roomView } from "@/app/_ad/view-server";

/** تحميلُ الغرفة: هيكلُها ينبض بالعرض الذي اختاره العضو (القالب، ٢٠٢٦-١٠-٣١). */
export default async function Loading() {
  return <AdRoomLoading {...CONTACT_ROOM} view={await roomView(CONTACT_ROOM.viewKey, CONTACT_ROOM.defaultView)} />;
}
